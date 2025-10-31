import { Session } from 'next-auth';

import { Bot } from '@/types/bots';
import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { RAGService } from '../ragService';
import { ChatLogger } from '../shared';

import { AzureOpenAI } from 'openai';

/**
 * Request parameters for RAG chat.
 */
export interface RAGChatRequest {
  messages: Message[];
  model: OpenAIModel;
  user: Session['user'];
  botId: string;
  bots: Bot[];
  stream?: boolean;
}

/**
 * Service responsible for handling RAG (Retrieval Augmented Generation) chat completions.
 *
 * Handles:
 * - Bot validation
 * - Knowledge base retrieval via Azure AI Search
 * - Message augmentation with search results
 * - Streaming and non-streaming responses
 * - Logging
 *
 * Uses dependency injection for all dependencies.
 */
export class RAGChatService {
  private ragService: RAGService;
  private logger: ChatLogger;
  private azureOpenAIClient: AzureOpenAI;

  constructor(
    ragService: RAGService,
    logger: ChatLogger,
    azureOpenAIClient: AzureOpenAI,
  ) {
    this.ragService = ragService;
    this.logger = logger;
    this.azureOpenAIClient = azureOpenAIClient;
  }

  /**
   * Handles a RAG chat request.
   *
   * @param request - The RAG chat request parameters
   * @returns Response with streaming or JSON content
   */
  public async handleChat(request: RAGChatRequest): Promise<Response> {
    const startTime = Date.now();

    try {
      // Validate bot exists
      const bot = request.bots.find((b) => b.id === request.botId);
      if (!bot) {
        throw new Error(`Bot not found: ${request.botId}`);
      }

      console.log(`[RAGChatService] Using bot: ${bot.name} (${bot.id})`);

      const streamResponse = request.stream ?? true;

      // Use RAGService to augment messages with search results
      const response = await this.ragService.augmentMessages(
        request.messages,
        request.botId,
        request.bots,
        request.model.id,
        streamResponse,
        request.user,
      );

      // Log completion (RAG service logs internally, but we log here too for consistency)
      const duration = Date.now() - startTime;
      console.log(
        `[RAGChatService] RAG completion in ${duration}ms for bot ${bot.name}`,
      );

      // Return appropriate response format
      if (streamResponse) {
        return new Response(response as ReadableStream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      } else {
        const completionText = (response as any)?.choices?.[0]?.message
          ?.content;
        return new Response(JSON.stringify({ text: completionText }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      // Log error
      await this.logger.logError(
        startTime,
        error,
        request.model.id,
        request.messages.length,
        1, // Default temperature for RAG
        request.user,
        request.botId,
      );

      throw error;
    }
  }
}
