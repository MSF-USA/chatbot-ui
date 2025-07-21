import { Session } from 'next-auth';

import {
  AgentConfig,
  AgentExecutionContext,
  AgentResponse,
  AgentType,
  BaseAgentInstance,
  AgentHealthResult,
  AgentExecutionStats,
  AgentValidationResult,
  AgentPoolStats,
} from '@/types/agent';

import { AzureMonitorLoggingService } from '@/services/loggingService';

/**
 * Custom error classes for agent operations
 */
export class BaseAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'BaseAgentError';
  }
}

export class AgentCreationError extends BaseAgentError {
  constructor(message: string, details?: any) {
    super(message, 'AGENT_CREATION_ERROR', details);
    this.name = 'AgentCreationError';
  }
}

export class AgentExecutionError extends BaseAgentError {
  constructor(message: string, details?: any) {
    super(message, 'AGENT_EXECUTION_ERROR', details);
    this.name = 'AgentExecutionError';
  }
}

export class AgentTimeoutError extends BaseAgentError {
  constructor(message: string, details?: any) {
    super(message, 'AGENT_TIMEOUT_ERROR', details);
    this.name = 'AgentTimeoutError';
  }
}

export class AgentValidationError extends BaseAgentError {
  constructor(message: string, details?: any) {
    super(message, 'AGENT_VALIDATION_ERROR', details);
    this.name = 'AgentValidationError';
  }
}

export class AgentPoolError extends BaseAgentError {
  constructor(message: string, details?: any) {
    super(message, 'AGENT_POOL_ERROR', details);
    this.name = 'AgentPoolError';
  }
}

/**
 * Agent pool configuration
 */
interface AgentPoolConfig {
  maxSize: number;
  evictionStrategy: 'LRU' | 'FIFO';
  validationInterval: number;
  maxAge: number;
}

/**
 * Pool entry for tracking agent instances
 */
interface PoolEntry {
  agent: BaseAgentInstance;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * Abstract base class for all agent implementations
 * Provides common functionality for lifecycle management, pooling, and monitoring
 */
export abstract class BaseAgent implements BaseAgentInstance {
  public readonly config: AgentConfig;
  public readonly createdAt: Date;
  public lastUsed: Date;
  public healthy: boolean;
  public usageCount: number;
  public state: Record<string, any>;

  private static pools: Map<AgentType, Map<string, PoolEntry>> = new Map();
  private static poolStats: Map<AgentType, AgentPoolStats> = new Map();
  private static poolConfig: AgentPoolConfig = {
    maxSize: 10,
    evictionStrategy: 'LRU',
    validationInterval: 5 * 60 * 1000, // 5 minutes
    maxAge: 30 * 60 * 1000, // 30 minutes
  };

  private static cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
    this.createdAt = new Date();
    this.lastUsed = new Date();
    this.healthy = true;
    this.usageCount = 0;
    this.state = {};

    this.validateConfig();
    this.initializeAgent();
  }

  /**
   * Abstract methods that must be implemented by specific agent types
   */
  protected abstract initializeAgent(): Promise<void> | void;
  protected abstract executeInternal(
    context: AgentExecutionContext,
  ): Promise<AgentResponse>;
  protected executeInternalStreaming?(
    context: AgentExecutionContext,
  ): Promise<ReadableStream<string>>;
  protected abstract validateSpecificConfig(): string[];
  protected abstract getCapabilities(): string[];

