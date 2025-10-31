'use client';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { apiClient } from '../api';
import { ChatApiResponse, RAGChatApiRequest } from '../api/types';

/**
 * Frontend service for RAG (Retrieval Augmented Generation) chat completions.
 *
 * Calls: POST /api/chat/rag
 *
 * Handles:
 * - RAG chat requests with knowledge bases
 * - Streaming responses
 * - Non-streaming responses
 */
export class RAGChatService {
  /**
   * Sends a RAG chat request and returns a streaming response.
   *
   * @param request - The RAG chat request
   * @returns ReadableStream for processing response chunks
   */
  public async sendStreamingChat(
    request: Omit<RAGChatApiRequest, 'stream'>,
  ): Promise<ReadableStream<Uint8Array>> {
    return apiClient.postStream('/api/chat/rag', {
      ...request,
      stream: true,
    });
  }

  /**
   * Sends a RAG chat request and returns a complete response.
   *
   * @param request - The RAG chat request
   * @returns The complete chat response
   */
  public async sendChat(
    request: Omit<RAGChatApiRequest, 'stream'>,
  ): Promise<ChatApiResponse> {
    return apiClient.post<ChatApiResponse>('/api/chat/rag', {
      ...request,
      stream: false,
    });
  }

  /**
   * Convenience method for RAG chat requests.
   *
   * @param model - The model to use
   * @param messages - The conversation messages
   * @param botId - The bot/knowledge base ID
   * @returns ReadableStream for processing response chunks
   */
  public async chat(
    model: OpenAIModel,
    messages: Message[],
    botId: string,
  ): Promise<ReadableStream<Uint8Array>> {
    return this.sendStreamingChat({
      model,
      messages,
      botId,
    });
  }
}

// Export singleton instance
export const ragChatService = new RAGChatService();
