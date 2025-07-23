import { Session } from 'next-auth';

import {
  AgentExecutionContext,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentType,
} from '@/types/agent';
import { ChatBody } from '@/types/chat';
import { IntentAnalysisResult } from '@/types/intentAnalysis';

import { getAgentFactory } from './agentFactory';
import { getAgentRegistry } from './agentRegistry';

import { AzureOpenAI } from 'openai';

/**
 * Performance metrics for tracking
 */
export interface PerformanceMetrics {
  agentType: AgentType;
  averageResponseTime: number;
  successRate: number;
  throughput: number; // requests per minute
  errorRate: number;
  cacheHitRate: number;
  resourceUtilization: ResourceUtilization;
  timestamp: Date;
}

/**
 * Resource utilization tracking
 */
export interface ResourceUtilization {
  cpuUsage: number; // percentage
  memoryUsage: number; // MB
  activeConnections: number;
  queueSize: number;
  poolUtilization: number; // percentage
}

/**
 * Performance optimization configuration
 */
export interface OptimizationConfig {
  enableCaching: boolean;
  enablePooling: boolean;
  enablePrefetching: boolean;
  enableBatching: boolean;
  enableParallelExecution: boolean;
  cacheTTL: number; // milliseconds
  maxConcurrentRequests: number;
  batchSize: number;
  prefetchThreshold: number;
  optimizationStrategy: 'aggressive' | 'balanced' | 'conservative';
}

/**
 * Request batching configuration
 */
export interface BatchConfig {
  enabled: boolean;
  maxBatchSize: number;
  batchTimeout: number; // milliseconds
  similarityThreshold: number; // 0-1
}

/**
 * Caching configuration
 */
export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number; // milliseconds
  compressionEnabled: boolean;
  evictionStrategy: 'LRU' | 'LFU' | 'TTL';
}

/**
 * Performance optimization recommendation
 */
export interface OptimizationRecommendation {
  id: string;
  type: 'cache' | 'pool' | 'batch' | 'parallel' | 'fallback' | 'throttle';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImpact: number; // percentage improvement
  implementation: string;
  riskLevel: 'low' | 'medium' | 'high';
  agentType?: AgentType;
}

/**
 * Batch execution result
 */
export interface BatchExecutionResult {
  results: AgentExecutionResult[];
  totalTime: number;
  averageTime: number;
  successCount: number;
  failureCount: number;
  batchSize: number;
}

/**
 * Agent Performance Optimization System
 * Provides intelligent performance optimizations including caching, batching, and resource management
 */
export class AgentPerformanceOptimizer {
  private static instance: AgentPerformanceOptimizer | null = null;

  private performanceCache: Map<string, any>;
  private requestQueue: Map<AgentType, AgentExecutionRequest[]>;
  private batchTimers: Map<AgentType, NodeJS.Timeout>;
  private performanceMetrics: Map<AgentType, PerformanceMetrics>;
  private optimizationConfig: OptimizationConfig;
  private requestInProgress: Map<string, Promise<AgentExecutionResult>>;
  private resourceMonitor: NodeJS.Timeout | null = null;

  private constructor() {
    this.performanceCache = new Map();
    this.requestQueue = new Map();
    this.batchTimers = new Map();
    this.performanceMetrics = new Map();
    this.requestInProgress = new Map();
    this.optimizationConfig = this.getDefaultOptimizationConfig();
    this.initializeOptimizer();
  }

  /**
   * Singleton pattern - get or create optimizer instance
   */
  public static getInstance(): AgentPerformanceOptimizer {
    if (!AgentPerformanceOptimizer.instance) {
      AgentPerformanceOptimizer.instance = new AgentPerformanceOptimizer();
    }
    return AgentPerformanceOptimizer.instance;
  }

