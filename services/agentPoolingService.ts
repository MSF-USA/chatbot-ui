/**
 * Agent Pooling Service
 * 
 * Manages a pool of agent instances for efficient resource utilization,
 * conversation memory management, and agent health monitoring.
 */

import { 
  AgentType, 
  BaseAgentInstance, 
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHealthResult,
  AgentPoolStats,
  AgentExecutionEnvironment,
  AgentConfig
} from '@/types/agent';
import { AgentFactory } from './agentFactory';
import { AzureMonitorLoggingService } from './loggingService';
import { AGENT_POOL_SIZE, DEFAULT_AGENT_TIMEOUT } from '@/utils/app/const';

/**
 * Agent pool configuration
 */
export interface AgentPoolConfig {
  maxPoolSize: number;
  minPoolSize: number;
  idleTimeout: number;
  healthCheckInterval: number;
  maxRetries: number;
  enableMemoryManagement: boolean;
}

/**
 * Agent instance wrapper with metadata
 */
interface PooledAgent {
  instance: BaseAgentInstance;
  id: string;
  type: AgentType;
  isActive: boolean;
  lastUsed: Date;
  conversationCount: number;
  memoryUsage: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  createdAt: Date;
}

/**
 * Conversation memory context
 */
interface ConversationMemory {
  conversationId: string;
  agentId: string;
  context: any;
  lastAccessed: Date;
  messageCount: number;
}

/**
 * Agent Pooling Service for managing agent resources and memory
 */
export class AgentPoolingService {
  private pools: Map<AgentType, PooledAgent[]> = new Map();
  private conversationMemory: Map<string, ConversationMemory> = new Map();
  private config: AgentPoolConfig;
  private agentFactory: AgentFactory;
  private logger: AzureMonitorLoggingService;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Performance metrics
  private metrics = {
    totalRequests: 0,
    poolHits: 0,
    poolMisses: 0,
    agentsCreated: 0,
    agentsDestroyed: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
  };

  constructor(
    agentFactory: AgentFactory,
    config: Partial<AgentPoolConfig> = {}
  ) {
    this.agentFactory = agentFactory;
    const loggerInstance = AzureMonitorLoggingService.getInstance();
    if (!loggerInstance) {
      throw new Error('Failed to initialize AzureMonitorLoggingService');
    }
    this.logger = loggerInstance;
    
    this.config = {
      maxPoolSize: AGENT_POOL_SIZE,
      minPoolSize: Math.max(1, Math.floor(AGENT_POOL_SIZE / 2)),
      idleTimeout: 300000, // 5 minutes
      healthCheckInterval: 60000, // 1 minute
      maxRetries: 3,
      enableMemoryManagement: true,
      ...config,
    };
  }

  /**
   * Initialize the agent pooling service
   */
  async initialize(): Promise<void> {
    try {
      console.log('[INFO] Initializing Agent Pooling Service');

      // Initialize pools for each agent type
      const agentTypes: AgentType[] = [AgentType.WEB_SEARCH, AgentType.CODE_INTERPRETER, AgentType.LOCAL_KNOWLEDGE];
      
      for (const agentType of agentTypes) {
        this.pools.set(agentType, []);
        
        // Pre-warm the pool with minimum instances
        await this.warmPool(agentType, this.config.minPoolSize);
      }

      // Start health check monitoring
      this.startHealthChecking();

      this.isInitialized = true;
      console.log('[INFO] Agent Pooling Service initialized successfully');

      void this.logger.logCustomMetric(
        'AgentPoolingServiceInitialized',
        1, // Count metric - service initialized once
        'count',
        {
          maxPoolSize: this.config.maxPoolSize,
          minPoolSize: this.config.minPoolSize,
          idleTimeout: this.config.idleTimeout,
          healthCheckInterval: this.config.healthCheckInterval,
          maxRetries: this.config.maxRetries,
          enableMemoryManagement: this.config.enableMemoryManagement ? 1 : 0,
          agentTypesCount: agentTypes.length,
        }
      );

    } catch (error) {
      console.error('[ERROR] Failed to initialize Agent Pooling Service:', error);
      throw error;
    }
  }

