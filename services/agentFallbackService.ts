/**
 * Agent Fallback Service
 *
 * Provides intelligent fallback mechanisms for agent failures,
 * including agent switching, feature degradation, and alternative workflows.
 */
import { AgentType } from '@/types/agent';

import {
  AgentError,
  AgentErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  getAgentErrorHandlingService,
} from './agentErrorHandlingService';
import { AzureMonitorLoggingService } from './loggingService';

/**
 * Fallback strategy types
 */
export enum FallbackStrategy {
  AGENT_SWITCH = 'agent_switch',
  FEATURE_DEGRADATION = 'feature_degradation',
  ALTERNATIVE_WORKFLOW = 'alternative_workflow',
  CACHED_RESPONSE = 'cached_response',
  MANUAL_INTERVENTION = 'manual_intervention',
  GRACEFUL_FAILURE = 'graceful_failure',
}

/**
 * Fallback configuration for each agent type
 */
export interface AgentFallbackConfig {
  agentType: AgentType;
  fallbackChain: AgentType[];
  allowedStrategies: FallbackStrategy[];
  degradationOptions: {
    features: string[];
    retainCore: boolean;
    userNotification: string;
  };
  alternativeWorkflows: {
    [feature: string]: AlternativeWorkflow;
  };
  cacheConfig: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number; // number of cached responses
  };
}

/**
 * Alternative workflow definition
 */
export interface AlternativeWorkflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  fallbackAgent?: AgentType;
  userMessage: string;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  type: 'user_input' | 'agent_call' | 'processing' | 'validation';
  description: string;
  agentType?: AgentType;
  parameters?: Record<string, any>;
  required: boolean;
}

/**
 * Fallback execution result
 */
export interface FallbackResult {
  success: boolean;
  strategy: FallbackStrategy;
  fallbackAgent?: AgentType;
  degradedFeatures?: string[];
  alternativeWorkflow?: AlternativeWorkflow;
  cachedResponse?: any;
  userMessage: string;
  requiresUserAction: boolean;
  actionInstructions?: string;
  metadata?: {
    originalAgent: AgentType;
    errorCategory: AgentErrorCategory;
    fallbackLatency: number;
    confidence: number;
  };
}

/**
 * Cached response entry
 */
interface CachedResponse {
  key: string;
  response: any;
  timestamp: number;
  agentType: AgentType;
  ttl: number;
}

/**
 * Agent Fallback Service
 */
export class AgentFallbackService {
  private logger: AzureMonitorLoggingService;
  private errorHandlingService = getAgentErrorHandlingService();
  private fallbackConfigs: Map<AgentType, AgentFallbackConfig> = new Map();
  private responseCache: Map<string, CachedResponse> = new Map();
  private fallbackHistory: Map<string, FallbackResult[]> = new Map();

  constructor() {
    const loggerInstance = AzureMonitorLoggingService.getInstance();
    if (!loggerInstance) {
      throw new Error('Failed to initialize AzureMonitorLoggingService');
    }
    this.logger = loggerInstance;
    this.initializeFallbackConfigs();
    this.startCacheCleanup();
  }