  /**
   * Optimize agent execution with performance enhancements
   */
  public async optimizeExecution(
    request: AgentExecutionRequest,
    openai: AzureOpenAI,
    user: Session['user'],
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId(request);

    try {
      console.log('Performance optimization started', {
        agentType: request.agentType,
        requestId,
        optimizations: this.getEnabledOptimizations(),
      });

      // 1. Check cache first
      if (this.optimizationConfig.enableCaching) {
        const cachedResult = await this.checkCache(request);
        if (cachedResult) {
          this.recordCacheHit(request.agentType);
          return this.createCachedExecutionResult(
            cachedResult,
            requestId,
            startTime,
          );
        }
      }

      // 2. Check for duplicate in-progress requests
      const duplicateRequest = this.checkDuplicateRequests(request);
      if (duplicateRequest) {
        console.log('Deduplicating request', {
          requestId,
          agentType: request.agentType,
        });
        return await duplicateRequest;
      }

      // 3. Apply request batching if enabled
      if (this.optimizationConfig.enableBatching && this.shouldBatch(request)) {
        return await this.addToBatch(request, openai, user);
      }

      // 4. Execute with optimizations
      const executionPromise = this.executeWithOptimizations(
        request,
        openai,
        user,
        requestId,
      );
      this.requestInProgress.set(this.getRequestKey(request), executionPromise);

      const result = await executionPromise;

      // 5. Cache successful results
      if (this.optimizationConfig.enableCaching && result.response.success) {
        await this.cacheResult(request, result);
      }

      // 6. Update performance metrics
      this.updatePerformanceMetrics(
        request.agentType,
        Date.now() - startTime,
        true,
      );

      console.log('Performance optimization completed', {
        agentType: request.agentType,
        requestId,
        totalTime: Date.now() - startTime,
        success: result.response.success,
      });

      return result;
    } catch (error) {
      this.updatePerformanceMetrics(
        request.agentType,
        Date.now() - startTime,
        false,
      );

      console.error('Performance optimization failed', error as Error, {
        agentType: request.agentType,
        requestId,
        totalTime: Date.now() - startTime,
      });

      throw error;
    } finally {
      this.requestInProgress.delete(this.getRequestKey(request));
    }
  }

  /**
   * Execute multiple requests in parallel with optimization
   */
  public async executeParallel(
    requests: AgentExecutionRequest[],
    openai: AzureOpenAI,
    user: Session['user'],
    maxConcurrency: number = this.optimizationConfig.maxConcurrentRequests,
  ): Promise<AgentExecutionResult[]> {
    const startTime = Date.now();

    try {
      console.log('Parallel execution started', {
        requestCount: requests.length,
        maxConcurrency,
      });

      // Group requests by agent type for optimal batching
      const requestGroups = this.groupRequestsByType(requests);
      const results: AgentExecutionResult[] = [];

      // Execute groups in parallel with concurrency limit
      const groupPromises = Array.from(requestGroups.entries()).map(
        async ([agentType, groupRequests]) => {
          const batchResults = await this.executeBatch(
            groupRequests,
            openai,
            user,
            maxConcurrency,
          );
          return batchResults.results;
        },
      );

      const groupResults = await Promise.all(groupPromises);

      // Flatten results maintaining original order
      for (const groupResult of groupResults) {
        results.push(...groupResult);
      }

      const totalTime = Date.now() - startTime;

      console.log('Parallel execution completed', {
        requestCount: requests.length,
        successCount: results.filter((r) => r.response.success).length,
        totalTime,
        averageTime: totalTime / requests.length,
      });

      return results;
    } catch (error) {
      console.error('Parallel execution failed', error as Error, {
        requestCount: requests.length,
      });
      throw error;
    }
  }

