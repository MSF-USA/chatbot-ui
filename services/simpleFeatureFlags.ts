/**
 * Simple Feature Flags Service
 * 
 * Lightweight feature flag system that works both client and server-side
 * without complex SDKs. Uses environment variables and local storage.
 */

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
 * Agent routing flags structure (maintaining compatibility)
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
 * Feature flag configuration
 */
interface FeatureFlagConfig {
  // Agent routing
  'agent-routing-enabled'?: boolean;
  'agent-type'?: string;
  'rollout-percentage'?: number;
  'fallback-on-error'?: boolean;
  'enable-streaming'?: boolean;
  'rate-limit-multiplier'?: number;
  
  // Additional feature flags can be added here
  [key: string]: boolean | string | number | undefined;
}

/**
 * Default feature flag values
 */
const DEFAULT_FLAGS: FeatureFlagConfig = {
  'agent-routing-enabled': true, // Enable by default when using enhanced service
  'agent-type': 'web-search',
  'rollout-percentage': 100, // Full rollout by default
  'fallback-on-error': true,
  'enable-streaming': true, // Enable streaming by default
  'rate-limit-multiplier': 1.0,
};

/**
 * Environment variable mappings
 */
const ENV_FLAG_MAPPING: Record<string, string> = {
  'agent-routing-enabled': 'AGENT_ROUTING_ENABLED', // Use existing env var
  'agent-type': 'FEATURE_AGENT_TYPE',
  'rollout-percentage': 'FEATURE_ROLLOUT_PERCENTAGE',
  'fallback-on-error': 'FEATURE_FALLBACK_ON_ERROR',
  'enable-streaming': 'FEATURE_ENABLE_STREAMING',
  'rate-limit-multiplier': 'FEATURE_RATE_LIMIT_MULTIPLIER',
};

/**
 * Simple Feature Flag Service
 */
export class SimpleFeatureFlagService {
  private cache: Map<string, any> = new Map();
  private isClient: boolean;

  constructor() {
    this.isClient = typeof window !== 'undefined';
  }

  /**
   * Get feature flag value with fallback hierarchy:
   * 1. Environment variable (server) or localStorage (client)
   * 2. Default value
   */
  private getRawValue(flagKey: string): any {
    // Check environment variables first (server-side or build-time)
    const envKey = ENV_FLAG_MAPPING[flagKey];
    if (envKey) {
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        // Parse the environment value
        if (envValue === 'true') return true;
        if (envValue === 'false') return false;
        const numValue = Number(envValue);
        if (!isNaN(numValue)) return numValue;
        return envValue;
      }
    }

    // Check localStorage on client-side
    if (this.isClient) {
      try {
        const stored = localStorage.getItem(`feature-flag:${flagKey}`);
        if (stored !== null) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.warn(`Failed to parse stored feature flag ${flagKey}:`, error);
      }
    }

    // Return default value
    return DEFAULT_FLAGS[flagKey];
  }

  /**
   * Set feature flag value (client-side only)
   */
  setFlag(flagKey: string, value: any): void {
    if (!this.isClient) {
      console.warn('Cannot set feature flags on server-side');
      return;
    }

    try {
      localStorage.setItem(`feature-flag:${flagKey}`, JSON.stringify(value));
      this.cache.set(flagKey, value);
    } catch (error) {
      console.error(`Failed to store feature flag ${flagKey}:`, error);
    }
  }

  /**
   * Evaluate a boolean feature flag
   */
  async evaluateFlag(
    flagKey: string, 
    userContext: UserContext, 
    defaultValue: boolean = false
  ): Promise<boolean> {
    const cached = this.cache.get(flagKey);
    if (cached !== undefined) {
      return Boolean(cached);
    }

    const value = this.getRawValue(flagKey);
    const result = value !== undefined ? Boolean(value) : defaultValue;
    
    this.cache.set(flagKey, result);
    return result;
  }

  /**
   * Evaluate a feature flag with detailed result (maintaining compatibility)
   */
  async evaluateFlagWithDetails<T>(
    flagKey: string,
    userContext: UserContext,
    defaultValue: T
  ): Promise<T> {
    const cached = this.cache.get(flagKey);
    if (cached !== undefined) {
      return cached;
    }

    const value = this.getRawValue(flagKey);
    const result = value !== undefined ? value : defaultValue;
    
    this.cache.set(flagKey, result);
    return result;
  }

  /**
   * Get flag variation (string-based flags)
   */
  async getFlagVariation(
    flagKey: string,
    userContext: UserContext,
    defaultValue: string = 'control'
  ): Promise<string> {
    return this.evaluateFlagWithDetails(flagKey, userContext, defaultValue);
  }

  /**
   * Get all agent routing flags for a user
   */
  async getAgentRoutingFlags(userContext: UserContext): Promise<AgentRoutingFlags> {
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
      console.error('Failed to get agent routing flags:', error);
      
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
      console.error('Failed to determine agent routing:', error);
      return false; // Safe default
    }
  }

  /**
   * Generate consistent hash for user ID (for percentage rollouts)
   */
  private getUserHash(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all available flags
   */
  getAvailableFlags(): string[] {
    return Object.keys(DEFAULT_FLAGS);
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    isInitialized: boolean;
    cacheSize: number;
    isClient: boolean;
  } {
    return {
      isInitialized: true,
      cacheSize: this.cache.size,
      isClient: this.isClient,
    };
  }

  /**
   * Initialize (no-op for compatibility)
   */
  async initialize(): Promise<void> {
    // No initialization needed for simple flags
    console.log('Simple Feature Flag Service initialized');
  }

  /**
   * Close (no-op for compatibility)
   */
  async close(): Promise<void> {
    this.clearCache();
    console.log('Simple Feature Flag Service closed');
  }
}

/**
 * Singleton instance for global access
 */
let featureFlagServiceInstance: SimpleFeatureFlagService | null = null;

/**
 * Get or create the feature flag service instance
 */
export function getFeatureFlagService(): SimpleFeatureFlagService {
  if (!featureFlagServiceInstance) {
    featureFlagServiceInstance = new SimpleFeatureFlagService();
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

// Re-export for compatibility
export { SimpleFeatureFlagService as FeatureFlagService };