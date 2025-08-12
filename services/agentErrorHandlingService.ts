/**
 * Agent Error Handling Service
 *
 * Comprehensive error handling system specifically designed for agent operations.
 * Provides categorization, recovery strategies, user-friendly messaging, and telemetry.
 */
import { AgentType } from '@/types/agent';

import { AzureMonitorLoggingService } from './loggingService';

/**
 * Agent error categories
 */
export enum AgentErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  PROCESSING = 'processing',
  TIMEOUT = 'timeout',
  QUOTA_EXCEEDED = 'quota_exceeded',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  CONFIGURATION = 'configuration',
  PERMISSION = 'permission',
  CONTENT_FILTER = 'content_filter',
  UNKNOWN = 'unknown',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Recovery strategy types
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  ALTERNATIVE_AGENT = 'alternative_agent',
  USER_ACTION = 'user_action',
  MANUAL_INTERVENTION = 'manual_intervention',
  NONE = 'none',
}

/**
 * Agent error interface
 */
export interface AgentError {
  id: string;
  agentType: AgentType | 'unknown';
  category: AgentErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, any>;
  timestamp: number;
  retryCount?: number;
  recoveryStrategy: RecoveryStrategy;
  isRecoverable: boolean;
  context?: {
    requestId?: string;
    userId?: string;
    sessionId?: string;
    operation?: string;
    parameters?: Record<string, any>;
  };
}

/**
 * Error recovery result
 */
export interface ErrorRecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  newAgentType?: AgentType;
  retryDelay?: number;
  userAction?: string;
  message?: string;
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  maxRetries: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  enableFallback: boolean;
  enableAlternativeAgents: boolean;
  enableUserNotifications: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed';
  telemetryEnabled: boolean;
}

/**
 * Agent-specific error patterns
 */
interface AgentErrorPattern {
  agentType: AgentType;
  commonErrors: {
    [key: string]: {
      category: AgentErrorCategory;
      severity: ErrorSeverity;
      userMessage: string;
      recoveryStrategy: RecoveryStrategy;
      isRecoverable: boolean;
    };
  };
}

/**
 * Agent Error Handling Service
 */
