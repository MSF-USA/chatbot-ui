import {
  AgentDiscoveryQuery,
  AgentDiscoveryResult,
  AgentExecutionEnvironment,
  AgentFactoryRegistration,
  AgentType,
} from '@/types/agent';

import { AgentFactory, getAgentFactory } from './agentFactory';
import { AzureMonitorLoggingService } from './loggingService';

/**
 * Agent metadata for extended registry functionality
 */
interface AgentMetadata {
  version: string;
  author: string;
  description: string;
  tags: string[];
  category: string;
  documentation?: string;
  examples?: any[];
  pricing?: {
    model: 'free' | 'usage' | 'subscription';
    cost?: number;
    currency?: string;
  };
}

/**
 * Extended agent registration with metadata
 */
interface ExtendedAgentRegistration extends AgentFactoryRegistration {
  metadata: AgentMetadata;
  enabled: boolean;
  priority: number;
  usage: {
    totalExecutions: number;
    successfulExecutions: number;
    averageResponseTime: number;
    lastUsed: Date | null;
  };
}

/**
 * Registry search filters
 */
interface RegistrySearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  version?: string;
  enabled?: boolean;
  minPriority?: number;
  pricingModel?: 'free' | 'usage' | 'subscription';
}

/**
 * Registry statistics
 */
interface RegistryStatistics {
  totalAgents: number;
  enabledAgents: number;
  categories: Record<string, number>;
  authors: Record<string, number>;
  totalExecutions: number;
  averageResponseTime: number;
  popularAgents: Array<{
    type: AgentType;
    executions: number;
    successRate: number;
  }>;
}

/**
 * AgentRegistry - Advanced registry service for agent management
 * Provides extended functionality beyond the basic factory registration
 */
export class AgentRegistry {
  private static instance: AgentRegistry | null = null;
  private extendedRegistrations: Map<AgentType, ExtendedAgentRegistration> =
    new Map();
  private factory: AgentFactory;

  private constructor() {
    this.factory = getAgentFactory();
    this.initializeExtendedRegistrations();
  }

  /**
   * Singleton pattern - get or create registry instance
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register an agent with extended metadata
   */
  public registerAgentWithMetadata(
    registration: AgentFactoryRegistration,
    metadata: AgentMetadata,
    priority: number = 100,
  ): void {
    try {
      // Register with the factory first
      this.factory.registerAgent(
        registration.type,
        registration.factory,
        registration.capabilities,
        registration.supportedModels,
        registration.configSchema,
      );

      // Create extended registration
      const extendedRegistration: ExtendedAgentRegistration = {
        ...registration,
        metadata,
        enabled: true,
        priority,
        usage: {
          totalExecutions: 0,
          successfulExecutions: 0,
          averageResponseTime: 0,
          lastUsed: null,
        },
      };

      this.extendedRegistrations.set(registration.type, extendedRegistration);

      console.log(`[INFO] Agent registered with metadata`, {
        agentType: registration.type,
        category: metadata.category,
        version: metadata.version,
        author: metadata.author,
      });
    } catch (error) {
      console.error(`[ERROR] Failed to register agent with metadata`, error, {
        agentType: registration.type,
      });
      throw error;
    }
  }

  /**
   * Update agent metadata
   */
  public updateAgentMetadata(
    type: AgentType,
    metadata: Partial<AgentMetadata>,
  ): boolean {
    try {
      const registration = this.extendedRegistrations.get(type);
      if (!registration) {
        console.warn(
          `[WARNING] Agent type ${type} not found for metadata update`,
          {
            agentType: type,
          },
        );
        return false;
      }

      registration.metadata = {
        ...registration.metadata,
        ...metadata,
      };

      this.extendedRegistrations.set(type, registration);

      console.log(`[INFO] Agent metadata updated`, {
        agentType: type,
        updatedFields: Object.keys(metadata),
      });

      return true;
    } catch (error) {
      console.error(`[ERROR] Failed to update agent metadata`, error as Error, {
        agentType: type,
      });
      throw error;
    }
  }

