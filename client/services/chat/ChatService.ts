'use client';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';
import { SearchMode } from '@/types/searchMode';

import { agentChatService } from './AgentChatService';
import { audioChatService } from './AudioChatService';
import { fileChatService } from './FileChatService';
import { ragChatService } from './RAGChatService';
import { standardChatService } from './StandardChatService';

/**
 * Main chat service orchestrator.
 *
 * Routes chat requests to the appropriate specialized service based on:
 * - Document files → FileChatService
 * - Audio/video files → AudioChatService
 * - Bot ID present → RAGChatService
 * - SearchMode.AGENT → AgentChatService (direct AI Foundry - fast, less private)
 * - SearchMode.INTELLIGENT/ALWAYS → Tool-Aware endpoint (privacy-focused)
 * - SearchMode.OFF or default → StandardChatService
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
      searchMode?: SearchMode;
    },
  ): Promise<ReadableStream<Uint8Array>> {
    // 1. Check for document files FIRST (highest priority)
    if (fileChatService.hasDocumentFiles(messages)) {
      console.log('[ChatService] Routing to FileChatService');
      return fileChatService.chat(model, messages, {
        botId: options?.botId,
      });
    }

    // 2. Check for audio/video files
    if (audioChatService.hasAudioVideoFiles(messages)) {
      console.log('[ChatService] Routing to AudioChatService');
      return audioChatService.chat(model, messages, {
        botId: options?.botId,
      });
    }

    // 3. Check for RAG/bot requests
    if (options?.botId) {
      console.log('[ChatService] Routing to RAGChatService');
      return ragChatService.chat(model, messages, options.botId);
    }

    // 4. Check for AGENT search mode (direct AI Foundry agent - fast, less private)
    if (options?.searchMode === SearchMode.AGENT) {
      console.log(
        '[ChatService] Routing to AgentChatService (SearchMode.AGENT)',
      );
      return agentChatService.chat(model, messages, {
        temperature: options?.temperature,
        threadId: options?.threadId,
        botId: options?.botId,
      });
    }

    // 5. Check for INTELLIGENT or ALWAYS search mode (privacy-focused tool routing)
    // This uses tool-aware routing where only search queries go to AI Foundry
    if (
      options?.searchMode === SearchMode.INTELLIGENT ||
      options?.searchMode === SearchMode.ALWAYS
    ) {
      console.log(
        `[ChatService] Routing to Tool-Aware endpoint (SearchMode.${options.searchMode})`,
      );
      return this.toolAwareChat(model, messages, options);
    }

    // 6. Default to standard chat
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
   * Sends chat request to tool-aware endpoint (search mode with privacy).
   * Uses privacy-focused routing with intelligent tool determination.
   * Only search queries are sent to AI Foundry, not the full conversation.
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
      searchMode?: SearchMode;
    },
  ): Promise<ReadableStream<Uint8Array>> {
    console.log(
      `[ChatService] Tool-aware chat with SearchMode.${options?.searchMode}`,
    );

    const response = await fetch('/api/chat/tool-aware', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        prompt: options?.prompt,
        temperature: options?.temperature,
        stream: options?.stream ?? true,
        searchMode: options?.searchMode,
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
      searchMode?: SearchMode;
    },
  ): 'file' | 'audio' | 'rag' | 'agent' | 'tool-aware' | 'standard' {
    if (fileChatService.hasDocumentFiles(messages)) {
      return 'file';
    }

    if (audioChatService.hasAudioVideoFiles(messages)) {
      return 'audio';
    }

    if (options?.botId) {
      return 'rag';
    }

    if (options?.searchMode === SearchMode.AGENT) {
      return 'agent';
    }

    if (
      options?.searchMode === SearchMode.INTELLIGENT ||
      options?.searchMode === SearchMode.ALWAYS
    ) {
      return 'tool-aware';
    }

    return 'standard';
  }
}

// Export singleton instance
export const chatService = new ChatService();
