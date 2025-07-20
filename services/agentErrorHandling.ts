import { Session } from 'next-auth';
import { AzureOpenAI } from 'openai';

import { 
  AgentType, 
  AgentExecutionRequest, 
  AgentExecutionResult, 
  AgentExecutionContext,
  AgentResponse 
} from '@/types/agent';
import { ChatBody } from '@/types/chat';
import { 
  IntentAnalysisResult 
} from '@/types/intentAnalysis';

import { executeAgentRequest } from './agentFactory';
import { getAgentSettingsService } from './agentSettingsService';


/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better classification
 */
export enum ErrorCategory {
  AGENT_UNAVAILABLE = 'agent_unavailable',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMITED = 'rate_limited',
  TIMEOUT = 'timeout',
  INVALID_REQUEST = 'invalid_request',
  INVALID_RESPONSE = 'invalid_response',
  NETWORK_ERROR = 'network_error',
  SERVICE_ERROR = 'service_error',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  CONFIGURATION_ERROR = 'configuration_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN = 'unknown'
}

/**
 * Structured error information
 */
export interface AgentError {
  id: string;
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  agentType?: AgentType;
  timestamp: Date;
  retryable: boolean;
  retryAfter?: number; // seconds
  context?: Record<string, any>;
  stackTrace?: string;
  userMessage?: string;
  suggestedActions?: string[];
}

/**
 * Fallback strategy configuration
 */
export interface FallbackStrategy {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number;
  fallbackAgents: AgentType[];
  gracefulDegradation: boolean;
  timeoutThreshold: number; // milliseconds
}

/**
 * Recovery action result
 */
export interface RecoveryResult {
  success: boolean;
  agentResponse?: AgentResponse;
  fallbackUsed: boolean;
  recoveryStrategy: string;
  attemptsUsed: number;
  totalRecoveryTime: number;
  errors: AgentError[];
}

/**
 * Circuit breaker state
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker configuration for agents
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  monitoringWindow: number; // milliseconds
  minimumRequests: number;
}

/**
 * Agent Error Handling and Fallback System
 * Provides comprehensive error handling, fallback mechanisms, and recovery strategies
 */
export class AgentErrorHandlingService {
  private static instance: AgentErrorHandlingService | null = null;
  
  private circuitBreakers: Map<AgentType, CircuitBreakerState>;
  private circuitBreakerStats: Map<AgentType, {
    failures: number;
    requests: number;
    lastFailureTime: number;
    windowStart: number;
  }>;
  private fallbackStrategies: Map<AgentType, FallbackStrategy>;
  private errorHistory: Map<string, AgentError[]>;

  private constructor() {
    
    this.circuitBreakers = new Map();
    this.circuitBreakerStats = new Map();
    this.fallbackStrategies = new Map();
    this.errorHistory = new Map();
    this.initializeDefaultStrategies();
  }

  /**
   * Singleton pattern - get or create error handling service instance
   */
  public static getInstance(): AgentErrorHandlingService {
    if (!AgentErrorHandlingService.instance) {
      AgentErrorHandlingService.instance = new AgentErrorHandlingService();
    }
    return AgentErrorHandlingService.instance;
  }

