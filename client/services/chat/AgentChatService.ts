'use client';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { apiClient } from '../api';
import { AgentChatApiRequest } from '../api/types';

/**
 * Frontend service for Azure AI Foundry Agent-based chat completions.
 *
 * Calls: POST /api/chat/agent
 *
 * Handles:
 * - Agent chat requests with Bing grounding
 * - Streaming responses (always streaming for agents)
 * - Thread management
 * - Citation extraction
 */
export class AgentChatService {
  /**
   * Sends an agent chat request and returns a streaming response.
   *
   * @param request - The agent chat request
   * @returns ReadableStream for processing response chunks
   */
  public async sendStreamingChat(
    request: AgentChatApiRequest,
  ): Promise<ReadableStream<Uint8Array>> {
    return apiClient.postStream('/api/chat/agent', request);
  }

  /**
   * Convenience method for agent chat requests.
   *
   * @param model - The model to use (must have agentId configured)
   * @param messages - The conversation messages
   * @param options - Optional parameters
   * @returns ReadableStream for processing response chunks
   */
  public async chat(
    model: OpenAIModel,
    messages: Message[],
    options?: {
      temperature?: number;
      threadId?: string;
      forcedAgentType?: string;
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
export const agentChatService = new AgentChatService();