export class AgentErrorHandlingService {
  private config: ErrorHandlingConfig;
  private logger: AzureMonitorLoggingService;
  private errorPatterns: Map<AgentType, AgentErrorPattern['commonErrors']> =
    new Map();
  private errorHistory: Map<string, AgentError[]> = new Map();
  private recoveryStrategies: Map<
    string,
    (error: AgentError) => Promise<ErrorRecoveryResult>
  > = new Map();

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseRetryDelay: 1000,
      maxRetryDelay: 30000,
      enableFallback: true,
      enableAlternativeAgents: true,
      enableUserNotifications: true,
      logLevel: 'standard',
      telemetryEnabled: true,
      ...config,
    };

    const loggerInstance = AzureMonitorLoggingService.getInstance();
    if (!loggerInstance) {
      throw new Error('Failed to initialize AzureMonitorLoggingService');
    }
    this.logger = loggerInstance;
    this.initializeErrorPatterns();
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize error patterns for each agent type
   */
  private initializeErrorPatterns(): void {
    // Web Search Agent Error Patterns
    this.errorPatterns.set(AgentType.WEB_SEARCH, {
      BING_API_KEY_INVALID: {
        category: AgentErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        userMessage:
          'Web search is temporarily unavailable. Please try again later.',
        recoveryStrategy: RecoveryStrategy.ALTERNATIVE_AGENT,
        isRecoverable: false,
      },
      BING_RATE_LIMIT: {
        category: AgentErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'Search quota exceeded. Please wait a moment and try again.',
        recoveryStrategy: RecoveryStrategy.RETRY,
        isRecoverable: true,
      },
      BING_NO_RESULTS: {
        category: AgentErrorCategory.PROCESSING,
        severity: ErrorSeverity.LOW,
        userMessage:
          'No search results found for your query. Try rephrasing your question.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: true,
      },
      BING_CONTENT_FILTERED: {
        category: AgentErrorCategory.CONTENT_FILTER,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'Your search query was filtered for safety. Please try a different search.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: true,
      },
    });

    // Code Interpreter Agent Error Patterns
    this.errorPatterns.set(AgentType.CODE_INTERPRETER, {
      CODE_EXECUTION_TIMEOUT: {
        category: AgentErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'Code execution took too long and was stopped. Try simplifying your code.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: true,
      },
      CODE_EXECUTION_ERROR: {
        category: AgentErrorCategory.PROCESSING,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'There was an error in your code. Please check the syntax and try again.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: true,
      },
      SANDBOX_UNAVAILABLE: {
        category: AgentErrorCategory.SERVICE_UNAVAILABLE,
        severity: ErrorSeverity.HIGH,
        userMessage: 'Code execution environment is temporarily unavailable.',
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        isRecoverable: false,
      },
      MEMORY_LIMIT_EXCEEDED: {
        category: AgentErrorCategory.QUOTA_EXCEEDED,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'Code execution used too much memory. Try optimizing your code.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: true,
      },
    });

    // URL Pull Agent Error Patterns
    this.errorPatterns.set(AgentType.URL_PULL, {
      URL_INVALID: {
        category: AgentErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        userMessage:
          'The URL provided is not valid. Please check the URL and try again.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: true,
      },
      URL_INACCESSIBLE: {
        category: AgentErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'Could not access the website. It may be down or blocking requests.',
        recoveryStrategy: RecoveryStrategy.RETRY,
        isRecoverable: true,
      },
      CONTENT_TOO_LARGE: {
        category: AgentErrorCategory.QUOTA_EXCEEDED,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'The webpage content is too large to process. Try a different page.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: false,
      },
      CONTENT_TYPE_UNSUPPORTED: {
        category: AgentErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        userMessage:
          'This file type is not supported. Please try a different URL.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: false,
      },
    });

    // Local Knowledge Agent Error Patterns
    this.errorPatterns.set(AgentType.LOCAL_KNOWLEDGE, {
      KNOWLEDGE_BASE_EMPTY: {
        category: AgentErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'No local knowledge base available. Please upload documents first.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: true,
      },
      SEARCH_INDEX_CORRUPTED: {
        category: AgentErrorCategory.PROCESSING,
        severity: ErrorSeverity.HIGH,
        userMessage:
          'Local search index needs to be rebuilt. This may take a few minutes.',
        recoveryStrategy: RecoveryStrategy.MANUAL_INTERVENTION,
        isRecoverable: true,
      },
      DOCUMENT_PARSING_FAILED: {
        category: AgentErrorCategory.PROCESSING,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'Could not process the document. Please check the file format.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: false,
      },
    });

    // Standard Chat Agent Error Patterns
    this.errorPatterns.set(AgentType.STANDARD_CHAT, {
      MODEL_UNAVAILABLE: {
        category: AgentErrorCategory.SERVICE_UNAVAILABLE,
        severity: ErrorSeverity.HIGH,
        userMessage:
          'AI model is temporarily unavailable. Please try again later.',
        recoveryStrategy: RecoveryStrategy.RETRY,
        isRecoverable: true,
      },
      CONTEXT_LENGTH_EXCEEDED: {
        category: AgentErrorCategory.QUOTA_EXCEEDED,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'Conversation is too long. Consider starting a new conversation.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: false,
      },
      CONTENT_POLICY_VIOLATION: {
        category: AgentErrorCategory.CONTENT_FILTER,
        severity: ErrorSeverity.MEDIUM,
        userMessage:
          'Your message violated content policy. Please rephrase your request.',
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        isRecoverable: true,
      },
    });
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Retry strategy
    this.recoveryStrategies.set(
      RecoveryStrategy.RETRY,
      async (error: AgentError) => {
        const retryCount = error.retryCount || 0;
        if (retryCount >= this.config.maxRetries) {
          return {
            success: false,
            strategy: RecoveryStrategy.FALLBACK,
            message: 'Maximum retries exceeded, attempting fallback',
          };
        }

        const delay = Math.min(
          this.config.baseRetryDelay * Math.pow(2, retryCount),
          this.config.maxRetryDelay,
        );

        return {
          success: true,
          strategy: RecoveryStrategy.RETRY,
          retryDelay: delay,
          message: `Retrying in ${delay}ms (attempt ${retryCount + 1}/${
            this.config.maxRetries
          })`,
        };
      },
    );

    // Alternative agent strategy
    this.recoveryStrategies.set(
      RecoveryStrategy.ALTERNATIVE_AGENT,
      async (error: AgentError) => {
        const alternativeAgents =
          error.agentType !== 'unknown'
            ? this.getAlternativeAgents(error.agentType)
            : [];

        if (alternativeAgents.length === 0) {
          return {
            success: false,
            strategy: RecoveryStrategy.FALLBACK,
            message: 'No alternative agents available',
          };
        }

        return {
          success: true,
          strategy: RecoveryStrategy.ALTERNATIVE_AGENT,
          newAgentType: alternativeAgents[0],
          message: `Switching to ${alternativeAgents[0]} agent`,
        };
      },
    );

    // Fallback strategy
    this.recoveryStrategies.set(
      RecoveryStrategy.FALLBACK,
      async (error: AgentError) => {
        return {
          success: true,
          strategy: RecoveryStrategy.FALLBACK,
          newAgentType: AgentType.STANDARD_CHAT,
          message: 'Falling back to standard chat mode',
        };
      },
    );

    // User action strategy
    this.recoveryStrategies.set(
      RecoveryStrategy.USER_ACTION,
      async (error: AgentError) => {
        return {
          success: false,
          strategy: RecoveryStrategy.USER_ACTION,
          userAction: this.getUserActionSuggestion(error),
          message: 'User action required',
        };
      },
    );
  }

  /**
   * Handle an agent error
   */
  async handleError(
    error: Error | AgentError,
    agentType: AgentType,
    context?: AgentError['context'],
  ): Promise<ErrorRecoveryResult> {
    let agentError: AgentError;

    if ('category' in error) {
      agentError = error as AgentError;
    } else {
      agentError = this.categorizeError(error, agentType, context);
    }

    // Log the error
    await this.logError(agentError);

    // Store in error history
    this.storeErrorHistory(agentError);

    // Attempt recovery
    const recoveryResult = await this.attemptRecovery(agentError);

    // Send telemetry if enabled
    if (this.config.telemetryEnabled) {
      await this.sendErrorTelemetry(agentError, recoveryResult);
    }

    return recoveryResult;
  }

  /**
   * Categorize a generic error into an AgentError
   */
  private categorizeError(
    error: Error,
    agentType: AgentType,
    context?: AgentError['context'],
  ): AgentError {
    const errorMessage = error.message.toLowerCase();
    const agentErrorPatterns = this.errorPatterns.get(agentType) || {};

    // Try to match against known patterns
    for (const [code, pattern] of Object.entries(agentErrorPatterns)) {
      if (this.matchesErrorPattern(errorMessage, code)) {
        return {
          id: this.generateErrorId(),
          agentType,
          category: pattern.category,
          severity: pattern.severity,
          code,
          message: error.message,
          userMessage: pattern.userMessage,
          timestamp: Date.now(),
          recoveryStrategy: pattern.recoveryStrategy,
          isRecoverable: pattern.isRecoverable,
          context,
        };
      }
    }

    // Default categorization for unknown errors
    return {
      id: this.generateErrorId(),
      agentType,
      category: this.inferErrorCategory(errorMessage),
      severity: ErrorSeverity.MEDIUM,
      code: 'UNKNOWN_ERROR',
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      timestamp: Date.now(),
      recoveryStrategy: RecoveryStrategy.RETRY,
      isRecoverable: true,
      context,
    };
  }

  /**
   * Match error message against known patterns
   */
  private matchesErrorPattern(errorMessage: string, code: string): boolean {
    const patterns: Record<string, string[]> = {
      BING_API_KEY_INVALID: ['api key', 'unauthorized', '401'],
      BING_RATE_LIMIT: ['rate limit', 'quota', 'too many requests', '429'],
      BING_NO_RESULTS: ['no results', 'no matches'],
      CODE_EXECUTION_TIMEOUT: ['timeout', 'time limit'],
      CODE_EXECUTION_ERROR: ['syntax error', 'runtime error'],
      URL_INVALID: ['invalid url', 'malformed url'],
      URL_INACCESSIBLE: ['connection refused', 'network error', 'dns'],
      CONTENT_TOO_LARGE: ['too large', 'size limit', 'payload'],
      MODEL_UNAVAILABLE: ['model unavailable', 'service unavailable'],
      CONTEXT_LENGTH_EXCEEDED: ['context length', 'token limit'],
    };

    const codePatterns = patterns[code] || [];
    return codePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Infer error category from error message
   */
  private inferErrorCategory(errorMessage: string): AgentErrorCategory {
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection')
    ) {
      return AgentErrorCategory.NETWORK;
    }
    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('auth')
    ) {
      return AgentErrorCategory.AUTHENTICATION;
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      return AgentErrorCategory.RATE_LIMIT;
    }
    if (errorMessage.includes('timeout')) {
      return AgentErrorCategory.TIMEOUT;
    }
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid')
    ) {
      return AgentErrorCategory.VALIDATION;
    }

    return AgentErrorCategory.UNKNOWN;
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(
    error: AgentError,
  ): Promise<ErrorRecoveryResult> {
    const strategy = this.recoveryStrategies.get(error.recoveryStrategy);

    if (!strategy) {
      return {
        success: false,
        strategy: RecoveryStrategy.NONE,
        message: 'No recovery strategy available',
      };
    }

    try {
      return await strategy(error);
    } catch (recoveryError) {
      console.error('Recovery strategy failed:', recoveryError);
      return {
        success: false,
        strategy: RecoveryStrategy.NONE,
        message: 'Recovery attempt failed',
      };
    }
  }

  /**
   * Get alternative agents for fallback
   */
  private getAlternativeAgents(failedAgentType: AgentType): AgentType[] {
    const alternatives: Record<AgentType, AgentType[]> = {
      [AgentType.WEB_SEARCH]: [AgentType.STANDARD_CHAT],
      [AgentType.CODE_INTERPRETER]: [AgentType.STANDARD_CHAT],
      [AgentType.URL_PULL]: [AgentType.WEB_SEARCH, AgentType.STANDARD_CHAT],
      [AgentType.LOCAL_KNOWLEDGE]: [
        AgentType.WEB_SEARCH,
        AgentType.STANDARD_CHAT,
      ],
      [AgentType.FOUNDRY]: [AgentType.STANDARD_CHAT],
      [AgentType.THIRD_PARTY]: [AgentType.STANDARD_CHAT],
      [AgentType.TRANSLATION]: [AgentType.STANDARD_CHAT],
      [AgentType.STANDARD_CHAT]: [],
    };

    return alternatives[failedAgentType] || [];
  }

  /**
   * Get user action suggestion for errors requiring user intervention
   */
  private getUserActionSuggestion(error: AgentError): string {
    const suggestions: Record<string, string> = {
      URL_INVALID: 'Please check the URL format and try again',
      CODE_EXECUTION_ERROR: 'Please review your code for syntax errors',
      BING_NO_RESULTS: 'Try rephrasing your search query',
      CONTENT_POLICY_VIOLATION:
        'Please rephrase your message to comply with content guidelines',
      KNOWLEDGE_BASE_EMPTY: 'Upload documents to your knowledge base first',
    };

    return (
      suggestions[error.code] ||
      'Please try a different approach or contact support'
    );
  }

  /**
   * Store error in history for analysis
   */
  private storeErrorHistory(error: AgentError): void {
    const key = `${error.agentType}:${error.category}:${error.code}`;
    const history = this.errorHistory.get(key) || [];

    history.push(error);

    // Keep only last 100 errors per type
    if (history.length > 100) {
      history.shift();
    }

    this.errorHistory.set(key, history);
  }

  /**
   * Log error for monitoring
   */
  private async logError(error: AgentError): Promise<void> {
    try {
      await this.logger.logError(
        error.timestamp,
        new Error(`${error.code}: ${error.message}`),
        'agent-error',
        1,
        0,
        {
          id: 'system',
          givenName: 'System',
          surname: 'Agent',
          displayName: 'System Agent',
        },
        error.agentType,
        false,
      );
    } catch (loggingError) {
      console.error('Failed to log agent error:', loggingError);
    }
  }

  /**
   * Send error telemetry
   */
  private async sendErrorTelemetry(
    error: AgentError,
    recovery: ErrorRecoveryResult,
  ): Promise<void> {
    try {
      await this.logger.logAgentError(
        error.timestamp,
        new Error(`${error.code}: ${error.message}`),
        `agent-${error.agentType}`,
        error.agentType,
        'agent-error',
        {
          id: 'system',
          givenName: 'System',
          surname: 'Agent',
          displayName: 'System Agent',
        },
        error.agentType,
        `error-${error.id}`,
        false,
      );
    } catch (telemetryError) {
      console.error('Failed to send error telemetry:', telemetryError);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByAgent: Record<AgentType, number>;
    errorsByCategory: Record<AgentErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recoverySuccessRate: number;
  } {
    let totalErrors = 0;
    const errorsByAgent: Record<string, number> = {};
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let successfulRecoveries = 0;

    for (const errors of this.errorHistory.values()) {
      for (const error of errors) {
        totalErrors++;
        errorsByAgent[error.agentType] =
          (errorsByAgent[error.agentType] || 0) + 1;
        errorsByCategory[error.category] =
          (errorsByCategory[error.category] || 0) + 1;
        errorsBySeverity[error.severity] =
          (errorsBySeverity[error.severity] || 0) + 1;

        if (error.isRecoverable) {
          successfulRecoveries++;
        }
      }
    }

    return {
      totalErrors,
      errorsByAgent: errorsByAgent as Record<AgentType, number>,
      errorsByCategory: errorsByCategory as Record<AgentErrorCategory, number>,
      errorsBySeverity: errorsBySeverity as Record<ErrorSeverity, number>,
      recoverySuccessRate:
        totalErrors > 0 ? successfulRecoveries / totalErrors : 0,
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Global service instance
 */
let agentErrorHandlingServiceInstance: AgentErrorHandlingService | null = null;

/**
 * Get or create the agent error handling service instance
 */
export function getAgentErrorHandlingService(): AgentErrorHandlingService {
  if (!agentErrorHandlingServiceInstance) {
    agentErrorHandlingServiceInstance = new AgentErrorHandlingService();
  }
  return agentErrorHandlingServiceInstance;
}

/**
 * Convenience function to handle agent errors
 */
export async function handleAgentError(
  error: Error | AgentError,
  agentType: AgentType,
  context?: AgentError['context'],
): Promise<ErrorRecoveryResult> {
  const service = getAgentErrorHandlingService();
  return await service.handleError(error, agentType, context);
}