  /**
   * Execute agent request with comprehensive error handling and fallback
   */
  public async executeWithFallback(
    request: AgentExecutionRequest,
    openai: AzureOpenAI,
    user: Session['user']
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const errors: AgentError[] = [];
    let attemptsUsed = 0;

    try {
      console.log('Starting agent execution with fallback', {
        agentType: request.agentType,
        sessionId: (request.context as any).sessionId,
        hasCircuitBreaker: this.circuitBreakers.has(request.agentType),
      });

      // Check circuit breaker
      if (!this.isCircuitBreakerClosed(request.agentType)) {
        const error = this.createError(
          'CIRCUIT_BREAKER_OPEN',
          `Circuit breaker is open for agent type ${request.agentType}`,
          ErrorCategory.AGENT_UNAVAILABLE,
          ErrorSeverity.MEDIUM,
          request.agentType
        );
        errors.push(error);
        return this.attemptFallback(request, openai, user, errors, startTime);
      }

      // Try primary agent execution
      const primaryResult = await this.executeWithRetry(request, 1);
      if (primaryResult.success) {
        this.recordSuccess(request.agentType);
        return {
          success: true,
          agentResponse: primaryResult.agentResponse,
          fallbackUsed: false,
          recoveryStrategy: 'primary_execution',
          attemptsUsed: 1,
          totalRecoveryTime: Date.now() - startTime,
          errors: [],
        };
      }

      // Primary execution failed, record error and try fallback
      const primaryError = this.classifyError((primaryResult.error as Error), request.agentType);
      errors.push(primaryError);
      this.recordFailure(request.agentType, primaryError);

      return await this.attemptFallback(request, openai, user, errors, startTime);
    } catch (error) {
      const agentError = this.classifyError(error as Error, request.agentType);
      errors.push(agentError);
      this.recordFailure(request.agentType, agentError);

      const totalRecoveryTime = Date.now() - startTime;

      console.error('Agent execution with fallback failed completely', error as Error, {
        agentType: request.agentType,
        attemptsUsed,
        totalRecoveryTime,
        errorCount: errors.length,
      });

      return {
        success: false,
        fallbackUsed: true,
        recoveryStrategy: 'fallback_failed',
        attemptsUsed,
        totalRecoveryTime,
        errors,
      };
    }
  }

  /**
   * Handle specific error types with targeted recovery strategies
   */
  public async handleSpecificError(
    error: AgentError,
    originalRequest: AgentExecutionRequest,
    context: {
      openai: AzureOpenAI;
      user: Session['user'];
      intentResult?: IntentAnalysisResult;
    }
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    try {
      switch (error.category) {
        case ErrorCategory.RATE_LIMITED:
          return await this.handleRateLimitError(error, originalRequest, context);

        case ErrorCategory.TIMEOUT:
          return await this.handleTimeoutError(error, originalRequest, context);

        case ErrorCategory.AUTHENTICATION:
        case ErrorCategory.AUTHORIZATION:
          return await this.handleAuthError(error, originalRequest, context);

        case ErrorCategory.RESOURCE_EXHAUSTED:
          return await this.handleResourceExhaustedError(error, originalRequest, context);

        case ErrorCategory.INVALID_REQUEST:
          return await this.handleInvalidRequestError(error, originalRequest, context);

        default:
          return await this.handleGenericError(error, originalRequest, context);
      }
    } catch (recoveryError) {
      console.error('Error recovery failed', recoveryError as Error, {
        originalErrorCode: error.code,
        agentType: originalRequest.agentType,
      });

      return {
        success: false,
        fallbackUsed: true,
        recoveryStrategy: 'recovery_failed',
        attemptsUsed: 1,
        totalRecoveryTime: Date.now() - startTime,
        errors: [error, this.classifyError(recoveryError as Error, originalRequest.agentType)],
      };
    }
  }

  /**
   * Configure fallback strategy for an agent type
   */
  public configureFallbackStrategy(agentType: AgentType, strategy: Partial<FallbackStrategy>): void {
    const currentStrategy = this.fallbackStrategies.get(agentType) || this.getDefaultFallbackStrategy();
    const updatedStrategy = { ...currentStrategy, ...strategy };
    
    this.fallbackStrategies.set(agentType, updatedStrategy);
    
    console.log('Fallback strategy configured', {
      agentType,
      strategy: updatedStrategy,
    });
  }