  /**
   * Get performance analysis and optimization recommendations
   */
  public getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    for (const [agentType, metrics] of this.performanceMetrics.entries()) {
      // Analyze performance patterns
      if (metrics.averageResponseTime > 5000) {
        recommendations.push({
          id: `slow-response-${agentType}`,
          type: 'cache',
          priority: 'high',
          description: `${agentType} has slow response times (${metrics.averageResponseTime}ms). Consider aggressive caching.`,
          expectedImpact: 40,
          implementation: 'Increase cache TTL and implement preemptive caching',
          riskLevel: 'low',
          agentType,
        });
      }

      if (metrics.successRate < 0.9) {
        recommendations.push({
          id: `low-success-${agentType}`,
          type: 'fallback',
          priority: 'high',
          description: `${agentType} has low success rate (${(
            metrics.successRate * 100
          ).toFixed(1)}%). Consider fallback optimization.`,
          expectedImpact: 25,
          implementation: 'Implement more aggressive fallback strategies',
          riskLevel: 'medium',
          agentType,
        });
      }

      if (metrics.throughput < 10) {
        recommendations.push({
          id: `low-throughput-${agentType}`,
          type: 'parallel',
          priority: 'medium',
          description: `${agentType} has low throughput (${metrics.throughput} req/min). Consider parallel execution.`,
          expectedImpact: 60,
          implementation: 'Enable parallel execution and increase pool size',
          riskLevel: 'medium',
          agentType,
        });
      }

      if (metrics.cacheHitRate < 0.3) {
        recommendations.push({
          id: `low-cache-hit-${agentType}`,
          type: 'cache',
          priority: 'medium',
          description: `${agentType} has low cache hit rate (${(
            metrics.cacheHitRate * 100
          ).toFixed(1)}%). Optimize caching strategy.`,
          expectedImpact: 35,
          implementation:
            'Increase cache size and improve cache key generation',
          riskLevel: 'low',
          agentType,
        });
      }
    }

