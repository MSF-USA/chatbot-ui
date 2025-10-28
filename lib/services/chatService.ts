import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

import {
  checkIsModelValid,
  isAudioVideoConversation,
  isCustomAgentModel,
  isImageConversation,
  isReasoningModel,
} from '@/lib/utils/app/chat';
import {
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_VERSION,
} from '@/lib/utils/app/const';
import { getMessagesToSend } from '@/lib/utils/server/chat';

import { ChatBody } from '@/types/chat';
import {
  OpenAIModel,
  OpenAIModelID,
  OpenAIModels,
  OpenAIVisionModelID,
} from '@/types/openai';

import { AIFoundryAgentHandler } from './chat/AIFoundryAgentHandler';
import { FileConversationHandler } from './chat/FileConversationHandler';
import { AIFoundryAgentChatHandler } from './chat/handlers/AIFoundryAgentChatHandler';
import { ChatContext } from './chat/handlers/ChatContext';
import { ChatRequestHandler } from './chat/handlers/ChatRequestHandler';
import { ForcedAgentHandler } from './chat/handlers/ForcedAgentHandler';
import { RAGHandler } from './chat/handlers/RAGHandler';
import { ReasoningModelHandler } from './chat/handlers/ReasoningModelHandler';
import { StandardModelChatHandler } from './chat/handlers/StandardModelChatHandler';
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
import fs from 'fs';
import OpenAI, { AzureOpenAI } from 'openai';
import path from 'path';

/**
 * ChatService class for handling chat-related API operations.
 *
 * Uses Chain of Responsibility pattern to route requests to appropriate handlers.
 */
export default class ChatService {
  private azureOpenAIClient: AzureOpenAI;
  private openAIClient: OpenAI;
  private loggingService: AzureMonitorLoggingService;
  private ragService: RAGService;
  private fileHandler: FileConversationHandler;
  private agentHandler: AIFoundryAgentHandler;

  // Handler chain (sorted by priority)
  private handlers: ChatRequestHandler[];

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

    // Initialize handler chain
    // Note: Audio/video is handled as special case before handler chain (to preserve original messages)
    // Order is determined by getPriority() - lower numbers = higher priority
    this.handlers = [
      new ForcedAgentHandler(this.agentHandler),
      new RAGHandler(
        this.ragService,
        this.loggingService,
        this.azureOpenAIClient,
      ),
      new AIFoundryAgentChatHandler(this.agentHandler),
      new ReasoningModelHandler(this.azureOpenAIClient, this.loggingService),
      new StandardModelChatHandler(
        this.azureOpenAIClient,
        this.openAIClient,
        this.loggingService,
      ),
    ].sort((a, b) => a.getPriority() - b.getPriority());

