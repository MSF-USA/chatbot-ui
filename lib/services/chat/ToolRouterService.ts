import { Message, ToolRouterRequest, ToolRouterResponse } from '@/types/chat';

import { OpenAI } from 'openai';

/**
 * ToolRouterService
 *
 * Determines which tools are needed for a given message using GPT-4.1.
 * Uses a lightweight model to intelligently decide when web search is beneficial.
 */
export class ToolRouterService {
  constructor(private openAIClient: OpenAI) {}

  /**
   * Determines which tools are needed for the current message.
   *
   * @param request - ToolRouterRequest with messages and forceWebSearch flag
   * @returns ToolRouterResponse with tools array and optional searchQuery
   */
  async determineTool(request: ToolRouterRequest): Promise<ToolRouterResponse> {
    const { currentMessage, forceWebSearch } = request;

    // If forceWebSearch is true, always return web_search
    if (forceWebSearch) {
      console.log(
        '[ToolRouterService] Force web search enabled, skipping AI decision',
      );
      return {
        tools: ['web_search'],
        searchQuery: currentMessage,
        reasoning: 'Forced web search mode',
      };
    }

    // Use an efficient model to determine if web search is needed
    // This uses the standard OpenAI client which can route to any model
    try {
      const systemPrompt = `You are a tool router that determines if web search is needed.

Analyze the user's message and determine if it requires current, real-time information from the web.

Web search is needed for:
- Current events, news, recent developments
- Real-time data (weather, stock prices, scores)
- Recent information (released after 2024)
- Specific facts that change frequently
- Comparisons requiring current data

Web search is NOT needed for:
- General knowledge, concepts, explanations
- Code writing, debugging, tutorials
- Mathematical calculations
- Creative writing, brainstorming
- Personal advice, opinions
- Questions about uploaded files or images

IMPORTANT: Always provide searchQuery in your response:
- If needsWebSearch is true, provide an optimized search query
- If needsWebSearch is false, provide an empty string`;

      // Use gpt-5-mini for efficient tool routing decisions
      // This works with any OpenAI-compatible endpoint
      // Note: gpt-5-mini only supports default temperature (1), custom values not allowed
      const response = await this.openAIClient.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: currentMessage },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tool_router_response',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                needsWebSearch: {
                  type: 'boolean',
                  description: 'Whether web search is needed for this query',
                },
                searchQuery: {
                  type: 'string',
                  description:
                    'Optimized search query if web search is needed, empty string otherwise',
                },
                reasoning: {
                  type: 'string',
                  description: 'Brief explanation of the decision',
                },
              },
              required: ['needsWebSearch', 'searchQuery', 'reasoning'],
              additionalProperties: false,
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      console.log('[ToolRouterService] AI decision:', result);

      if (result.needsWebSearch) {
        return {
          tools: ['web_search'],
          searchQuery: result.searchQuery || currentMessage,
          reasoning: result.reasoning || 'Web search recommended by AI',
        };
      }

      return {
        tools: [],
        reasoning: result.reasoning || 'No tools needed',
      };
    } catch (error) {
      console.error('[ToolRouterService] Error determining tool:', error);
      // Fail gracefully - no tools
      return {
        tools: [],
        reasoning: 'Error determining tools, proceeding without search',
      };
    }
  }
}
