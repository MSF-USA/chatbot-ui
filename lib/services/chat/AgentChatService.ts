import { Session } from 'next-auth';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { AzureMonitorLoggingService } from '../loggingService';
import { AIFoundryAgentHandler } from './AIFoundryAgentHandler';

/**
 * Request for executing a web search tool via AI Foundry agent.
 */
export interface WebSearchToolRequest {
  searchQuery: string;
  model: OpenAIModel;
  user: Session['user'];
}

/**
 * Response from web search tool execution.
 */
export interface WebSearchToolResponse {
  text: string;
  citations: Array<{
    number: number;
    title: string;
    url: string;
    date: string;
  }>;
}

/**
 * AgentChatService
 *
 * Handles execution of AI Foundry agents as tools (specifically for web search).
 * This is different from full agent-based chat - here we use agents to execute
 * specific tool functions and return structured results.
 */
export class AgentChatService {
  private aiFoundryAgentHandler: AIFoundryAgentHandler;

  constructor(loggingService: AzureMonitorLoggingService) {
    this.aiFoundryAgentHandler = new AIFoundryAgentHandler(loggingService);
  }

  /**
   * Executes a web search using an AI Foundry agent.
   *
   * This uses the agent ONLY for the search query, not the full conversation,
   * to preserve user privacy.
   *
   * @param request - Web search request with query, model, and user
   * @returns Search results with text and citations
   */
  async executeWebSearchTool(
    request: WebSearchToolRequest,
  ): Promise<WebSearchToolResponse> {
    const { searchQuery, model, user } = request;

    console.log(
      `[AgentChatService] Executing web search for query: "${searchQuery}"`,
    );

    try {
      // Create a minimal message with just the search query
      const searchMessages: Message[] = [
        {
          role: 'user' as const,
          content: searchQuery,
          messageType: undefined,
        },
      ];

      // Execute the agent with the search query
      const response = await this.aiFoundryAgentHandler.handleAgentChat(
        model.id,
        model,
        searchMessages,
        0.3, // Lower temperature for factual search
        user,
        undefined, // No botId for search
        undefined, // No threadId - each search is independent
      );

      // Parse the streaming response to extract text and citations
      const { text, citations } = await this.parseAgentResponse(response);

      console.log(
        `[AgentChatService] Web search completed: ${text.length} chars, ${citations.length} citations`,
      );

      return { text, citations };
    } catch (error) {
      console.error('[AgentChatService] Web search failed:', error);
      throw error;
    }
  }

  /**
   * Parses the streaming agent response to extract text and citations.
   */
  private async parseAgentResponse(response: Response): Promise<{
    text: string;
    citations: Array<{
      number: number;
      title: string;
      url: string;
      date: string;
    }>;
  }> {
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let citations: Array<{
      number: number;
      title: string;
      url: string;
      date: string;
    }> = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Check if this chunk contains metadata using the correct format
        if (chunk.includes('<<<METADATA_START>>>')) {
          // Extract metadata
          const metadataMatch = chunk.match(
            /<<<METADATA_START>>>(.*?)<<<METADATA_END>>>/s,
          );
          if (metadataMatch) {
            try {
              const metadata = JSON.parse(metadataMatch[1]);
              if (metadata.citations) {
                citations = metadata.citations;
              }
            } catch (e) {
              console.error('[AgentChatService] Error parsing metadata:', e);
            }
          }

          // Remove metadata from text
          fullText += chunk.replace(
            /\n\n<<<METADATA_START>>>.*?<<<METADATA_END>>>/gs,
            '',
          );
        } else {
          fullText += chunk;
        }
      }

      return { text: fullText.trim(), citations };
    } finally {
      reader.releaseLock();
    }
  }
}
