import { Session } from 'next-auth';

import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { Message, ToolRouterRequest } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

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
  minimizeAIFoundryUse: boolean;
  agentModel?: OpenAIModel; // Model with agentId for web search tool
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
}

/**
 * ChatOrchestrator
 *
 * Server-side orchestrator that handles privacy-focused chat routing.
 * When minimizeAIFoundryUse is enabled:
 * - Uses ToolRouterService to determine which tools are needed
 * - Executes tools via ToolRegistry (only tool params sent to AI Foundry)
 * - Continues with StandardChatService using tool results
 *
 * When minimizeAIFoundryUse is disabled:
 * - Routes directly to AgentChatService (current behavior)
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
    // codeql[js/log-injection] - User input sanitized with sanitizeForLog() which removes newlines and control characters
    console.log(
      `[ChatOrchestrator] minimizeAIFoundryUse: ${sanitizeForLog(request.minimizeAIFoundryUse)}`,
    );

    // If minimize AI Foundry is OFF, use standard routing (agent service directly)
    if (!request.minimizeAIFoundryUse) {
      console.log(
        '[ChatOrchestrator] Routing directly to AgentChatService (privacy mode OFF)',
      );
      return this.agentChatService.handleChat({
        messages: request.messages,
        model: request.agentModel || request.model,
        user: request.user,
        temperature: request.temperature,
        botId: request.botId,
      });
    }

    // Privacy mode ON - use tool router
    console.log('[ChatOrchestrator] Privacy mode ON - using ToolRouterService');

    const lastMessage = request.messages[request.messages.length - 1];
    const currentMessage =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : this.extractTextFromContent(lastMessage.content);

    // Determine which tools are needed
    const toolRouterRequest: ToolRouterRequest = {
      messages: request.messages,
      currentMessage,
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

      // Execute each tool and collect results
      const toolResults: Array<{
        tool: string;
        text: string;
        citations?: any[];
      }> = [];

      for (const toolType of toolResponse.tools) {
        const tool = this.toolRegistry.getTool(toolType);

        if (!tool) {
          console.warn(`[ChatOrchestrator] Tool not found: ${toolType}`);
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

      // If we have tool results, add them to context
      if (toolResults.length > 0) {
        console.log(
          `[ChatOrchestrator] Adding ${toolResults.length} tool result(s) to context`,
        );

        // Collect all citations from tools
        const allCitations =
          toolResults.flatMap((tr) => tr.citations || []) || [];

        // Create system messages for tool results
        // Build citation reference list for the LLM
        const citationReferences = allCitations
          .map((c, idx) => `[${idx + 1}] ${c.title || c.url}`)
          .join('\n');

        const toolContextMessages: Message[] = toolResults.map((tr) => ({
          role: 'system' as const,
          content: `${tr.tool} results:\n\n${tr.text}\n\nAvailable sources:\n${citationReferences}\n\nIMPORTANT: When referencing these sources in your response, use ONLY citation markers like [1], [2], etc. Do NOT include source information (URLs, titles, or dates) in your response text. The citation details will be displayed separately to the user.`,
          messageType: undefined,
        }));

        // Insert tool results before the last user message
        const messagesWithTools = [
          ...request.messages.slice(0, -1),
          ...toolContextMessages,
          request.messages[request.messages.length - 1],
        ];

        // Continue with standard chat using tool-enhanced context
        // We need to pass citations through to the response
        const response = await this.standardChatService.handleChat({
          messages: messagesWithTools,
          model: request.model,
          user: request.user,
          systemPrompt: request.systemPrompt || '',
          temperature: request.temperature,
          stream: request.stream,
          botId: request.botId,
          reasoningEffort: request.reasoningEffort,
          verbosity: request.verbosity,
        });

        // Transform stream to add action metadata at the beginning and citations at the end
        const originalBody = response.body;
        if (!originalBody) return response;

        const { appendMetadataToStream } = await import(
          '@/lib/utils/app/metadata'
        );

        const transformedStream = new ReadableStream({
          async start(controller) {
            const reader = originalBody.getReader();

            try {
              // PREPEND action metadata at the beginning for immediate feedback
              appendMetadataToStream(controller, { action: actionMessage });

              // Pass through all content from original stream
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }

              // APPEND citations metadata at the end (if any)
              if (allCitations.length > 0) {
                console.log(
                  `[ChatOrchestrator] Appending ${allCitations.length} citations to response`,
                );
                appendMetadataToStream(controller, { citations: allCitations });
              }

              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });

        return new Response(transformedStream, {
          headers: response.headers,
        });
      }
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
