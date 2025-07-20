import { Session } from 'next-auth';
import { AzureOpenAI } from 'openai';

import { AgentType, AgentExecutionRequest, AgentExecutionResult, AgentExecutionEnvironment } from '@/types/agent';
import {
  IntentAnalysisContext,
  IntentAnalysisResult,
} from '@/types/intentAnalysis';
import { ChatBody, Message, MessageType } from '@/types/chat';
import { OpenAIModelID } from '@/types/openai';

import { getIntentAnalysisService, analyzeUserIntent } from './intentAnalysis';
import { getAgentFactory, executeAgentRequest } from './agentFactory';
import { getAgentRegistry } from './agentRegistry';
import ChatService from './chatService';

/**
 * Agent execution response for chat integration
 */
interface AgentChatResponse {
  content: string;
  agentType: AgentType;
  success: boolean;
  processingTime: number;
  confidence: number;
  metadata?: any;
  fallbackUsed: boolean;
}

/**
 * Chat routing decision
 */
interface ChatRoutingDecision {
  useAgent: boolean;
  agentType?: AgentType;
  confidence: number;
  reasoning: string;
  fallbackToChatService: boolean;
  parameters?: Record<string, any>;
}

/**
 * Agent Chat Integration Service
 * Bridges the existing chat service with the new agent system
 */
export class AgentChatIntegrationService {
  private static instance: AgentChatIntegrationService | null = null;
  private chatService: ChatService;
  private enabledAgentTypes: Set<AgentType>;
  private confidenceThreshold: number;
  private fallbackEnabled: boolean;

  private constructor() {
    this.chatService = new ChatService();
    this.enabledAgentTypes = new Set([
      AgentType.WEB_SEARCH,
      AgentType.CODE_INTERPRETER,
      AgentType.URL_PULL,
      AgentType.LOCAL_KNOWLEDGE,
      AgentType.FOUNDRY,
    ]);
    this.confidenceThreshold = 0.6;
    this.fallbackEnabled = true;
  }

  /**
   * Singleton pattern - get or create integration service instance
   */
  public static getInstance(): AgentChatIntegrationService {
    if (!AgentChatIntegrationService.instance) {
      AgentChatIntegrationService.instance = new AgentChatIntegrationService();
    }
    return AgentChatIntegrationService.instance;
  }

