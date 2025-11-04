import { Session } from 'next-auth';

import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { Message, ToolRouterRequest } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';
import { SearchMode } from '@/types/searchMode';

import { AgentChatService } from './AgentChatService';
import { StandardChatService } from './StandardChatService';
import { ToolRouterService } from './ToolRouterService';
import { ToolRegistry, WebSearchToolParams } from './tools';

/**
 * Request parameters for chat orchestration.
 */
export interface ChatOrchestratorRequest {
  messages: Message[];
  model: OpenAIModel;
  user: Session['user'];
  systemPrompt?: string;
  temperature?: number;
  stream?: boolean;
  botId?: string;
  searchMode?: SearchMode; // Search mode configuration
  agentModel?: OpenAIModel; // Model with agentId for web search tool
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
}

/**
 * ChatOrchestrator
 *
 * Server-side orchestrator that handles privacy-focused chat routing.
 * Based on SearchMode:
 * - INTELLIGENT: Uses ToolRouterService to intelligently decide when web search is needed
 * - ALWAYS: Forces web search on every message
 * - Both modes execute tools via ToolRegistry (only search queries sent to AI Foundry)
 * - Continues with StandardChatService using tool results for privacy
 *
 * Note: SearchMode.AGENT and SearchMode.OFF are handled by ChatService, not here.
 */
export class ChatOrchestrator {
  constructor(
    private standardChatService: StandardChatService,
    private agentChatService: AgentChatService,
    private toolRouterService: ToolRouterService,
    private toolRegistry: ToolRegistry,
  ) {}

