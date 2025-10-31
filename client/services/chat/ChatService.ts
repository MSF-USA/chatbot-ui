'use client';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { agentChatService } from './AgentChatService';
import { audioChatService } from './AudioChatService';
import { ragChatService } from './RAGChatService';
import { standardChatService } from './StandardChatService';

/**
 * Main chat service orchestrator.
 *
 * Routes chat requests to the appropriate specialized service based on:
 * - Audio/video files → AudioChatService
 * - Bot ID present → RAGChatService
 * - Azure Agent Mode ON → AgentChatService (direct AI Foundry)
 * - Search Mode ON → Tool-Aware endpoint (privacy-focused)
 * - Otherwise → StandardChatService
 *
 * This provides a unified interface while delegating to specialized implementations.
 */
export class ChatService {
  /**
   * Sends a chat request using the appropriate specialized service.
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
      stream?: boolean;
      reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
      verbosity?: 'low' | 'medium' | 'high';
      botId?: string;
      threadId?: string;
      forcedAgentType?: string;
    },
  ): Promise<ReadableStream<Uint8Array>> {
    // 1. Check for audio/video files FIRST (highest priority)
    if (audioChatService.hasAudioVideoFiles(messages)) {
      console.log('[ChatService] Routing to AudioChatService');
      return audioChatService.chat(model, messages, {
        botId: options?.botId,
      });
    }

    // 2. Check for RAG/bot requests
    if (options?.botId) {
      console.log('[ChatService] Routing to RAGChatService');
      return ragChatService.chat(model, messages, options.botId);
    }

    // 3. Check for Azure Agent Mode (direct AI Foundry routing)
    if (model.azureAgentMode && model.agentId) {
      console.log(
        '[ChatService] Routing to AgentChatService (Azure Agent Mode ON)',
      );
      return agentChatService.chat(model, messages, {
        temperature: options?.temperature,
        threadId: options?.threadId,
        botId: options?.botId,
      });
    }

    // 4. Check for Search Mode (tool-aware routing)
    if (model.searchModeEnabled || options?.forcedAgentType) {
      console.log(
        '[ChatService] Routing to Tool-Aware endpoint (Search Mode ON)',
      );
      return this.toolAwareChat(model, messages, options);
    }

    // 5. Default to standard chat
    console.log('[ChatService] Routing to StandardChatService');
    return standardChatService.chat(model, messages, {
      prompt: options?.prompt,
      temperature: options?.temperature,
      reasoningEffort: options?.reasoningEffort,
      verbosity: options?.verbosity,
      botId: options?.botId,
    });
  }

  /**
   * Sends chat request to tool-aware endpoint (search mode).
   * Uses privacy-focused routing with intelligent tool determination.
   *
   * @param model - The model to use
   * @param messages - The conversation messages
   * @param options - Optional parameters
   * @returns ReadableStream for processing response chunks
   */
  private async toolAwareChat(
    model: OpenAIModel,
    messages: Message[],
    options?: {
      prompt?: string;
      temperature?: number;
      stream?: boolean;
      reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
      verbosity?: 'low' | 'medium' | 'high';
      botId?: string;
      threadId?: string;
      forcedAgentType?: string;
    },
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch('/api/chat/tool-aware', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        prompt: options?.prompt,
        temperature: options?.temperature,
        stream: options?.stream ?? true,
        minimizeAIFoundryUse: true, // Always use privacy mode for search
        reasoningEffort: options?.reasoningEffort,
        verbosity: options?.verbosity,
        botId: options?.botId,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Tool-aware chat request failed: ${response.statusText}`);
    }

    return response.body;
  }

  /**
   * Determines which service would handle a given request.
   *
   * Useful for debugging and testing.
   *
   * @param model - The model to use
   * @param messages - The conversation messages
   * @param options - Optional parameters
   * @returns The service name that would handle this request
   */
  public getServiceForRequest(
    model: OpenAIModel,
    messages: Message[],
    options?: {
      botId?: string;
      forcedAgentType?: string;
    },
  ): 'audio' | 'rag' | 'agent' | 'standard' {
    if (audioChatService.hasAudioVideoFiles(messages)) {
      return 'audio';
    }

    if (options?.botId) {
      return 'rag';
    }

    const modelConfig = model as unknown as Record<string, unknown>;
    if (modelConfig.agentId || options?.forcedAgentType) {
      return 'agent';
    }

    return 'standard';
  }
}

// Export singleton instance
export const chatService = new ChatService();
