import {
  AgentConfig,
  AgentDiscoveryQuery,
  AgentDiscoveryResult,
  AgentExecutionEnvironment,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentFactoryConfig,
  AgentFactoryRegistration,
  AgentHealthResult,
  AgentPoolStats,
  AgentType,
  BaseAgentInstance,
  WebSearchAgentConfig,
} from '@/types/agent';
import { WebSearchConfig } from '@/types/webSearch';

import { BaseAgent } from './agents/baseAgent';
import { CodeAgent } from './agents/codeAgent';
import { CodeInterpreterAgent } from './agents/codeInterpreterAgent';
import { FoundryAgent } from './agents/foundryAgent';
import { LocalKnowledgeAgent } from './agents/localKnowledgeAgent';
import { ThirdPartyAgent } from './agents/thirdPartyAgent';
import { TranslationAgent } from './agents/translationAgent';
import { UrlPullAgent } from './agents/urlPullAgent';
import { WebSearchAgent } from './agents/webSearchAgent';
import { AzureMonitorLoggingService } from './loggingService';
import {OpenAIModelID} from "@/types/openai";

/**
 * Custom error classes for agent factory operations
 */
export class AgentFactoryError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AgentFactoryError';
  }
}

export class AgentRegistrationError extends AgentFactoryError {
  constructor(message: string, details?: any) {
    super(message, 'AGENT_REGISTRATION_ERROR', details);
    this.name = 'AgentRegistrationError';
  }
}

export class AgentDiscoveryError extends AgentFactoryError {
  constructor(message: string, details?: any) {
    super(message, 'AGENT_DISCOVERY_ERROR', details);
    this.name = 'AgentDiscoveryError';
  }
}

export class AgentExecutionRequestError extends AgentFactoryError {
  constructor(message: string, details?: any) {
    super(message, 'AGENT_EXECUTION_REQUEST_ERROR', details);
    this.name = 'AgentExecutionRequestError';
  }
}

/**
 * AgentFactory - Centralized factory for creating and managing agent instances
 * Provides registration, discovery, and execution capabilities for all agent types
 */
export class AgentFactory {
  private static instance: AgentFactory | null = null;
  private registrations: Map<AgentType, AgentFactoryRegistration> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private logger: AzureMonitorLoggingService;
  private config: AgentFactoryConfig;

  private constructor(config?: Partial<AgentFactoryConfig>) {
    const loggingService = AzureMonitorLoggingService.getInstance();
    if (!loggingService) {
      throw new Error('Failed to initialize Azure Monitor Logging Service');
    }
    this.logger = loggingService;
    this.config = {
      maxPoolSize: 10,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      idleTimeout: 30 * 60 * 1000, // 30 minutes
      healthCheckInterval: 2 * 60 * 1000, // 2 minutes
      defaultTimeout: 300000, // 5 minutes
      enableMetrics: true,
      enableHealthMonitoring: true,
      ...config,
    };

    this.initializeDefaultAgents();
    this.startHealthMonitoring();
    this.startMetricsCollection();
  }

  /**
   * Singleton pattern - get or create factory instance
   */
  public static getInstance(
    config?: Partial<AgentFactoryConfig>,
  ): AgentFactory {
    if (!AgentFactory.instance) {
      AgentFactory.instance = new AgentFactory(config);
    }
    return AgentFactory.instance;
  }

  /**
   * Register a new agent type with the factory
   */
  public registerAgent(
    type: AgentType,
    factoryFunction: (config: AgentConfig) => Promise<BaseAgentInstance>,
    capabilities: string[],
    supportedModels: string[],
    configSchema?: Record<string, any>,
  ): void {
    try {
      if (this.registrations.has(type)) {
        this.logWarning(
          `Agent type ${type} is already registered. Overriding...`,
          {
            agentType: type,
          },
        );
      }

      const registration: AgentFactoryRegistration = {
        type,
        factory: factoryFunction,
        capabilities,
        supportedModels,
        configSchema,
        registeredAt: new Date(),
      };

      this.registrations.set(type, registration);

      this.logInfo(`Agent type ${type} registered successfully`, {
        agentType: type,
        capabilities,
        supportedModels,
      });
    } catch (error) {
      this.logError(`Failed to register agent type ${type}`, error as Error, {
        agentType: type,
      });
      throw new AgentRegistrationError(
        `Failed to register agent type ${type}: ${(error as Error).message}`,
        { agentType: type, originalError: error },
      );
    }
  }

