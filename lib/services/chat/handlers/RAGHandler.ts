import { AzureMonitorLoggingService } from '@/lib/services/loggingService';
import { RAGService } from '@/lib/services/ragService';

import { bots } from '@/types/bots';

import { ChatContext } from './ChatContext';
import { ChatRequestHandler } from './ChatRequestHandler';

import { AzureOpenAI } from 'openai';

/**
 * Handles RAG (Retrieval Augmented Generation) / Bot-augmented chat.
 *
 * Priority: 3
 * When a bot/knowledge base is selected for the conversation.
 */
export class RAGHandler implements ChatRequestHandler {
  private ragService: RAGService;
  private loggingService: AzureMonitorLoggingService;
  private azureOpenAIClient: AzureOpenAI;

  constructor(
    ragService: RAGService,
    loggingService: AzureMonitorLoggingService,
    azureOpenAIClient: AzureOpenAI,
  ) {
    this.ragService = ragService;
    this.loggingService = loggingService;
    this.azureOpenAIClient = azureOpenAIClient;
  }

  canHandle(context: ChatContext): boolean {
    return !!context.botId;
  }

  async handle(context: ChatContext): Promise<Response> {
    console.log(`[RAGHandler] Handling RAG chat with botId: ${context.botId}`);

    const bot = bots.find((bot) => bot.id === context.botId);

    if (!bot) {
      throw new Error(`Bot not found: ${context.botId}`);
    }

    console.log(`[RAGHandler] Using bot: ${bot.name} (${bot.id})`);

    // Use RAGService to augment messages with search results
    const response = await this.ragService.augmentMessages(
      context.messages,
      context.botId!,
      bots,
      context.model.id,
      context.streamResponse,
      context.user,
    );

    // Return appropriate response format
    if (context.streamResponse) {
      return new Response(response as ReadableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      const completionText = (response as any)?.choices?.[0]?.message?.content;
      return new Response(JSON.stringify({ text: completionText }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  getPriority(): number {
    return 3;
  }

  getName(): string {
    return 'RAGHandler';
  }
}