  /**
   * Orchestrates chat request with privacy-focused routing.
   *
   * @param request - Chat request parameters
   * @returns Response with streaming content
   */
  async handleChat(request: ChatOrchestratorRequest): Promise<Response> {
    console.log(
      `[ChatOrchestrator] searchMode: ${sanitizeForLog(request.searchMode)}`,
    );

    const lastMessage = request.messages[request.messages.length - 1];
    const currentMessage =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : this.extractTextFromContent(lastMessage.content);

    // Determine which tools are needed using intelligent routing
    // Force web search if SearchMode.ALWAYS, otherwise let AI decide (SearchMode.INTELLIGENT)
    const forceWebSearch = request.searchMode === SearchMode.ALWAYS;

    const toolRouterRequest: ToolRouterRequest = {
      messages: request.messages,
      currentMessage,
      forceWebSearch,
    };

    const toolResponse =
      await this.toolRouterService.determineTool(toolRouterRequest);

    console.log('[ChatOrchestrator] Tool router response:', toolResponse);

    // Execute tools if needed
    if (toolResponse.tools.length > 0) {
      console.log(
        `[ChatOrchestrator] Executing ${toolResponse.tools.length} tool(s): ${toolResponse.tools.join(', ')}`,
      );

      // Determine action message to show in frontend
      const actionMessage = toolResponse.tools.includes('web_search')
        ? 'Searching the web...'
        : 'Processing...';

      // Create a stream that sends metadata FIRST, then executes tools
      const { appendMetadataToStream } = await import(
        '@/lib/utils/app/metadata'
      );

      // Capture class properties before entering ReadableStream closure
      const toolRegistry = this.toolRegistry;
      const standardChatService = this.standardChatService;

      // Execute tools in background and return stream immediately
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              // 1. IMMEDIATELY send action metadata to client
              appendMetadataToStream(controller, { action: actionMessage });

              // 2. Execute each tool and collect results
              const toolResults: Array<{
                tool: string;
                text: string;
                citations?: any[];
              }> = [];

              for (const toolType of toolResponse.tools) {
                const tool = toolRegistry.getTool(toolType);

                if (!tool) {
                  console.warn(
                    `[ChatOrchestrator] Tool not found: ${toolType}`,
                  );
                  continue;
                }

                console.log(`[ChatOrchestrator] Executing tool: ${tool.name}`);

                try {
                  let result;

                  // Execute tool with appropriate parameters
                  if (toolType === 'web_search' && toolResponse.searchQuery) {
                    if (!request.agentModel) {
                      console.warn(
                        '[ChatOrchestrator] No agent model provided for web search, skipping',
                      );
                      continue;
                    }

                    result = await tool.execute({
                      searchQuery: toolResponse.searchQuery,
                      model: request.agentModel,
                      user: request.user,
                    } as WebSearchToolParams);
                  } else {
                    // Future: Add other tool types here
                    console.warn(
                      `[ChatOrchestrator] No execution params for tool: ${toolType}`,
                    );
                    continue;
                  }

                  if (result && result.text) {
                    toolResults.push({
                      tool: tool.name,
                      text: result.text,
                      citations: result.citations,
                    });
                  }
                } catch (error) {
                  console.error(
                    `[ChatOrchestrator] Tool execution failed for ${tool.name}:`,
                    error,
                  );
                  // Continue with other tools
                }
              }

              // 3. Prepare messages and call LLM (with or without tool results)
              let messagesForLLM = request.messages;
              let allCitations: any[] = [];

              if (toolResults.length > 0) {
                console.log(
                  `[ChatOrchestrator] Adding ${toolResults.length} tool result(s) to context`,
                );

                // Collect all citations from tools and renumber citation markers in text
                allCitations =
                  toolResults.flatMap((tr) => tr.citations || []) || [];

                console.log(
                  `[ChatOrchestrator] Collected ${allCitations.length} citations from tool results:`,
                  JSON.stringify(allCitations, null, 2),
                );

                // Renumber citation markers in each tool result's text
                let citationOffset = 0;
                const renumberedToolResults = toolResults.map((tr) => {
                  const toolCitationCount = tr.citations?.length || 0;
                  let renumberedText = tr.text;

                  // Renumber citation markers [1], [2], etc. to account for offset
                  if (toolCitationCount > 0) {
                    // Replace [1], [2], [3]... with [offset+1], [offset+2], [offset+3]...
                    for (let i = toolCitationCount; i >= 1; i--) {
                      const oldMarker = `[${i}]`;
                      const newMarker = `[${citationOffset + i}]`;
                      renumberedText = renumberedText
                        .split(oldMarker)
                        .join(newMarker);
                    }
                  }

                  citationOffset += toolCitationCount;

                  return {
                    ...tr,
                    text: renumberedText,
                  };
                });

                // Create system messages for tool results with renumbered text
                const citationReferences = allCitations
                  .map((c, idx) => `[${idx + 1}] ${c.title || c.url}`)
                  .join('\n');

                const toolContextMessages: Message[] =
                  renumberedToolResults.map((tr) => ({
                    role: 'system' as const,
                    content: `${tr.tool} results:\n\n${tr.text}\n\nAvailable sources:\n${citationReferences}\n\nIMPORTANT: When referencing these sources in your response, use ONLY citation markers like [1], [2], etc. Do NOT include source information (URLs, titles, or dates) in your response text. The citation details will be displayed separately to the user.`,
                    messageType: undefined,
                  }));

                // Insert tool results before the last user message
                messagesForLLM = [
                  ...request.messages.slice(0, -1),
                  ...toolContextMessages,
                  request.messages[request.messages.length - 1],
                ];
              } else {
                console.log(
                  '[ChatOrchestrator] No tool results, using standard chat as fallback',
                );
              }

              // 4. Call LLM (with or without tool context)
              const response = await standardChatService.handleChat({
                messages: messagesForLLM,
                model: request.model,
                user: request.user,
                systemPrompt: request.systemPrompt || '',
                temperature: request.temperature,
                stream: request.stream,
                botId: request.botId,
                reasoningEffort: request.reasoningEffort,
                verbosity: request.verbosity,
              });

              // 5. Stream LLM response to client
              const originalBody = response.body;
              if (originalBody) {
                const reader = originalBody.getReader();

                // Pass through all content from LLM stream
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }

                // 6. APPEND citations metadata at the end (if any)
                if (allCitations.length > 0) {
                  console.log(
                    `[ChatOrchestrator] Appending ${allCitations.length} citations to response`,
                  );
                  appendMetadataToStream(controller, {
                    citations: allCitations,
                  });
                }
              }

              controller.close();
            } catch (error) {
              console.error('[ChatOrchestrator] Stream error:', error);
              controller.error(error);
            }
          },
        }),
        {
          headers: { 'Content-Type': 'text/event-stream' },
        },
      );
    }

    // No tools needed or search failed - use standard chat
    console.log(
      '[ChatOrchestrator] No tools needed, using StandardChatService',
    );
    return this.standardChatService.handleChat({
      messages: request.messages,
      model: request.model,
      user: request.user,
      systemPrompt: request.systemPrompt || '',
      temperature: request.temperature,
      stream: request.stream,
      botId: request.botId,
      reasoningEffort: request.reasoningEffort,
      verbosity: request.verbosity,
    });
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
}