  /**
   * Get circuit breaker status for an agent type
   */
  public getCircuitBreakerStatus(agentType: AgentType): {
    state: CircuitBreakerState;
    failures: number;
    requests: number;
    lastFailureTime?: Date;
  } {
    const state = this.circuitBreakers.get(agentType) || CircuitBreakerState.CLOSED;
    const stats = this.circuitBreakerStats.get(agentType) || {
      failures: 0,
      requests: 0,
      lastFailureTime: 0,
      windowStart: Date.now(),
    };

    return {
      state,
      failures: stats.failures,
      requests: stats.requests,
      lastFailureTime: stats.lastFailureTime > 0 ? new Date(stats.lastFailureTime) : undefined,
    };
  }

  /**
   * Get error statistics for monitoring
   */
  public getErrorStatistics(timeWindow: number = 3600000): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsByAgent: Record<AgentType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrors: AgentError[];
  } {
    const now = Date.now();
    const cutoff = now - timeWindow;
    const allErrors: AgentError[] = [];

    // Collect all errors within time window
    for (const errors of this.errorHistory.values()) {
      allErrors.push(...errors.filter(error => error.timestamp.getTime() > cutoff));
    }

    // Calculate statistics
    const errorsByCategory: Record<ErrorCategory, number> = {} as any;
    const errorsByAgent: Record<AgentType, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;

    for (const error of allErrors) {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      if (error.agentType) {
        errorsByAgent[error.agentType] = (errorsByAgent[error.agentType] || 0) + 1;
      }
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    }

    // Get top 10 most frequent errors
    const errorFrequency: Record<string, number> = {};
    for (const error of allErrors) {
      errorFrequency[error.code] = (errorFrequency[error.code] || 0) + 1;
    }

    const topErrorCodes = Object.entries(errorFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code]) => code);

    const topErrors = topErrorCodes.map(code => 
      allErrors.find(error => error.code === code)!
    );

    return {
      totalErrors: allErrors.length,
      errorsByCategory,
      errorsByAgent,
      errorsBySeverity,
      topErrors,
    };
  }

  /**
   * Create a user-friendly error message
   */
  public createUserFriendlyMessage(error: AgentError): string {
    if (error.userMessage) {
      return error.userMessage;
    }

    switch (error.category) {
      case ErrorCategory.RATE_LIMITED:
        return 'I\'m currently experiencing high demand. Please try again in a few moments.';

      case ErrorCategory.TIMEOUT:
        return 'Your request is taking longer than expected. Let me try a different approach.';

      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return 'I\'m having trouble accessing the required service. Please contact support if this persists.';

      case ErrorCategory.AGENT_UNAVAILABLE:
        return 'The requested service is temporarily unavailable. I\'ll use an alternative approach.';

      case ErrorCategory.INVALID_REQUEST:
        return 'There seems to be an issue with your request. Could you please rephrase or provide more details?';

      case ErrorCategory.NETWORK_ERROR:
        return 'I\'m experiencing connectivity issues. Please try again in a moment.';

      default:
        return 'I encountered an unexpected issue. Let me try to help you in a different way.';
    }
  }

  /**
   * Private helper methods
   */

  private async executeWithRetry(
    request: AgentExecutionRequest,
    maxRetries: number
  ): Promise<{ success: boolean; agentResponse?: AgentResponse; error?: Error }> {
    const strategy = this.fallbackStrategies.get(request.agentType) || this.getDefaultFallbackStrategy();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = strategy.retryDelay * Math.pow(strategy.backoffMultiplier, attempt - 2);
          await this.sleep(delay);
        }

        const result = await executeAgentRequest(request);
        
        if (result.response.success) {
          return { success: true, agentResponse: result.response };
        } else {
          lastError = new Error(result.response.content);
        }
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Check if error is retryable
        const agentError = this.classifyError(lastError, request.agentType);
        if (!agentError.retryable) {
          break;
        }
      }
    }

    return { success: false, error: lastError };
  }

  private async attemptFallback(
    originalRequest: AgentExecutionRequest,
    openai: AzureOpenAI,
    user: Session['user'],
    errors: AgentError[],
    startTime: number
  ): Promise<RecoveryResult> {
    const strategy = this.fallbackStrategies.get(originalRequest.agentType) || this.getDefaultFallbackStrategy();
    
    if (!strategy.enabled) {
      return {
        success: false,
        fallbackUsed: false,
        recoveryStrategy: 'fallback_disabled',
        attemptsUsed: 1,
        totalRecoveryTime: Date.now() - startTime,
        errors,
      };
    }

    // Try fallback agents in order
    for (const fallbackAgentType of strategy.fallbackAgents) {
      if (fallbackAgentType === originalRequest.agentType) {
        continue; // Skip same agent type
      }

      if (!this.isCircuitBreakerClosed(fallbackAgentType)) {
        continue; // Skip if circuit breaker is open
      }

      try {
        console.log('Attempting fallback agent', {
          originalAgent: originalRequest.agentType,
          fallbackAgent: fallbackAgentType,
        });

        const fallbackRequest: AgentExecutionRequest = {
          ...originalRequest,
          agentType: fallbackAgentType,
          context: {
            ...originalRequest.context,
          },
        };

        const fallbackResult = await this.executeWithRetry(fallbackRequest, strategy.maxRetries);
        
        if (fallbackResult.success) {
          this.recordSuccess(fallbackAgentType);
          return {
            success: true,
            agentResponse: fallbackResult.agentResponse!,
            fallbackUsed: true,
            recoveryStrategy: `fallback_to_${fallbackAgentType}`,
            attemptsUsed: 2,
            totalRecoveryTime: Date.now() - startTime,
            errors,
          };
        } else {
          const fallbackError = this.classifyError(fallbackResult.error!, fallbackAgentType);
          errors.push(fallbackError);
          this.recordFailure(fallbackAgentType, fallbackError);
        }
      } catch (error) {
        const fallbackError = this.classifyError(error as Error, fallbackAgentType);
        errors.push(fallbackError);
        this.recordFailure(fallbackAgentType, fallbackError);
      }
    }

    // All fallbacks failed, try graceful degradation
    if (strategy.gracefulDegradation) {
      return this.createGracefulDegradationResponse(originalRequest, errors, startTime);
    }

    return {
      success: false,
      fallbackUsed: true,
      recoveryStrategy: 'all_fallbacks_failed',
      attemptsUsed: 1 + strategy.fallbackAgents.length,
      totalRecoveryTime: Date.now() - startTime,
      errors,
    };
  }

  private async handleRateLimitError(
    error: AgentError,
    request: AgentExecutionRequest,
    context: { openai: AzureOpenAI; user: Session['user']; intentResult?: IntentAnalysisResult }
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const retryAfter = error.retryAfter || 60; // Default to 60 seconds

    console.log('Handling rate limit error', {
      agentType: request.agentType,
      retryAfter,
    });

    // Wait for the retry-after period
    await this.sleep(retryAfter * 1000);

    // Retry the original request
    const retryResult = await this.executeWithRetry(request, 1);
    
    if (retryResult.success) {
      return {
        success: true,
        agentResponse: retryResult.agentResponse!,
        fallbackUsed: false,
        recoveryStrategy: 'rate_limit_retry',
        attemptsUsed: 2,
        totalRecoveryTime: Date.now() - startTime,
        errors: [error],
      };
    }

    // If retry failed, try fallback
    return await this.attemptFallback(request, context.openai, context.user, [error], startTime);
  }

  private async handleTimeoutError(
    error: AgentError,
    request: AgentExecutionRequest,
    context: { openai: AzureOpenAI; user: Session['user']; intentResult?: IntentAnalysisResult }
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    // Try with extended timeout
    const extendedRequest: AgentExecutionRequest = {
      ...request,
      config: {
        ...request.config,
        timeout: (request.config?.timeout || 30000) * 2, // Double the timeout
      },
    };

    const retryResult = await this.executeWithRetry(extendedRequest, 1);
    
    if (retryResult.success) {
      return {
        success: true,
        agentResponse: retryResult.agentResponse!,
        fallbackUsed: false,
        recoveryStrategy: 'extended_timeout_retry',
        attemptsUsed: 2,
        totalRecoveryTime: Date.now() - startTime,
        errors: [error],
      };
    }

    // If retry failed, try fallback
    return await this.attemptFallback(request, context.openai, context.user, [error], startTime);
  }

  private async handleAuthError(
    error: AgentError,
    request: AgentExecutionRequest,
    context: { openai: AzureOpenAI; user: Session['user']; intentResult?: IntentAnalysisResult }
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    // Authentication errors are typically not retryable, go directly to fallback
    return await this.attemptFallback(request, context.openai, context.user, [error], startTime);
  }

  private async handleResourceExhaustedError(
    error: AgentError,
    request: AgentExecutionRequest,
    context: { openai: AzureOpenAI; user: Session['user']; intentResult?: IntentAnalysisResult }
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    // Wait a bit and retry once
    await this.sleep(5000); // 5 second delay

    const retryResult = await this.executeWithRetry(request, 1);
    
    if (retryResult.success) {
      return {
        success: true,
        agentResponse: retryResult.agentResponse!,
        fallbackUsed: false,
        recoveryStrategy: 'resource_retry',
        attemptsUsed: 2,
        totalRecoveryTime: Date.now() - startTime,
        errors: [error],
      };
    }

    // If retry failed, try fallback
    return await this.attemptFallback(request, context.openai, context.user, [error], startTime);
  }

  private async handleInvalidRequestError(
    error: AgentError,
    request: AgentExecutionRequest,
    context: { openai: AzureOpenAI; user: Session['user']; intentResult?: IntentAnalysisResult }
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    // Try to fix common request issues
    const fixedRequest = this.attemptRequestFix(request, error);
    
    if (fixedRequest) {
      const retryResult = await this.executeWithRetry(fixedRequest, 1);
      
      if (retryResult.success) {
        return {
          success: true,
          agentResponse: retryResult.agentResponse!,
          fallbackUsed: false,
          recoveryStrategy: 'request_fix_retry',
          attemptsUsed: 2,
          totalRecoveryTime: Date.now() - startTime,
          errors: [error],
        };
      }
    }

    // If fix failed or wasn't possible, try fallback
    return await this.attemptFallback(request, context.openai, context.user, [error], startTime);
  }

  private async handleGenericError(
    error: AgentError,
    request: AgentExecutionRequest,
    context: { openai: AzureOpenAI; user: Session['user']; intentResult?: IntentAnalysisResult }
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    // For generic errors, go directly to fallback
    return await this.attemptFallback(request, context.openai, context.user, [error], startTime);
  }

  private attemptRequestFix(request: AgentExecutionRequest, error: AgentError): AgentExecutionRequest | null {
    try {
      // Try to fix common issues based on error message
      if (error.message.includes('parameter')) {
        // Remove potentially problematic parameters
        const fixedRequest: AgentExecutionRequest = {
          ...request,
          context: {
            ...request.context,
          },
        };
        return fixedRequest;
      }

      if (error.message.includes('query') || error.message.includes('content')) {
        // Simplify the query
        const fixedRequest: AgentExecutionRequest = {
          ...request,
          context: {
            ...request.context,
            query: request.context.query.substring(0, 100), // Truncate query
          },
        };
        return fixedRequest;
      }

      return null;
    } catch {
      return null;
    }
  }

  private createGracefulDegradationResponse(
    request: AgentExecutionRequest,
    errors: AgentError[],
    startTime: number
  ): RecoveryResult {
    const degradedResponse: AgentResponse = {
      agentId: `error-handler-${Date.now()}`,
      agentType: request.agentType,
      content: this.createDegradedResponseContent(request, errors),
      success: false,
      metadata: {
        agentMetadata: {
          degraded: true,
          originalAgentType: request.agentType,
          errorCount: errors.length,
          timestamp: new Date(),
        },
      },
    };

    return {
      success: true, // Graceful degradation is considered a success
      agentResponse: degradedResponse,
      fallbackUsed: true,
      recoveryStrategy: 'graceful_degradation',
      attemptsUsed: 1,
      totalRecoveryTime: Date.now() - startTime,
      errors,
    };
  }

  private createDegradedResponseContent(request: AgentExecutionRequest, errors: AgentError[]): string {
    const userFriendlyErrors = errors.map(error => this.createUserFriendlyMessage(error));
    
    return `I apologize, but I'm currently experiencing some technical difficulties with the ${request.agentType} service. ${userFriendlyErrors[0]} 

I understand you were asking about: "${request.context.query.substring(0, 100)}${request.context.query.length > 100 ? '...' : ''}"

While I can't provide the specialized service you requested right now, I can offer some general assistance or suggestions. Please let me know if you'd like me to help in a different way, or you can try your request again later.`;
  }

  private classifyError(error: Error, agentType?: AgentType): AgentError {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message = error.message.toLowerCase();

    let category = ErrorCategory.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = true;
    let retryAfter: number | undefined;

    // Classify based on error message patterns
    if (message.includes('rate limit') || message.includes('too many requests')) {
      category = ErrorCategory.RATE_LIMITED;
      severity = ErrorSeverity.LOW;
      retryAfter = 60;
    } else if (message.includes('timeout') || message.includes('timed out')) {
      category = ErrorCategory.TIMEOUT;
      severity = ErrorSeverity.MEDIUM;
    } else if (message.includes('unauthorized') || message.includes('authentication')) {
      category = ErrorCategory.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
      retryable = false;
    } else if (message.includes('forbidden') || message.includes('permission')) {
      category = ErrorCategory.AUTHORIZATION;
      severity = ErrorSeverity.HIGH;
      retryable = false;
    } else if (message.includes('not found') || message.includes('unavailable')) {
      category = ErrorCategory.AGENT_UNAVAILABLE;
      severity = ErrorSeverity.MEDIUM;
    } else if (message.includes('network') || message.includes('connection')) {
      category = ErrorCategory.NETWORK_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (message.includes('invalid') || message.includes('bad request')) {
      category = ErrorCategory.INVALID_REQUEST;
      severity = ErrorSeverity.MEDIUM;
      retryable = false;
    } else if (message.includes('quota') || message.includes('limit exceeded')) {
      category = ErrorCategory.RESOURCE_EXHAUSTED;
      severity = ErrorSeverity.HIGH;
    }

    const agentError: AgentError = {
      id: errorId,
      code: this.generateErrorCode(category, agentType),
      message: error.message,
      category,
      severity,
      agentType,
      timestamp: new Date(),
      retryable,
      retryAfter,
      stackTrace: error.stack,
      context: {
        userAgent: 'chatbot-ui',
        timestamp: new Date().toISOString(),
      },
      suggestedActions: this.getSuggestedActions(category),
    };

    // Store error in history
    this.storeError(agentError);

    return agentError;
  }

  private generateErrorCode(category: ErrorCategory, agentType?: AgentType): string {
    const timestamp = Date.now().toString(36);
    const agentPrefix = agentType ? agentType.toUpperCase().replace('_', '') : 'UNKNOWN';
    const categoryPrefix = category.toUpperCase().replace('_', '');
    return `${agentPrefix}_${categoryPrefix}_${timestamp}`;
  }

  private getSuggestedActions(category: ErrorCategory): string[] {
    const actions: Record<ErrorCategory, string[]> = {
      [ErrorCategory.RATE_LIMITED]: ['Wait a few minutes before retrying', 'Try a different approach to your question'],
      [ErrorCategory.TIMEOUT]: ['Try breaking your request into smaller parts', 'Check your internet connection'],
      [ErrorCategory.AUTHENTICATION]: ['Contact support for authentication issues'],
      [ErrorCategory.AUTHORIZATION]: ['Contact support for permission issues'],
      [ErrorCategory.AGENT_UNAVAILABLE]: ['Try again later', 'Use a different tool or approach'],
      [ErrorCategory.NETWORK_ERROR]: ['Check your internet connection', 'Try again in a few moments'],
      [ErrorCategory.INVALID_REQUEST]: ['Rephrase your question', 'Provide more specific details'],
      [ErrorCategory.INVALID_RESPONSE]: ['Try rephrasing your request', 'Contact support if the issue persists'],
      [ErrorCategory.RESOURCE_EXHAUSTED]: ['Try again later when demand is lower'],
      [ErrorCategory.SERVICE_ERROR]: ['Try again in a few minutes'],
      [ErrorCategory.CONFIGURATION_ERROR]: ['Contact support for configuration issues'],
      [ErrorCategory.VALIDATION_ERROR]: ['Check your input format and try again'],
      [ErrorCategory.UNKNOWN]: ['Try rephrasing your request', 'Contact support if the issue persists'],
    };

    return actions[category] || actions[ErrorCategory.UNKNOWN];
  }

  private storeError(error: AgentError): void {
    const key = error.agentType || 'unknown';
    if (!this.errorHistory.has(key)) {
      this.errorHistory.set(key, []);
    }

    const errors = this.errorHistory.get(key)!;
    errors.push(error);

    // Keep only last 100 errors per agent type
    if (errors.length > 100) {
      errors.splice(0, errors.length - 100);
    }
  }

  private isCircuitBreakerClosed(agentType: AgentType): boolean {
    const state = this.circuitBreakers.get(agentType);
    const config = this.getCircuitBreakerConfig(agentType);

    if (state === CircuitBreakerState.OPEN) {
      const stats = this.circuitBreakerStats.get(agentType);
      if (stats && Date.now() - stats.lastFailureTime > config.recoveryTimeout) {
        // Transition to half-open
        this.circuitBreakers.set(agentType, CircuitBreakerState.HALF_OPEN);
        return true;
      }
      return false;
    }

    return true; // CLOSED or HALF_OPEN
  }

  private recordSuccess(agentType: AgentType): void {
    const state = this.circuitBreakers.get(agentType);
    
    if (state === CircuitBreakerState.HALF_OPEN) {
      // Transition back to closed
      this.circuitBreakers.set(agentType, CircuitBreakerState.CLOSED);
    }

    // Update stats
    if (!this.circuitBreakerStats.has(agentType)) {
      this.circuitBreakerStats.set(agentType, {
        failures: 0,
        requests: 0,
        lastFailureTime: 0,
        windowStart: Date.now(),
      });
    }

    const stats = this.circuitBreakerStats.get(agentType)!;
    stats.requests++;
  }

  private recordFailure(agentType: AgentType, error: AgentError): void {
    const config = this.getCircuitBreakerConfig(agentType);
    
    if (!this.circuitBreakerStats.has(agentType)) {
      this.circuitBreakerStats.set(agentType, {
        failures: 0,
        requests: 0,
        lastFailureTime: 0,
        windowStart: Date.now(),
      });
    }

    const stats = this.circuitBreakerStats.get(agentType)!;
    const now = Date.now();

    // Reset window if needed
    if (now - stats.windowStart > config.monitoringWindow) {
      stats.failures = 0;
      stats.requests = 0;
      stats.windowStart = now;
    }

    stats.failures++;
    stats.requests++;
    stats.lastFailureTime = now;

    // Check if we should open circuit breaker
    if (stats.requests >= config.minimumRequests && 
        stats.failures >= config.failureThreshold) {
      this.circuitBreakers.set(agentType, CircuitBreakerState.OPEN);
      
      console.warn('Circuit breaker opened', {
        agentType,
        failures: stats.failures,
        requests: stats.requests,
        threshold: config.failureThreshold,
      });
    }
  }

  private getCircuitBreakerConfig(agentType: AgentType): CircuitBreakerConfig {
    // Default configuration - could be made configurable per agent type
    return {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      minimumRequests: 10,
    };
  }

  private getDefaultFallbackStrategy(): FallbackStrategy {
    return {
      enabled: true,
      maxRetries: 2,
      retryDelay: 1000,
      backoffMultiplier: 2,
      fallbackAgents: [AgentType.FOUNDRY, AgentType.STANDARD_CHAT],
      gracefulDegradation: true,
      timeoutThreshold: 30000,
    };
  }

  private initializeDefaultStrategies(): void {
    // Configure default fallback strategies for each agent type
    const strategies: Record<AgentType, Partial<FallbackStrategy>> = {
      [AgentType.WEB_SEARCH]: {
        fallbackAgents: [AgentType.FOUNDRY, AgentType.STANDARD_CHAT],
      },
      [AgentType.CODE_INTERPRETER]: {
        fallbackAgents: [AgentType.FOUNDRY, AgentType.STANDARD_CHAT],
        maxRetries: 1, // Code execution is expensive
      },
      [AgentType.URL_PULL]: {
        fallbackAgents: [AgentType.WEB_SEARCH, AgentType.FOUNDRY],
      },
      [AgentType.LOCAL_KNOWLEDGE]: {
        fallbackAgents: [AgentType.WEB_SEARCH, AgentType.FOUNDRY],
      },
      [AgentType.FOUNDRY]: {
        fallbackAgents: [AgentType.STANDARD_CHAT],
      },
      [AgentType.THIRD_PARTY]: {
        fallbackAgents: [AgentType.FOUNDRY, AgentType.STANDARD_CHAT],
      },
      [AgentType.STANDARD_CHAT]: {
        fallbackAgents: [], // No fallback for standard chat
        gracefulDegradation: false,
      },
    };

    for (const [agentType, strategy] of Object.entries(strategies)) {
      this.configureFallbackStrategy(agentType as AgentType, strategy);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    agentType?: AgentType
  ): AgentError {
    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code,
      message,
      category,
      severity,
      agentType,
      timestamp: new Date(),
      retryable: category !== ErrorCategory.AUTHENTICATION && category !== ErrorCategory.AUTHORIZATION,
      context: {
        generated: true,
        timestamp: new Date().toISOString(),
      },
      suggestedActions: this.getSuggestedActions(category),
    };
  }
}

/**
 * Convenience function to get the singleton error handling service instance
 */
export function getAgentErrorHandlingService(): AgentErrorHandlingService {
  return AgentErrorHandlingService.getInstance();
}

/**
 * Convenience function to execute agent request with fallback
 */
export async function executeAgentWithFallback(
  request: AgentExecutionRequest,
  openai: AzureOpenAI,
  user: Session['user']
): Promise<RecoveryResult> {
  const errorHandler = getAgentErrorHandlingService();
  return await errorHandler.executeWithFallback(request, openai, user);
}

/**
 * Convenience function to handle specific errors
 */
export async function handleAgentError(
  error: AgentError,
  request: AgentExecutionRequest,
  context: {
    openai: AzureOpenAI;
    user: Session['user'];
    intentResult?: IntentAnalysisResult;
  }
): Promise<RecoveryResult> {
  const errorHandler = getAgentErrorHandlingService();
  return await errorHandler.handleSpecificError(error, request, context);
}

/**
 * Convenience function to configure fallback strategy
 */
export function configureAgentFallback(agentType: AgentType, strategy: Partial<FallbackStrategy>): void {
  const errorHandler = getAgentErrorHandlingService();
  errorHandler.configureFallbackStrategy(agentType, strategy);
}