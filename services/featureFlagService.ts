/**
 * Feature Flag Service
 *
 * Provides type-safe feature flag evaluation using LaunchDarkly SDK
 * with caching, user targeting, and error handling for Azure AI Agent integration.
 */
import { AzureMonitorLoggingService } from './loggingService';

import {
  LDClient,
  LDFlagSet,
  LDUser,
  init,
} from '@launchdarkly/node-server-sdk';

/**
 * User context for feature flag evaluation
 */
export interface UserContext {
  userId: string;
  email?: string;
  role?: string;
  groups?: string[];
  custom?: Record<string, any>;
}

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  sdkKey: string;
  timeout: number;
  enableCaching: boolean;
  cacheTime: number;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Agent routing flags structure
 */
export interface AgentRoutingFlags {
  agentRoutingEnabled: boolean;
  agentType: 'web-search' | 'code-interpreter' | 'local-knowledge';
  rolloutPercentage: number;
  fallbackOnError: boolean;
  enableStreaming: boolean;
  rateLimitMultiplier: number;
}

/**
 * Feature flag evaluation result
 */
export interface FlagEvaluationResult<T = any> {
  value: T;
  variation: number;
  reason: {
    kind: string;
    errorKind?: string;
  };
  trackEvents: boolean;
}

/**
 * Feature flag cache entry
 */
interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Feature Flag Service for controlled rollout of Azure AI Agent system
 */
export class FeatureFlagService {
  private client: LDClient | null = null;
  private config: FeatureFlagConfig;
  private logger: AzureMonitorLoggingService | null;
  private cache: Map<string, CacheEntry> = new Map();
  private isInitialized = false;

  // Default flag values for fallback scenarios
  private defaultFlags: Partial<AgentRoutingFlags> = {
    agentRoutingEnabled: false,
    agentType: 'web-search',
    rolloutPercentage: 0,
    fallbackOnError: true,
    enableStreaming: false,
    rateLimitMultiplier: 1.0,
  };

  constructor(config: FeatureFlagConfig) {
    this.config = config;
    this.logger = AzureMonitorLoggingService.getInstance();
  }

  /**
   * Initialize the LaunchDarkly client
   */
  async initialize(): Promise<void> {
    try {
      console.log('[INFO] Initializing Feature Flag Service');

      if (!this.config.sdkKey) {
        throw new Error('LaunchDarkly SDK key is required');
      }

      this.client = init(this.config.sdkKey, {
        timeout: this.config.timeout,
        logger: {
          debug: (message: string) => console.debug(`[LD DEBUG] ${message}`),
          info: (message: string) => console.info(`[LD INFO] ${message}`),
          warn: (message: string) => console.warn(`[LD WARN] ${message}`),
          error: (message: string) => console.error(`[LD ERROR] ${message}`),
        },
      });

      await this.client.waitForInitialization();
      this.isInitialized = true;

      console.log('[INFO] Feature Flag Service initialized successfully');

      await this.logger?.logCustomMetric(
        'FeatureFlagServiceEvent',
        1,
        'count',
        {
          eventName: 'FeatureFlagServiceInitialized',
          environment: this.config.environment,
          cachingEnabled: String(this.config.enableCaching),
        },
      );
    } catch (error) {
      console.error(
        '[ERROR] Failed to initialize Feature Flag Service:',
        error,
      );

      await this.logger?.logCustomMetric(
        'FeatureFlagServiceError',
        1,
        'count',
        {
          errorMessage: 'Feature flag service initialization failed',
          error: error instanceof Error ? error.message : String(error),
          environment: this.config.environment,
          timeout: String(this.config.timeout),
        },
      );

      throw error;
    }
  }

  /**
   * Evaluate a boolean feature flag
   */
  async evaluateFlag(
    flagKey: string,
    userContext: UserContext,
    defaultValue: boolean = false,
  ): Promise<boolean> {
    return this.evaluateFlagWithDetails(flagKey, userContext, defaultValue);
  }