  /**
   * Get an agent from the pool or create a new one
   */
  async getAgent(
    agentType: AgentType,
    conversationId?: string
  ): Promise<PooledAgent> {
    const startTime = Date.now();
    
    try {
      this.metrics.totalRequests++;

      // Check if we have a conversation-specific agent
      if (conversationId) {
        const memory = this.conversationMemory.get(conversationId);
        if (memory) {
          const agent = this.findAgentById(memory.agentId);
          if (agent && agent.healthStatus === 'healthy') {
            this.metrics.poolHits++;
            agent.lastUsed = new Date();
            memory.lastAccessed = new Date();
            return agent;
          }
        }
      }

      // Get an available agent from the pool
      const pool = this.pools.get(agentType) || [];
      let agent = pool.find(a => !a.isActive && a.healthStatus === 'healthy');

      if (agent) {
        // Found available agent in pool
        this.metrics.poolHits++;
        agent.isActive = true;
        agent.lastUsed = new Date();
        
        // Associate with conversation if provided
        if (conversationId) {
          this.setConversationMemory(conversationId, agent.id);
        }
        
        return agent;
      }

      // Pool miss - need to create new agent
      this.metrics.poolMisses++;

      if (pool.length >= this.config.maxPoolSize) {
        // Pool is full, try to evict idle agents
        await this.evictIdleAgents(agentType);
        
        // Try again to find available agent
        agent = pool.find(a => !a.isActive && a.healthStatus === 'healthy');
        if (agent) {
          agent.isActive = true;
          agent.lastUsed = new Date();
          
          if (conversationId) {
            this.setConversationMemory(conversationId, agent.id);
          }
          
          return agent;
        }
      }

      // Create new agent
      agent = await this.createNewAgent(agentType);
      
      if (conversationId) {
        this.setConversationMemory(conversationId, agent.id);
      }

      return agent;

    } catch (error) {
      console.error(`[ERROR] Failed to get agent of type ${agentType}:`, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);
    }
  }

  /**
   * Return an agent to the pool
   */
  async returnAgent(
    agentId: string,
    result?: AgentExecutionResult
  ): Promise<void> {
    try {
      const agent = this.findAgentById(agentId);
      if (!agent) {
        console.warn(`[WARN] Agent ${agentId} not found in pool`);
        return;
      }

      agent.isActive = false;
      agent.lastUsed = new Date();
      agent.conversationCount++;

      // Update health status based on execution result
      if (result) {
        if (result.response.success) {
          agent.healthStatus = 'healthy';
        } else if (result.response.content?.includes('timeout')) {
          agent.healthStatus = 'degraded';
        } else {
          agent.healthStatus = 'unhealthy';
        }
      }

      // Memory management
      if (this.config.enableMemoryManagement) {
        await this.updateAgentMemoryUsage(agent);
      }

      console.log(`[INFO] Agent ${agentId} returned to pool`);

    } catch (error) {
      console.error(`[ERROR] Failed to return agent ${agentId}:`, error);
    }
  }

  /**
   * Execute a request using a pooled agent
   */
  async executeWithAgent(
    agentType: AgentType,
    request: AgentExecutionRequest
  ): Promise<AgentExecutionResult> {
    let agent: PooledAgent | null = null;
    
    try {
      // Get agent from pool
      agent = await this.getAgent(agentType, 'default-conversation');
      
      // Execute the request
      const response = await agent.instance.execute(request.context);
      
      // Create execution result
      const result: AgentExecutionResult = {
        request: request,
        response: response,
        startTime: new Date(),
        endTime: new Date(),
        executionTime: 0,
        agentInstance: agent.instance,
      };
      
      // Return agent to pool
      await this.returnAgent(agent.id, result);
      
      return result;

    } catch (error) {
      console.error(`[ERROR] Failed to execute with agent:`, error);
      
      if (agent) {
        const errorResult: AgentExecutionResult = {
          request: request,
          response: {
            agentId: agent.id,
            agentType: agentType,
            content: error instanceof Error ? error.message : String(error),
            success: false,
            metadata: { 
              agentMetadata: { 
                error: true 
              } 
            },
          },
          startTime: new Date(),
          endTime: new Date(),
          executionTime: 0,
          agentInstance: agent.instance,
        };
        await this.returnAgent(agent.id, errorResult);
      }
      
      throw error;
    }
  }