  /**
   * Streaming execution method with common functionality
   */
  public async executeStreaming(
    context: AgentExecutionContext,
  ): Promise<ReadableStream<string>> {
    const startTime = Date.now();
    const correlationId = context.correlationId || this.generateCorrelationId();

    try {
      // Log execution start
      console.log(`[INFO] Agent streaming execution started`, {
        agentId: this.config.id,
        agentType: this.config.type,
        correlationId,
        query: context.query?.substring(0, 100), // Truncate for logging
      });

      // Validate context
      const contextValidation = this.validateContext(context);
      if (!contextValidation.valid) {
        throw new AgentValidationError(
          `Invalid execution context: ${contextValidation.errors.join(', ')}`,
          { errors: contextValidation.errors },
        );
      }

      // Check if agent supports streaming
      if (!this.executeInternalStreaming) {
        // Fallback to non-streaming execution and convert to stream
        console.log(`[INFO] Agent ${this.config.type} doesn't support streaming, falling back to non-streaming`);
        const response = await this.executeInternal(context);
        return this.convertResponseToStream(response);
      }

      // Execute with timeout for streaming
      const timeoutPromise = new Promise<ReadableStream<string>>((_, reject) => {
        setTimeout(() => {
          reject(
            new AgentTimeoutError(
              `Agent streaming execution timed out after ${this.config.timeout || 300000}ms`,
            ),
          );
        }, this.config.timeout || 300000);
      });

      const executionPromise = this.executeInternalStreaming(context);
      const stream = await Promise.race([executionPromise, timeoutPromise]);

      // Update usage statistics
      this.lastUsed = new Date();
      this.usageCount++;

      const executionTime = Date.now() - startTime;

      console.log(`[INFO] Agent streaming execution completed successfully`, {
        agentId: this.config.id,
        agentType: this.config.type,
        correlationId,
        executionTime,
      });

      return stream;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.error(`[ERROR] Agent streaming execution failed`, error, {
        agentId: this.config.id,
        agentType: this.config.type,
        correlationId,
        executionTime,
      });

      // Return error stream
      return this.createErrorStream(error as Error);
    }
  }

  /**
   * Main execution method with common functionality
   */
  public async execute(
    context: AgentExecutionContext,
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const correlationId = context.correlationId || this.generateCorrelationId();

    try {
      // Log execution start
      console.log(`[INFO] Agent execution started`, {
        agentId: this.config.id,
        agentType: this.config.type,
        correlationId,
        query: context.query?.substring(0, 100), // Truncate for logging
      });

      // Validate context
      const contextValidation = this.validateContext(context);
      if (!contextValidation.valid) {
        throw new AgentValidationError(
          `Invalid execution context: ${contextValidation.errors.join(', ')}`,
          { errors: contextValidation.errors },
        );
      }

      // Execute with timeout
      const timeoutPromise = new Promise<AgentResponse>((_, reject) => {
        setTimeout(() => {
          reject(
            new AgentTimeoutError(
              `Agent execution timed out after ${this.config.timeout || 300000}ms`,
            ),
          );
        }, this.config.timeout || 300000);
      });

      const executionPromise = this.executeInternal(context);
      const response = await Promise.race([executionPromise, timeoutPromise]);

      // Update usage statistics
      this.lastUsed = new Date();
      this.usageCount++;

      const executionTime = Date.now() - startTime;

      // Add metadata to response
      response.metadata = {
        ...response.metadata,
        processingTime: executionTime,
        agentMetadata: {
          ...response.metadata?.agentMetadata,
          agentId: this.config.id,
          usageCount: this.usageCount,
          correlationId,
        },
      };

      // Log successful execution to Azure Monitor for dashboard tracking
      const logger = AzureMonitorLoggingService.getInstance();
      if (logger && context.user) {
        void logger.logAgentExecution(
          startTime,
          this.config.id,
          this.config.type,
          this.config.modelId || 'unknown',
          context.user,
          undefined,
          correlationId
        );
      }

      console.log(`[INFO] Agent execution completed successfully`, {
        agentId: this.config.id,
        agentType: this.config.type,
        correlationId,
        executionTime,
        success: response.success,
      });

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log execution error to Azure Monitor for dashboard tracking
      const logger = AzureMonitorLoggingService.getInstance();
      if (logger && context.user) {
        void logger.logAgentError(
          startTime,
          error,
          this.config.id,
          this.config.type,
          this.config.modelId || 'unknown',
          context.user,
          undefined,
          correlationId
        );
      }

      console.error(`[ERROR] Agent execution failed`, error, {
        agentId: this.config.id,
        agentType: this.config.type,
        correlationId,
        executionTime,
      });

      // Return error response
      return {
        content: '',
        agentId: this.config.id,
        agentType: this.config.type,
        success: false,
        metadata: {
          processingTime: executionTime,
          agentMetadata: {
            agentId: this.config.id,
            usageCount: this.usageCount,
            correlationId,
          },
        },
        error: {
          code: error instanceof BaseAgentError ? error.code : 'UNKNOWN_ERROR',
          message: (error as Error).message,
          details: error instanceof BaseAgentError ? error.details : undefined,
        },
      };
    }
  }

