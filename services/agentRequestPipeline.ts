import { Session } from 'next-auth';
import { AzureOpenAI } from 'openai';
import * as crypto from 'crypto';

import { 
  AgentType, 
  AgentExecutionRequest, 
  AgentExecutionResult,
  AgentExecutionContext,
  AgentResponse 
} from '@/types/agent';
import { ChatBody } from '@/types/chat';
import { 
  IntentAnalysisContext, 
  IntentAnalysisResult 
} from '@/types/intentAnalysis';
import { AgentSettings } from '@/types/settings';

import { analyzeUserIntent } from './intentAnalysis';
import { executeAgentRequest } from './agentFactory';
import { getAgentSettingsService } from './agentSettingsService';
import { recordIntentAnalysisPerformance } from './intentAnalysis';

/**
 * Pipeline stage execution result
 */
interface PipelineStageResult {
  success: boolean;
  data?: any;
  error?: Error;
  processingTime: number;
  stage: string;
}

/**
 * Complete pipeline execution result
 */
interface PipelineExecutionResult {
  success: boolean;
  agentResponse?: AgentResponse;
  intentResult?: IntentAnalysisResult;
  processingTime: number;
  stages: PipelineStageResult[];
  metadata: PipelineMetadata;
}

/**
 * Pipeline execution metadata
 */
interface PipelineMetadata {
  pipelineId: string;
  timestamp: Date;
  user: Session['user'];
  modelId: string;
  agentType?: AgentType;
  stagesExecuted: string[];
  fallbackUsed: boolean;
  cacheHit: boolean;
  totalTokens?: number;
  costEstimate?: number;
}

/**
 * Pipeline configuration
 */
interface PipelineConfig {
  enableIntentAnalysis: boolean;
  enableCaching: boolean;
  enableMetrics: boolean;
  enableFallback: boolean;
  maxProcessingTime: number;
  retryAttempts: number;
  parallelExecution: boolean;
}

/**
 * Request validation result
 */
interface RequestValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedRequest?: any;
}

/**
 * Agent Request Processing Pipeline
 * Unified pipeline for processing agent requests with caching, validation, and monitoring
 */
export class AgentRequestPipeline {
  private static instance: AgentRequestPipeline | null = null;
  private config: PipelineConfig;
  private requestCache: Map<string, any> = new Map();
  private activeRequests: Map<string, Promise<PipelineExecutionResult>> = new Map();

  private constructor(config?: Partial<PipelineConfig>) {
    this.config = {
      enableIntentAnalysis: true,
      enableCaching: true,
      enableMetrics: true,
      enableFallback: true,
      maxProcessingTime: 60000, // 1 minute
      retryAttempts: 2,
      parallelExecution: false,
      ...config,
    };
  }

  /**
   * Singleton pattern - get or create pipeline instance
   */
  public static getInstance(config?: Partial<PipelineConfig>): AgentRequestPipeline {
    if (!AgentRequestPipeline.instance) {
      AgentRequestPipeline.instance = new AgentRequestPipeline(config);
    }
    return AgentRequestPipeline.instance;
  }

