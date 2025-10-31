import { AgentChatService } from '../AgentChatService';
import { Tool, WebSearchToolParams } from './Tool';

/**
 * WebSearchTool
 *
 * Executes web searches using AI Foundry agents.
 * Only the search query is sent to AI Foundry, not the full conversation,
 * preserving user privacy.
 */
export class WebSearchTool implements Tool {
  readonly type = 'web_search' as const;
  readonly name = 'Web Search';
  readonly description =
    'Searches the web for current information, news, and real-time data';

  constructor(private agentChatService: AgentChatService) {}

  /**
   * Executes a web search.
   *
   * @param params - Web search parameters including query and model
   * @returns Search results as formatted text
   */
  async execute(params: WebSearchToolParams): Promise<string> {
    try {
      console.log(`[WebSearchTool] Executing search: "${params.searchQuery}"`);

      const searchResults = await this.agentChatService.executeWebSearchTool({
        searchQuery: params.searchQuery,
        model: params.model,
        user: params.user,
      });

      console.log(
        `[WebSearchTool] Search completed, ${searchResults.length} characters`,
      );

      return searchResults;
    } catch (error) {
      console.error('[WebSearchTool] Search failed:', error);
      return ''; // Fail gracefully
    }
  }
}
