import { Message, ToolRouterRequest, ToolRouterResponse } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { OpenAI } from 'openai';

/**
 * ToolRouterService
 *
 * Determines which tools (if any) should be used for a conversation.
 * Uses a lightweight model (GPT-4.1 by default) to analyze messages and decide if tools like web search are needed.
 *
 * Privacy-focused: Only analyzes messages to determine tool usage, doesn't send full conversation to AI Foundry.
 */
export class ToolRouterService {
  private client: OpenAI;
  private routerModel: OpenAIModel;

  constructor(client: OpenAI, routerModel: OpenAIModel) {
    this.client = client;
    this.routerModel = routerModel;
  }

  /**
   * Analyzes messages to determine which tools should be used
   *
   * @param request - Messages and current user message
   * @returns Array of tools to use and optional search query
   */
  async determineTool(request: ToolRouterRequest): Promise<ToolRouterResponse> {
    const startTime = Date.now();

    try {
      // If forceWebSearch is enabled, always generate a search query
      if (request.forceWebSearch) {
        console.log(
          '[ToolRouterService] Force web search enabled - generating search query',
        );

        const recentMessages = request.messages.slice(-3);
        const context = this.buildContext(
          recentMessages,
          request.currentMessage,
        );

        // Call tool router model (GPT-5-mini) to generate an optimized search query
        // Note: Reasoning models don't support temperature parameter
        const response = await this.client.chat.completions.create({
          model: this.routerModel.id,
          messages: [
            {
              role: 'system',
              content: this.getForcedSearchSystemPrompt(),
            },
            {
              role: 'user',
              content: context,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'forced_search_query',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  tools: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of tools needed (web_search)',
                  },
                  searchQuery: {
                    type: 'string',
                    description:
                      'Optimized search query for Bing/AI Foundry search',
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation of the search intent',
                  },
                },
                required: ['tools', 'searchQuery', 'reasoning'],
                additionalProperties: false,
              },
            },
          },
          max_completion_tokens: 500,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          console.warn(
            '[ToolRouterService] No content in response for forced search',
          );
          return { tools: ['web_search'], searchQuery: request.currentMessage };
        }

        const parsed = JSON.parse(content) as ToolRouterResponse;

        const duration = Date.now() - startTime;
        console.log(
          `[ToolRouterService] Forced search query generated in ${duration}ms:`,
          parsed,
        );

        return {
          tools: ['web_search'],
          searchQuery: parsed.searchQuery || request.currentMessage,
          reasoning:
            parsed.reasoning || 'Search mode enabled - always using web search',
        };
      }

      // Normal mode - determine if web search is needed
      const recentMessages = request.messages.slice(-3);
      const context = this.buildContext(recentMessages, request.currentMessage);