  /**
   * Unregister an agent type
   */
  public unregisterAgent(type: AgentType): boolean {
    try {
      const removed = this.registrations.delete(type);

      if (removed) {
        this.logInfo(`Agent type ${type} unregistered successfully`, {
          agentType: type,
        });
      } else {
        this.logWarning(`Agent type ${type} was not registered`, {
          agentType: type,
        });
      }

      return removed;
    } catch (error) {
      this.logError(`Failed to unregister agent type ${type}`, error as Error, {
        agentType: type,
      });
      throw new AgentRegistrationError(
        `Failed to unregister agent type ${type}: ${(error as Error).message}`,
        { agentType: type, originalError: error },
      );
    }
  }

  /**
   * Create an agent instance
   */
  public async createAgent(config: AgentConfig): Promise<BaseAgentInstance> {
    this.logInfo(`Creating agent`, {
      agentType: config.type,
      agentId: config.id,
      environment: config.environment,
    });

    try {
      const registration = this.registrations.get(config.type);

      if (!registration) {
        this.logError(
          `Agent type ${config.type} is not registered`,
          new Error('Agent type not registered'),
          {
            agentType: config.type,
            availableTypes: Array.from(this.registrations.keys()),
          },
        );
        throw new AgentFactoryError(
          `Agent type ${config.type} is not registered`,
          'AGENT_TYPE_NOT_REGISTERED',
          {
            agentType: config.type,
            availableTypes: Array.from(this.registrations.keys()),
          },
        );
      }

      this.logInfo(
        `Found registration for ${config.type}, using factory function`,
      );

      // Validate configuration
      this.validateAgentConfig(config, registration);

      // Use the registered factory function to create the agent
      // This ensures proper configuration for each agent type
      this.logInfo(
        `Creating agent using registered factory function for ${config.type}`,
      );
      const agent = await registration.factory(config);

      this.logInfo(`Agent created successfully`, {
        agentId: config.id,
        agentType: config.type,
        environment: config.environment,
      });

      return agent;
    } catch (error) {
      this.logError(`Failed to create agent`, error as Error, {
        agentType: config.type,
        agentId: config.id,
      });

      if (error instanceof AgentFactoryError) {
        throw error;
      }

      throw new AgentFactoryError(
        `Failed to create agent: ${(error as Error).message}`,
        'AGENT_CREATION_FAILED',
        { agentType: config.type, originalError: error },
      );
    }
  }

