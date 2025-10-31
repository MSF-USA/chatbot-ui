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
      // Build context from last 3 messages for efficiency
      const recentMessages = request.messages.slice(-3);
      const context = this.buildContext(recentMessages, request.currentMessage);

      // Call GPT-4.1 with structured output
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
        temperature: 0.1, // Low temperature for consistent routing decisions
        response_format: { type: 'json_object' },
        max_tokens: 500,
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
   * System prompt for tool determination
   */
  private getSystemPrompt(): string {
    return `You are a tool router that analyzes user messages to determine if web search is needed.

Your job is to decide if the user's question requires current information from the internet.

Output a JSON object with this structure:
{
  "tools": ["web_search"],  // Array of tools needed (currently only "web_search" is supported)
  "searchQuery": "optimized search query",  // If web_search is needed, provide an optimized query
  "reasoning": "brief explanation"  // Why you chose these tools
}

If web search is NOT needed, return:
{
  "tools": [],
  "reasoning": "brief explanation"
}

USE WEB SEARCH FOR:
- Current events, news, recent developments
- Real-time data (weather, stock prices, sports scores)
- Recent product releases or updates
- Questions about "latest", "current", "recent", "today", "this week", etc.
- Fact-checking recent claims
- Finding specific websites or resources
- Information that changes frequently

DO NOT USE WEB SEARCH FOR:
- General knowledge questions
- Coding/programming help
- Mathematical calculations
- Explanations of concepts
- Creative writing
- Analysis of provided content
- Questions about historical facts (older than 6 months)
- Theoretical discussions

When creating searchQuery:
- Make it concise and specific (3-7 words)
- Remove unnecessary words
- Focus on key terms
- Example: "What's the latest TypeScript version?" -> "latest TypeScript version 2024"

Always respond with valid JSON only, no other text.`;
  }
}
