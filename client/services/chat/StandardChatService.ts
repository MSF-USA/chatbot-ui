'use client';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { apiClient } from '../api';
import { ChatApiResponse, StandardChatApiRequest } from '../api/types';

/**
 * Frontend service for standard (non-RAG, non-agent) chat completions.
 *
 * Calls: POST /api/chat/standard
 *
 * Handles:
 * - Standard chat requests
 * - Streaming responses
 * - Non-streaming responses
 */
export class StandardChatService {
  /**
   * Sends a chat request and returns a streaming response.
   *
   * @param request - The chat request
   * @returns ReadableStream for processing response chunks
   */
  public async sendStreamingChat(
    request: Omit<StandardChatApiRequest, 'stream'>,
  ): Promise<ReadableStream<Uint8Array>> {
    return apiClient.postStream('/api/chat/standard', {
      ...request,
      stream: true,
    });
  }

  /**
   * Sends a chat request and returns a complete response.
   *
   * @param request - The chat request
   * @returns The complete chat response
   */
  public async sendChat(
    request: Omit<StandardChatApiRequest, 'stream'>,
  ): Promise<ChatApiResponse> {
    return apiClient.post<ChatApiResponse>('/api/chat/standard', {
      ...request,
      stream: false,
    });
  }

  /**
   * Convenience method for simple chat requests.
   *
   * @param model - The model to use
   * @param messages - The conversation messages
   * @param options - Optional parameters
   * @returns ReadableStream for processing response chunks
   */
  public async chat(
    model: OpenAIModel,
    messages: Message[],
    options?: {
      prompt?: string;
      temperature?: number;
      reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
      verbosity?: 'low' | 'medium' | 'high';
      botId?: string;
    },
  ): Promise<ReadableStream<Uint8Array>> {
    return this.sendStreamingChat({
      model,
      messages,
      ...options,
    });
  }
}

// Export singleton instance
export const standardChatService = new StandardChatService();