  /**
   * Execute a request using the appropriate agent
   */
  public async executeRequest(
    request: AgentExecutionRequest,
  ): Promise<AgentExecutionResult> {
    const startTime = new Date();

    try {
      // Create agent configuration from request
      const agentConfig: AgentConfig = {
        id: `${request.agentType}-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        name: `${request.agentType} Agent`,
        type: request.agentType,
        environment: this.getDefaultEnvironment(request.agentType),
        modelId: request.context.model.id,
        instructions:
          'Process the user request according to agent capabilities',
        tools: [],
        timeout: request.timeout || this.config.defaultTimeout,
        ...request.config,
      };

      // Create agent instance
      const agent = await this.createAgent(agentConfig);

      // Execute the request
      const response = await agent.execute(request.context);

      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();

      const result: AgentExecutionResult = {
        request,
        response,
        startTime,
        endTime,
        executionTime,
        agentInstance: agent,
      };

      this.logInfo(`Request executed successfully`, {
        agentType: request.agentType,
        executionTime,
        success: response.success,
      });

      return result;
    } catch (error) {
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();

      this.logError(`Request execution failed`, error as Error, {
        agentType: request.agentType,
        executionTime,
      });

      throw new AgentExecutionRequestError(
        `Request execution failed: ${(error as Error).message}`,
        {
          agentType: request.agentType,
          executionTime,
          originalError: error,
        },
      );
    }
  }

  /**
   * Discover available agents based on query criteria
   */
  public discoverAgents(query: AgentDiscoveryQuery): AgentDiscoveryResult[] {
    try {
      const results: AgentDiscoveryResult[] = [];

      for (const [type, registration] of this.registrations) {
        // Apply filters
        if (query.type && query.type !== type) continue;
        if (
          query.environment &&
          query.environment !== this.getDefaultEnvironment(type)
        )
          continue;
        if (
          query.capabilities &&
          !query.capabilities.every((cap) =>
            registration.capabilities.includes(cap),
          )
        )
          continue;
        if (
          query.model &&
          !registration.supportedModels.some((model) =>
            model.includes(query.model!),
          )
        )
          continue;

        const poolStats = BaseAgent.getPoolStats(type);
        const available =
          query.available === undefined ||
          (poolStats ? poolStats.totalAgents > 0 : true);

        if (query.available !== undefined && query.available !== available)
          continue;

        results.push({
          type,
          environment: this.getDefaultEnvironment(type),
          capabilities: registration.capabilities,
          supportedModels: registration.supportedModels,
          available,
          poolStats,
          registration,
        });
      }

      this.logInfo(`Agent discovery completed`, {
        queryFilters: query,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      this.logError(`Agent discovery failed`, error as Error, {
        query,
      });

      throw new AgentDiscoveryError(
        `Agent discovery failed: ${(error as Error).message}`,
        { query, originalError: error },
      );
    }
  }

  /**
   * Get all registered agent types
   */
  public getRegisteredAgentTypes(): AgentType[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Get registration information for a specific agent type
   */
  public getAgentRegistration(
    type: AgentType,
  ): AgentFactoryRegistration | undefined {
    return this.registrations.get(type);
  }

  /**
   * Get pool statistics for all agent types
   */
  public getAllPoolStats(): Map<AgentType, AgentPoolStats | undefined> {
    const stats = new Map<AgentType, AgentPoolStats | undefined>();

    for (const type of this.registrations.keys()) {
      stats.set(type, BaseAgent.getPoolStats(type));
    }

    return stats;
  }

  /**
   * Perform health checks on all registered agent types
   */
  public async performHealthChecks(): Promise<
    Map<AgentType, AgentHealthResult[]>
  > {
    const healthResults = new Map<AgentType, AgentHealthResult[]>();

    for (const type of this.registrations.keys()) {
      try {
        // Create a test agent for health checking
        const testConfig: AgentConfig = {
          id: `health-check-${type}-${Date.now()}`,
          name: `Health Check Agent`,
          type,
          environment: this.getDefaultEnvironment(type),
          modelId: 'gpt-4o-mini', // Use a lightweight model for health checks
          instructions: 'Health check agent',
          tools: [],
        };

        const agent = await this.createAgent(testConfig);
        const healthResult = await agent.checkHealth();

        healthResults.set(type, [healthResult]);

        // Cleanup test agent
        await agent.cleanup();
      } catch (error) {
        this.logError(
          `Health check failed for agent type ${type}`,
          error as Error,
          {
            agentType: type,
          },
        );

        healthResults.set(type, [
          {
            agentId: `health-check-${type}`,
            healthy: false,
            timestamp: new Date(),
            responseTime: 0,
            error: (error as Error).message,
          },
        ]);
      }
    }

    return healthResults;
  }

  /**
   * Clean up all agent pools and resources
   */
  public async cleanup(): Promise<void> {
    try {
      // Stop monitoring intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = null;
      }

      // Clear all agent pools
      await BaseAgent.clearAllPools();

      // Clear registrations
      this.registrations.clear();

      this.logInfo('AgentFactory cleanup completed', {
        factoryInstance: 'singleton',
      });
    } catch (error) {
      this.logError('AgentFactory cleanup failed', error as Error);
      throw error;
    }
  }

  /**
   * Shutdown the factory (singleton cleanup)
   */
  public static async shutdown(): Promise<void> {
    if (AgentFactory.instance) {
      await AgentFactory.instance.cleanup();
      AgentFactory.instance = null;
    }
  }

  /**
   * Private helper methods
   */

  private initializeDefaultAgents(): void {
    try {
      // Register FoundryAgent
      this.registerAgent(
        AgentType.FOUNDRY,
        async (config: AgentConfig) => await FoundryAgent.create(config),
        [
          'text_generation',
          'conversation',
          'tool_calling',
          'azure_integration',
        ],
        FoundryAgent.getSupportedModels(),
      );

      // // Register CodeAgent
      // this.registerAgent(
      //   AgentType.CODE_INTERPRETER,
      //   async (config: AgentConfig) => await CodeAgent.create(config),
      //   [
      //     'code_execution',
      //     'python_support',
      //     'javascript_support',
      //     'data_analysis',
      //   ],
      //   ['gpt-4', 'gpt-4o', 'gpt-35-turbo'], // Code agents work with most models
      // );

      // Register ThirdPartyAgent
      this.registerAgent(
        AgentType.THIRD_PARTY,
        async (config: AgentConfig) => await ThirdPartyAgent.create(config),
        ['api_integration', 'http_requests', 'rest_apis', 'authentication'],
        ['gpt-4', 'gpt-4o', 'gpt-35-turbo'], // Third-party agents work with most models
      );

      // Register WebSearchAgent
      this.registerAgent(
        AgentType.WEB_SEARCH,
        async (config: AgentConfig) => {
          this.logInfo('WebSearchAgent factory function called', {
            agentId: config.id,
          });
          const webSearchConfig = this.createWebSearchAgentConfig(config);
          this.logInfo('About to create WebSearchAgent instance');
          return new WebSearchAgent(webSearchConfig);
        },
        [
          'web-search',
          'citation-extraction',
          'multi-market-search',
          'safe-search',
          'freshness-filtering',
          'result-caching',
        ],
        [OpenAIModelID.GPT_4o, OpenAIModelID.GPT_4o_mini, OpenAIModelID.GPT_o1_mini, OpenAIModelID.GPT_o3_mini], // Web search agents work with most models
      );

      // Register UrlPullAgent
      this.registerAgent(
        AgentType.URL_PULL,
        async (config: AgentConfig) => new UrlPullAgent(config as any),
        [
          'url-processing',
          'parallel-fetching',
          'content-extraction',
          'metadata-extraction',
          'caching',
          'validation',
        ],
        ['gpt-4', 'gpt-4o', 'gpt-35-turbo', 'gpt-4o-mini'], // URL pull agents work with most models
      );

      // Register CodeInterpreterAgent
      this.registerAgent(
        AgentType.CODE_INTERPRETER,
        async (config: AgentConfig) => new CodeInterpreterAgent(config as any),
        [
          'code-execution',
          'python-support',
          'javascript-support',
          'sql-support',
          'data-analysis',
          'file-processing',
          'visualization',
          'debugging',
        ],
        ['gpt-4', 'gpt-4o', 'gpt-35-turbo', 'gpt-4o-mini'], // Code interpreter agents work with most models
      );

      // Register LocalKnowledgeAgent
      this.registerAgent(
        AgentType.LOCAL_KNOWLEDGE,
        async (config: AgentConfig) => new LocalKnowledgeAgent(config as any),
        [
          'knowledge-search',
          'semantic-search',
          'keyword-search',
          'hybrid-search',
          'document-retrieval',
          'content-filtering',
          'access-control',
          'knowledge-graph',
          'entity-linking',
          'answer-summarization',
        ],
        ['gpt-4', 'gpt-4o', 'gpt-35-turbo', 'gpt-4o-mini'], // Local knowledge agents work with most models
      );

      // Register TranslationAgent
      this.registerAgent(
        AgentType.TRANSLATION,
        async (config: AgentConfig) => new TranslationAgent(config as any),
        [
          'text-translation',
          'language-detection',
          'multi-language-support',
          'automatic-language-inference',
          'translation-caching',
          'context-preservation',
          'quality-analysis',
        ],
        ['gpt-4', 'gpt-4o', 'gpt-35-turbo', 'gpt-4o-mini'], // Translation agents work with most models
      );

      this.logInfo('Default agents registered successfully', {
        registeredTypes: Array.from(this.registrations.keys()),
      });
    } catch (error) {
      this.logError('Failed to register default agents', error as Error);
      throw new AgentFactoryError(
        'Failed to initialize default agents',
        'DEFAULT_AGENT_REGISTRATION_FAILED',
        { originalError: error },
      );
    }
  }

  private validateAgentConfig(
    config: AgentConfig,
    registration: AgentFactoryRegistration,
  ): void {
    const errors: string[] = [];

    // Basic validation
    if (!config.id) errors.push('Agent ID is required');
    if (!config.name) errors.push('Agent name is required');
    if (!config.modelId) errors.push('Model ID is required');

    // Check if model is supported
    if (
      !registration.supportedModels.some((model) =>
        config.modelId.toLowerCase().includes(model.toLowerCase()),
      )
    ) {
      errors.push(
        `Model ${config.modelId} is not supported by agent type ${config.type}`,
      );
    }

    // Validate against schema if provided
    if (registration.configSchema) {
      // Placeholder for schema validation
      // In a real implementation, you would use a JSON schema validator
    }

    if (errors.length > 0) {
      throw new AgentFactoryError(
        `Configuration validation failed: ${errors.join(', ')}`,
        'AGENT_CONFIG_VALIDATION_FAILED',
        { errors, agentType: config.type },
      );
    }
  }

  private getAgentClass(type: AgentType): any {
    const classMap: Record<AgentType, any> = {
      [AgentType.FOUNDRY]: FoundryAgent,
      [AgentType.CODE_INTERPRETER]: CodeInterpreterAgent,
      [AgentType.THIRD_PARTY]: ThirdPartyAgent,
      [AgentType.WEB_SEARCH]: WebSearchAgent,
      [AgentType.URL_PULL]: UrlPullAgent,
      [AgentType.LOCAL_KNOWLEDGE]: LocalKnowledgeAgent,
      [AgentType.TRANSLATION]: TranslationAgent,
      [AgentType.STANDARD_CHAT]: FoundryAgent, // Default to Foundry for now
    };

    return classMap[type] || FoundryAgent;
  }

  private getDefaultEnvironment(type: AgentType): AgentExecutionEnvironment {
    const environmentMap: Record<AgentType, AgentExecutionEnvironment> = {
      [AgentType.FOUNDRY]: AgentExecutionEnvironment.FOUNDRY,
      [AgentType.CODE_INTERPRETER]: AgentExecutionEnvironment.CODE,
      [AgentType.THIRD_PARTY]: AgentExecutionEnvironment.THIRD_PARTY,
      [AgentType.WEB_SEARCH]: AgentExecutionEnvironment.FOUNDRY,
      [AgentType.URL_PULL]: AgentExecutionEnvironment.FOUNDRY,
      [AgentType.LOCAL_KNOWLEDGE]: AgentExecutionEnvironment.LOCAL,
      [AgentType.TRANSLATION]: AgentExecutionEnvironment.FOUNDRY,
      [AgentType.STANDARD_CHAT]: AgentExecutionEnvironment.FOUNDRY,
    };

    return environmentMap[type] || AgentExecutionEnvironment.FOUNDRY;
  }

  private startHealthMonitoring(): void {
    if (!this.config.enableHealthMonitoring) return;

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logError('Scheduled health check failed', error as Error);
      }
    }, this.config.healthCheckInterval);

    this.logInfo('Health monitoring started', {
      interval: this.config.healthCheckInterval,
    });
  }

  /**
   * Helper methods for logging that adapt AzureMonitorLoggingService to the original interface
   */
  private logInfo(message: string, data?: any): void {
    // Log to console for debugging
    console.log(`[INFO] AgentFactory: %s`, message, data);
  }

  private logWarning(message: string, data?: any): void {
    // Log to console for debugging
    console.warn(`[WARNING] AgentFactory: %s`, message, data);
  }

  private logError(message: string, error: Error, data?: any): void {
    // Log to console for debugging
    console.error(`[ERROR] AgentFactory: %s`, message, error, data);
  }

  private startMetricsCollection(): void {
    if (!this.config.enableMetrics) return;

    this.metricsInterval = setInterval(() => {
      try {
        const stats = this.getAllPoolStats();
        this.logInfo('Agent pool metrics collected', {
          poolStats: Object.fromEntries(stats),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logError('Metrics collection failed', error as Error);
      }
    }, 60000); // Collect metrics every minute

    this.logInfo('Metrics collection started', {
      interval: 60000,
    });
  }

  /**
   * Create WebSearchAgentConfig from base AgentConfig
   */
  private createWebSearchAgentConfig(
    config: AgentConfig,
  ): WebSearchAgentConfig {
    this.logInfo('Creating WebSearchAgentConfig', {
      agentId: config.id,
      baseConfigType: config.type,
    });

    // Create default web search configuration
    const webSearchConfig: WebSearchConfig = {
      endpoint:
        process.env.AZURE_AI_FOUNDRY_ENDPOINT ||
        process.env.PROJECT_ENDPOINT ||
        process.env.AZURE_GROUNDING_ENDPOINT ||
        'https://placeholder.cognitiveservices.azure.com',
      apiKey:
        process.env.AZURE_GROUNDING_CONNECTION_ID ||
        process.env.AZURE_GROUNDING_API_KEY ||
        '',
      defaultMarket: 'en-US',
      defaultSafeSearch: 'Moderate',
      maxResults: 5,
      timeout: 30000,
      enableCaching: true,
      cacheTtl: 300, // 5 minutes
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
      },
    };

    this.logInfo('WebSearchConfig created', {
      endpoint: webSearchConfig.endpoint,
      hasApiKey: !!webSearchConfig.apiKey,
      defaultMarket: webSearchConfig.defaultMarket,
    });

    // Create WebSearchAgentConfig by extending the base config
    const webSearchAgentConfig: WebSearchAgentConfig = {
      ...config,
      type: AgentType.WEB_SEARCH,
      environment: AgentExecutionEnvironment.FOUNDRY,
      webSearchConfig,
      maxResults: 5,
      defaultMarket: 'en-US',
      defaultSafeSearch: 'Moderate',
      enableCitations: true,
      enableCaching: true,
      cacheTtl: 300,
    };

    this.logInfo('WebSearchAgentConfig created successfully', {
      agentId: webSearchAgentConfig.id,
      hasWebSearchConfig: !!webSearchAgentConfig.webSearchConfig,
      environment: webSearchAgentConfig.environment,
    });

    return webSearchAgentConfig;
  }
}

/**
 * Convenience function to get the singleton factory instance
 */
export function getAgentFactory(
  config?: Partial<AgentFactoryConfig>,
): AgentFactory {
  return AgentFactory.getInstance(config);
}

/**
 * Convenience function to create an agent
 */
export async function createAgent(
  config: AgentConfig,
): Promise<BaseAgentInstance> {
  const factory = getAgentFactory();
  return await factory.createAgent(config);
}

/**
 * Convenience function to execute a request
 */
export async function executeAgentRequest(
  request: AgentExecutionRequest,
): Promise<AgentExecutionResult> {
  const factory = getAgentFactory();
  return await factory.executeRequest(request);
}

/**
 * Convenience function to discover agents
 */
export function discoverAgents(
  query: AgentDiscoveryQuery = {},
): AgentDiscoveryResult[] {
  const factory = getAgentFactory();
  return factory.discoverAgents(query);
}