  /**
   * Get conversation memory for continuity
   */
  getConversationMemory(conversationId: string): ConversationMemory | null {
    return this.conversationMemory.get(conversationId) || null;
  }

  /**
   * Clear conversation memory
   */
  clearConversationMemory(conversationId: string): void {
    this.conversationMemory.delete(conversationId);
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): AgentPoolStats {
    const poolStats: Record<AgentType, any> = {} as any;
    
    for (const [agentType, pool] of this.pools.entries()) {
      poolStats[agentType] = {
        total: pool.length,
        active: pool.filter(a => a.isActive).length,
        healthy: pool.filter(a => a.healthStatus === 'healthy').length,
        degraded: pool.filter(a => a.healthStatus === 'degraded').length,
        unhealthy: pool.filter(a => a.healthStatus === 'unhealthy').length,
      };
    }

    return {
      agentType: AgentType.WEB_SEARCH, // Default agent type for aggregated stats
      totalAgents: Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.length, 0),
      activeAgents: Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.filter(a => a.isActive).length, 0),
      idleAgents: Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.filter(a => !a.isActive).length, 0),
      hitRate: this.metrics.totalRequests > 0 ? this.metrics.poolHits / this.metrics.totalRequests : 0,
      missRate: this.metrics.totalRequests > 0 ? this.metrics.poolMisses / this.metrics.totalRequests : 0,
      avgCreationTime: 100, // Placeholder value
      avgExecutionTime: this.metrics.averageResponseTime,
      memoryUsage: this.metrics.memoryUsage,
      lastUpdated: new Date(),
    };
  }

  /**
   * Health check for all agents
   */
  async performHealthCheck(): Promise<Record<AgentType, AgentHealthResult[]>> {
    const results: Record<AgentType, AgentHealthResult[]> = {} as any;
    
    for (const [agentType, pool] of this.pools.entries()) {
      results[agentType] = [];
      
      for (const agent of pool) {
        try {
          const health = await agent.instance.checkHealth();
          results[agentType].push(health);
          
          // Update agent health status
          if (health.healthy) {
            agent.healthStatus = 'healthy';
          } else if (health.responseTime > 5000) {
            agent.healthStatus = 'degraded';
          } else {
            agent.healthStatus = 'unhealthy';
          }
          
        } catch (error) {
          agent.healthStatus = 'unhealthy';
          results[agentType].push({
            agentId: agent.id,
            healthy: false,
            timestamp: new Date(),
            responseTime: 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Shutdown the pooling service
   */
  async shutdown(): Promise<void> {
    try {
      console.log('[INFO] Shutting down Agent Pooling Service');
      
      // Stop health checking
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      // Destroy all agents
      for (const pool of this.pools.values()) {
        for (const agent of pool) {
          try {
            if (typeof agent.instance.cleanup === 'function') {
              await agent.instance.cleanup();
            }
          } catch (error) {
            console.error(`[ERROR] Failed to destroy agent ${agent.id}:`, error);
          }
        }
      }
      
      // Clear pools and memory
      this.pools.clear();
      this.conversationMemory.clear();
      this.isInitialized = false;
      
      console.log('[INFO] Agent Pooling Service shutdown complete');
      
    } catch (error) {
      console.error('[ERROR] Error during Agent Pooling Service shutdown:', error);
    }
  }

  /**
   * Private helper methods
   */

  private async warmPool(agentType: AgentType, count: number): Promise<void> {
    const pool = this.pools.get(agentType) || [];
    
    for (let i = 0; i < count; i++) {
      try {
        const agent = await this.createNewAgent(agentType);
        agent.isActive = false; // Available for use
      } catch (error) {
        console.error(`[ERROR] Failed to warm pool for ${agentType}:`, error);
      }
    }
  }

  private async createNewAgent(agentType: AgentType): Promise<PooledAgent> {
    try {
      const agentConfig = {
        id: `pooled-${agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Pooled ${agentType} Agent`,
        type: agentType,
        environment: AgentExecutionEnvironment.FOUNDRY,
        modelId: 'gpt-4o-mini',
        instructions: 'Pooled agent instance',
        tools: [],
        timeout: DEFAULT_AGENT_TIMEOUT,
      };
      const instance = await this.agentFactory.createAgent(agentConfig);
      
      const agent: PooledAgent = {
        instance,
        id: `${agentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: agentType,
        isActive: true,
        lastUsed: new Date(),
        conversationCount: 0,
        memoryUsage: 0,
        healthStatus: 'healthy',
        createdAt: new Date(),
      };
      
      const pool = this.pools.get(agentType) || [];
      pool.push(agent);
      this.pools.set(agentType, pool);
      
      this.metrics.agentsCreated++;
      
      console.log(`[INFO] Created new agent: ${agent.id}`);
      return agent;
      
    } catch (error) {
      console.error(`[ERROR] Failed to create agent of type ${agentType}:`, error);
      throw error;
    }
  }

  private findAgentById(agentId: string): PooledAgent | null {
    for (const pool of this.pools.values()) {
      const agent = pool.find(a => a.id === agentId);
      if (agent) return agent;
    }
    return null;
  }

  private setConversationMemory(conversationId: string, agentId: string): void {
    this.conversationMemory.set(conversationId, {
      conversationId,
      agentId,
      context: {},
      lastAccessed: new Date(),
      messageCount: 0,
    });
  }

  private async evictIdleAgents(agentType: AgentType): Promise<void> {
    const pool = this.pools.get(agentType) || [];
    const now = Date.now();
    
    const idleAgents = pool.filter(
      agent => !agent.isActive && 
      (now - agent.lastUsed.getTime()) > this.config.idleTimeout
    );
    
    for (const agent of idleAgents) {
      try {
        if (typeof agent.instance.cleanup === 'function') {
          await agent.instance.cleanup();
        }
        
        const index = pool.indexOf(agent);
        if (index > -1) {
          pool.splice(index, 1);
          this.metrics.agentsDestroyed++;
        }
        
        console.log(`[INFO] Evicted idle agent: ${agent.id}`);
        
      } catch (error) {
        console.error(`[ERROR] Failed to evict agent ${agent.id}:`, error);
      }
    }
  }

  private async updateAgentMemoryUsage(agent: PooledAgent): Promise<void> {
    try {
      // Placeholder for memory usage calculation
      // In a real implementation, this would measure actual memory usage
      agent.memoryUsage = process.memoryUsage().heapUsed;
      this.metrics.memoryUsage = process.memoryUsage().heapUsed;
    } catch (error) {
      console.error(`[ERROR] Failed to update memory usage for agent ${agent.id}:`, error);
    }
  }

  private updateAverageResponseTime(duration: number): void {
    const currentAvg = this.metrics.averageResponseTime;
    const totalRequests = this.metrics.totalRequests;
    
    this.metrics.averageResponseTime = 
      ((currentAvg * (totalRequests - 1)) + duration) / totalRequests;
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('[ERROR] Health check failed:', error);
      }
    }, this.config.healthCheckInterval);
  }
}

/**
 * Singleton instance
 */
let agentPoolingServiceInstance: AgentPoolingService | null = null;

/**
 * Get or create the agent pooling service instance
 */
export function getAgentPoolingService(): AgentPoolingService {
  if (!agentPoolingServiceInstance) {
    // This will be properly initialized when the AgentFactory is available
    throw new Error('Agent Pooling Service not initialized. Call initializeAgentPoolingService first.');
  }
  return agentPoolingServiceInstance;
}

/**
 * Initialize the agent pooling service
 */
export async function initializeAgentPoolingService(agentFactory: AgentFactory): Promise<void> {
  if (!agentPoolingServiceInstance) {
    agentPoolingServiceInstance = new AgentPoolingService(agentFactory);
    await agentPoolingServiceInstance.initialize();
  }
}