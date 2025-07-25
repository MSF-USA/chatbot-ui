import { AzureMonitorLoggingService } from '@/services/loggingService';

import {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionEnvironment,
  AgentResponse,
  AgentType,
} from '@/types/agent';

import {
  AgentCreationError,
  AgentExecutionError,
  BaseAgent,
} from './baseAgent';

import { DefaultAzureCredential } from '@azure/identity';
import { AzureOpenAI } from 'openai';

/**
 * FoundryAgent - Implementation for Azure AI Foundry agents
 * Uses Azure AI Foundry services for agent execution
 */
export class FoundryAgent extends BaseAgent {
  private azureOpenAI: AzureOpenAI | null = null;
  private foundryEndpoint: string;
  private projectId: string;
  private credential: DefaultAzureCredential;

  constructor(config: AgentConfig) {
    // Ensure this is a foundry agent
    if (config.environment !== AgentExecutionEnvironment.FOUNDRY) {
      throw new AgentCreationError(
        'FoundryAgent can only be used with FOUNDRY environment',
        { providedEnvironment: config.environment },
      );
    }

    super(config);

    // Initialize Azure credentials and configuration
    this.credential = new DefaultAzureCredential();
    this.foundryEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT || '';
    this.projectId = process.env.AZURE_AI_FOUNDRY_PROJECT_ID || '';

    if (!this.foundryEndpoint || !this.projectId) {
      throw new AgentCreationError(
        'Azure AI Foundry configuration is missing. Please set AZURE_AI_FOUNDRY_ENDPOINT and AZURE_AI_FOUNDRY_PROJECT_ID environment variables.',
        {
          endpoint: this.foundryEndpoint,
          projectId: this.projectId,
        },
      );
    }
  }