  /**
   * Health check for the agent
   */
  public async checkHealth(): Promise<AgentHealthResult> {
    const startTime = Date.now();

    try {
      // Perform basic health checks
      const isConfigValid = this.validateConfig();
      const isAgentResponsive = await this.performHealthCheck();

      const healthy = isConfigValid && isAgentResponsive;
      this.healthy = healthy;

      const responseTime = Date.now() - startTime;

      // Log health check for dashboard tracking
      this.logHealthCheck(healthy);

      return {
        agentId: this.config.id,
        healthy,
        timestamp: new Date(),
        responseTime,
        metrics: {
          usageCount: this.usageCount,
          lastUsed: this.lastUsed,
          configValid: isConfigValid,
          responsive: isAgentResponsive,
        },
      };
    } catch (error) {
      this.healthy = false;
      const responseTime = Date.now() - startTime;

      // Log failed health check for dashboard tracking
      this.logHealthCheck(false);

      return {
        agentId: this.config.id,
        healthy: false,
        timestamp: new Date(),
        responseTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get execution statistics for this agent
   */
  public getExecutionStats(): AgentExecutionStats {
    return {
      agentId: this.config.id,
      totalExecutions: this.usageCount,
      successfulExecutions: this.usageCount, // This would be tracked separately in a real implementation
      failedExecutions: 0, // This would be tracked separately in a real implementation
      avgExecutionTime: 0, // This would be calculated from execution history
      totalTokens: 0, // This would be tracked from responses
      lastExecution: this.lastUsed,
      errorRate: 0, // This would be calculated from success/failure ratio
    };
  }

  /**
   * Clean up agent resources
   */
  public async cleanup(): Promise<void> {
    try {
      await this.performCleanup();
      console.log(`[INFO] Agent cleanup completed`, {
        agentId: this.config.id,
        agentType: this.config.type,
      });
    } catch (error) {
      console.error(`[ERROR] Agent cleanup failed`, error, {
        agentId: this.config.id,
        agentType: this.config.type,
      });
      throw error;
    }
  }

  /**
   * Static methods for pool management
   */

  /**
   * Get or create an agent from the pool
   */
  public static async getFromPool<T extends BaseAgent>(
    agentType: AgentType,
    config: AgentConfig,
    agentClass: new (config: AgentConfig) => T,
  ): Promise<T> {
    const poolKey = this.generatePoolKey(config);
    let pool = this.pools.get(agentType);

    if (!pool) {
      pool = new Map();
      this.pools.set(agentType, pool);
    }

    const entry = pool.get(poolKey);

    if (entry && this.isValidPoolEntry(entry)) {
      // Update access time and count
      entry.lastAccessed = new Date();
      entry.accessCount++;

      this.updatePoolStats(agentType, true); // Hit
      return entry.agent as T;
    }

    // Create new agent
    const agent = new agentClass(config);
    await agent.initializeAgent();

    // Add to pool
    const newEntry: PoolEntry = {
      agent,
      lastAccessed: new Date(),
      accessCount: 1,
    };

    // Check pool size and evict if necessary
    if (pool.size >= this.poolConfig.maxSize) {
      this.evictFromPool(agentType);
    }

    pool.set(poolKey, newEntry);
    this.updatePoolStats(agentType, false); // Miss

    return agent;
  }

  /**
   * Get pool statistics for an agent type
   */
  public static getPoolStats(agentType: AgentType): AgentPoolStats | undefined {
    return this.poolStats.get(agentType);
  }

  /**
   * Clear all pools
   */
  public static async clearAllPools(): Promise<void> {
    for (const [agentType, pool] of this.pools) {
      for (const entry of pool.values()) {
        try {
          await (entry.agent as BaseAgent).cleanup();
        } catch (error) {
          console.error(`Failed to cleanup agent: ${(error as Error).message}`);
        }
      }
      pool.clear();
    }
    this.pools.clear();
    this.poolStats.clear();
  }

  /**
   * Start pool cleanup interval
   */
  public static startPoolCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.performPoolCleanup();
    }, this.poolConfig.validationInterval);
  }

