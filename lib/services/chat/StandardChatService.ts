import { Session } from 'next-auth';

import { createAzureOpenAIStreamProcessor } from '@/lib/utils/app/stream/streamProcessor';
import { getMessagesToSend } from '@/lib/utils/server/chat';

import { Message } from '@/types/chat';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';

import {
  ChatLogger,
  ModelSelector,
  StreamingService,
  ToneService,
} from '../shared';
import { HandlerFactory } from './handlers/HandlerFactory';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import fs from 'fs';
import OpenAI, { AzureOpenAI } from 'openai';
import path from 'path';

/**
 * Request parameters for standard chat.
 */
export interface StandardChatRequest {
  messages: Message[];
  model: OpenAIModel;
  user: Session['user'];
  systemPrompt: string;
  temperature?: number;
  stream?: boolean;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
  botId?: string;
}

/**
 * Service responsible for handling standard (non-RAG, non-agent) chat completions.
 *
 * Handles:
 * - Model selection and validation
 * - Tone application
 * - Message preparation with token limits
 * - Provider-specific request execution (Azure OpenAI, DeepSeek, etc.)
 * - Streaming and non-streaming responses
 * - Logging
 *
 * Uses dependency injection for all dependencies.
 */
export class StandardChatService {
  private azureOpenAIClient: AzureOpenAI;
  private openAIClient: OpenAI;
  private logger: ChatLogger;
  private modelSelector: ModelSelector;
  private toneService: ToneService;
  private streamingService: StreamingService;

  constructor(
    azureOpenAIClient: AzureOpenAI,
    openAIClient: OpenAI,
    logger: ChatLogger,
    modelSelector: ModelSelector,
    toneService: ToneService,
    streamingService: StreamingService,
  ) {
    this.azureOpenAIClient = azureOpenAIClient;
    this.openAIClient = openAIClient;
    this.logger = logger;
    this.modelSelector = modelSelector;
    this.toneService = toneService;
    this.streamingService = streamingService;
  }

  /**
   * Handles a standard chat request.
   *
   * @param request - The chat request parameters
   * @returns Response with streaming or JSON content
   */
  public async handleChat(request: StandardChatRequest): Promise<Response> {
    const startTime = Date.now();

    try {
      // Select appropriate model (may upgrade for images, validate, etc.)
      const { modelId, modelConfig } = this.modelSelector.selectModel(
        request.model,
        request.messages,
      );

      // Apply tone to system prompt if specified
      const enhancedPrompt = this.toneService.applyTone(
        request.messages,
        request.systemPrompt,
        request.user.id,
      );

      // Determine streaming and temperature based on model
      const { stream, temperature } = this.streamingService.getStreamConfig(
        modelId,
        request.stream ?? true,
        request.temperature,
      );

      // Prepare messages with token limit filtering
      const encoding = await this.initTiktoken();
      const promptTokens = encoding.encode(enhancedPrompt);
      const messagesToSend = await getMessagesToSend(
        request.messages,
        encoding,
        promptTokens.length,
        modelConfig.tokenLimit,
        request.user,
      );
      encoding.free();

      // Get appropriate handler for this model
      const handler = HandlerFactory.getHandler(
        modelConfig,
        this.azureOpenAIClient,
        this.openAIClient,
        this.logger,
      );

      console.log(
        `[StandardChatService] Using ${HandlerFactory.getHandlerName(modelConfig)} for model: ${modelId}`,
      );

      // Prepare messages using handler-specific logic
      const preparedMessages = handler.prepareMessages(
        messagesToSend,
        enhancedPrompt,
        modelConfig,
      );

      // Build request parameters
      const requestParams = handler.buildRequestParams(
        handler.getModelIdForRequest(modelId, modelConfig),
        preparedMessages,
        temperature,
        request.user,
        stream,
        modelConfig,
        request.reasoningEffort,
        request.verbosity,
      );

      // Execute request
      const response = await handler.executeRequest(requestParams, stream);

      // Log chat completion
      await this.logger.logChatCompletion(
        startTime,
        modelId,
        messagesToSend.length,
        temperature,
        request.user,
        request.botId,
      );

      // Return appropriate response format
      if (stream) {
        const processedStream = createAzureOpenAIStreamProcessor(
          response as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
        );

        return new Response(processedStream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      } else {
        const completion = response as OpenAI.Chat.Completions.ChatCompletion;

        return new Response(
          JSON.stringify({ text: completion.choices[0]?.message?.content }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
    } catch (error) {
      // Log error
      await this.logger.logError(
        startTime,
        error,
        request.model.id,
        request.messages.length,
        request.temperature ?? 1,
        request.user,
        request.botId,
      );

      throw error;
    }
  }

  /**
   * Initializes the Tiktoken tokenizer.
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
}