  /**
   * Main pipeline execution method
   */
  public async processRequest(
    chatBody: ChatBody,
    openai: AzureOpenAI,
    user: Session['user'],
    modelId: string
  ): Promise<PipelineExecutionResult> {
    const pipelineId = this.generatePipelineId();
    const startTime = Date.now();
    const stages: PipelineStageResult[] = [];

    try {
      console.log('Pipeline execution started', {
        pipelineId,
        modelId,
        userId: user.id,
        messageCount: chatBody.messages.length,
      });

      // Stage 1: Request Validation
      const validationResult = await this.executeStage(
        'validation',
        () => this.validateRequest(chatBody, user, modelId)
      );
      stages.push(validationResult);

      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error?.message}`);
      }

      // Stage 2: Deduplication Check
      const deduplicationResult = await this.executeStage(
        'deduplication',
        () => this.checkRequestDeduplication(chatBody, user)
      );
      stages.push(deduplicationResult);

      if (deduplicationResult.success && deduplicationResult.data?.isDuplicate) {
        return this.createCachedResult(deduplicationResult.data.cachedResult, stages, pipelineId, startTime);
      }

      // Stage 3: Intent Analysis
      let intentResult: IntentAnalysisResult | undefined;
      if (this.config.enableIntentAnalysis) {
        const intentAnalysisResult = await this.executeStage(
          'intent_analysis',
          () => this.performIntentAnalysis(chatBody, openai, user, modelId)
        );
        stages.push(intentAnalysisResult);

        if (intentAnalysisResult.success) {
          intentResult = intentAnalysisResult.data;
        }
      }

      // Stage 4: Agent Selection and Configuration
      const agentSelectionResult = await this.executeStage(
        'agent_selection',
        () => this.selectAndConfigureAgent(intentResult, chatBody, user)
      );
      stages.push(agentSelectionResult);

      if (!agentSelectionResult.success) {
        throw new Error(`Agent selection failed: ${agentSelectionResult.error?.message}`);
      }

      const agentExecutionRequest = agentSelectionResult.data as AgentExecutionRequest;

      // Stage 5: Agent Execution
      const executionResult = await this.executeStage(
        'agent_execution',
        () => this.executeAgent(agentExecutionRequest)
      );
      stages.push(executionResult);

      if (!executionResult.success) {
        // Try fallback if enabled
        if (this.config.enableFallback) {
          const fallbackResult = await this.executeStage(
            'fallback_execution',
            () => this.executeFallbackAgent(agentExecutionRequest)
          );
          stages.push(fallbackResult);

          if (fallbackResult.success) {
            executionResult.success = true;
            executionResult.data = fallbackResult.data;
          }
        }

        if (!executionResult.success) {
          throw new Error(`Agent execution failed: ${executionResult.error?.message}`);
        }
      }

      const agentResult = executionResult.data as AgentExecutionResult;

      // Stage 6: Response Processing
      const responseProcessingResult = await this.executeStage(
        'response_processing',
        () => this.processResponse(agentResult, intentResult, chatBody)
      );
      stages.push(responseProcessingResult);

      // Stage 7: Caching
      if (this.config.enableCaching) {
        const cachingResult = await this.executeStage(
          'caching',
          () => this.cacheResult(chatBody, user, agentResult.response)
        );
        stages.push(cachingResult);
      }

      // Stage 8: Metrics and Feedback
      if (this.config.enableMetrics) {
        const metricsResult = await this.executeStage(
          'metrics',
          () => this.recordMetrics(intentResult, agentResult, startTime)
        );
        stages.push(metricsResult);
      }

      const processingTime = Date.now() - startTime;

      const result: PipelineExecutionResult = {
        success: true,
        agentResponse: agentResult.response,
        intentResult,
        processingTime,
        stages,
        metadata: this.buildMetadata(pipelineId, user, modelId, intentResult?.recommendedAgent, stages, startTime),
      };

      console.log('Pipeline execution completed successfully', {
        pipelineId,
        processingTime,
        agentType: intentResult?.recommendedAgent,
        stagesExecuted: stages.length,
        success: true,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('Pipeline execution failed', error, {
        pipelineId,
        processingTime,
        stagesExecuted: stages.length,
        lastStage: stages[stages.length - 1]?.stage,
      });

      return {
        success: false,
        processingTime,
        stages,
        metadata: this.buildMetadata(pipelineId, user, modelId, undefined, stages, startTime, error as Error),
      };
    } finally {
      this.activeRequests.delete(pipelineId);
    }
  }

  /**
   * Get pipeline status and statistics
   */
  public getPipelineStatus(): {
    activeRequests: number;
    cacheSize: number;
    config: PipelineConfig;
    uptime: number;
  } {
    return {
      activeRequests: this.activeRequests.size,
      cacheSize: this.requestCache.size,
      config: { ...this.config },
      uptime: Date.now(),
    };
  }

  /**
   * Configure pipeline settings
   */
  public configure(newConfig: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Pipeline configuration updated', {
      updatedFields: Object.keys(newConfig),
      newConfig: JSON.stringify(this.config),
    });
  }

  /**
   * Clear pipeline cache
   */
  public clearCache(): void {
    this.requestCache.clear();
    console.log('Pipeline cache cleared');
  }

  /**
   * Private helper methods
   */

  private async executeStage<T>(
    stageName: string,
    stageFunction: () => Promise<T> | T
  ): Promise<PipelineStageResult> {
    const startTime = Date.now();

    try {
      const data = await stageFunction();
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data,
        processingTime,
        stage: stageName,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error(`Pipeline stage ${stageName} failed`, error, {
        stage: stageName,
        processingTime,
      });

      return {
        success: false,
        error: error as Error,
        processingTime,
        stage: stageName,
      };
    }
  }

  private async validateRequest(
    chatBody: ChatBody,
    user: Session['user'],
    modelId: string
  ): Promise<RequestValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!chatBody.messages || chatBody.messages.length === 0) {
      errors.push('No messages provided');
    }

    if (!user || !user.id) {
      warnings.push('User information is incomplete');
    }

    if (!modelId) {
      errors.push('Model ID is required');
    }

    // Message validation
    const lastMessage = chatBody.messages[chatBody.messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      errors.push('Last message has no content');
    }

    // Content length validation
    const totalContentLength = chatBody.messages.reduce((total, msg) => {
      if (typeof msg.content === 'string') {
        return total + msg.content.length;
      }
      if (Array.isArray(msg.content)) {
        return total + (msg.content as any[]).reduce((sum: number, item: any) => {
          return sum + (item.type === 'text' ? (item.text?.length || 0) : 0);
        }, 0);
      }
      return total;
    }, 0);

    if (totalContentLength > 100000) {
      warnings.push('Very long conversation may impact performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedRequest: chatBody,
    };
  }

  private async checkRequestDeduplication(
    chatBody: ChatBody,
    user: Session['user']
  ): Promise<{ isDuplicate: boolean; cachedResult?: any }> {
    if (!this.config.enableCaching) {
      return { isDuplicate: false };
    }

    const requestHash = this.generateRequestHash(chatBody, user);
    const cached = this.requestCache.get(requestHash);

    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minute cache
      console.log('Request deduplication cache hit', {
        requestHash,
        cacheAge: Date.now() - cached.timestamp,
      });

      return {
        isDuplicate: true,
        cachedResult: cached.result,
      };
    }

    return { isDuplicate: false };
  }

  private async performIntentAnalysis(
    chatBody: ChatBody,
    openai: AzureOpenAI,
    user: Session['user'],
    modelId: string
  ): Promise<IntentAnalysisResult> {
    const context = this.buildIntentAnalysisContext(chatBody, user);
    return await analyzeUserIntent(context, openai, modelId, user);
  }

  private async selectAndConfigureAgent(
    intentResult: IntentAnalysisResult | undefined,
    chatBody: ChatBody,
    user: Session['user']
  ): Promise<AgentExecutionRequest> {
    const settingsService = getAgentSettingsService();
    const agentSettings = settingsService.getAgentSettings();

    // Determine agent type
    let agentType: AgentType;
    if (intentResult && agentSettings.enabledAgentTypes.includes(intentResult.recommendedAgent)) {
      agentType = intentResult.recommendedAgent;
    } else {
      agentType = this.selectFallbackAgent(agentSettings);
    }

    // Get agent configuration
    const agentConfig = settingsService.getAgentConfiguration(agentType);

    // Build execution request
    const executionRequest: AgentExecutionRequest = {
      agentType,
      context: {
        query: this.extractQueryFromChatBody(chatBody),
        model: { 
          id: chatBody.model.id, 
          name: chatBody.model.name,
          maxLength: chatBody.model.maxLength || 4000,
          tokenLimit: chatBody.model.tokenLimit || 4000
        },
        messages: chatBody.messages || [],
        user: user,
        locale: 'en',
        context: {
          sessionId: this.generateSessionId(user),
          parameters: intentResult?.parameters || {},
          conversationHistory: this.extractConversationHistory(chatBody),
        }
      },
      config: {
        timeout: agentConfig.timeout,
      },
    };

    return executionRequest;
  }

  private async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return await executeAgentRequest(request);
  }

  private async executeFallbackAgent(
    originalRequest: AgentExecutionRequest
  ): Promise<AgentExecutionResult> {
    const fallbackRequest: AgentExecutionRequest = {
      ...originalRequest,
      agentType: AgentType.FOUNDRY,
      context: {
        ...originalRequest.context,
        context: {
          ...originalRequest.context.context,
          parameters: {
            ...originalRequest.context.context,
            fallbackReason: 'Original agent execution failed',
            originalAgentType: originalRequest.agentType,
          },
        },
      },
    };

    return await executeAgentRequest(fallbackRequest);
  }

  private async processResponse(
    agentResult: AgentExecutionResult,
    intentResult: IntentAnalysisResult | undefined,
    chatBody: ChatBody
  ): Promise<AgentResponse> {
    // Add any response post-processing here
    // For now, just return the agent response
    return agentResult.response;
  }

  private async cacheResult(
    chatBody: ChatBody,
    user: Session['user'],
    response: AgentResponse
  ): Promise<void> {
    const requestHash = this.generateRequestHash(chatBody, user);
    this.requestCache.set(requestHash, {
      result: response,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.requestCache.size > 1000) {
      const firstKey = this.requestCache.keys().next().value;
      this.requestCache.delete(firstKey);
    }
  }

  private async recordMetrics(
    intentResult: IntentAnalysisResult | undefined,
    agentResult: AgentExecutionResult,
    startTime: number
  ): Promise<void> {
    if (intentResult) {
      const responseTime = Date.now() - startTime;
      recordIntentAnalysisPerformance(
        intentResult.recommendedAgent,
        agentResult.response.success,
        responseTime
      );
    }
  }

  private buildIntentAnalysisContext(
    chatBody: ChatBody,
    user: Session['user']
  ): IntentAnalysisContext {
    return {
      query: this.extractQueryFromChatBody(chatBody),
      conversationHistory: this.extractConversationHistory(chatBody),
      locale: 'en',
      userPreferences: {
        languagePreference: 'en',
      },
      additionalContext: {
        messageCount: chatBody.messages.length,
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

    if (Array.isArray(lastMessage.content)) {
      const contentArray = lastMessage.content as any[];
      const textContent = contentArray.find(item => item.type === 'text');
      return textContent ? textContent.text : '';
    }

    return '';
  }

  private extractConversationHistory(chatBody: ChatBody): string[] {
    return chatBody.messages
      .slice(-5)
      .map(msg => {
        if (typeof msg.content === 'string') {
          return `${msg.role}: ${msg.content}`;
        }
        if (Array.isArray(msg.content)) {
          const contentArray = msg.content as any[];
          const textContent = contentArray.find(item => item.type === 'text');
          return textContent ? `${msg.role}: ${textContent.text}` : `${msg.role}: [non-text content]`;
        }
        return `${msg.role}: [complex content]`;
      });
  }

  private selectFallbackAgent(agentSettings: AgentSettings): AgentType {
    if (agentSettings.enabledAgentTypes.includes(AgentType.FOUNDRY)) {
      return AgentType.FOUNDRY;
    }
    if (agentSettings.enabledAgentTypes.includes(AgentType.STANDARD_CHAT)) {
      return AgentType.STANDARD_CHAT;
    }
    return agentSettings.enabledAgentTypes[0] || AgentType.STANDARD_CHAT;
  }

  private generatePipelineId(): string {
    const randomPart = crypto.randomBytes(9).toString('base64url').substr(0, 9);
    return `pipeline-${Date.now()}-${randomPart}`;
  }

  private generateSessionId(user: Session['user']): string {
    const randomPart = crypto.randomBytes(9).toString('base64url').substr(0, 9);
    return `${user.id || 'anonymous'}-${Date.now()}-${randomPart}`;
  }

  private generateRequestHash(chatBody: ChatBody, user: Session['user']): string {
    const query = this.extractQueryFromChatBody(chatBody);
    const hashData = {
      query: query.toLowerCase().trim(),
      modelId: chatBody.model.id,
      userId: user.id || 'anonymous',
      messageCount: chatBody.messages.length,
    };
    
    const str = JSON.stringify(hashData, Object.keys(hashData).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private createCachedResult(
    cachedResult: any,
    stages: PipelineStageResult[],
    pipelineId: string,
    startTime: number
  ): PipelineExecutionResult {
    return {
      success: true,
      agentResponse: cachedResult,
      processingTime: Date.now() - startTime,
      stages,
      metadata: {
        pipelineId,
        timestamp: new Date(),
        user: {} as Session['user'],
        modelId: '',
        stagesExecuted: stages.map(s => s.stage),
        fallbackUsed: false,
        cacheHit: true,
      },
    };
  }

  private buildMetadata(
    pipelineId: string,
    user: Session['user'],
    modelId: string,
    agentType: AgentType | undefined,
    stages: PipelineStageResult[],
    startTime: number,
    error?: Error
  ): PipelineMetadata {
    return {
      pipelineId,
      timestamp: new Date(),
      user,
      modelId,
      agentType,
      stagesExecuted: stages.map(s => s.stage),
      fallbackUsed: stages.some(s => s.stage === 'fallback_execution'),
      cacheHit: stages.some(s => s.stage === 'deduplication' && s.data?.isDuplicate),
    };
  }
}

/**
 * Convenience function to get the singleton pipeline instance
 */
export function getAgentRequestPipeline(config?: Partial<PipelineConfig>): AgentRequestPipeline {
  return AgentRequestPipeline.getInstance(config);
}

/**
 * Convenience function to process agent request
 */
export async function processAgentRequest(
  chatBody: ChatBody,
  openai: AzureOpenAI,
  user: Session['user'],
  modelId: string
): Promise<PipelineExecutionResult> {
  const pipeline = getAgentRequestPipeline();
  return await pipeline.processRequest(chatBody, openai, user, modelId);
}