  /**
   * Initialize fallback configurations for each agent type
   */
  private initializeFallbackConfigs(): void {
    // Web Search Agent Fallback Config
    this.fallbackConfigs.set(AgentType.WEB_SEARCH, {
      agentType: AgentType.WEB_SEARCH,
      fallbackChain: [AgentType.LOCAL_KNOWLEDGE, AgentType.STANDARD_CHAT],
      allowedStrategies: [
        FallbackStrategy.AGENT_SWITCH,
        FallbackStrategy.CACHED_RESPONSE,
        FallbackStrategy.FEATURE_DEGRADATION,
      ],
      degradationOptions: {
        features: ['real_time_search', 'image_search', 'news_search'],
        retainCore: true,
        userNotification: 'Using local knowledge instead of live web search',
      },
      alternativeWorkflows: {
        search: {
          name: 'Manual Search Assistance',
          description: 'Guide user through manual search process',
          steps: [
            {
              id: 'suggest_keywords',
              type: 'processing',
              description: 'Suggest search keywords to user',
              required: true,
            },
            {
              id: 'user_search',
              type: 'user_input',
              description: 'User performs manual search',
              required: true,
            },
            {
              id: 'analyze_results',
              type: 'agent_call',
              description: 'Analyze user-provided search results',
              agentType: AgentType.STANDARD_CHAT,
              required: false,
            },
          ],
          userMessage:
            'I can help you search manually. Let me suggest some keywords.',
        },
      },
      cacheConfig: {
        enabled: true,
        ttl: 3600, // 1 hour
        maxSize: 100,
      },
    });

    // Code Interpreter Agent Fallback Config
    this.fallbackConfigs.set(AgentType.CODE_INTERPRETER, {
      agentType: AgentType.CODE_INTERPRETER,
      fallbackChain: [AgentType.STANDARD_CHAT],
      allowedStrategies: [
        FallbackStrategy.FEATURE_DEGRADATION,
        FallbackStrategy.ALTERNATIVE_WORKFLOW,
        FallbackStrategy.AGENT_SWITCH,
      ],
      degradationOptions: {
        features: ['code_execution', 'file_operations', 'package_installation'],
        retainCore: false,
        userNotification:
          'Code execution unavailable, providing code review instead',
      },
      alternativeWorkflows: {
        code_execution: {
          name: 'Code Review and Guidance',
          description: 'Provide code review without execution',
          steps: [
            {
              id: 'code_analysis',
              type: 'agent_call',
              description: 'Analyze code syntax and logic',
              agentType: AgentType.STANDARD_CHAT,
              required: true,
            },
            {
              id: 'suggest_improvements',
              type: 'processing',
              description: 'Suggest code improvements',
              required: true,
            },
            {
              id: 'execution_guidance',
              type: 'user_input',
              description: 'Guide user through manual execution',
              required: false,
            },
          ],
          userMessage:
            'I can review your code and provide guidance for manual execution.',
        },
      },
      cacheConfig: {
        enabled: false,
        ttl: 0,
        maxSize: 0,
      },
    });

    // URL Pull Agent Fallback Config
    this.fallbackConfigs.set(AgentType.URL_PULL, {
      agentType: AgentType.URL_PULL,
      fallbackChain: [AgentType.WEB_SEARCH, AgentType.STANDARD_CHAT],
      allowedStrategies: [
        FallbackStrategy.AGENT_SWITCH,
        FallbackStrategy.ALTERNATIVE_WORKFLOW,
        FallbackStrategy.CACHED_RESPONSE,
      ],
      degradationOptions: {
        features: ['content_extraction', 'metadata_parsing', 'link_following'],
        retainCore: true,
        userNotification: 'Using web search instead of direct URL access',
      },
      alternativeWorkflows: {
        url_access: {
          name: 'Manual Content Extraction',
          description: 'Guide user through manual content extraction',
          steps: [
            {
              id: 'url_validation',
              type: 'validation',
              description: 'Validate URL format',
              required: true,
            },
            {
              id: 'user_copy_content',
              type: 'user_input',
              description: 'User copies content manually',
              required: true,
            },
            {
              id: 'content_analysis',
              type: 'agent_call',
              description: 'Analyze provided content',
              agentType: AgentType.STANDARD_CHAT,
              required: true,
            },
          ],
          userMessage:
            "Please copy the content from the webpage and I'll analyze it.",
        },
      },
      cacheConfig: {
        enabled: true,
        ttl: 1800, // 30 minutes
        maxSize: 50,
      },
    });

    // Local Knowledge Agent Fallback Config
    this.fallbackConfigs.set(AgentType.LOCAL_KNOWLEDGE, {
      agentType: AgentType.LOCAL_KNOWLEDGE,
      fallbackChain: [AgentType.WEB_SEARCH, AgentType.STANDARD_CHAT],
      allowedStrategies: [
        FallbackStrategy.AGENT_SWITCH,
        FallbackStrategy.FEATURE_DEGRADATION,
        FallbackStrategy.CACHED_RESPONSE,
      ],
      degradationOptions: {
        features: ['semantic_search', 'document_ranking', 'content_extraction'],
        retainCore: false,
        userNotification:
          'Local knowledge unavailable, using web search instead',
      },
      alternativeWorkflows: {},
      cacheConfig: {
        enabled: true,
        ttl: 7200, // 2 hours
        maxSize: 200,
      },
    });

    // Standard Chat Agent (no fallback needed - it's the final fallback)
    this.fallbackConfigs.set(AgentType.STANDARD_CHAT, {
      agentType: AgentType.STANDARD_CHAT,
      fallbackChain: [],
      allowedStrategies: [FallbackStrategy.GRACEFUL_FAILURE],
      degradationOptions: {
        features: [],
        retainCore: true,
        userNotification: 'Operating in standard chat mode',
      },
      alternativeWorkflows: {},
      cacheConfig: {
        enabled: false,
        ttl: 0,
        maxSize: 0,
      },
    });
  }

