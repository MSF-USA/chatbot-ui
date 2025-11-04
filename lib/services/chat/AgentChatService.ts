import { Session } from 'next-auth';

import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { ChatLogger, ToneService } from '../shared';
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
  private toneService: ToneService;

  constructor(
    agentHandler: AIFoundryAgentHandler,
    logger: ChatLogger,
    toneService: ToneService,
  ) {
    this.agentHandler = agentHandler;
    this.logger = logger;
    this.toneService = toneService;
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
        `[AgentChatService] Using agent: ${sanitizeForLog(request.model.name || request.model.id)}`,
      );

      // Apply tone if specified on the last message
      const lastMessage = request.messages[request.messages.length - 1];
      let messagesToSend = request.messages;

      if (lastMessage.toneId) {
        console.log(
          `[AgentChatService] Applying tone: ${sanitizeForLog(lastMessage.toneId)}`,
        );

        // Load tone and create instruction message
        const tone = this.toneService.loadTone(
          request.user.id,
          lastMessage.toneId,
        );

        if (tone?.voiceRules) {
          // Inject tone instructions as a system-style message before the user message
          const toneInstructionMessage: Message = {
            role: 'user',
            content: `IMPORTANT: Please respond using the following writing style and tone:\n\n${tone.voiceRules}\n\nNow, please respond to my next message using this style.`,
            messageType: 'text',
          };

          // Insert tone instruction before the last user message
          messagesToSend = [
            ...request.messages.slice(0, -1),
            toneInstructionMessage,
            lastMessage,
          ];

          console.log(
            `[AgentChatService] Tone instructions injected for tone: ${tone.name}`,
          );
        }
      }

      // Delegate to agent handler
      const response = await this.agentHandler.handleAgentChat(
        request.model.id,
        modelConfig,
        messagesToSend,
        request.temperature ?? 1,
        request.user,
        request.botId,
        request.threadId,
      );

      // Log completion
      const duration = Date.now() - startTime;
      console.log(
        `[AgentChatService] Agent completion in ${duration}ms for ${sanitizeForLog(request.model.name || request.model.id)}`,
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
   * @returns Search results with text and citations
   */
  public async executeWebSearchTool(request: WebSearchToolRequest): Promise<{
    text: string;
    citations: any[];
  }> {
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

      // Parse metadata from search results
      const { parseMetadataFromContent } = await import(
        '@/lib/utils/app/metadata'
      );
      const parsed = parseMetadataFromContent(searchResults);

      const duration = Date.now() - startTime;
      console.log(
        `[AgentChatService] Web search completed in ${duration}ms, results length: ${parsed.content.length}, citations: ${parsed.citations.length}`,
      );
      console.log(
        '[AgentChatService] Extracted citations from search:',
        JSON.stringify(parsed.citations, null, 2),
      );
      console.log(
        '[AgentChatService] Raw search results (first 500 chars):',
        searchResults.substring(0, 500),
      );
      console.log(
        '[AgentChatService] Raw search results (last 500 chars):',
        searchResults.substring(searchResults.length - 500),
      );

      return {
        text: parsed.content,
        citations: parsed.citations,
      };
    } catch (error) {
      console.error('[AgentChatService] Web search tool error:', error);
      // Return empty results rather than breaking the conversation
      return { text: '', citations: [] };
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