  /**
   * Enable or disable an agent
   */
  public setAgentEnabled(type: AgentType, enabled: boolean): boolean {
    try {
      const registration = this.extendedRegistrations.get(type);
      if (!registration) {
        return false;
      }

      registration.enabled = enabled;
      this.extendedRegistrations.set(type, registration);

      console.log(`[INFO] Agent ${enabled ? 'enabled' : 'disabled'}`, {
        agentType: type,
        enabled,
      });

      return true;
    } catch (error) {
      console.error(
        `[ERROR] Failed to set agent enabled state`,
        error as Error,
        {
          agentType: type,
          enabled,
        },
      );
      throw error;
    }
  }

  /**
   * Set agent priority
   */
  public setAgentPriority(type: AgentType, priority: number): boolean {
    try {
      const registration = this.extendedRegistrations.get(type);
      if (!registration) {
        return false;
      }

      registration.priority = priority;
      this.extendedRegistrations.set(type, registration);

      console.log(`[INFO] Agent priority updated`, {
        agentType: type,
        priority,
      });

      return true;
    } catch (error) {
      console.error(`[ERROR] Failed to set agent priority`, error as Error, {
        agentType: type,
        priority,
      });
      throw error;
    }
  }

  /**
   * Record agent usage statistics
   */
  public recordAgentUsage(
    type: AgentType,
    success: boolean,
    responseTime: number,
  ): void {
    try {
      const registration = this.extendedRegistrations.get(type);
      if (!registration) {
        return;
      }

      registration.usage.totalExecutions++;
      if (success) {
        registration.usage.successfulExecutions++;
      }

      // Update average response time
      registration.usage.averageResponseTime =
        (registration.usage.averageResponseTime *
          (registration.usage.totalExecutions - 1) +
          responseTime) /
        registration.usage.totalExecutions;

      registration.usage.lastUsed = new Date();

      this.extendedRegistrations.set(type, registration);

      console.log(`[INFO] Agent usage recorded`, {
        agentType: type,
        success,
        responseTime,
        totalExecutions: registration.usage.totalExecutions,
      });
    } catch (error) {
      console.error(`[ERROR] Failed to record agent usage`, error as Error, {
        agentType: type,
        success,
        responseTime,
      });
    }
  }