  /**
   * Execute fallback mechanism for a failed agent
   */
  async executeFallback(
    error: AgentError,
    context: {
      originalRequest: any;
      userInput: string;
      conversationHistory?: any[];
      preferredStrategy?: FallbackStrategy;
    },
  ): Promise<FallbackResult> {
    const startTime = Date.now();
    const config =
      error.agentType !== 'unknown'
        ? this.fallbackConfigs.get(error.agentType)
        : undefined;

    if (!config) {
      return this.createGracefulFailureResult(
        error,
        'No fallback configuration available',
      );
    }

    // Log fallback attempt
    await this.logger.logCustomMetric('AgentFallbackInitiated', 1, 'count', {
      originalAgent: error.agentType,
      errorCategory: error.category,
      errorCode: error.code,
      availableStrategies: config.allowedStrategies.join(','),
    });

    // Try strategies in order of preference
    const strategies = context.preferredStrategy
      ? [
          context.preferredStrategy,
          ...config.allowedStrategies.filter(
            (s) => s !== context.preferredStrategy,
          ),
        ]
      : config.allowedStrategies;

    for (const strategy of strategies) {
      try {
        const result = await this.executeStrategy(
          strategy,
          error,
          config,
          context,
        );

        if (result.success) {
          result.metadata = {
            originalAgent: error.agentType as AgentType,
            errorCategory: error.category,
            fallbackLatency: Date.now() - startTime,
            confidence: this.calculateConfidence(strategy, error),
          };

          // Store in history
          this.storeFallbackHistory(error.agentType as AgentType, result);

          // Log successful fallback
          await this.logger.logCustomMetric(
            'AgentFallbackSuccess',
            1,
            'count',
            {
              originalAgent: error.agentType,
              strategy: strategy,
              fallbackAgent: result.fallbackAgent || '',
              latency: result.metadata?.fallbackLatency || 0,
              confidence: result.metadata?.confidence || 0,
            },
          );

          return result;
        }
      } catch (strategyError) {
        console.warn(`Fallback strategy ${strategy} failed:`, strategyError);
        continue;
      }
    }

    // All strategies failed
    const gracefulResult = this.createGracefulFailureResult(
      error,
      'All fallback strategies failed',
    );
    gracefulResult.metadata = {
      originalAgent: error.agentType as AgentType,
      errorCategory: error.category,
      fallbackLatency: Date.now() - startTime,
      confidence: 0,
    };

    await this.logger.logCustomMetric('AgentFallbackFailure', 1, 'count', {
      originalAgent: error.agentType,
      errorCategory: error.category,
      attemptedStrategies: strategies.join(','),
      latency: gracefulResult.metadata?.fallbackLatency || 0,
    });

    return gracefulResult;
  }

  /**
   * Execute a specific fallback strategy
   */
  private async executeStrategy(
    strategy: FallbackStrategy,
    error: AgentError,
    config: AgentFallbackConfig,
    context: any,
  ): Promise<FallbackResult> {
    switch (strategy) {
      case FallbackStrategy.AGENT_SWITCH:
        return this.executeAgentSwitch(config, context);

      case FallbackStrategy.CACHED_RESPONSE:
        return this.executeCachedResponse(config, context);

      case FallbackStrategy.FEATURE_DEGRADATION:
        return this.executeFeatureDegradation(config, context);

      case FallbackStrategy.ALTERNATIVE_WORKFLOW:
        return this.executeAlternativeWorkflow(config, context);

      case FallbackStrategy.GRACEFUL_FAILURE:
        return this.createGracefulFailureResult(
          error,
          'Agent operation failed',
        );

      default:
        throw new Error(`Unknown fallback strategy: ${strategy}`);
    }
  }

  /**
   * Execute agent switch fallback
   */
  private async executeAgentSwitch(
    config: AgentFallbackConfig,
    context: any,
  ): Promise<FallbackResult> {
    if (config.fallbackChain.length === 0) {
      return {
        success: false,
        strategy: FallbackStrategy.AGENT_SWITCH,
        userMessage: 'No alternative agents available',
        requiresUserAction: false,
      };
    }

    const fallbackAgent = config.fallbackChain[0];

    return {
      success: true,
      strategy: FallbackStrategy.AGENT_SWITCH,
      fallbackAgent,
      userMessage: `Switching to ${fallbackAgent} agent to handle your request`,
      requiresUserAction: false,
    };
  }

