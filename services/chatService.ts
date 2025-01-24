import { JWT, Session } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';

import {
  checkIsModelValid,
  isFileConversation,
  isImageConversation,
} from '@/utils/app/chat';
import {
  APIM_CHAT_ENDPONT,
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST,
  OPENAI_API_VERSION,
} from '@/utils/app/const';
import { parseAndQueryFileOpenAI } from '@/utils/app/documentSummary';
import { getEnvVariable } from '@/utils/app/env';
import {
  StreamProcessingResult,
  createAzureOpenAIStreamProcessor,
} from '@/utils/app/streamProcessor';
import { AzureBlobStorage, BlobProperty } from '@/utils/server/blob';
import { getMessagesToSend } from '@/utils/server/chat';

import { bots } from '@/types/bots';
import { MessageType } from '@/types/chat';
import {
  ChatBody,
  FileMessageContent,
  Message,
  TextMessageContent,
} from '@/types/chat';
import { OpenAIModelID, OpenAIVisionModelID } from '@/types/openai';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

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
import { Stream } from 'openai/streaming';
import path from 'path';

interface RAGResponse {
  answer: string;
  metadata: {
    dateRange: DateRange;
    resultCount: number;
    citations: Array<{
      content: string;
      title: string;
      date: string;
      url: string;
      number: number;
    }>;
    sources_used: number;
  };
}

interface DateRange {
  newest: string | null;
  oldest: string | null;
}

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
      apiVersion: '2024-08-01-preview',
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

  /**
   * Retrieves the OpenAI API arguments based on the provided token and model.
   * @param {JWT} token - The JWT token for authentication.
   * @param {string} modelToUse - The ID of the model to use.
   * @returns {Promise<any>} A promise that resolves to the OpenAI API arguments.
   */
  private async getOpenAIArgs(token: JWT, modelToUse: string): Promise<any> {
    const openAIArgs: any = {
      baseURL: `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${modelToUse}`,
      defaultQuery: { 'api-version': OPENAI_API_VERSION },
      defaultHeaders: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
      apiVersion: OPENAI_API_VERSION,
    };

    if (process.env.OPENAI_API_KEY)
      openAIArgs.apiKey = process.env.OPENAI_API_KEY;
    else openAIArgs.apiKey = '';

    return openAIArgs;
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
    streamResponse: boolean, // Added this parameter
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
          stream: streamResponse, // Pass streamResponse parameter
        });

        console.log('File summarized successfully.');

        if (streamResponse) {
          const { stream } = result as StreamProcessingResult;
          return new StreamingTextResponse(stream);
        } else {
          const responseText = result as string;
          return new Response(JSON.stringify({ text: responseText }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.error('Error processing the file:', error);

        const endTime = Date.now();
        const duration = endTime - startTime;

        await this.loggingService.log({
          EventType: 'FileConversationError',
          Status: 'error',
          ModelUsed: modelId,
          UserId: user.id,
          UserJobTitle: user.jobTitle,
          UserDisplayName: user.displayName,
          UserGivenName: user.givenName,
          UserSurName: user.surName,
          UserDepartment: user.department,
          UserEmail: user.mail,
          UserCompanyName: user.companyName,
          FileUpload: true,
          FileName: filename,
          FileSize: fileBuffer ? fileBuffer.length : undefined,
          Duration: duration,
          ErrorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          ErrorStack: error instanceof Error ? error.stack : undefined,
        });

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

  private async handleError(
    error: any,
    user: Session['user'],
    modelId: string,
    messages: Message[],
    temperature: number,
    botId?: string,
  ): Promise<Response> {
    console.error('Error in chat completion:', error);

    let statusCode = 500;
    let errorMessage = 'An error occurred while processing your request.';

    if (error instanceof OpenAI.APIError) {
      statusCode = error.status || 500;
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    await this.loggingService.log({
      EventType: 'ChatCompletion',
      Status: 'error',
      ModelUsed: modelId,
      MessageCount: messages.length,
      Temperature: temperature,
      UserId: user.id,
      BotId: botId,
      ErrorMessage: errorMessage,
      StatusCode: statusCode,
    });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async handleChatCompletion(
    modelId: string,
    messages: Message[],
    temperature: number,
    user: Session['user'],
    botId?: string,
    streamResponse: boolean = true,
  ): Promise<Response> {
    try {
      if (botId) {
        const response = await this.ragService.augmentMessages(
          messages,
          botId,
          bots,
          modelId,
          streamResponse,
        );

        if (streamResponse) {
          const streamResponseIterable =
            response as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
          const { stream } = createAzureOpenAIStreamProcessor(
            streamResponseIterable,
            true,
          );
          return new StreamingTextResponse(stream);
        } else {
          const { answer, metadata } = response as {
            answer: string;
            metadata: any;
          };
          return new Response(JSON.stringify({ text: answer, metadata }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else {
        const response = await this.openAIClient.chat.completions.create({
          model: modelId,
          messages:
            messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature,
          stream: streamResponse,
          user: JSON.stringify(user),
        });

        if (streamResponse) {
          const { stream } = createAzureOpenAIStreamProcessor(
            response as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
            false,
          );
          return new StreamingTextResponse(stream);
        }

        const completion = response as OpenAI.Chat.Completions.ChatCompletion;
        return new Response(
          JSON.stringify({ text: completion.choices[0]?.message?.content }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
    } catch (error) {
      return this.handleError(
        error,
        user,
        modelId,
        messages,
        temperature,
        botId,
      );
    }
  }

  /**
   * Handles an incoming request by processing the chat body and returning an appropriate response.
   * @param {NextRequest} req - The incoming Next.js request.
   * @returns {Promise<Response>} A promise that resolves to the response based on the request.
   */
  public async handleRequest(req: NextRequest): Promise<Response> {
    const {
      model,
      messages,
      prompt,
      temperature,
      botId,
      stream = true, // Extract stream parameter (default to true)
    } = (await req.json()) as ChatBody;

    const encoding = await this.initTiktoken();
    const promptToSend = prompt || DEFAULT_SYSTEM_PROMPT;
    const temperatureToUse = temperature ?? DEFAULT_TEMPERATURE;

    const needsToHandleImages: boolean = isImageConversation(messages);
    const needsToHandleFiles: boolean =
      !needsToHandleImages && isFileConversation(messages);

    const isValidModel: boolean = checkIsModelValid(model.id, OpenAIModelID);
    const isImageModel: boolean = checkIsModelValid(
      model.id,
      OpenAIVisionModelID,
    );

    let modelToUse = model.id;
    if (isValidModel && needsToHandleImages && !isImageModel) {
      modelToUse = 'gpt-4o';
    } else if (modelToUse == null || !isValidModel) {
      modelToUse = AZURE_DEPLOYMENT_ID;
    }

    const token = (await getToken({ req })) as JWT | null;
    if (!token) throw new Error('Could not pull token!');
    const session: Session | null = await getServerSession(authOptions as any);
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
        stream, // Pass stream parameter
      );
    } else {
      return this.handleChatCompletion(
        modelToUse,
        messagesToSend,
        temperatureToUse,
        user,
        botId,
        stream, // Pass stream parameter
      );
    }
  }
}