  /**
   * Search agents with advanced filters
   */
  public searchAgents(filters: RegistrySearchFilters): AgentDiscoveryResult[] {
    try {
      const allAgents = this.factory.discoverAgents({});
      const results: AgentDiscoveryResult[] = [];

      for (const agent of allAgents) {
        const extendedReg = this.extendedRegistrations.get(agent.type);
        if (!extendedReg) continue;

        // Apply filters
        if (
          filters.enabled !== undefined &&
          extendedReg.enabled !== filters.enabled
        )
          continue;
        if (
          filters.minPriority !== undefined &&
          extendedReg.priority < filters.minPriority
        )
          continue;
        if (
          filters.category &&
          extendedReg.metadata.category !== filters.category
        )
          continue;
        if (filters.author && extendedReg.metadata.author !== filters.author)
          continue;
        if (filters.version && extendedReg.metadata.version !== filters.version)
          continue;
        if (
          filters.pricingModel &&
          extendedReg.metadata.pricing?.model !== filters.pricingModel
        )
          continue;

        // Tag filtering
        if (
          filters.tags &&
          !filters.tags.every((tag) => extendedReg.metadata.tags.includes(tag))
        )
          continue;

        // Text search in name and description
        if (filters.query) {
          const searchText = filters.query.toLowerCase();
          const agentText =
            `${agent.registration.type} ${extendedReg.metadata.description}`.toLowerCase();
          if (!agentText.includes(searchText)) continue;
        }

        results.push(agent);
      }

      // Sort by priority (highest first)
      results.sort((a, b) => {
        const priorityA = this.extendedRegistrations.get(a.type)?.priority || 0;
        const priorityB = this.extendedRegistrations.get(b.type)?.priority || 0;
        return priorityB - priorityA;
      });

      console.log(`[INFO] Agent search completed`, {
        filters,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      console.error(`[ERROR] Agent search failed`, error as Error, {
        filters,
      });
      throw error;
    }
  }

  /**
   * Get agent metadata
   */
  public getAgentMetadata(type: AgentType): AgentMetadata | undefined {
    const registration = this.extendedRegistrations.get(type);
    return registration?.metadata;
  }

  /**
   * Get agent usage statistics
   */
  public getAgentUsage(
    type: AgentType,
  ): ExtendedAgentRegistration['usage'] | undefined {
    const registration = this.extendedRegistrations.get(type);
    return registration?.usage;
  }

  /**
   * Get all registered agents with metadata
   */
  public getAllExtendedRegistrations(): Map<
    AgentType,
    ExtendedAgentRegistration
  > {
    return new Map(this.extendedRegistrations);
  }

  /**
   * Get registry statistics
   */
  public getRegistryStatistics(): RegistryStatistics {
    try {
      const registrations = Array.from(this.extendedRegistrations.values());
      const enabledAgents = registrations.filter((r) => r.enabled);

      // Category distribution
      const categories: Record<string, number> = {};
      registrations.forEach((r) => {
        categories[r.metadata.category] =
          (categories[r.metadata.category] || 0) + 1;
      });

      // Author distribution
      const authors: Record<string, number> = {};
      registrations.forEach((r) => {
        authors[r.metadata.author] = (authors[r.metadata.author] || 0) + 1;
      });

      // Total executions and average response time
      const totalExecutions = registrations.reduce(
        (sum, r) => sum + r.usage.totalExecutions,
        0,
      );
      const totalResponseTime = registrations.reduce(
        (sum, r) => sum + r.usage.averageResponseTime * r.usage.totalExecutions,
        0,
      );
      const averageResponseTime =
        totalExecutions > 0 ? totalResponseTime / totalExecutions : 0;

      // Popular agents (sorted by executions)
      const popularAgents = registrations
        .filter((r) => r.usage.totalExecutions > 0)
        .map((r) => ({
          type: r.type,
          executions: r.usage.totalExecutions,
          successRate:
            r.usage.totalExecutions > 0
              ? r.usage.successfulExecutions / r.usage.totalExecutions
              : 0,
        }))
        .sort((a, b) => b.executions - a.executions)
        .slice(0, 10);

      const statistics: RegistryStatistics = {
        totalAgents: registrations.length,
        enabledAgents: enabledAgents.length,
        categories,
        authors,
        totalExecutions,
        averageResponseTime,
        popularAgents,
      };

      console.log(`[INFO] Registry statistics generated`, {
        totalAgents: statistics.totalAgents,
        enabledAgents: statistics.enabledAgents,
        totalExecutions: statistics.totalExecutions,
      });

      return statistics;
    } catch (error) {
      console.error(
        `[ERROR] Failed to generate registry statistics`,
        error as Error,
      );
      throw error;
    }
  }

  /**
   * Export registry configuration
   */
  public exportRegistry(): any {
    try {
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        agents: Object.fromEntries(
          Array.from(this.extendedRegistrations.entries()).map(
            ([type, registration]) => [
              type,
              {
                metadata: registration.metadata,
                enabled: registration.enabled,
                priority: registration.priority,
                capabilities: registration.capabilities,
                supportedModels: registration.supportedModels,
                usage: registration.usage,
              },
            ],
          ),
        ),
      };

      console.log(`[INFO] Registry exported`, {
        agentCount: Object.keys(exportData.agents).length,
        timestamp: exportData.timestamp,
      });

      return exportData;
    } catch (error) {
      console.error(`[ERROR] Failed to export registry`, error as Error);
      throw error;
    }
  }

  /**
   * Get recommended agents based on query and context
   */
  public getRecommendedAgents(
    query: string,
    context?: any,
    limit: number = 5,
  ): AgentDiscoveryResult[] {
    try {
      // Simple recommendation algorithm based on:
      // 1. Agent capabilities matching query keywords
      // 2. Usage statistics (success rate, popularity)
      // 3. Agent priority

      const allAgents = this.factory.discoverAgents({});
      const scoredAgents = allAgents.map((agent) => {
        const extendedReg = this.extendedRegistrations.get(agent.type);
        if (!extendedReg || !extendedReg.enabled) {
          return { agent, score: 0 };
        }

        let score = 0;

        // Capability matching
        const queryLower = query.toLowerCase();
        const capabilityMatches = agent.capabilities.filter(
          (cap) =>
            queryLower.includes(cap.replace('_', ' ')) ||
            cap.toLowerCase().includes(queryLower),
        ).length;
        score += capabilityMatches * 10;

        // Success rate
        const successRate =
          extendedReg.usage.totalExecutions > 0
            ? extendedReg.usage.successfulExecutions /
              extendedReg.usage.totalExecutions
            : 0.5;
        score += successRate * 5;

        // Popularity (normalized by total executions)
        const popularityScore =
          Math.min(extendedReg.usage.totalExecutions / 100, 1) * 3;
        score += popularityScore;

        // Priority
        score += extendedReg.priority / 100;

        // Response time (lower is better)
        const responseTimeScore =
          extendedReg.usage.averageResponseTime > 0
            ? Math.max(0, 2 - extendedReg.usage.averageResponseTime / 5000)
            : 1;
        score += responseTimeScore;

        return { agent, score };
      });

      const recommendations = scoredAgents
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => item.agent);

      console.log(`[INFO] Agent recommendations generated`, {
        query,
        recommendationCount: recommendations.length,
        topScore: scoredAgents[0]?.score || 0,
      });

      return recommendations;
    } catch (error) {
      console.error(
        `[ERROR] Failed to generate agent recommendations`,
        error as Error,
        {
          query,
          limit,
        },
      );
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private initializeExtendedRegistrations(): void {
    try {
      // Initialize with default agents
      const defaultAgents = [
        {
          type: AgentType.FOUNDRY,
          metadata: {
            version: '1.0.0',
            author: 'Microsoft',
            description: 'Azure AI Foundry agent for advanced AI capabilities',
            tags: ['ai', 'foundry', 'azure', 'conversation'],
            category: 'AI Services',
            documentation: 'https://docs.microsoft.com/azure/ai-foundry',
            pricing: { model: 'usage' as const, cost: 0.002, currency: 'USD' },
          },
          priority: 90,
        },
        {
          type: AgentType.CODE_INTERPRETER,
          metadata: {
            version: '1.0.0',
            author: 'System',
            description: 'Code execution agent for programming tasks',
            tags: ['code', 'programming', 'execution', 'python', 'javascript'],
            category: 'Development',
            pricing: { model: 'free' as const },
          },
          priority: 80,
        },
        {
          type: AgentType.THIRD_PARTY,
          metadata: {
            version: '1.0.0',
            author: 'System',
            description: 'Third-party service integration agent',
            tags: ['integration', 'api', 'third-party', 'webhook'],
            category: 'Integration',
            pricing: { model: 'usage' as const },
          },
          priority: 70,
        },
      ];

      for (const agentDef of defaultAgents) {
        const factoryReg = this.factory.getAgentRegistration(agentDef.type);
        if (factoryReg) {
          const extendedReg: ExtendedAgentRegistration = {
            ...factoryReg,
            metadata: agentDef.metadata,
            enabled: true,
            priority: agentDef.priority,
            usage: {
              totalExecutions: 0,
              successfulExecutions: 0,
              averageResponseTime: 0,
              lastUsed: null,
            },
          };
          this.extendedRegistrations.set(agentDef.type, extendedReg);
        }
      }

      console.log(`[INFO] Extended registrations initialized`, {
        agentCount: this.extendedRegistrations.size,
      });
    } catch (error) {
      console.error(
        `[ERROR] Failed to initialize extended registrations`,
        error as Error,
      );
      throw error;
    }
  }
}

/**
 * Convenience function to get the singleton registry instance
 */
export function getAgentRegistry(): AgentRegistry {
  return AgentRegistry.getInstance();
}

/**
 * Convenience function to search agents
 */
export function searchAgents(
  filters: RegistrySearchFilters,
): AgentDiscoveryResult[] {
  const registry = getAgentRegistry();
  return registry.searchAgents(filters);
}

/**
 * Convenience function to get agent recommendations
 */
export function getRecommendedAgents(
  query: string,
  context?: any,
  limit?: number,
): AgentDiscoveryResult[] {
  const registry = getAgentRegistry();
  return registry.getRecommendedAgents(query, context, limit);
}