  /**
   * Stop pool cleanup interval
   */
  public static stopPoolCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Protected methods for subclasses
   */

  protected async performHealthCheck(): Promise<boolean> {
    // Default implementation - can be overridden by subclasses
    return true;
  }

  protected async performCleanup(): Promise<void> {
    // Default implementation - can be overridden by subclasses
  }

  protected validateContext(
    context: AgentExecutionContext,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!context.query || context.query.trim().length === 0) {
      errors.push('Query is required');
    }

    if (!context.user) {
      errors.push('User session is required');
    }

    if (!context.model) {
      errors.push('Model configuration is required');
    }

    if (!context.locale) {
      errors.push('Locale is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  protected generateCorrelationId(): string {
    return `${this.config.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log health check to Azure Monitor for dashboard tracking
   */
  protected logHealthCheck(healthy: boolean, user?: Session['user']): void {
    const logger = AzureMonitorLoggingService.getInstance();
    if (logger) {
      const startTime = Date.now();
      void logger.logAgentHealth(
        startTime,
        this.config.id,
        this.config.type,
        healthy,
        user,
        this.config.id // Use agent ID as botId for health checks
      );
    }
  }

  /**
   * Log informational messages using AzureMonitorLoggingService
   * @param message The message to log
   * @param metadata Additional metadata to include in the log
   */
  protected logInfo(message: string, metadata?: Record<string, any>): void {
    // Log to console for local debugging
    console.log(`[INFO] ${message}`, metadata);
    
    // Log to Azure Monitor if available
    const logger = AzureMonitorLoggingService.getInstance();
    if (logger) {
      void logger.logCustomMetric(
        `${this.config.type}Info`,
        1,
        'count',
        {
          agentId: this.config.id,
          agentType: this.config.type,
          message,
          ...metadata
        }
      );
    }
  }

  /**
   * Log error messages using AzureMonitorLoggingService
   * @param message The error message to log
   * @param error The error object
   * @param metadata Additional metadata to include in the log
   */
  protected logError(message: string, error: Error, metadata?: Record<string, any>): void {
    // Log to console for local debugging
    console.error(`[ERROR] ${message}`, error, metadata);
    
    // Log to Azure Monitor if available
    const logger = AzureMonitorLoggingService.getInstance();
    if (logger) {
      const startTime = Date.now() - (metadata?.executionTime || 0);
      void logger.logAgentError(
        startTime,
        error,
        this.config.id,
        this.config.type,
        this.config.modelId || 'unknown',
        {
          id: 'system',
          givenName: 'System',
          surname: 'Agent',
          displayName: 'System Agent'
        }, // Default user for system context
        undefined, // botId is not available in this context
        metadata?.correlationId
      );
    }
  }

  /**
   * Log warning messages using AzureMonitorLoggingService
   * @param message The warning message to log
   * @param metadata Additional metadata to include in the log
   */
  protected logWarning(message: string, metadata?: Record<string, any>): void {
    // Log to console for local debugging
    console.warn(`[WARNING] ${message}`, metadata);
    
    // Log to Azure Monitor if available
    const logger = AzureMonitorLoggingService.getInstance();
    if (logger) {
      void logger.logCustomMetric(
        `${this.config.type}Warning`,
        1,
        'count',
        {
          agentId: this.config.id,
          agentType: this.config.type,
          message,
          ...metadata
        }
      );
    }
  }

  /**
   * Private helper methods
   */

  private validateConfig(): boolean {
    try {
      const errors: string[] = [];

      // Basic validation
      if (!this.config.id) errors.push('Agent ID is required');
      if (!this.config.name) errors.push('Agent name is required');
      if (!this.config.type) errors.push('Agent type is required');
      if (!this.config.modelId) errors.push('Model ID is required');

      // Get agent-specific validation errors
      const specificErrors = this.validateSpecificConfig();
      errors.push(...specificErrors);

      if (errors.length > 0) {
        throw new AgentValidationError(
          `Configuration validation failed: ${errors.join(', ')}`,
          { errors },
        );
      }

      return true;
    } catch (error) {
      console.error(`[ERROR] Agent configuration validation failed`, error, {
        agentId: this.config.id,
        agentType: this.config.type,
      });
      return false;
    }
  }

  /**
   * Convert a non-streaming response to a ReadableStream
   */
  private convertResponseToStream(response: AgentResponse): ReadableStream<string> {
    return new ReadableStream({
      start(controller) {
        if (response.success && response.content) {
          // Split content into chunks for smoother streaming experience
          const chunks = response.content.match(/.{1,50}/g) || [response.content];
          
          let index = 0;
          const sendChunk = () => {
            if (index < chunks.length) {
              controller.enqueue(chunks[index]);
              index++;
              // Small delay to simulate natural typing
              setTimeout(sendChunk, 50);
            } else {
              controller.close();
            }
          };
          
          sendChunk();
        } else {
          // Handle error response
          const errorMessage = response.error?.message || 'Agent execution failed';
          controller.enqueue(`Error: ${errorMessage}`);
          controller.close();
        }
      }
    });
  }

  /**
   * Create an error stream for failed executions
   */
  private createErrorStream(error: Error): ReadableStream<string> {
    return new ReadableStream({
      start(controller) {
        const errorMessage = `Error: ${error.message}`;
        controller.enqueue(errorMessage);
        controller.close();
      }
    });
  }

  private static generatePoolKey(config: AgentConfig): string {
    // Generate a key based on configuration that should be shared across instances
    return `${config.type}-${config.modelId}-${config.environment}`;
  }

  private static isValidPoolEntry(entry: PoolEntry): boolean {
    const now = Date.now();
    const entryAge = now - entry.lastAccessed.getTime();
    
    return (
      entry.agent.healthy &&
      entryAge < this.poolConfig.maxAge
    );
  }

  private static evictFromPool(agentType: AgentType): void {
    const pool = this.pools.get(agentType);
    if (!pool || pool.size === 0) return;

    let victimKey: string | null = null;
    let oldestAccess = Date.now();

    // Find LRU entry
    for (const [key, entry] of pool) {
      if (entry.lastAccessed.getTime() < oldestAccess) {
        oldestAccess = entry.lastAccessed.getTime();
        victimKey = key;
      }
    }

    if (victimKey) {
      const victim = pool.get(victimKey);
      if (victim) {
        (victim.agent as BaseAgent).cleanup().catch((error: Error) => {
          console.error(`Failed to cleanup evicted agent: ${error.message}`);
        });
        pool.delete(victimKey);
      }
    }
  }

  private static updatePoolStats(agentType: AgentType, hit: boolean): void {
    let stats = this.poolStats.get(agentType);
    const pool = this.pools.get(agentType);

    if (!stats) {
      stats = {
        agentType,
        totalAgents: 0,
        activeAgents: 0,
        idleAgents: 0,
        hitRate: 0,
        missRate: 0,
        avgCreationTime: 0,
        avgExecutionTime: 0,
        memoryUsage: 0,
        lastUpdated: new Date(),
      };
    }

    if (pool) {
      stats.totalAgents = pool.size;
      stats.activeAgents = Array.from(pool.values()).filter(
        (entry) => entry.agent.healthy,
      ).length;
      stats.idleAgents = stats.totalAgents - stats.activeAgents;
    }

    // Update hit/miss rates (simplified calculation)
    if (hit) {
      stats.hitRate = Math.min(stats.hitRate + 0.1, 1);
      stats.missRate = 1 - stats.hitRate;
    } else {
      stats.missRate = Math.min(stats.missRate + 0.1, 1);
      stats.hitRate = 1 - stats.missRate;
    }

    stats.lastUpdated = new Date();
    this.poolStats.set(agentType, stats);
  }

  private static performPoolCleanup(): void {
    for (const [agentType, pool] of this.pools) {
      const keysToRemove: string[] = [];

      for (const [key, entry] of pool) {
        if (!this.isValidPoolEntry(entry)) {
          keysToRemove.push(key);
          (entry.agent as BaseAgent).cleanup().catch((error: Error) => {
            console.error(`Failed to cleanup invalid pool entry: ${error.message}`);
          });
        }
      }

      keysToRemove.forEach((key) => pool.delete(key));
      this.updatePoolStats(agentType, false);
    }
  }
}

// Start pool cleanup when module is loaded
BaseAgent.startPoolCleanup();