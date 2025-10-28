import { AzureMonitorLoggingService } from '@/lib/services/loggingService';

import { createAzureOpenAIStreamProcessor } from '@/lib/utils/app/streamProcessor';

import { ChatContext } from './ChatContext';
import { ChatRequestHandler } from './ChatRequestHandler';
import { HandlerFactory } from './HandlerFactory';

import OpenAI, { AzureOpenAI } from 'openai';

/**
 * Handles standard model chat using provider-specific handlers.
 *
 * Priority: 99 (Lowest - Fallback)
 * Accepts all requests that don't match specialized handlers.
 *
 * Uses HandlerFactory to select the appropriate ModelHandler:
 * - AzureOpenAIHandler (GPT-5, o3, GPT-4.1 non-agent)
 * - DeepSeekHandler (DeepSeek-R1, V3.1)
 * - StandardOpenAIHandler (Grok, Llama, etc.)
 */
export class StandardModelChatHandler implements ChatRequestHandler {
  private azureOpenAIClient: AzureOpenAI;
  private openAIClient: OpenAI;
  private loggingService: AzureMonitorLoggingService;

  constructor(
    azureOpenAIClient: AzureOpenAI,
    openAIClient: OpenAI,
    loggingService: AzureMonitorLoggingService,
  ) {
    this.azureOpenAIClient = azureOpenAIClient;
    this.openAIClient = openAIClient;
    this.loggingService = loggingService;
  }

  canHandle(context: ChatContext): boolean {
    return true; // Fallback handler - accepts everything
  }

  async handle(context: ChatContext): Promise<Response> {
    const handlerName = HandlerFactory.getHandlerName(context.model);
    console.log(
      `[StandardModelChatHandler] Using ${handlerName} for model: ${context.model.id}`,
    );

    const startTime = Date.now();

    // Get appropriate handler for this model
    const handler = HandlerFactory.getHandler(
      context.model,
      this.azureOpenAIClient,
      this.openAIClient,
      this.loggingService,
    );

    // Prepare messages using handler-specific logic
    const preparedMessages = handler.prepareMessages(
      context.messages,
      context.systemPrompt,
      context.model,
    );

    // Build request parameters
    const requestParams = handler.buildRequestParams(
      handler.getModelIdForRequest(context.model.id, context.model),
      preparedMessages,
      context.temperature,
      context.user,
      context.streamResponse,
      context.model,
      context.reasoningEffort,
      context.verbosity,
    );

    // Execute request
    const response = await handler.executeRequest(
      requestParams,
      context.streamResponse,
    );

    // Process response
    if (context.streamResponse) {
      const processedStream = createAzureOpenAIStreamProcessor(
        response as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
      );

      // Log chat completion
      await this.loggingService.logChatCompletion(
        startTime,
        context.model.id,
        context.messages.length,
        context.temperature,
        context.user,
        context.botId,
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

      // Log chat completion
      await this.loggingService.logChatCompletion(
        startTime,
        context.model.id,
        context.messages.length,
        context.temperature,
        context.user,
        context.botId,
      );

      return new Response(
        JSON.stringify({ text: completion.choices[0]?.message?.content }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  getPriority(): number {
    return 99; // Lowest priority - fallback handler
  }

  getName(): string {
    return 'StandardModelChatHandler';
  }
}
