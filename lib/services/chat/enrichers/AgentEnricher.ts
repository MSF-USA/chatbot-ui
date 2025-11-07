import { ChatContext } from '../pipeline/ChatContext';
import { BasePipelineStage } from '../pipeline/PipelineStage';

/**
 * AgentEnricher adds AI Foundry agent capabilities.
 *
 * Responsibilities:
 * - Validates that the model has an agentId
 * - Sets execution strategy to 'agent'
 * - Prepares for AI Foundry agent execution
 *
 * Modifies context:
 * - context.executionStrategy = 'agent'
 *
 * Note: Agent mode currently supports text only.
 * If files/images are present, this enricher will skip.
 * Future: Could support agents with file/image understanding.
 */
export class AgentEnricher extends BasePipelineStage {
  readonly name = 'AgentEnricher';

  shouldRun(context: ChatContext): boolean {
    return !!context.agentMode && !!context.model.agentId;
  }

  protected async executeStage(context: ChatContext): Promise<ChatContext> {
    console.log(
      `[AgentEnricher] Using AI Foundry agent: ${context.model.agentId}`,
    );

    // Validate that model has agentId
    if (!context.model.agentId) {
      throw new Error(
        `Model ${context.modelId} does not have an agentId configured`,
      );
    }

    // If files or images are present, agent mode may not support them yet
    if (context.hasFiles || context.hasImages) {
      console.warn(
        '[AgentEnricher] Agent mode with files/images not yet supported, will use standard execution',
      );
      return context;
    }

    // Set execution strategy to agent
    return {
      ...context,
      executionStrategy: 'agent',
    };
  }
}
