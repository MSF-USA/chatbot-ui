import { AzureMonitorLoggingService } from '@/lib/services/loggingService';

import { isReasoningModel } from '@/lib/utils/app/chat';

import { OpenAIModelID } from '@/types/openai';

import { ChatContext } from './ChatContext';
import { ChatRequestHandler } from './ChatRequestHandler';

import { AzureOpenAI } from 'openai';
import {
  ResponseCreateParamsBase,
  ResponseInput,
} from 'openai/resources/responses/responses';

/**
 * Handles reasoning models that use Azure's special Responses API.
 *
 * Priority: 5
 * Models: o3, DeepSeek-R1
 */
export class ReasoningModelHandler implements ChatRequestHandler {
  private azureOpenAIClient: AzureOpenAI;
  private loggingService: AzureMonitorLoggingService;

  constructor(
    azureOpenAIClient: AzureOpenAI,
    loggingService: AzureMonitorLoggingService,
  ) {
    this.azureOpenAIClient = azureOpenAIClient;
    this.loggingService = loggingService;
  }

  canHandle(context: ChatContext): boolean {
    return isReasoningModel(context.model.id);
  }

  async handle(context: ChatContext): Promise<Response> {
    console.log(
      `[ReasoningModelHandler] Handling reasoning model: ${context.model.id}`,
    );

    const startTime = Date.now();

    // For reasoning models, merge system prompt into first user message
    const messages = [...context.messages];
    if (
      context.systemPrompt &&
      messages.length > 0 &&
      messages[0].role === 'user'
    ) {
      const firstUserMessage = messages[0];
      const content = firstUserMessage.content;

      // If content is a string, prepend the system prompt
      if (typeof content === 'string') {
        firstUserMessage.content = `${context.systemPrompt}\n\n${content}`;
      } else if (Array.isArray(content)) {
        // If content is an array, add system prompt to the first text element
        const textContent = (content as any[]).find(
          (item) => item.type === 'text',
        );
        if (textContent && 'text' in textContent) {
          textContent.text = `${context.systemPrompt}\n\n${textContent.text}`;
        }
      }
    }

    // Build request for Responses API
    const request: ResponseCreateParamsBase = {
      model: context.model.id,
      input: messages as ResponseInput,
      user: context.user.mail || context.user.displayName || 'unknown',
      stream: true, // Enable streaming for reasoning models
    };

    // Create response using Azure Responses API
    const response = await this.azureOpenAIClient.responses.create(request);

    // Process the stream
    const { createAzureOpenAIStreamProcessor } = await import(
      '@/lib/utils/app/streamProcessor'
    );
    const processedStream = createAzureOpenAIStreamProcessor(
      response as AsyncIterable<any>,
    );

    // Log completion
    await this.loggingService.logChatCompletion(
      startTime,
      context.model.id,
      context.messages.length,
      1, // Reasoning models use temperature = 1
      context.user,
      context.botId,
    );

    // Return streaming response
    return new Response(processedStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  getPriority(): number {
    return 5;
  }

  getName(): string {
    return 'ReasoningModelHandler';
  }
}