  /**
   * Main entry point for processing chat requests with agent integration
   */
  public async processChatRequest(
    chatBody: ChatBody,
    openai: AzureOpenAI,
    user: Session['user'],
    modelId: string
  ): Promise<AgentChatResponse | null> {
    const startTime = Date.now();

    try {
      // Analyze the request to determine if agent routing is appropriate
      const routingDecision = await this.analyzeAndRoute(chatBody, openai, user, modelId);

      if (!routingDecision.useAgent || routingDecision.fallbackToChatService) {
        console.log('[INFO] Routing to standard chat service', {
          useAgent: routingDecision.useAgent,
          confidence: routingDecision.confidence,
          reasoning: routingDecision.reasoning,
        });
        return null; // Let the standard chat service handle this
      }

      // Execute the agent request
      const agentResponse = await this.executeAgentRequest(
        routingDecision,
        chatBody,
        openai,
        user,
        modelId
      );

      const processingTime = Date.now() - startTime;

      console.log('[INFO] Agent chat request processed', {
        agentType: routingDecision.agentType,
        success: agentResponse.success,
        processingTime,
        confidence: routingDecision.confidence,
      });

      return {
        content: agentResponse.content,
        agentType: routingDecision.agentType!,
        success: agentResponse.success,
        processingTime,
        confidence: routingDecision.confidence,
        metadata: agentResponse.metadata,
        fallbackUsed: false,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('[ERROR] Agent chat request failed', error as Error, {
        processingTime,
        query: this.extractQueryFromChatBody(chatBody).substring(0, 100),
      });

      // Fallback to standard chat service if enabled
      if (this.fallbackEnabled) {
        console.log('[INFO] Falling back to standard chat service due to agent failure');
        return {
          content: `I encountered an issue processing your request. Let me handle this differently.`,
          agentType: AgentType.STANDARD_CHAT,
          success: false,
          processingTime,
          confidence: 0.3,
          fallbackUsed: true,
        };
      }

      throw error;
    }
  }

  /**
   * Configure agent integration settings
   */
  public configure(options: {
    enabledAgentTypes?: AgentType[];
    confidenceThreshold?: number;
    fallbackEnabled?: boolean;
  }): void {
    if (options.enabledAgentTypes) {
      this.enabledAgentTypes = new Set(options.enabledAgentTypes);
    }
    if (options.confidenceThreshold !== undefined) {
      this.confidenceThreshold = options.confidenceThreshold;
    }
    if (options.fallbackEnabled !== undefined) {
      this.fallbackEnabled = options.fallbackEnabled;
    }

    console.log('[INFO] Agent integration configured', {
      enabledAgentTypes: Array.from(this.enabledAgentTypes),
      confidenceThreshold: this.confidenceThreshold,
      fallbackEnabled: this.fallbackEnabled,
    });
  }

  /**
   * Check if a specific agent type is available and healthy
   */
  public async isAgentAvailable(agentType: AgentType): Promise<boolean> {
    try {
      if (!this.enabledAgentTypes.has(agentType)) {
        return false;
      }

      const factory = getAgentFactory();
      const healthResults = await factory.performHealthChecks();
      const agentHealth = healthResults.get(agentType);

      return agentHealth?.some(result => result.healthy) || false;
    } catch (error) {
      console.error(`[ERROR] Health check failed for agent type ${agentType}`, error as Error);
      return false;
    }
  }

  /**
   * Get agent recommendations for a query
   */
  public async getAgentRecommendations(
    query: string,
    limit: number = 3
  ): Promise<Array<{ agentType: AgentType; confidence: number; reasoning: string }>> {
    try {
      const registry = getAgentRegistry();
      const recommendations = registry.getRecommendedAgents(query, {}, limit);

      return recommendations.map(rec => ({
        agentType: rec.type,
        confidence: this.calculateRecommendationConfidence(rec),
        reasoning: this.generateRecommendationReasoning(rec),
      }));
    } catch (error) {
      console.error('[ERROR] Failed to get agent recommendations', error as Error, {
        query: query.substring(0, 100),
      });
      return [];
    }
  }

  /**
   * Private helper methods
   */

  private async analyzeAndRoute(
    chatBody: ChatBody,
    openai: AzureOpenAI,
    user: Session['user'],
    modelId: string
  ): Promise<ChatRoutingDecision> {
    try {
      // Extract context from chat body
      const context = this.buildAnalysisContext(chatBody, user);

      // Perform intent analysis
      const intentResult = await analyzeUserIntent(context, openai, modelId, user);

      // Determine if we should use an agent
      const shouldUseAgent = this.shouldUseAgent(intentResult);

      return {
        useAgent: shouldUseAgent,
        agentType: shouldUseAgent ? intentResult.recommendedAgent : undefined,
        confidence: intentResult.confidence,
        reasoning: intentResult.reasoning,
        fallbackToChatService: !shouldUseAgent || intentResult.confidence < this.confidenceThreshold,
        parameters: intentResult.parameters,
      };
    } catch (error) {
      console.error('[ERROR] Routing analysis failed', error as Error, {
        query: this.extractQueryFromChatBody(chatBody).substring(0, 100),
      });

      return {
        useAgent: false,
        confidence: 0,
        reasoning: 'Analysis failed, falling back to standard chat',
        fallbackToChatService: true,
      };
    }
  }

  private async executeAgentRequest(
    routing: ChatRoutingDecision,
    chatBody: ChatBody,
    openai: AzureOpenAI,
    user: Session['user'],
    modelId: string
  ): Promise<{ content: string; success: boolean; metadata?: any }> {
    const agentRequest: AgentExecutionRequest = {
      agentType: routing.agentType!,
      context: {
        query: this.extractQueryFromChatBody(chatBody),
        messages: chatBody.messages || [],
        user: user,
        model: { id: modelId, name: modelId, maxLength: 4000, tokenLimit: 4000 },
        locale: (user as any).language || 'en',
      },
      config: {
        id: 'agent-' + routing.agentType,
        name: 'Agent for ' + routing.agentType,
        type: routing.agentType!,
        environment: AgentExecutionEnvironment.FOUNDRY,
        modelId: modelId,
      },
    };

    try {
      const result = await executeAgentRequest(agentRequest);

      if (!result.response.success) {
        throw new Error(`Agent execution failed: ${result.response.content}`);
      }

      return {
        content: result.response.content,
        success: true,
        metadata: result.response.metadata,
      };
    } catch (error) {
      console.error('[ERROR] Agent execution failed', error as Error, {
        agentType: routing.agentType,
        query: agentRequest.context.query.substring(0, 100),
      });

      // Try fallback agent if available
      if (routing.agentType !== AgentType.STANDARD_CHAT && this.fallbackEnabled) {
        return this.executeFallbackAgent(agentRequest, error as Error);
      }

      throw error;
    }
  }

  private async executeFallbackAgent(
    originalRequest: AgentExecutionRequest,
    originalError: Error
  ): Promise<{ content: string; success: boolean; metadata?: any }> {
    try {
      console.log('[INFO] Attempting fallback agent execution', {
        originalAgentType: originalRequest.agentType,
        fallbackAgentType: AgentType.FOUNDRY,
      });

      const fallbackRequest: AgentExecutionRequest = {
        ...originalRequest,
        agentType: AgentType.FOUNDRY,
        context: {
          ...originalRequest.context,
        },
      };

      const result = await executeAgentRequest(fallbackRequest);

      return {
        content: result.response.content,
        success: result.response.success,
        metadata: {
          ...result.response.metadata,
          fallbackUsed: true,
          originalError: originalError.message,
        },
      };
    } catch (fallbackError) {
      console.error('[ERROR] Fallback agent execution also failed', fallbackError as Error, {
        originalAgentType: originalRequest.agentType,
        fallbackAgentType: AgentType.FOUNDRY,
      });

      // Return a graceful error message
      return {
        content: 'I apologize, but I encountered difficulties processing your request. Please try rephrasing your question or contact support if the issue persists.',
        success: false,
        metadata: {
          originalError: originalError.message,
          fallbackError: (fallbackError as Error).message,
        },
      };
    }
  }

  private buildAnalysisContext(chatBody: ChatBody, user: Session['user']): IntentAnalysisContext {
    const query = this.extractQueryFromChatBody(chatBody);
    const conversationHistory = this.extractConversationHistory(chatBody);

    return {
      query,
      conversationHistory,
      locale: (user as any).language || 'en',
      userPreferences: {
        preferredAgents: this.getUserPreferredAgents(user),
        disabledAgents: this.getUserDisabledAgents(user),
        languagePreference: (user as any).language,
      },
      additionalContext: {
        messageCount: chatBody.messages.length,
        sessionInfo: {
          sessionId: this.generateSessionId(user),
          userId: user.id || 'anonymous',
          previousInteractions: chatBody.messages.length,
        },
        modelId: chatBody.model.id,
        temperature: chatBody.temperature,
      },
      timestamp: new Date(),
    };
  }

  private extractQueryFromChatBody(chatBody: ChatBody): string {
    const lastMessage = chatBody.messages[chatBody.messages.length - 1];
    
    if (typeof lastMessage.content === 'string') {
      return lastMessage.content;
    }

    // Handle array content (multimodal)
    if (Array.isArray(lastMessage.content)) {
      const textContent = (lastMessage.content as any[]).find((item: any) => item.type === 'text');
      return textContent ? textContent.text : '';
    }

    return '';
  }

  private extractConversationHistory(chatBody: ChatBody): string[] {
    return chatBody.messages
      .slice(-5) // Last 5 messages for context
      .map(msg => {
        if (typeof msg.content === 'string') {
          return `${msg.role}: ${msg.content}`;
        }
        if (Array.isArray(msg.content)) {
          const textContent = (msg.content as any[]).find((item: any) => item.type === 'text');
          return textContent ? `${msg.role}: ${textContent.text}` : `${msg.role}: [non-text content]`;
        }
        return `${msg.role}: [complex content]`;
      });
  }

  private shouldUseAgent(intentResult: IntentAnalysisResult): boolean {
    // Don't use agents for standard chat unless specifically requested
    if (intentResult.recommendedAgent === AgentType.STANDARD_CHAT) {
      return false;
    }

    // Check if the agent type is enabled
    if (!this.enabledAgentTypes.has(intentResult.recommendedAgent)) {
      return false;
    }

    // Check confidence threshold
    if (intentResult.confidence < this.confidenceThreshold) {
      return false;
    }

    // Additional checks for specific agent types
    switch (intentResult.recommendedAgent) {
      case AgentType.URL_PULL:
        // Only use URL agent if URLs are actually present
        return Boolean(intentResult.parameters.urls?.length);
      
      case AgentType.CODE_INTERPRETER:
        // Only use code agent if code is detected or explicitly requested
        return Boolean(intentResult.parameters.language || intentResult.confidence > 0.7);
      
      case AgentType.LOCAL_KNOWLEDGE:
        // Only use local knowledge if company-specific terms are detected
        return Boolean(intentResult.parameters.topics?.length || intentResult.parameters.keywords?.length);
      
      default:
        return true;
    }
  }

  private getUserPreferredAgents(user: Session['user']): AgentType[] {
    // This could be stored in user preferences in the future
    return [];
  }

  private getUserDisabledAgents(user: Session['user']): AgentType[] {
    // This could be stored in user preferences in the future
    return [];
  }

  private generateSessionId(user: Session['user']): string {
    return `${user.id || 'anonymous'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRecommendationConfidence(recommendation: any): number {
    // Simple confidence calculation based on recommendation metadata
    return Math.min(0.9, Math.max(0.1, 
      (recommendation.poolStats?.totalAgents || 0) > 0 ? 0.7 : 0.4
    ));
  }

  private generateRecommendationReasoning(recommendation: any): string {
    const capabilities = recommendation.capabilities.slice(0, 3).join(', ');
    return `Best suited for: ${capabilities}. Available: ${recommendation.available ? 'Yes' : 'No'}.`;
  }
}

/**
 * Convenience function to get the singleton integration service instance
 */
export function getAgentChatIntegration(): AgentChatIntegrationService {
  return AgentChatIntegrationService.getInstance();
}

/**
 * Main integration function for processing chat requests
 */
export async function processAgentChatRequest(
  chatBody: ChatBody,
  openai: AzureOpenAI,
  user: Session['user'],
  modelId: string
): Promise<AgentChatResponse | null> {
  const integration = getAgentChatIntegration();
  return await integration.processChatRequest(chatBody, openai, user, modelId);
}

/**
 * Function to configure agent integration
 */
export function configureAgentIntegration(options: {
  enabledAgentTypes?: AgentType[];
  confidenceThreshold?: number;
  fallbackEnabled?: boolean;
}): void {
  const integration = getAgentChatIntegration();
  integration.configure(options);
}

/**
 * Function to check agent availability
 */
export async function checkAgentAvailability(agentType: AgentType): Promise<boolean> {
  const integration = getAgentChatIntegration();
  return await integration.isAgentAvailable(agentType);
}