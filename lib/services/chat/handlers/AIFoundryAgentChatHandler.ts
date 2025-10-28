import { AIFoundryAgentHandler } from '../AIFoundryAgentHandler';
import { ChatContext } from './ChatContext';
import { ChatRequestHandler } from './ChatRequestHandler';

/**
 * Handles AI Foundry Agent requests (GPT-4.1 with agent capabilities).
 *
 * Priority: 4
 * For models with agentEnabled=true and agentId configured.
 */
export class AIFoundryAgentChatHandler implements ChatRequestHandler {
  private agentHandler: AIFoundryAgentHandler;

  constructor(agentHandler: AIFoundryAgentHandler) {
    this.agentHandler = agentHandler;
  }

  canHandle(context: ChatContext): boolean {
    return !!(
      (context.model as any).agentEnabled && (context.model as any).agentId
    );
  }

  async handle(context: ChatContext): Promise<Response> {
    console.log(
      `[AIFoundryAgentChatHandler] Handling agent chat with model: ${context.model.id}`,
    );

    return this.agentHandler.handleAgentChat(
      context.model.id,
      context.model as unknown as Record<string, unknown>,
      context.messages,
      context.temperature,
      context.user,
      context.botId,
      context.threadId,
    );
  }

  getPriority(): number {
    return 4;
  }

  getName(): string {
    return 'AIFoundryAgentChatHandler';
  }
}
