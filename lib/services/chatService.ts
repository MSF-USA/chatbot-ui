import { Session } from 'next-auth';
import { JWT, getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

import {
  checkIsModelValid,
  isFileConversation,
  isImageConversation,
} from '@/lib/utils/app/chat';
import {
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_VERSION,
} from '@/lib/utils/app/const';
import { createAzureOpenAIStreamProcessor } from '@/lib/utils/app/streamProcessor';
import { getMessagesToSend } from '@/lib/utils/server/chat';

import { bots } from '@/types/bots';
import { ChatBody, Message } from '@/types/chat';
import {
  OpenAIModel,
  OpenAIModelID,
  OpenAIModels,
  OpenAIVisionModelID,
} from '@/types/openai';

import { AIFoundryAgentHandler } from './chat/AIFoundryAgentHandler';
import { FileConversationHandler } from './chat/FileConversationHandler';
import { HandlerFactory } from './chat/handlers/HandlerFactory';
import { ModelHandler } from './chat/handlers/ModelHandler';
import { AzureMonitorLoggingService } from './loggingService';
import { RAGService } from './ragService';

import { auth } from '@/auth';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import '@azure/openai/types';
import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import { StreamingTextResponse } from 'ai';
import fs from 'fs';
import OpenAI, { AzureOpenAI } from 'openai';
import { ChatCompletion } from 'openai/resources';
import {
  ResponseCreateParamsBase,
  ResponseInput,
} from 'openai/resources/responses/responses';
import path from 'path';

/**
 * ChatService class for handling chat-related API operations.
 */
export default class ChatService {
  private azureOpenAIClient: AzureOpenAI;
  private openAIClient: OpenAI;
  private loggingService: AzureMonitorLoggingService;
  private ragService: RAGService;
  private fileHandler: FileConversationHandler;
  private agentHandler: AIFoundryAgentHandler;

  constructor() {
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      'https://cognitiveservices.azure.com/.default',
    );

    // Azure OpenAI client for GPT models
    this.azureOpenAIClient = new AzureOpenAI({
      azureADTokenProvider,
      apiVersion: OPENAI_API_VERSION,
    });

    // Standard OpenAI client for Grok/DeepSeek models via AI Foundry endpoint
    this.openAIClient = new OpenAI({
      baseURL:
        process.env.AZURE_AI_FOUNDRY_OPENAI_ENDPOINT ||
        `${process.env.AZURE_AI_FOUNDRY_ENDPOINT?.replace('/api/projects/default', '')}/openai/v1/`,
      apiKey: process.env.OPENAI_API_KEY,
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
      this.azureOpenAIClient,
    );

    this.fileHandler = new FileConversationHandler(this.loggingService);
    this.agentHandler = new AIFoundryAgentHandler(this.loggingService);
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
   * Handles chat completion with different strategies based on model configuration.
   * Uses Strategy Pattern with specialized handlers for different model providers.
   */
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
    reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high',
    verbosity?: 'low' | 'medium' | 'high',
  ): Promise<Response> {
    const startTime = Date.now();

    // Debug logging
    console.log('=== handleChatCompletion Debug ===');
    console.log('modelId:', modelId);
    console.log('Handler:', HandlerFactory.getHandlerName(modelConfig as any));
    console.log('agentEnabled:', modelConfig?.agentEnabled);
    console.log('===================================');

    try {
      // Strategy 1: RAG/Bot flow
      if (botId) {
        return await this.handleBotChat(
          messages,
          botId,
          modelId,
          streamResponse,
          user,
          startTime,
          temperature,
        );
      }

      // Strategy 2: AI Foundry Agent flow (GPT-4.1 with agentEnabled)
      if (modelConfig?.agentEnabled && modelConfig?.agentId) {
        return await this.agentHandler.handleAgentChat(
          modelId,
          modelConfig,
          messages,
          temperature,
          user,
          botId,
          threadId,
        );
      }

      // Strategy 3: Reasoning model flow (uses special Responses API)
      if (this.isReasoningModel(modelId)) {
        return await this.handleReasoningModel(
          modelId,
          messages,
          user,
          promptToSend,
          startTime,
          botId,
        );
      }

      // Strategy 4: Standard chat flow using provider-specific handlers
      const model = modelConfig as unknown as OpenAIModel;
      return await this.handleModelChat(
        modelId,
        messages,
        temperature,
        user,
        botId,
        streamResponse,
        promptToSend,
        startTime,
        model,
        reasoningEffort,
        verbosity,
      );
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

  /**
   * Handles RAG/bot-augmented chat
   */
  private async handleBotChat(
    messages: Message[],
    botId: string,
    modelId: string,
    streamResponse: boolean,
    user: Session['user'],
    startTime: number,
    temperature: number,
  ): Promise<Response> {
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
      const completionText = (response as ChatCompletion)?.choices?.[0]?.message
        ?.content;
      return new Response(JSON.stringify({ text: completionText }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handles reasoning model chat (o1, o3-mini, etc.)
   */
  private async handleReasoningModel(
    modelId: string,
    messages: Message[],
    user: Session['user'],
    promptToSend: string | undefined,
    startTime: number,
    botId: string | undefined,
  ): Promise<Response> {
    // For reasoning models:
    // 1. Skip system messages
    // 2. Force temperature to 1 or leave out
    // 3. Don't stream responses
    if (promptToSend && messages.length > 0 && messages[0].role === 'user') {
      const firstUserMessage = messages[0];
      const content = firstUserMessage.content;

      // If content is a string, prepend the system prompt
      if (typeof content === 'string') {
        firstUserMessage.content = `${promptToSend}\n\n${content}`;
      } else if (Array.isArray(content)) {
        // If content is an array, add system prompt to the first text element
        const textContent = (content as any[]).find(
          (item) => item.type === 'text',
        );
        if (textContent && 'text' in textContent) {
          textContent.text = `${promptToSend}\n\n${textContent.text}`;
        }
      }
    }

    const chatCompletionParams: ResponseCreateParamsBase = {
      model: modelId,
      input: messages as ResponseInput,
      user: JSON.stringify(user),
      stream: false,
    };

    const responseData =
      await this.azureOpenAIClient.responses.create(chatCompletionParams);
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

    return new Response(JSON.stringify({ text: completion }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handles chat completion using provider-specific handlers.
   * Uses HandlerFactory to select appropriate handler (Azure, DeepSeek, or Standard).
   */
  private async handleModelChat(
    modelId: string,
    messages: Message[],
    temperature: number,
    user: Session['user'],
    botId: string | undefined,
    streamResponse: boolean,
    promptToSend: string | undefined,
    startTime: number,
    modelConfig: OpenAIModel,
    reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high',
    verbosity?: 'low' | 'medium' | 'high',
  ): Promise<Response> {
    // Get the appropriate handler for this model
    const handler: ModelHandler = HandlerFactory.getHandler(
      modelConfig,
      this.azureOpenAIClient,
      this.openAIClient,
      this.loggingService,
    );

    // Let the handler prepare messages (handles DeepSeek system prompt merging, etc.)
    const preparedMessages = handler.prepareMessages(
      messages,
      promptToSend,
      modelConfig,
    );

    // Let the handler build request parameters (handles reasoning_effort, verbosity, etc.)
    const requestParams = handler.buildRequestParams(
      modelId,
      preparedMessages,
      temperature,
      user,
      streamResponse,
      modelConfig,
      reasoningEffort,
      verbosity,
    );

    // Execute the request
    const response = await handler.executeRequest(
      requestParams,
      streamResponse,
    );

    // Process and return response
    return await this.processResponse(
      response,
      streamResponse,
      startTime,
      modelId,
      messages.length,
      temperature,
      user,
      botId,
    );
  }

  /**
   * Process response from any handler (Azure or OpenAI SDK)
   */
  private async processResponse(
    response: any,
    streamResponse: boolean,
    startTime: number,
    modelId: string,
    messageCount: number,
    temperature: number,
    user: Session['user'],
    botId: string | undefined,
  ): Promise<Response> {
    if (streamResponse) {
      const processedStream = createAzureOpenAIStreamProcessor(
        response as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
      );

      // Log chat completion
      await this.loggingService.logChatCompletion(
        startTime,
        modelId,
        messageCount,
        temperature,
        user,
        botId,
      );

      return new StreamingTextResponse(processedStream);
    }

    const completion = response as OpenAI.Chat.Completions.ChatCompletion;

    // Log chat completion
    await this.loggingService.logChatCompletion(
      startTime,
      modelId,
      messageCount,
      temperature,
      user,
      botId,
    );

    return new Response(
      JSON.stringify({ text: completion.choices[0]?.message?.content }),
      { headers: { 'Content-Type': 'application/json' } },
    );
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
      reasoningEffort,
      verbosity,
    } = (await req.json()) as ChatBody;

    const encoding = await this.initTiktoken();
    const promptToSend = prompt || DEFAULT_SYSTEM_PROMPT;

    // Use fixed temperature of 1 for reasoning models, otherwise use provided temperature or default
    const temperatureToUse = this.isReasoningModel(model.id)
      ? 1
      : (temperature ?? DEFAULT_TEMPERATURE);

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

    // Check if the model is legacy and migrate to gpt-5
    const modelConfig = Object.values(OpenAIModels).find(
      (m) => m.id === model.id,
    );
    if (modelConfig?.isLegacy) {
      console.log(
        `Migrating legacy model ${model.id} to ${OpenAIModelID.GPT_5}`,
      );
      modelToUse = OpenAIModelID.GPT_5;
    }

    if (isValidModel && needsToHandleImages && !isImageModel) {
      modelToUse = 'gpt-5';
    } else if (modelToUse == null || !isValidModel) {
      modelToUse = DEFAULT_MODEL;
    }

    const token = (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
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
      return this.fileHandler.handleFileConversation(
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
        model as unknown as Record<string, unknown>,
        threadId,
        reasoningEffort,
        verbosity,
      );
    }
  }

  private isReasoningModel(id: OpenAIModelID | string): boolean {
    // This function is for models that use the special Azure responses.create() API
    // and require non-streaming mode with temperature=1
    const reasoningModels: OpenAIModelID[] = [
      // OpenAIModelID.GPT_o3, // o3 uses standard chat completions API
      // OpenAIModelID.GROK_4_FAST_REASONING // Grok 4 supports streaming like DeepSeek-R1
    ];
    return reasoningModels.includes(id as OpenAIModelID);
  }
}
