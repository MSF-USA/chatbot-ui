import { AgentType } from '@/types/agent';
import { OpenAIModels } from '@/types/openai';

import { AIFoundryAgentHandler } from '../AIFoundryAgentHandler';
import { ChatContext } from './ChatContext';
import { ChatRequestHandler } from './ChatRequestHandler';

/**
 * Handles forced agent routing (e.g., web search override).
 *
 * Priority: 2
 * When user explicitly requests an agent type via UI controls.
 */
export class ForcedAgentHandler implements ChatRequestHandler {
  private agentHandler: AIFoundryAgentHandler;

  constructor(agentHandler: AIFoundryAgentHandler) {
    this.agentHandler = agentHandler;
  }

  canHandle(context: ChatContext): boolean {
    return !!context.forcedAgentType;
  }

  async handle(context: ChatContext): Promise<Response> {
    console.log(
      `[ForcedAgentHandler] Routing to forced agent: ${context.forcedAgentType}`,
    );

    // Find the appropriate agent configuration
    if (context.forcedAgentType === AgentType.WEB_SEARCH) {
      const webSearchModel = Object.values(OpenAIModels).find(
        (model) => model.agentEnabled && model.agentId,
      );

      if (!webSearchModel) {
        throw new Error(
          'Web search agent not configured. Please ensure a model with agentEnabled and agentId is available.',
        );
      }

      console.log(
        `[ForcedAgentHandler] Using web search agent: ${webSearchModel.id} with agentId: ${webSearchModel.agentId}`,
      );

      return this.agentHandler.handleAgentChat(
        webSearchModel.id,
        webSearchModel as unknown as Record<string, unknown>,
        context.messages,
        context.temperature,
        context.user,
        context.botId,
        context.threadId,
      );
    }

    throw new Error(
      `Unsupported forced agent type: ${context.forcedAgentType}`,
    );
  }

  getPriority(): number {
    return 2;
  }

  getName(): string {
    return 'ForcedAgentHandler';
  }
}