    // System-wide recommendations
    const overallMetrics = this.calculateOverallMetrics();
    if (overallMetrics.averageResponseTime > 3000) {
      recommendations.push({
        id: 'system-wide-optimization',
        type: 'batch',
        priority: 'high',
        description:
          'System-wide performance is below optimal. Consider request batching.',
        expectedImpact: 50,
        implementation: 'Enable request batching and reduce batch timeouts',
        riskLevel: 'low',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(
    agentType?: AgentType,
  ): PerformanceMetrics | PerformanceMetrics[] {
    if (agentType) {
      return (
        this.performanceMetrics.get(agentType) ||
        this.createEmptyMetrics(agentType)
      );
    }

    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Configure optimization settings
   */
  public configure(config: Partial<OptimizationConfig>): void {
    this.optimizationConfig = { ...this.optimizationConfig, ...config };

    console.log('Performance optimization configured', {
      config: this.optimizationConfig,
    });

    // Restart resource monitoring if needed
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.startResourceMonitoring();
    }
  }

  /**
   * Clear performance cache
   */
  public clearCache(agentType?: AgentType): void {
    if (agentType) {
      const keysToDelete = Array.from(this.performanceCache.keys()).filter(
        (key) => key.startsWith(`${agentType}:`),
      );

      for (const key of keysToDelete) {
        this.performanceCache.delete(key);
      }

      console.log('Agent-specific cache cleared', { agentType });
    } else {
      this.performanceCache.clear();
      console.log('All performance cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStatistics(): {
    size: number;
    hitRate: number;
    missRate: number;
    memoryUsage: number;
    topKeys: string[];
  } {
    const totalRequests = Array.from(this.performanceMetrics.values()).reduce(
      (sum, metrics) => sum + (metrics.throughput * 60 || 0),
      0,
    );

    const totalCacheHits = Array.from(this.performanceMetrics.values()).reduce(
      (sum, metrics) =>
        sum + metrics.cacheHitRate * (metrics.throughput * 60 || 0),
      0,
    );

    const hitRate = totalRequests > 0 ? totalCacheHits / totalRequests : 0;

    // Estimate memory usage (rough calculation)
    const memoryUsage =
      Array.from(this.performanceCache.values()).reduce(
        (sum, value) => sum + JSON.stringify(value).length,
        0,
      ) / 1024; // KB

    // Get most frequently accessed cache keys
    const topKeys = Array.from(this.performanceCache.keys()).slice(0, 10);

    return {
      size: this.performanceCache.size,
      hitRate,
      missRate: 1 - hitRate,
      memoryUsage,
      topKeys,
    };
  }

  /**
   * Private helper methods
   */

  private async executeWithOptimizations(
    request: AgentExecutionRequest,
    openai: AzureOpenAI,
    user: Session['user'],
    requestId: string,
  ): Promise<AgentExecutionResult> {
    const factory = getAgentFactory();

    // Apply request optimizations
    const optimizedRequest = this.optimizeRequest(request);

    // Execute with factory
    const result = await factory.executeRequest(optimizedRequest);

    // Apply response optimizations
    const optimizedResult = this.optimizeResponse(result, requestId);

    return optimizedResult;
  }

  private optimizeRequest(
    request: AgentExecutionRequest,
  ): AgentExecutionRequest {
    // Request-level optimizations
    const optimized = { ...request };

    // Optimize timeout based on historical performance
    const metrics = this.performanceMetrics.get(request.agentType);
    if (metrics) {
      const recommendedTimeout = Math.max(
        metrics.averageResponseTime * 2,
        request.config?.timeout || 30000,
      );
      optimized.config = {
        ...optimized.config,
        timeout: recommendedTimeout,
      };
    }

    // Optimize parameters based on agent type
    switch (request.agentType) {
      case AgentType.WEB_SEARCH:
        optimized.context.context = {
          ...optimized.context.context,
          maxResults: Math.min(
            (optimized.context.context as any)?.maxResults || 10,
            5,
          ), // Limit for performance
        };
        break;

      case AgentType.CODE_INTERPRETER:
        optimized.context.context = {
          ...optimized.context.context,
          memoryLimit: Math.min(
            (optimized.context.context as any)?.memoryLimit || 512,
            256,
          ), // Limit memory
        };
        break;
    }

    return optimized;
  }

  private optimizeResponse(
    result: AgentExecutionResult,
    requestId: string,
  ): AgentExecutionResult {
    // Response-level optimizations
    const optimized = { ...result };

    // Add performance metadata
    optimized.response.metadata = {
      ...optimized.response.metadata,
      agentMetadata: {
        ...optimized.response.metadata?.agentMetadata,
        optimized: true,
        requestId,
        cacheStrategy: this.getCacheStrategy(result.request.agentType),
      },
    };

    return optimized;
  }

  private async checkCache(
    request: AgentExecutionRequest,
  ): Promise<AgentExecutionResult | null> {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.performanceCache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.timestamp < this.optimizationConfig.cacheTTL
    ) {
      console.log('Cache hit', {
        agentType: request.agentType,
        cacheKey: cacheKey.substring(0, 50),
      });

      return cached.result;
    }

    return null;
  }

  private async cacheResult(
    request: AgentExecutionRequest,
    result: AgentExecutionResult,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(request);

    // Only cache successful results
    if (result.response.success) {
      this.performanceCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      // Implement cache size limit
      if (this.performanceCache.size > 1000) {
        const oldestKey = this.performanceCache.keys().next().value;
        this.performanceCache.delete(oldestKey);
      }
    }
  }

  private checkDuplicateRequests(
    request: AgentExecutionRequest,
  ): Promise<AgentExecutionResult> | null {
    const requestKey = this.getRequestKey(request);
    return this.requestInProgress.get(requestKey) || null;
  }

  private shouldBatch(request: AgentExecutionRequest): boolean {
    // Only batch certain types of requests
    const batchableTypes = [AgentType.WEB_SEARCH, AgentType.LOCAL_KNOWLEDGE];
    return batchableTypes.includes(request.agentType);
  }

  private async addToBatch(
    request: AgentExecutionRequest,
    openai: AzureOpenAI,
    user: Session['user'],
  ): Promise<AgentExecutionResult> {
    if (!this.requestQueue.has(request.agentType)) {
      this.requestQueue.set(request.agentType, []);
    }

    const queue = this.requestQueue.get(request.agentType)!;
    queue.push(request);

    // Set up batch timer if not already set
    if (!this.batchTimers.has(request.agentType)) {
      const timer = setTimeout(() => {
        this.processBatch(request.agentType, openai, user);
      }, 100); // 100ms batch window

      this.batchTimers.set(request.agentType, timer);
    }

    // If batch is full, process immediately
    if (queue.length >= this.optimizationConfig.batchSize) {
      if (this.batchTimers.has(request.agentType)) {
        clearTimeout(this.batchTimers.get(request.agentType)!);
        this.batchTimers.delete(request.agentType);
      }
      await this.processBatch(request.agentType, openai, user);
    }

    // Return a promise that will be resolved when the batch is processed
    return new Promise((resolve, reject) => {
      const originalResolve = (request.context.context as any)?.resolve;
      const originalReject = (request.context.context as any)?.reject;

      (request.context.context as any) = {
        ...(request.context.context as any),
        resolve,
        reject,
      };
    });
  }

  private async processBatch(
    agentType: AgentType,
    openai: AzureOpenAI,
    user: Session['user'],
  ): Promise<void> {
    const queue = this.requestQueue.get(agentType);
    if (!queue || queue.length === 0) return;

    console.log('Processing batch', {
      agentType,
      batchSize: queue.length,
    });

    // Clear the queue and timer
    this.requestQueue.set(agentType, []);
    if (this.batchTimers.has(agentType)) {
      clearTimeout(this.batchTimers.get(agentType)!);
      this.batchTimers.delete(agentType);
    }

    try {
      const batchResult = await this.executeBatch(queue, openai, user);

      // Resolve individual request promises
      batchResult.results.forEach((result, index) => {
        const request = queue[index];
        if ((request.context.context as any)?.resolve) {
          (request.context.context as any).resolve(result);
        }
      });
    } catch (error) {
      // Reject all individual request promises
      queue.forEach((request) => {
        if ((request.context.context as any)?.reject) {
          (request.context.context as any).reject(error);
        }
      });
    }
  }

  private async executeBatch(
    requests: AgentExecutionRequest[],
    openai: AzureOpenAI,
    user: Session['user'],
    maxConcurrency: number = this.optimizationConfig.maxConcurrentRequests,
  ): Promise<BatchExecutionResult> {
    const startTime = Date.now();

    // Split into chunks based on concurrency limit
    const chunks = this.chunkArray(requests, maxConcurrency);
    const allResults: AgentExecutionResult[] = [];

    for (const chunk of chunks) {
      const chunkPromises = chunk.map((request) =>
        this.executeWithOptimizations(
          request,
          openai,
          user,
          this.generateRequestId(request),
        ),
      );

      const chunkResults = await Promise.allSettled(chunkPromises);

      // Convert settled results to execution results
      const processedResults = chunkResults.map((settled, index) => {
        if (settled.status === 'fulfilled') {
          return settled.value;
        } else {
          // Create error result
          const request = chunk[index];
          return {
            request,
            response: {
              agentId: 'batch-error',
              agentType: request.agentType,
              content: `Batch execution failed: ${settled.reason.message}`,
              success: false,
              metadata: { batchError: true, error: settled.reason.message },
            },
            startTime: new Date(startTime),
            endTime: new Date(),
            executionTime: Date.now() - startTime,
            agentInstance: null as any,
          } as AgentExecutionResult;
        }
      });

      allResults.push(...processedResults);
    }

    const totalTime = Date.now() - startTime;
    const successCount = allResults.filter((r) => r.response.success).length;

    return {
      results: allResults,
      totalTime,
      averageTime: totalTime / requests.length,
      successCount,
      failureCount: requests.length - successCount,
      batchSize: requests.length,
    };
  }

  private groupRequestsByType(
    requests: AgentExecutionRequest[],
  ): Map<AgentType, AgentExecutionRequest[]> {
    const groups = new Map<AgentType, AgentExecutionRequest[]>();

    for (const request of requests) {
      if (!groups.has(request.agentType)) {
        groups.set(request.agentType, []);
      }
      groups.get(request.agentType)!.push(request);
    }

    return groups;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private updatePerformanceMetrics(
    agentType: AgentType,
    responseTime: number,
    success: boolean,
  ): void {
    if (!this.performanceMetrics.has(agentType)) {
      this.performanceMetrics.set(
        agentType,
        this.createEmptyMetrics(agentType),
      );
    }

    const metrics = this.performanceMetrics.get(agentType)!;

    // Update moving averages (simple approach)
    const alpha = 0.1; // Smoothing factor
    metrics.averageResponseTime =
      metrics.averageResponseTime * (1 - alpha) + responseTime * alpha;

    // Update success rate
    const totalRequests = metrics.throughput * 60 || 1; // Estimate from throughput
    const successfulRequests =
      totalRequests * metrics.successRate + (success ? 1 : 0);
    metrics.successRate = successfulRequests / (totalRequests + 1);

    // Update error rate
    metrics.errorRate = 1 - metrics.successRate;

    // Update timestamp
    metrics.timestamp = new Date();
  }

  private recordCacheHit(agentType: AgentType): void {
    if (!this.performanceMetrics.has(agentType)) {
      this.performanceMetrics.set(
        agentType,
        this.createEmptyMetrics(agentType),
      );
    }

    const metrics = this.performanceMetrics.get(agentType)!;
    const alpha = 0.1;
    metrics.cacheHitRate = metrics.cacheHitRate * (1 - alpha) + 1 * alpha;
  }

  private createEmptyMetrics(agentType: AgentType): PerformanceMetrics {
    return {
      agentType,
      averageResponseTime: 1000,
      successRate: 0.9,
      throughput: 10,
      errorRate: 0.1,
      cacheHitRate: 0.0,
      resourceUtilization: {
        cpuUsage: 0,
        memoryUsage: 0,
        activeConnections: 0,
        queueSize: 0,
        poolUtilization: 0,
      },
      timestamp: new Date(),
    };
  }

  private calculateOverallMetrics(): PerformanceMetrics {
    const allMetrics = Array.from(this.performanceMetrics.values());
    if (allMetrics.length === 0) {
      return this.createEmptyMetrics(AgentType.STANDARD_CHAT);
    }

    const avgResponseTime =
      allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) /
      allMetrics.length;
    const avgSuccessRate =
      allMetrics.reduce((sum, m) => sum + m.successRate, 0) / allMetrics.length;
    const totalThroughput = allMetrics.reduce(
      (sum, m) => sum + m.throughput,
      0,
    );

    return {
      agentType: AgentType.STANDARD_CHAT, // Placeholder
      averageResponseTime: avgResponseTime,
      successRate: avgSuccessRate,
      throughput: totalThroughput,
      errorRate: 1 - avgSuccessRate,
      cacheHitRate:
        allMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) /
        allMetrics.length,
      resourceUtilization: {
        cpuUsage: 0,
        memoryUsage: 0,
        activeConnections: 0,
        queueSize: 0,
        poolUtilization: 0,
      },
      timestamp: new Date(),
    };
  }

  private createCachedExecutionResult(
    cachedResult: AgentExecutionResult,
    requestId: string,
    startTime: number,
  ): AgentExecutionResult {
    return {
      ...cachedResult,
      executionTime: Date.now() - startTime,
      response: {
        ...cachedResult.response,
        metadata: {
          ...cachedResult.response.metadata,
          agentMetadata: {
            ...cachedResult.response.metadata?.agentMetadata,
            cached: true,
            cacheHit: true,
          },
        },
      },
    };
  }

  private generateRequestId(request: AgentExecutionRequest): string {
    return `req-${request.agentType}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  private generateCacheKey(request: AgentExecutionRequest): string {
    const keyData = {
      agentType: request.agentType,
      query: request.context.query,
      model: request.context.model.id,
      context: request.context.context,
    };

    // Simple hash function for cache key
    const str = JSON.stringify(keyData, Object.keys(keyData).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return `${request.agentType}:${Math.abs(hash).toString(36)}`;
  }

  private getRequestKey(request: AgentExecutionRequest): string {
    return this.generateCacheKey(request);
  }

  private getCacheStrategy(agentType: AgentType): string {
    const strategies: Record<AgentType, string> = {
      [AgentType.WEB_SEARCH]: 'time-based',
      [AgentType.CODE_INTERPRETER]: 'session-based',
      [AgentType.URL_PULL]: 'content-based',
      [AgentType.LOCAL_KNOWLEDGE]: 'query-based',
      [AgentType.FOUNDRY]: 'adaptive',
      [AgentType.THIRD_PARTY]: 'minimal',
      [AgentType.STANDARD_CHAT]: 'none',
    };

    return strategies[agentType] || 'default';
  }

  private getEnabledOptimizations(): string[] {
    const optimizations: string[] = [];

    if (this.optimizationConfig.enableCaching) optimizations.push('caching');
    if (this.optimizationConfig.enablePooling) optimizations.push('pooling');
    if (this.optimizationConfig.enableBatching) optimizations.push('batching');
    if (this.optimizationConfig.enableParallelExecution)
      optimizations.push('parallel');
    if (this.optimizationConfig.enablePrefetching)
      optimizations.push('prefetching');

    return optimizations;
  }

  private getDefaultOptimizationConfig(): OptimizationConfig {
    return {
      enableCaching: true,
      enablePooling: true,
      enablePrefetching: false,
      enableBatching: true,
      enableParallelExecution: true,
      cacheTTL: 300000, // 5 minutes
      maxConcurrentRequests: 5,
      batchSize: 3,
      prefetchThreshold: 0.8,
      optimizationStrategy: 'balanced',
    };
  }

  private initializeOptimizer(): void {
    console.log('Performance optimizer initialized', {
      config: this.optimizationConfig,
    });

    // Start resource monitoring
    this.startResourceMonitoring();

    // Set up cache cleanup
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Every minute
  }

  private startResourceMonitoring(): void {
    this.resourceMonitor = setInterval(() => {
      this.collectResourceMetrics();
    }, 10000); // Every 10 seconds
  }

  private collectResourceMetrics(): void {
    // Collect basic resource metrics
    for (const [agentType, metrics] of this.performanceMetrics.entries()) {
      metrics.resourceUtilization = {
        cpuUsage: Math.random() * 100, // Placeholder - would use actual metrics
        memoryUsage: this.performanceCache.size * 0.1, // Rough estimate
        activeConnections: this.requestInProgress.size,
        queueSize: this.requestQueue.get(agentType)?.length || 0,
        poolUtilization: Math.random() * 100, // Placeholder
      };
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.performanceCache.entries()) {
      if (now - value.timestamp > this.optimizationConfig.cacheTTL) {
        this.performanceCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log('Cache cleanup completed', {
        itemsRemoved: cleanedCount,
        remainingItems: this.performanceCache.size,
      });
    }
  }
}

/**
 * Convenience function to get the singleton optimizer instance
 */
export function getAgentPerformanceOptimizer(): AgentPerformanceOptimizer {
  return AgentPerformanceOptimizer.getInstance();
}

/**
 * Convenience function to optimize agent execution
 */
export async function optimizeAgentExecution(
  request: AgentExecutionRequest,
  openai: AzureOpenAI,
  user: Session['user'],
): Promise<AgentExecutionResult> {
  const optimizer = getAgentPerformanceOptimizer();
  return await optimizer.optimizeExecution(request, openai, user);
}

/**
 * Convenience function to execute multiple requests in parallel
 */
export async function executeAgentsInParallel(
  requests: AgentExecutionRequest[],
  openai: AzureOpenAI,
  user: Session['user'],
  maxConcurrency?: number,
): Promise<AgentExecutionResult[]> {
  const optimizer = getAgentPerformanceOptimizer();
  return await optimizer.executeParallel(
    requests,
    openai,
    user,
    maxConcurrency,
  );
}

/**
 * Convenience function to get performance recommendations
 */
export function getPerformanceRecommendations(): OptimizationRecommendation[] {
  const optimizer = getAgentPerformanceOptimizer();
  return optimizer.getOptimizationRecommendations();
}