      // Call tool router model (GPT-5-mini) with structured output
      // Note: Reasoning models don't support temperature parameter
      const response = await this.client.chat.completions.create({
        model: this.routerModel.id,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: context,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tool_router_response',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                tools: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Array of tools needed (currently only web_search supported)',
                },
                searchQuery: {
                  type: 'string',
                  description:
                    'Optimized search query if web_search is in tools',
                },
                reasoning: {
                  type: 'string',
                  description:
                    'Brief explanation of why these tools were chosen',
                },
              },
              required: ['tools', 'reasoning'],
              additionalProperties: false,
            },
          },
        },
        max_completion_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn(
          '[ToolRouterService] No content in response, returning no tools',
        );
        return { tools: [] };
      }

      // Parse JSON response
      const parsed = JSON.parse(content) as ToolRouterResponse;

      const duration = Date.now() - startTime;
      console.log(
        `[ToolRouterService] Tool determination completed in ${duration}ms:`,
        parsed,
      );

      return {
        tools: parsed.tools || [],
        searchQuery: parsed.searchQuery,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('[ToolRouterService] Error determining tools:', error);
      // Fail gracefully - return no tools rather than breaking the request
      return { tools: [] };
    }
  }

  /**
   * Builds context string from recent messages
   */
  private buildContext(
    recentMessages: Message[],
    currentMessage: string,
  ): string {
    const conversationHistory = recentMessages
      .map((msg) => {
        const content =
          typeof msg.content === 'string'
            ? msg.content
            : this.extractTextFromContent(msg.content);
        return `${msg.role}: ${content}`;
      })
      .join('\n');

    return `Recent conversation:\n${conversationHistory}\n\nCurrent user message: ${currentMessage}`;
  }

  /**
   * Extracts text from complex message content
   */
  private extractTextFromContent(content: any): string {
    if (Array.isArray(content)) {
      const textContent = content.find((c) => c.type === 'text');
      return textContent?.text || '[non-text content]';
    }
    if (content.type === 'text') {
      return content.text;
    }
    return '[complex content]';
  }

  /**
   * System prompt for forced web search mode (search mode enabled)
   * Always generates an optimized search query for AI Foundry/Bing search
   */
  private getForcedSearchSystemPrompt(): string {
    return `You are a search query optimizer. Search mode is ENABLED, so you MUST generate a web search query for EVERY user message.

Your job is to extract or create the best possible search query to find relevant, current information online.

Search Query Optimization Guidelines:
1. **Extract Key Terms**: Identify the core question/topic
2. **Add Context**: Include relevant terms that help narrow results
3. **Be Specific**: Use 3-10 words for precision
4. **Include Time**: Add "2025", "latest", "recent" for current info when relevant
5. **Use Keywords**: Favor nouns and specific terms over filler words

Examples:
- User: "What's the weather like?" → "current weather [location if mentioned, or 'near me']"
- User: "Tell me about React hooks" → "React hooks tutorial guide 2025"
- User: "How do I fix this error?" → "fix [error name/type] [language/framework] 2025"
- User: "Latest news on AI" → "latest AI news developments 2025"
- User: "Best practices for TypeScript" → "TypeScript best practices 2025"
- User: "Help me understand recursion" → "recursion programming tutorial examples"

Even for general questions, create a search query that will find helpful resources:
- Explanations → "topic explanation tutorial"
- How-to → "how to [action] [context]"
- Comparison → "compare [A] vs [B] 2025"
- Best practices → "[topic] best practices 2025"`;
  }

  /**
   * System prompt for tool determination (normal mode - search not forced)
   */
  private getSystemPrompt(): string {
    return `You are a tool router that analyzes user messages to determine if web search is needed.

IMPORTANT: The LLM already has extensive knowledge. Only use web search for information that is:
1. Time-sensitive (current events, recent updates)
2. Real-time data (weather, stocks, sports)
3. Published/updated after the model's knowledge cutoff

USE WEB SEARCH ONLY FOR:
- Current events, breaking news, recent developments (within last few months)
- Real-time data (weather NOW, stock prices TODAY, live sports scores)
- Recent product releases or software versions (latest version of X)
- Questions explicitly asking for "latest", "current", "recent", "today", "this week"
- Fact-checking very recent claims (within last 6 months)
- Finding specific current websites or resources

DO NOT USE WEB SEARCH FOR:
- General knowledge questions the LLM already knows (e.g., "how do airplanes fly", "what is photosynthesis", "explain gravity")
- Coding/programming concepts and syntax (the LLM knows these)
- Mathematical calculations and formulas
- Explanations of established concepts, theories, or principles
- Historical facts and events (unless specifically about recent analysis/interpretation)
- Scientific explanations of well-established phenomena
- How-to questions about common tasks
- Definitions of terms and concepts
- Creative writing, brainstorming, analysis
- Technical questions the LLM can answer from its training

EXAMPLES:
❌ NO SEARCH: "How do airplanes fly?" - General physics knowledge
❌ NO SEARCH: "Explain how React hooks work" - Programming knowledge
❌ NO SEARCH: "What is machine learning?" - Established concept
❌ NO SEARCH: "How to sort an array in Python?" - Common programming task
✅ SEARCH: "What's the latest TypeScript version?" - Recent version info
✅ SEARCH: "Weather in Seattle today" - Real-time data
✅ SEARCH: "Latest AI developments this week" - Current events

DECISION RULE: When in doubt, DON'T search. The LLM can answer most questions without internet access.

When creating searchQuery (only if search IS needed):
- Make it concise and specific (3-7 words)
- Remove unnecessary words
- Focus on key terms
- Include "2025" or "latest" for current information
- Example: "What's the latest TypeScript version?" -> "latest TypeScript version 2025"`;
  }
}
