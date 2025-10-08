import { JWT, Session } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { auth } from '@/auth';
import { NextRequest } from 'next/server';

import {
  checkIsModelValid,
  isFileConversation,
  isImageConversation,
} from '@/lib/utils/app/chat';
import {
  APIM_CHAT_ENDPONT,
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST,
  OPENAI_API_VERSION,
} from '@/lib/utils/app/const';
import { parseAndQueryFileOpenAI } from '@/lib/utils/app/documentSummary';
import { getEnvVariable } from '@/lib/utils/app/env';
import { createAzureOpenAIStreamProcessor } from '@/lib/utils/app/streamProcessor';
import { AzureBlobStorage, BlobProperty } from '@/lib/utils/server/blob';
import { getMessagesToSend } from '@/lib/utils/server/chat';

import { bots } from '@/types/bots';
import {
  ChatBody,
  FileMessageContent,
  Message,
  TextMessageContent,
} from '@/types/chat';
import { OpenAIModelID, OpenAIVisionModelID, OpenAIModels } from '@/types/openai';


import { AzureMonitorLoggingService } from './loggingService';
import { RAGService } from './ragService';

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import '@azure/openai/types';
import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import fs from 'fs';
import OpenAI, { AzureOpenAI } from 'openai';
import { ChatCompletion } from 'openai/resources';
import path from 'path';
import {ResponseCreateParamsBase, ResponseInput} from "openai/resources/responses/responses";

/**
 * ChatService class for handling chat-related API operations.
 */
export default class ChatService {
  private openAIClient: AzureOpenAI;
  private loggingService: AzureMonitorLoggingService;
  private ragService: RAGService;

  constructor() {
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      'https://cognitiveservices.azure.com/.default',
    );

    this.openAIClient = new AzureOpenAI({
      azureADTokenProvider,
      apiVersion: process.env.OPENAI_API_VERSION ?? '2024-08-01-preview',
    });

    this.loggingService = new AzureMonitorLoggingService(
      process.env.LOGS_INJESTION_ENDPOINT!,
      process.env.DATA_COLLECTION_RULE_ID!,
      process.env.STREAM_NAME!,
    );