  protected async initializeAgent(): Promise<void> {
    try {
      // Initialize Azure OpenAI client for Foundry
      this.azureOpenAI = new AzureOpenAI({
        endpoint: this.foundryEndpoint,
        apiVersion: '2025-03-01-preview',
        azureADTokenProvider: async () => {
          const tokenResponse = await this.credential.getToken([
            'https://cognitiveservices.azure.com/.default',
          ]);
          return tokenResponse.token;
        },
      });

      // Verify connection by testing a simple call
      await this.performHealthCheck();

      this.logInfo('FoundryAgent initialized successfully', {
        agentId: this.config.id,
        endpoint: this.foundryEndpoint,
        projectId: this.projectId,
        modelId: this.config.modelId,
      });
    } catch (error) {
      const errorMessage = `Failed to initialize FoundryAgent: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logError(errorMessage, error as Error, {
        agentId: this.config.id,
        endpoint: this.foundryEndpoint,
        projectId: this.projectId,
      });
      throw new AgentCreationError(errorMessage, error);
    }
  }

  protected async executeInternalStreaming(
    context: AgentExecutionContext,
  ): Promise<ReadableStream<string>> {
    if (!this.azureOpenAI) {
      throw new AgentExecutionError('Azure OpenAI client not initialized', {
        agentId: this.config.id,
      });
    }

    try {
      // Prepare messages for Azure OpenAI
      const messages = this.prepareMessages(context);

      // Create streaming chat completion with Azure OpenAI
      const streamingCompletion =
        await this.azureOpenAI.chat.completions.create({
          model: this.config.modelId,
          messages,
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 4000,
          tools: this.config.tools || [],
          user: context.user?.id || 'anonymous',
          stream: true, // Enable streaming
        });

      // Create ReadableStream from the streaming response
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamingCompletion) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(content);
              }

              // Check if stream is finished
              if (chunk.choices[0]?.finish_reason) {
                break;
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });
    } catch (error) {
      throw new AgentExecutionError(
        `Foundry streaming execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          agentId: this.config.id,
          originalError: error,
        },
      );
    }
  }

  protected async executeInternal(
    context: AgentExecutionContext,
  ): Promise<AgentResponse> {
    if (!this.azureOpenAI) {
      throw new AgentExecutionError('Azure OpenAI client not initialized', {
        agentId: this.config.id,
      });
    }

    const startTime = Date.now();

    try {
      // Prepare messages for Azure OpenAI
      const messages = this.prepareMessages(context);

      // Create chat completion with Azure OpenAI (non-streaming)
      const completion = await this.azureOpenAI.chat.completions.create({
        model: this.config.modelId,
        messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 4000,
        tools: this.config.tools || [],
        user: context.user?.id || 'anonymous',
        stream: false, // Explicitly disable streaming for non-streaming execution
      });

      const processingTime = Date.now() - startTime;

      // Extract response content
      const responseContent = completion.choices[0]?.message?.content || '';
      const toolCalls = completion.choices[0]?.message?.tool_calls || [];

      // Process tool calls if any
      let toolResults: any[] = [];
      if (toolCalls.length > 0) {
        toolResults = await this.processToolCalls(toolCalls, context);
      }

      // Prepare response
      const response: AgentResponse = {
        content: responseContent,
        agentId: this.config.id,
        agentType: this.config.type,
        success: true,
        metadata: {
          tokenUsage: {
            prompt: completion.usage?.prompt_tokens || 0,
            completion: completion.usage?.completion_tokens || 0,
            total: completion.usage?.total_tokens || 0,
          },
          processingTime,
          confidence: this.calculateConfidence(completion),
          toolResults,
          agentMetadata: {
            model: this.config.modelId,
            temperature: this.config.temperature,
            foundryEndpoint: this.foundryEndpoint,
            projectId: this.projectId,
          },
        },
      };

      this.logInfo('FoundryAgent execution completed successfully', {
        agentId: this.config.id,
        processingTime,
        tokenUsage: response.metadata?.tokenUsage,
        toolCallsCount: toolCalls.length,
      });

      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logError('FoundryAgent execution failed', error as Error, {
        agentId: this.config.id,
        processingTime,
        query: context.query?.substring(0, 100),
      });

      throw new AgentExecutionError(
        `Agent execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          agentId: this.config.id,
          processingTime,
          originalError: error,
        },
      );
    }
  }

  protected validateSpecificConfig(): string[] {
    const errors: string[] = [];

    // Validate Foundry-specific configuration
    if (!this.foundryEndpoint) {
      errors.push('Azure AI Foundry endpoint is required');
    }

    if (!this.projectId) {
      errors.push('Azure AI Foundry project ID is required');
    }

    if (!this.config.modelId) {
      errors.push('Model ID is required for Foundry agents');
    }

    // Validate model ID format (should be a valid Azure OpenAI deployment)
    if (this.config.modelId && !this.isValidModelId(this.config.modelId)) {
      errors.push('Invalid model ID format for Azure OpenAI');
    }

    // Validate temperature range
    if (
      this.config.temperature !== undefined &&
      (this.config.temperature < 0 || this.config.temperature > 2)
    ) {
      errors.push('Temperature must be between 0 and 2');
    }

    // Validate max tokens
    if (
      this.config.maxTokens !== undefined &&
      (this.config.maxTokens < 1 || this.config.maxTokens > 128000)
    ) {
      errors.push('Max tokens must be between 1 and 128000');
    }

    return errors;
  }

  protected getCapabilities(): string[] {
    return [
      'text_generation',
      'conversation',
      'tool_calling',
      'azure_integration',
      'foundry_services',
      'multi_modal', // Depending on the model
    ];
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      if (!this.azureOpenAI) {
        return false;
      }

      // Perform a simple health check by making a minimal API call
      const testCompletion = await this.azureOpenAI.chat.completions.create({
        model: this.config.modelId,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
        temperature: 0,
      });

      return !!testCompletion.choices[0]?.message;
    } catch (error) {
      this.logWarning('FoundryAgent health check failed', {
        agentId: this.config.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  protected async performCleanup(): Promise<void> {
    try {
      // Clean up Azure OpenAI client
      this.azureOpenAI = null;

      this.logInfo('FoundryAgent cleanup completed', {
        agentId: this.config.id,
      });
    } catch (error) {
      this.logError('FoundryAgent cleanup failed', error as Error, {
        agentId: this.config.id,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private prepareMessages(context: AgentExecutionContext): any[] {
    const messages: any[] = [];

    // Add system message with instructions
    if (this.config.instructions) {
      messages.push({
        role: 'system',
        content: this.config.instructions,
      });
    }

    // Add conversation history (limited to prevent token overflow)
    const maxHistoryMessages = 10; // Configurable limit
    const recentMessages = context.messages
      .slice(-maxHistoryMessages)
      .map((msg) => ({
        role: msg.role,
        content:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
      }));

    messages.push(...recentMessages);

    // Add current query
    messages.push({
      role: 'user',
      content: context.query,
    });

    return messages;
  }

  private async processToolCalls(
    toolCalls: any[],
    context: AgentExecutionContext,
  ): Promise<any[]> {
    const toolResults: any[] = [];

    for (const toolCall of toolCalls) {
      try {
        // Process each tool call
        // This is a placeholder - actual tool processing would depend on the specific tools available
        const result = await this.executeToolCall(toolCall, context);
        toolResults.push({
          toolCallId: toolCall.id,
          functionName: toolCall.function?.name,
          result,
          success: true,
        });
      } catch (error) {
        this.logError('Tool call execution failed', error as Error, {
          agentId: this.config.id,
          toolCallId: toolCall.id,
          functionName: toolCall.function?.name,
        });

        toolResults.push({
          toolCallId: toolCall.id,
          functionName: toolCall.function?.name,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
      }
    }

    return toolResults;
  }

  private async executeToolCall(
    toolCall: any,
    context: AgentExecutionContext,
  ): Promise<any> {
    // Placeholder for tool execution
    // In a real implementation, this would dispatch to appropriate tool handlers
    // based on the tool name and parameters

    const functionName = toolCall.function?.name;
    const parameters = JSON.parse(toolCall.function?.arguments || '{}');

    this.logInfo('Executing tool call', {
      agentId: this.config.id,
      functionName,
      parameters,
    });

    // Return a placeholder result
    return {
      functionName,
      parameters,
      timestamp: new Date().toISOString(),
      message: 'Tool execution placeholder - implement specific tool handlers',
    };
  }

  private calculateConfidence(completion: any): number {
    // Calculate confidence based on various factors
    // This is a simplified implementation
    let confidence = 0.8; // Base confidence

    // Adjust based on finish reason
    if (completion.choices[0]?.finish_reason === 'stop') {
      confidence += 0.1;
    } else if (completion.choices[0]?.finish_reason === 'length') {
      confidence -= 0.2;
    }

    // Adjust based on response length (very short responses might be less reliable)
    const responseLength = completion.choices[0]?.message?.content?.length || 0;
    if (responseLength < 10) {
      confidence -= 0.2;
    } else if (responseLength > 100) {
      confidence += 0.1;
    }

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  private isValidModelId(modelId: string): boolean {
    // Basic validation for Azure OpenAI model IDs
    // Should be alphanumeric with possible hyphens
    return /^[a-zA-Z0-9\-_.]+$/.test(modelId);
  }

  /**
   * Static factory method for creating FoundryAgent instances
   */
  public static async create(config: AgentConfig): Promise<FoundryAgent> {
    const agent = new FoundryAgent(config);
    await agent.initializeAgent();
    return agent;
  }

  /**
   * Get supported model types for Foundry agents
   */
  public static getSupportedModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-32k',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-35-turbo',
      'gpt-35-turbo-16k',
    ];
  }

  /**
   * Validate if a model is supported by Foundry agents
   */
  public static isModelSupported(modelId: string): boolean {
    return this.getSupportedModels().some((supported) =>
      modelId.toLowerCase().includes(supported.toLowerCase()),
    );
  }
}