    console.log(
      '[ChatService] Initialized with handler chain:',
      this.handlers
        .map((h) => `${h.getName()} (priority ${h.getPriority()})`)
        .join(', '),
    );
    console.log(
      '[ChatService] Note: Audio/video handled as special case before handler chain',
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
   * Determines if streaming should be used for this model.
   */
  private shouldStream(
    modelId: OpenAIModelID | string,
    requestedStream: boolean,
  ): boolean {
    // Reasoning models don't support streaming
    return isReasoningModel(modelId) ? false : requestedStream;
  }

  /**
   * Determines the appropriate temperature for this model.
   */
  private getTemperature(
    modelId: OpenAIModelID | string,
    requestedTemperature?: number,
  ): number {
    // Reasoning models use fixed temperature of 1
    return isReasoningModel(modelId)
      ? 1
      : (requestedTemperature ?? DEFAULT_TEMPERATURE);
  }

  /**
   * Handles incoming chat requests using Chain of Responsibility pattern.
   */
  public async handleRequest(req: NextRequest): Promise<Response> {
    const startTime = Date.now();

    try {
      // Parse request body
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
        forcedAgentType,
      } = (await req.json()) as ChatBody;

      console.log('[ChatService] Request:', {
        modelId: model.id,
        messageCount: messages.length,
        botId,
        forcedAgentType,
      });

      // Authenticate
      const session: Session | null = await auth();
      if (!session) throw new Error('Could not pull session!');
      const user = session['user'];

      // CRITICAL: Check for audio/video FIRST on ORIGINAL messages
      // This must happen before getMessagesToSend() to preserve file metadata (originalFilename)
      if (isAudioVideoConversation(messages)) {
        console.log(
          '[ChatService] Audio/video detected - routing to FileConversationHandler',
        );
        return this.fileHandler.handleFileConversation(
          messages, // Original messages, not processed!
          model.id,
          user,
          botId,
          this.shouldStream(model.id, stream),
        );
      }

      // Initialize tokenizer (only for non-audio/video requests)
      const encoding = await this.initTiktoken();

      // Determine stream and temperature settings
      const streamResponse = this.shouldStream(model.id, stream);
      const temperatureToUse = this.getTemperature(model.id, temperature);
      const promptToSend = prompt || DEFAULT_SYSTEM_PROMPT;

      // Handle image model upgrades
      const needsToHandleImages: boolean = isImageConversation(messages);
      const isCustomAgent: boolean = isCustomAgentModel(model.id);
      const isValidModel: boolean = checkIsModelValid(model.id, OpenAIModelID);
      const isImageModel: boolean = checkIsModelValid(
        model.id,
        OpenAIVisionModelID,
      );

      let modelToUse = model.id;

      if (
        isValidModel &&
        needsToHandleImages &&
        !isImageModel &&
        !isCustomAgent
      ) {
        modelToUse = 'gpt-5';
        console.log(
          `[ChatService] Image detected - upgrading from ${model.id} to ${modelToUse} for vision support`,
        );
      } else if (modelToUse == null || !isValidModel) {
        modelToUse = DEFAULT_MODEL;
        console.log(
          `[ChatService] Invalid model ${model.id} - falling back to ${modelToUse}`,
        );
      }

      // Get model configuration using the potentially upgraded model
      // For custom agents, use the model config passed in (which already has the full config)
      // For standard models, look up in OpenAIModels
      const modelConfig =
        isCustomAgent && modelToUse === model.id
          ? model
          : (Object.values(OpenAIModels).find((m) => m.id === modelToUse) as
              | OpenAIModel
              | undefined);

      if (!modelConfig) {
        throw new Error(`Model configuration not found for: ${modelToUse}`);
      }

      // Process messages through token limit filter
      const prompt_tokens = encoding.encode(promptToSend);
      const messagesToSend = await getMessagesToSend(
        messages,
        encoding,
        prompt_tokens.length,
        modelConfig.tokenLimit, // Use upgraded model's token limit
        user,
      );
      encoding.free();

      // Build context for handler chain
      const context: ChatContext = {
        messages: messagesToSend,
        model: modelConfig,
        user,
        temperature: temperatureToUse,
        systemPrompt: promptToSend,
        streamResponse,
        botId,
        threadId,
        reasoningEffort,
        verbosity,
        forcedAgentType,
      };

      // Find appropriate handler
      const handler = this.handlers.find((h) => h.canHandle(context));

      if (!handler) {
        throw new Error('No handler found for request');
      }

      console.log(`[ChatService] Routing to ${handler.getName()}`);

      // Execute handler
      return await handler.handle(context);
    } catch (error) {
      await this.loggingService.logError(
        startTime,
        error,
        'unknown',
        0,
        DEFAULT_TEMPERATURE,
        { id: 'unknown', displayName: 'unknown', mail: undefined },
        undefined,
      );

      let statusCode = 500;
      let errorMessage = 'An error occurred while processing your request.';

      if (error instanceof OpenAI.APIError) {
        statusCode = error.status || 500;
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error('[ChatService] Error:', errorMessage, error);

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
