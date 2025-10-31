import { Session } from 'next-auth';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { ChatLogger } from '../shared';
import { AIFoundryAgentHandler } from './AIFoundryAgentHandler';

/**
 * Request parameters for agent chat.
 */
export interface AgentChatRequest {
  messages: Message[];
  model: OpenAIModel;
  user: Session['user'];
  temperature?: number;
  botId?: string;
  threadId?: string;
  forcedAgentType?: string;
}

/**
 * Request parameters for web search tool execution.
 */
export interface WebSearchToolRequest {
  searchQuery: string;
  model: OpenAIModel;
  user: Session['user'];
}

/**
 * Service responsible for handling Azure AI Foundry Agent-based chat completions.
 *
 * Handles:
 * - Agent thread management (create/reuse threads)
 * - Message streaming with Bing grounding
 * - Citation extraction and formatting
 * - Multi-modal content (text, images, files)
 * - Logging
 *
 * Uses dependency injection for all dependencies.
 */
export class AgentChatService {
  private agentHandler: AIFoundryAgentHandler;
  private logger: ChatLogger;

  constructor(agentHandler: AIFoundryAgentHandler, logger: ChatLogger) {
    this.agentHandler = agentHandler;
    this.logger = logger;
  }

  /**
   * Handles an agent chat request.
   *
   * @param request - The agent chat request parameters
   * @returns Response with streaming content
   */
  public async handleChat(request: AgentChatRequest): Promise<Response> {
    const startTime = Date.now();

    try {
      // Extract agent ID from model config
      const modelConfig = request.model as unknown as Record<string, unknown>;

      if (!modelConfig.agentId) {
        throw new Error(
          `Model ${request.model.id} does not have an agentId configured`,
        );
      }

      console.log(
        `[AgentChatService] Using agent: ${request.model.displayName || request.model.id}`,
      );

      // Delegate to agent handler
      const response = await this.agentHandler.handleAgentChat(
        request.model.id,
        modelConfig,
        request.messages,
        request.temperature ?? 1,
        request.user,
        request.botId,
        request.threadId,
      );

      // Log completion
      const duration = Date.now() - startTime;
      console.log(
        `[AgentChatService] Agent completion in ${duration}ms for ${request.model.displayName || request.model.id}`,
      );

      return response;
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
   * Executes a web search using AI Foundry as a tool (not full conversation).
   * This is used when minimizeAIFoundryUse is enabled - only the search query
   * goes to AI Foundry, not the conversation history.
   *
   * @param request - Web search tool request
   * @returns Search results as text
   */
  public async executeWebSearchTool(
    request: WebSearchToolRequest,
  ): Promise<string> {
    const startTime = Date.now();

    try {
      const modelConfig = request.model as unknown as Record<string, unknown>;

      if (!modelConfig.agentId) {
        throw new Error(
          `Model ${request.model.id} does not have an agentId configured for web search`,
        );
      }

      console.log(
        `[AgentChatService] Executing web search tool: "${request.searchQuery}"`,
      );

      // Create a simple message with the search query
      const searchMessage: Message = {
        role: 'user',
        content: request.searchQuery,
        messageType: 'text',
      };

      // Execute search using agent handler (no thread ID = one-time search)
      const response = await this.agentHandler.handleAgentChat(
        request.model.id,
        modelConfig,
        [searchMessage],
        0.3, // Low temperature for factual search
        request.user,
        undefined, // No botId for tool execution
        undefined, // No threadId = one-time execution
      );

      // Read the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body from web search');
      }

      let searchResults = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        searchResults += decoder.decode(value, { stream: true });
      }

      const duration = Date.now() - startTime;
      console.log(
        `[AgentChatService] Web search completed in ${duration}ms, results length: ${searchResults.length}`,
      );

      return searchResults;
    } catch (error) {
      console.error('[AgentChatService] Web search tool error:', error);
      // Return empty results rather than breaking the conversation
      return '';
    }
  }

  /**
   * Checks if a model is an agent model.
   *
   * @param model - The model to check
   * @returns true if agent model, false otherwise
   */
  public isAgentModel(model: OpenAIModel): boolean {
    const modelConfig = model as unknown as Record<string, unknown>;
    return !!modelConfig.agentId;
  }
}