  /**
   * Execute cached response fallback
   */
  private async executeCachedResponse(
    config: AgentFallbackConfig,
    context: any,
  ): Promise<FallbackResult> {
    if (!config.cacheConfig.enabled) {
      return {
        success: false,
        strategy: FallbackStrategy.CACHED_RESPONSE,
        userMessage: 'Caching not enabled for this agent',
        requiresUserAction: false,
      };
    }

    const cacheKey = this.generateCacheKey(config.agentType, context.userInput);
    const cached = this.responseCache.get(cacheKey);

    if (!cached || this.isCacheExpired(cached)) {
      return {
        success: false,
        strategy: FallbackStrategy.CACHED_RESPONSE,
        userMessage: 'No cached response available',
        requiresUserAction: false,
      };
    }

    return {
      success: true,
      strategy: FallbackStrategy.CACHED_RESPONSE,
      cachedResponse: cached.response,
      userMessage: 'Using cached response from previous similar request',
      requiresUserAction: false,
    };
  }

  /**
   * Execute feature degradation fallback
   */
  private async executeFeatureDegradation(
    config: AgentFallbackConfig,
    context: any,
  ): Promise<FallbackResult> {
    const degradedFeatures = config.degradationOptions.features;

    if (!config.degradationOptions.retainCore) {
      return {
        success: false,
        strategy: FallbackStrategy.FEATURE_DEGRADATION,
        userMessage: 'Core functionality cannot be maintained',
        requiresUserAction: false,
      };
    }

    return {
      success: true,
      strategy: FallbackStrategy.FEATURE_DEGRADATION,
      degradedFeatures,
      userMessage: config.degradationOptions.userNotification,
      requiresUserAction: false,
    };
  }

  /**
   * Execute alternative workflow fallback
   */
  private async executeAlternativeWorkflow(
    config: AgentFallbackConfig,
    context: any,
  ): Promise<FallbackResult> {
    // Find the most appropriate alternative workflow
    const workflows = Object.values(config.alternativeWorkflows);

    if (workflows.length === 0) {
      return {
        success: false,
        strategy: FallbackStrategy.ALTERNATIVE_WORKFLOW,
        userMessage: 'No alternative workflows available',
        requiresUserAction: false,
      };
    }

    const workflow = workflows[0]; // For simplicity, use the first one

    return {
      success: true,
      strategy: FallbackStrategy.ALTERNATIVE_WORKFLOW,
      alternativeWorkflow: workflow,
      userMessage: workflow.userMessage,
      requiresUserAction: true,
      actionInstructions: this.generateWorkflowInstructions(workflow),
    };
  }

  /**
   * Create graceful failure result
   */
  private createGracefulFailureResult(
    error: AgentError,
    message: string,
  ): FallbackResult {
    return {
      success: false,
      strategy: FallbackStrategy.GRACEFUL_FAILURE,
      userMessage: `${message}. Please try rephrasing your request or contact support.`,
      requiresUserAction: true,
      actionInstructions:
        'Try rephrasing your request or use a different approach',
    };
  }

  /**
   * Generate cache key for responses
   */
  private generateCacheKey(agentType: AgentType, input: string): string {
    const hash = input.toLowerCase().trim().replace(/\s+/g, ' ');
    return `${agentType}:${btoa(hash)}`;
  }

  /**
   * Check if cached response is expired
   */
  private isCacheExpired(cached: CachedResponse): boolean {
    return Date.now() > cached.timestamp + cached.ttl * 1000;
  }