    this.ragService = new RAGService(
      process.env.SEARCH_ENDPOINT!,
      process.env.SEARCH_INDEX!,
      process.env.SEARCH_ENDPOINT_API_KEY!,
      this.loggingService,
      this.openAIClient,
    );
  }
  /**
   * Initializes the Tiktoken tokenizer.
   * @returns {Promise<Tiktoken>} A promise that resolves to the initialized Tiktoken instance.
   */
  private async initTiktoken(): Promise<Tiktoken> {
    const wasmPath = path.resolve(
      './node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm',
    );
    const wasmBuffer = fs.readFileSync(wasmPath);
    await init((imports) => WebAssembly.instantiate(wasmBuffer, imports));
    return new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );
  }

  /**
   * Wrapper function to implement exponential backoff retry logic.
   * @param {Function} fn - The function to retry.
   * @param {number} maxRetries - Maximum number of retries.
   * @param {number} baseDelay - Base delay in milliseconds.
   * @returns {Promise<any>} - The result of the function call.
   */
  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        const delay = Math.min(Math.pow(2, attempt) * baseDelay, 10000); // Max delay of 10 seconds
        console.warn(
          `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Failed after maximum retries');
  }

  private async retryReadFile(
    filePath: string,
    maxRetries: number = 2,
  ): Promise<Buffer> {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return fs.readFileSync(filePath);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.warn(`Attempt ${attempt + 1} to read file failed. Retrying...`);
        await delay(Math.pow(2, attempt) * 1000); // Exponential backoff: 1s, 2s, 4s
      }
    }
    throw new Error('Failed to read file after maximum retries');
  }

  /**
   * Handles a file conversation by processing the file and returning a response.
   * @param {Message[]} messagesToSend - The messages to send in the conversation.
   * @returns {Promise<Response>} A promise that resolves to the response containing the processed file content.
   */
  private async handleFileConversation(
    messagesToSend: Message[],
    token: JWT,
    modelId: string,
    user: Session['user'],
    botId: string | undefined,
    streamResponse: boolean,
  ): Promise<Response> {
    const startTime = Date.now();
    let fileBuffer: Buffer | undefined;
    let filename: string | undefined;

    return this.retryWithExponentialBackoff(async () => {
      const lastMessage: Message = messagesToSend[messagesToSend.length - 1];
      const content = lastMessage.content as Array<
        TextMessageContent | FileMessageContent
      >;

      let prompt: string | null = null;
      let fileUrl: string | null = null;
      content.forEach((section) => {
        if (section.type === 'text') prompt = section.text;
        else if (section.type === 'file_url') fileUrl = section.url;
        else
          throw new Error(
            `Unexpected content section type: ${JSON.stringify(section)}`,
          );
      });

      if (!prompt) throw new Error('Could not find text content type!');
      if (!fileUrl) throw new Error('Could not find file URL!');

      filename = (fileUrl as string).split('/').pop();
      if (!filename) throw new Error('Could not parse filename from URL!');
      const filePath = `/tmp/${filename}`;

      try {
        await this.downloadFile(fileUrl, filePath, token, user);
        console.log('File downloaded successfully.');

        fileBuffer = await this.retryReadFile(filePath);
        const file: File = new File([fileBuffer], filename, {});

        const result = await parseAndQueryFileOpenAI({
          file,
          prompt,
          modelId,
          user,
          botId,
          loggingService: this.loggingService,
          stream: streamResponse,
        });

        console.log('File summarized successfully.');

        if (streamResponse) {
          if (typeof result === 'string') {
            throw new Error('Expected a ReadableStream for streaming response');
          }
          return new StreamingTextResponse(result);
        } else {
          if (result instanceof ReadableStream) {
            throw new Error('Expected a string for non-streaming response');
          }
          return new Response(JSON.stringify({ text: result }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        await this.loggingService.logFileError(
          startTime,
          error,
          modelId,
          user,
          filename,
          fileBuffer?.length,
          botId,
        );
        throw error;
      } finally {
        try {
          fs.unlinkSync(filePath);
        } catch (fileUnlinkError) {
          if (
            fileUnlinkError instanceof Error &&
            fileUnlinkError.message.startsWith(
              'ENOENT: no such file or directory, unlink',
            )
          ) {
            console.warn('File not found, but this is acceptable.');
          } else {
            throw fileUnlinkError;
          }
        }
      }
    });
  }

  /**
   * Downloads a file from the specified URL and saves it to the specified file path.
   * @param {string} fileUrl - The URL of the file to download.
   * @param {string} filePath - The path where the downloaded file will be saved.
   * @returns {Promise<void>} A promise that resolves when the file is successfully downloaded.
   */
  private async downloadFile(
    fileUrl: string,
    filePath: string,
    token: JWT,
    user: Session['user'],
  ): Promise<void> {
    const userId: string = user?.id ?? (token as any).userId ?? 'anonymous';
    const remoteFilepath = `${userId}/uploads/files`;
    const id: string | undefined = fileUrl.split('/').pop();
    if (!id) throw new Error(`Could not find file id from URL: ${fileUrl}`);

    const blobStorage = new AzureBlobStorage(
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_NAME', user }),
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_KEY', user }),
      getEnvVariable({
        name: 'AZURE_BLOB_STORAGE_CONTAINER',
        throwErrorOnFail: false,
        defaultValue: process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? '',
        user,
      }),
      user,
    );
    const blob: Buffer = await (blobStorage.get(
      `${remoteFilepath}/${id}`,
      BlobProperty.BLOB,
    ) as Promise<Buffer>);

    fs.writeFile(filePath, blob, () => null);
  }

  async handleChatCompletion(
    modelId: string,
    messages: Message[],
    temperature: number,
    user: Session['user'],
    botId?: string,
    streamResponse: boolean = true,
    promptToSend?: string,
    modelConfig?: Record<string, unknown>,
    threadId?: string,
  ): Promise<Response> {
    const startTime = Date.now();
    try {
      if (botId) {
        const response = await this.ragService.augmentMessages(
          messages,
          botId,
          bots,
          modelId,
          streamResponse,
          user,
        );

        if (streamResponse) {
          return new StreamingTextResponse(response as ReadableStream);
        } else {
          const completionText = (response as ChatCompletion)?.choices?.[0]
            ?.message?.content;
          return new Response(JSON.stringify({ text: completionText }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else {
        // Check if this is an agent-enabled model
        if (modelConfig?.agentEnabled && modelConfig?.agentId) {
          
          // Use Azure AI Agents directly
          const aiAgents = await import('@azure/ai-agents');
          const { DefaultAzureCredential } = await import('@azure/identity');
          
          const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;
          const agentId = modelConfig.agentId;
          
          if (!endpoint || !agentId) {
            throw new Error('Azure AI Foundry endpoint or Agent ID not configured');
          }
          
          const client = new aiAgents.AgentsClient(endpoint, new DefaultAzureCredential());
          
          // Stream the response directly without importing specific event types
          // The events are string constants in the eventMessage.event field
          
          // Create a thread and run for this conversation with streaming
          const lastMessage = messages[messages.length - 1];
          
          let thread;
          let isNewThread = false;
          
          try {
            if (threadId) {
              // For existing thread, just reuse it
              // The thread already has all previous messages persisted
              thread = { id: threadId };
            } else {
              // Create a new thread for the first message
              thread = await client.threads.create();
              isNewThread = true;
            }
          } catch (threadError) {
            console.error('Error with thread:', threadError);
            throw threadError;
          }
          
          try {
            
            // The SDK expects parameters to be passed separately: (threadId, role, content)
            await client.messages.create(
              thread.id, 
              'user', 
              String(lastMessage.content)
            );
          } catch (messageError) {
            console.error('Error creating message:', messageError);
            console.error('Full error object:', JSON.stringify(messageError, null, 2));
            throw messageError;
          }
          
          // Create a run and get the stream
          let streamEventMessages;
          try {
            
            // Check if client.runs exists
            if (!client.runs) {
              console.error('client.runs is undefined. Client structure:', Object.keys(client));
              throw new Error('AgentsClient does not have runs property - check SDK version');
            }
            
            // The Azure AI Agents SDK expects the agentId as the second parameter
            // and returns an object with a stream() method
            const run = client.runs.create(thread.id, agentId);
            
            
            // Call stream() on the run object
            streamEventMessages = await run.stream();
            
          } catch (streamError) {
            console.error('Error creating stream:', streamError);
            console.error('Error stack:', streamError.stack);
            throw streamError;
          }
          
          // Create a readable stream for the response
          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              let citations = [];
              let citationIndex = 1;
              const citationMap = new Map();
              let hasCompletedMessage = false;
              
              try {
                for await (const eventMessage of streamEventMessages) {
                  // Handle different event types
                  if (eventMessage.event === 'thread.message.delta') {
                    const messageData = eventMessage.data as any;
                    if (messageData?.delta?.content && Array.isArray(messageData.delta.content)) {
                      messageData.delta.content.forEach((contentPart: { type: string; text?: { value: string } }) => {
                        if (contentPart.type === 'text' && contentPart.text?.value) {
                          let textChunk = contentPart.text.value;
                          
                          // Convert citation format on the fly
                          textChunk = textChunk.replace(/【(\d+):(\d+)†source】/g, (match: string) => {
                            if (!citationMap.has(match)) {
                              citationMap.set(match, citationIndex);
                              citationIndex++;
                            }
                            return `[${citationMap.get(match)}]`;
                          });
                          
                          controller.enqueue(encoder.encode(textChunk));
                        }
                      });
                    }
                  } else if (eventMessage.event === 'thread.message.completed') {
                    hasCompletedMessage = true;
                    // Extract citations from annotations
                    const messageData = eventMessage.data as any;
                    if (messageData?.content?.[0]?.text?.annotations) {
                      const annotations = messageData.content[0].text.annotations;
                      citations = [];
                      citationIndex = 1;
                      
                      annotations.forEach((annotation: { type: string; urlCitation?: { title?: string; url?: string } }) => {
                        if (annotation.type === 'url_citation' && annotation.urlCitation) {
                          citations.push({
                            number: citationIndex++,
                            title: annotation.urlCitation.title || `Source ${citationIndex}`,
                            url: annotation.urlCitation.url || '',
                            date: '' // Agent citations don't have publication dates
                          });
                        }
                      });
                    }
                  } else if (eventMessage.event === 'thread.run.completed') {
                    // Only append metadata at the very end, after we have everything
                    if (citations.length > 0 || isNewThread) {
                      // Use a unique separator that won't appear in normal content
                      const separator = '\n\n<<<METADATA_START>>>';
                      const metadata = {
                        citations: citations.length > 0 ? citations : undefined,
                        threadId: isNewThread ? thread.id : undefined
                      };
                      const metadataStr = `${separator}${JSON.stringify(metadata)}<<<METADATA_END>>>`;
                      controller.enqueue(encoder.encode(metadataStr));
                    }
                  } else if (eventMessage.event === 'error') {
                    controller.error(new Error(`Agent error: ${JSON.stringify(eventMessage.data)}`));
                  } else if (eventMessage.event === 'done') {
                    controller.close();
                  }
                }
              } catch (error) {
                controller.error(error);
              }
            }
          });
          
          // Log the completion
          await this.loggingService.logChatCompletion(
            startTime,
            modelId,
            messages.length,
            temperature,
            user,
            botId,
          );
          
          return new StreamingTextResponse(stream);
        }
        // TODO: Fix special handling for reasoning models
        else if (this.isReasoningModel(modelId)) {
        // For reasoning models:
        // 1. Skip system messages
        // 2. Force temperature to 1 or leave out
        // 3. Don't stream responses
        // 4. Don't specify max tokens (I think this is no longer required)
        if (promptToSend && messages.length > 0 && messages[0].role === 'user') {
          const firstUserMessage = messages[0];
          const content = firstUserMessage.content;

          // If content is a string, prepend the system prompt
          if (typeof content === 'string') {
            firstUserMessage.content = `${promptToSend}\n\n${content}`;
          } else if (Array.isArray(content)) {
            // If content is an array, add system prompt to the first text element
            const textContent = (content as any[]).find(item => item.type === 'text');
            if (textContent && 'text' in textContent) {
              textContent.text = `${promptToSend}\n\n${textContent.text}`;
            }
          }
        }

        const chatCompletionParams: ResponseCreateParamsBase = {
          model: modelId,
          input: messages as ResponseInput,
          user: JSON.stringify(user),
          stream: false
        }

        const responseData = await this.openAIClient.responses.create(chatCompletionParams);
        const response = responseData as OpenAI.Responses.Response;

        const completion = response.output_text;

        // Log regular chat completion
        await this.loggingService.logChatCompletion(
            startTime,
            modelId,
            messages.length,
            1, // Log with temperature = 1
            user,
            botId,
        );

        return new Response(
            JSON.stringify({ text: completion }),
            { headers: { 'Content-Type': 'application/json' } },
        );
      } else {
        // Normal model handling (unchanged)
        const messagesWithSystemPrompt = [
          {
            role: 'system',
            content: promptToSend || DEFAULT_SYSTEM_PROMPT,
          },
          ...(messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[]),
        ];

        const response = await this.openAIClient.chat.completions.create({
          model: modelId,
          messages:
              messagesWithSystemPrompt as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature,
          stream: streamResponse,
          user: JSON.stringify(user),
        });

        if (streamResponse) {
          const processedStream = createAzureOpenAIStreamProcessor(
              response as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
          );

          // Log regular chat completion
          await this.loggingService.logChatCompletion(
              startTime,
              modelId,
              messages.length,
              temperature,
              user,
              botId,
          );

          return new StreamingTextResponse(processedStream);
        }

        const completion = response as OpenAI.Chat.Completions.ChatCompletion;

        // Log regular chat completion
        await this.loggingService.logChatCompletion(
            startTime,
            modelId,
            messages.length,
            temperature,
            user,
            botId,
        );

        return new Response(
          JSON.stringify({ text: completion.choices[0]?.message?.content }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
      }
    } catch (error) {
      await this.loggingService.logError(
        startTime,
        error,
        modelId,
        messages.length,
        temperature,
        user,
        botId,
      );

      let statusCode = 500;
      let errorMessage = 'An error occurred while processing your request.';

      if (error instanceof OpenAI.APIError) {
        statusCode = error.status || 500;
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  public async handleRequest(req: NextRequest): Promise<Response> {
    const {
      model,
      messages,
      prompt,
      temperature,
      botId,
      stream = true,
      threadId,
    } = (await req.json()) as ChatBody;

    const encoding = await this.initTiktoken();
    const promptToSend = prompt || DEFAULT_SYSTEM_PROMPT;

    // Use fixed temperature of 1 for reasoning models, otherwise use provided temperature or default
    const temperatureToUse = this.isReasoningModel(model.id) ? 1 : (temperature ?? DEFAULT_TEMPERATURE);

    // Never stream for reasoning models, otherwise use provided stream value
    const shouldStream = this.isReasoningModel(model.id) ? false : stream;

    const needsToHandleImages: boolean = isImageConversation(messages);
    const needsToHandleFiles: boolean =
      !needsToHandleImages && isFileConversation(messages);

    const isValidModel: boolean = checkIsModelValid(model.id, OpenAIModelID);
    const isImageModel: boolean = checkIsModelValid(
      model.id,
      OpenAIVisionModelID,
    );

    let modelToUse = model.id;
    
    // Check if the model is legacy and migrate to gpt-4o
    const modelConfig = Object.values(OpenAIModels).find(m => m.id === model.id);
    if (modelConfig?.isLegacy) {
      console.log(`Migrating legacy model ${model.id} to ${OpenAIModelID.GPT_4o}`);
      modelToUse = OpenAIModelID.GPT_4o;
    }
    
    if (isValidModel && needsToHandleImages && !isImageModel) {
      modelToUse = 'gpt-4o';
    } else if (modelToUse == null || !isValidModel) {
      modelToUse = AZURE_DEPLOYMENT_ID;
    }

    const token = (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
    })) as JWT | null;
    if (!token) throw new Error('Could not pull token!');
    const session: Session | null = await auth();
    if (!session) throw new Error('Could not pull session!');

    const user = session['user'];

    const prompt_tokens = encoding.encode(promptToSend);
    const messagesToSend: Message[] = await getMessagesToSend(
      messages,
      encoding,
      prompt_tokens.length,
      model.tokenLimit,
      token,
      user,
    );
    encoding.free();

    if (needsToHandleFiles) {
      return this.handleFileConversation(
        messagesToSend,
        token,
        model.id,
        user,
        botId,
        shouldStream,
      );
    } else {
      return this.handleChatCompletion(
        modelToUse,
        messagesToSend,
        temperatureToUse,
        user,
        botId,
        shouldStream,
        promptToSend,
        model,
        threadId,
      );
    }
  }

  private isReasoningModel(id: OpenAIModelID | string) {
    return [
      OpenAIModelID.GPT_o1,
      OpenAIModelID.GPT_o1_mini,
      OpenAIModelID.GPT_o3_mini
    ].includes(id as OpenAIModelID);
  }
}