  /**
   * Evaluate a feature flag with detailed result
   */
  async evaluateFlagWithDetails<T>(
    flagKey: string,
    userContext: UserContext,
    defaultValue: T,
  ): Promise<T> {
    try {
      // Check cache first if enabled
      if (this.config.enableCaching) {
        const cached = this.getCachedValue<T>(flagKey, userContext.userId);
        if (cached !== null) {
          return cached;
        }
      }

      if (!this.isInitialized || !this.client) {
        console.warn(
          `[WARN] Feature flag service not initialized, using default for ${flagKey}`,
        );
        return defaultValue;
      }

      const ldUser = this.convertToLDUser(userContext);
      const result = await this.client.variationDetail(
        flagKey,
        ldUser,
        defaultValue,
      );

      // Cache the result if enabled
      if (this.config.enableCaching) {
        this.setCachedValue(
          flagKey,
          userContext.userId,
          result.value,
          this.config.cacheTime,
        );
      }

      // Log flag evaluation
      await this.logger?.logCustomMetric(
        'FeatureFlagServiceEvent',
        1,
        'count',
        {
          eventName: 'FeatureFlagEvaluated',
          flagKey,
          userId: userContext.userId,
          value: String(result.value),
          variation: 'unknown', // LaunchDarkly doesn't expose variation in basic client
          environment: this.config.environment,
        },
      );

      return result.value;
    } catch (error) {
      console.error(`[ERROR] Failed to evaluate flag ${flagKey}:`, error);

      await this.logger?.logCustomMetric(
        'FeatureFlagServiceError',
        1,
        'count',
        {
          errorMessage: 'Feature flag evaluation failed',
          flagKey,
          userId: userContext.userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      return defaultValue;
    }
  }

  /**
   * Get flag variation (string-based flags)
   */
  async getFlagVariation(
    flagKey: string,
    userContext: UserContext,
    defaultValue: string = 'control',
  ): Promise<string> {
    return this.evaluateFlagWithDetails(flagKey, userContext, defaultValue);
  }

  /**
   * Get all agent routing flags for a user
   */
  async getAgentRoutingFlags(
    userContext: UserContext,
  ): Promise<AgentRoutingFlags> {
    try {
      const [
        agentRoutingEnabled,
        agentType,
        rolloutPercentage,
        fallbackOnError,
        enableStreaming,
        rateLimitMultiplier,
      ] = await Promise.all([
        this.evaluateFlag('agent-routing-enabled', userContext, false),
        this.getFlagVariation('agent-type', userContext, 'web-search'),
        this.evaluateFlagWithDetails('rollout-percentage', userContext, 0),
        this.evaluateFlag('fallback-on-error', userContext, true),
        this.evaluateFlag('enable-streaming', userContext, false),
        this.evaluateFlagWithDetails('rate-limit-multiplier', userContext, 1.0),
      ]);

      return {
        agentRoutingEnabled,
        agentType: agentType as AgentRoutingFlags['agentType'],
        rolloutPercentage: Number(rolloutPercentage),
        fallbackOnError,
        enableStreaming,
        rateLimitMultiplier: Number(rateLimitMultiplier),
      };
    } catch (error) {
      console.error('[ERROR] Failed to get agent routing flags:', error);

      await this.logger?.logCustomMetric(
        'FeatureFlagServiceError',
        1,
        'count',
        {
          errorMessage: 'Agent routing flags evaluation failed',
          userId: userContext.userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      // Return safe defaults
      return {
        agentRoutingEnabled: false,
        agentType: 'web-search',
        rolloutPercentage: 0,
        fallbackOnError: true,
        enableStreaming: false,
        rateLimitMultiplier: 1.0,
      };
    }
  }

  /**
   * Check if user should be routed to agents
   */
  async shouldRouteToAgents(userContext: UserContext): Promise<boolean> {
    try {
      const flags = await this.getAgentRoutingFlags(userContext);

      // Primary flag check
      if (!flags.agentRoutingEnabled) {
        return false;
      }

      // Percentage rollout check
      if (flags.rolloutPercentage < 100) {
        const userHash = this.getUserHash(userContext.userId);
        const userPercentile = userHash % 100;

        if (userPercentile >= flags.rolloutPercentage) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[ERROR] Failed to determine agent routing:', error);
      return false; // Safe default
    }
  }

  /**
   * Convert UserContext to LaunchDarkly user format
   */
  private convertToLDUser(userContext: UserContext): LDUser {
    return {
      key: userContext.userId,
      email: userContext.email,
      custom: {
        role: userContext.role || 'user',
        groups: userContext.groups || [],
        ...userContext.custom,
      },
    };
  }

  /**
   * Generate consistent hash for user ID (for percentage rollouts)
   */
  private getUserHash(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Cache management
   */
  private getCachedValue<T>(flagKey: string, userId: string): T | null {
    const cacheKey = `${flagKey}:${userId}`;
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.value;
  }

  private setCachedValue<T>(
    flagKey: string,
    userId: string,
    value: T,
    ttl: number,
  ): void {
    const cacheKey = `${flagKey}:${userId}`;
    this.cache.set(cacheKey, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear cache for a specific user or all cache
   */
  clearCache(userId?: string): void {
    if (userId) {
      const keysToDelete = Array.from(this.cache.keys()).filter((key) =>
        key.endsWith(`:${userId}`),
      );
      keysToDelete.forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Close the LaunchDarkly client
   */
  async close(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
      this.isInitialized = false;

      console.log('[INFO] Feature Flag Service closed');
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    isInitialized: boolean;
    cacheSize: number;
    lastError?: string;
  } {
    return {
      isInitialized: this.isInitialized,
      cacheSize: this.cache.size,
    };
  }
}

/**
 * Singleton instance for global access
 */
let featureFlagServiceInstance: FeatureFlagService | null = null;

/**
 * Get or create the feature flag service instance
 */
export function getFeatureFlagService(): FeatureFlagService {
  if (!featureFlagServiceInstance) {
    const config: FeatureFlagConfig = {
      sdkKey: process.env.LAUNCHDARKLY_SDK_KEY || '',
      timeout: 5000,
      enableCaching: true,
      cacheTime: 60000, // 1 minute
      environment: (process.env.NODE_ENV as any) || 'development',
    };

    featureFlagServiceInstance = new FeatureFlagService(config);
  }

  return featureFlagServiceInstance;
}

/**
 * Initialize the global feature flag service
 */
export async function initializeFeatureFlagService(): Promise<void> {
  const service = getFeatureFlagService();
  await service.initialize();
}