  /**
   * Calculate confidence score for fallback strategy
   */
  private calculateConfidence(
    strategy: FallbackStrategy,
    error: AgentError,
  ): number {
    const baseConfidence = {
      [FallbackStrategy.AGENT_SWITCH]: 0.8,
      [FallbackStrategy.CACHED_RESPONSE]: 0.7,
      [FallbackStrategy.FEATURE_DEGRADATION]: 0.6,
      [FallbackStrategy.ALTERNATIVE_WORKFLOW]: 0.5,
      [FallbackStrategy.GRACEFUL_FAILURE]: 0.1,
      [FallbackStrategy.MANUAL_INTERVENTION]: 0.3,
    };

    let confidence = baseConfidence[strategy] || 0.5;

    // Adjust based on error category
    if (error.category === AgentErrorCategory.NETWORK) {
      confidence *= 0.9; // Network issues are harder to work around
    } else if (error.category === AgentErrorCategory.RATE_LIMIT) {
      confidence *= 1.1; // Rate limits are easier to work around
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Generate workflow instructions for user
   */
  private generateWorkflowInstructions(workflow: AlternativeWorkflow): string {
    const steps = workflow.steps
      .filter((step) => step.required)
      .map((step, index) => `${index + 1}. ${step.description}`)
      .join('\n');

    return `To complete this task manually:\n${steps}`;
  }

  /**
   * Store fallback history for analysis
   */
  private storeFallbackHistory(
    agentType: AgentType,
    result: FallbackResult,
  ): void {
    const key = agentType;
    const history = this.fallbackHistory.get(key) || [];

    history.push(result);

    // Keep only last 50 entries per agent
    if (history.length > 50) {
      history.shift();
    }

    this.fallbackHistory.set(key, history);
  }

  /**
   * Cache a successful response
   */
  cacheResponse(agentType: AgentType, input: string, response: any): void {
    const config = this.fallbackConfigs.get(agentType);

    if (!config?.cacheConfig.enabled) {
      return;
    }

    const cacheKey = this.generateCacheKey(agentType, input);
    const cached: CachedResponse = {
      key: cacheKey,
      response,
      timestamp: Date.now(),
      agentType,
      ttl: config.cacheConfig.ttl,
    };

    this.responseCache.set(cacheKey, cached);

    // Enforce cache size limit
    if (this.responseCache.size > config.cacheConfig.maxSize) {
      const oldestKey = Array.from(this.responseCache.keys())[0];
      this.responseCache.delete(oldestKey);
    }
  }

  /**
   * Start cache cleanup process
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, cached] of this.responseCache.entries()) {
        if (this.isCacheExpired(cached)) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach((key) => this.responseCache.delete(key));
    }, 60000); // Cleanup every minute
  }

  /**
   * Get fallback statistics
   */
  getFallbackStatistics(): {
    fallbacksByAgent: Record<AgentType, number>;
    fallbacksByStrategy: Record<FallbackStrategy, number>;
    successRate: number;
    averageLatency: number;
    cacheStats: {
      size: number;
      hitRate: number;
    };
  } {
    const fallbacksByAgent: Record<string, number> = {};
    const fallbacksByStrategy: Record<string, number> = {};
    let totalFallbacks = 0;
    let successfulFallbacks = 0;
    let totalLatency = 0;

    for (const [agentType, history] of this.fallbackHistory.entries()) {
      fallbacksByAgent[agentType] = history.length;
      totalFallbacks += history.length;

      for (const result of history) {
        fallbacksByStrategy[result.strategy] =
          (fallbacksByStrategy[result.strategy] || 0) + 1;

        if (result.success) {
          successfulFallbacks++;
        }

        if (result.metadata?.fallbackLatency) {
          totalLatency += result.metadata.fallbackLatency;
        }
      }
    }

    return {
      fallbacksByAgent: fallbacksByAgent as Record<AgentType, number>,
      fallbacksByStrategy: fallbacksByStrategy as Record<
        FallbackStrategy,
        number
      >,
      successRate:
        totalFallbacks > 0 ? successfulFallbacks / totalFallbacks : 0,
      averageLatency: totalFallbacks > 0 ? totalLatency / totalFallbacks : 0,
      cacheStats: {
        size: this.responseCache.size,
        hitRate: 0, // Would need to track cache hits/misses separately
      },
    };
  }

  /**
   * Clear fallback history and cache
   */
  clearHistory(): void {
    this.fallbackHistory.clear();
    this.responseCache.clear();
  }
}

/**
 * Global service instance
 */
let agentFallbackServiceInstance: AgentFallbackService | null = null;

/**
 * Get or create the agent fallback service instance
 */
export function getAgentFallbackService(): AgentFallbackService {
  if (!agentFallbackServiceInstance) {
    agentFallbackServiceInstance = new AgentFallbackService();
  }
  return agentFallbackServiceInstance;
}

/**
 * Convenience function to execute fallback
 */
export async function executeAgentFallback(
  error: AgentError,
  context: {
    originalRequest: any;
    userInput: string;
    conversationHistory?: any[];
    preferredStrategy?: FallbackStrategy;
  },
): Promise<FallbackResult> {
  const service = getAgentFallbackService();
  return await service.executeFallback(error, context);
}
