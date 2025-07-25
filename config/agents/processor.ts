/**
 * Agent Configuration Processor
 * 
 * This processor automatically distributes centralized agent configurations
 * throughout the application, eliminating the need to manually update 25+ files
 * when adding or modifying agents.
 */

import { AgentType, AgentExecutionEnvironment } from '@/types/agent';
import { AGENT_REGISTRY, getAgentDefinition, getEnabledAgents, getAgentsWithCommands } from './registry';
import { AgentDefinition, ProcessorConfig } from './schemas';

/**
 * Processes centralized agent configuration for distribution
 */
export class AgentConfigurationProcessor {
  private config: ProcessorConfig;

  constructor(config: ProcessorConfig = {}) {
    this.config = {
      validate: true,
      environment: process.env.NODE_ENV as any || 'development',
      debug: false,
      ...config,
    };
  }

  /**
   * Generate agent factory configurations
   */
  generateFactoryConfigs(): Record<AgentType, any> {
    const configs: Record<AgentType, any> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      configs[agent.metadata.type] = {
        type: agent.metadata.type,
        name: agent.metadata.name,
        capabilities: agent.execution.capabilities,
        supportedModels: agent.execution.supportedModels || [],
        implementation: agent.implementation,
        environment: agent.execution.environment,
        timeout: agent.execution.timeout,
      };
    }

    return configs;
  }

  /**
   * Generate command parser configurations
   */
  generateCommandConfigs(): Record<string, any> {
    const commands: Record<string, any> = {};
    
    for (const agent of getAgentsWithCommands()) {
      if (!agent.commands) continue;

      // Primary command
      commands[agent.commands.primary] = {
        agentType: agent.metadata.type,
        description: agent.metadata.description,
        usage: agent.commands.usage,
        examples: agent.commands.examples,
        hidden: agent.commands.hidden || false,
      };

      // Alias commands
      if (agent.commands?.aliases) {
        for (const alias of agent.commands.aliases) {
          commands[alias] = {
            agentType: agent.metadata.type,
            description: `Alias for ${agent.commands?.primary}`,
            usage: agent.commands?.usage.replace(agent.commands?.primary, alias),
            examples: agent.commands?.examples.map(ex => 
              ex.replace(`/${agent.commands?.primary}`, `/${alias}`)
            ),
            isAlias: true,
            primary: agent.commands?.primary,
          };
        }
      }
    }

    return commands;
  }

  /**
   * Generate API default configurations
   */
  generateAPIDefaults(): Record<AgentType, any> {
    const apiDefaults: Record<AgentType, any> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      apiDefaults[agent.metadata.type] = {
        ...agent.api.defaultConfig,
        skipStandardChatProcessing: agent.execution.skipStandardChatProcessing,
        timeout: agent.execution.timeout,
        temperature: agent.execution.temperature,
        environment: agent.execution.environment,
      };
    }

    return apiDefaults;
  }

  /**
   * Generate UI configurations
   */
  generateUIConfigs(): Record<AgentType, any> {
    const uiConfigs: Record<AgentType, any> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      uiConfigs[agent.metadata.type] = {
        name: agent.metadata.name,
        description: agent.metadata.description,
        color: agent.ui?.color || '#6B7280',
        icon: agent.ui?.icon || 'chat',
        displayOrder: agent.ui?.displayOrder || 999,
        showInSelector: agent.ui?.showInSelector !== false,
        enabled: agent.metadata.enabled,
      };
    }

    return uiConfigs;
  }

  /**
   * Generate error handling configurations
   */
  generateErrorConfigs(): Record<AgentType, any> {
    const errorConfigs: Record<AgentType, any> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      errorConfigs[agent.metadata.type] = {
        maxRetries: agent.error?.maxRetries || 2,
        retryDelay: agent.error?.retryDelay || 1000,
        fallbackAgent: agent.error?.fallbackAgent || (agent.metadata.type !== AgentType.STANDARD_CHAT ? AgentType.STANDARD_CHAT : undefined),
        strategies: agent.error?.strategies || {},
        errorMessages: agent.error?.errorMessages || {},
      };
    }

    return errorConfigs;
  }

  /**
   * Generate intent analysis configurations
   */
  generateIntentConfigs(): Record<AgentType, any> {
    const intentConfigs: Record<AgentType, any> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      if (agent.features?.intentAnalysis) {
        intentConfigs[agent.metadata.type] = {
          keywords: agent.features.intentAnalysis.keywords || [],
          patterns: agent.features.intentAnalysis.patterns || [],
          confidenceThreshold: agent.features.intentAnalysis.confidenceThreshold || 0.7,
        };
      }
    }

    return intentConfigs;
  }

  /**
   * Generate parameter extraction configurations
   */
  generateParameterConfigs(): Record<AgentType, any> {
    const paramConfigs: Record<AgentType, any> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      if (agent.features?.parameterExtraction) {
        paramConfigs[agent.metadata.type] = {
          patterns: agent.features.parameterExtraction.patterns || {},
          defaults: agent.features.parameterExtraction.defaults || {},
          validators: agent.features.parameterExtraction.validators || {},
        };
      }
    }

    return paramConfigs;
  }

  /**
   * Generate intent classification keyword maps for each agent type
   */
  generateIntentKeywordMaps(): Record<string, AgentType[]> {
    const keywordMap: Record<string, AgentType[]> = {};
    
    for (const agent of getEnabledAgents()) {
      if (agent.features?.intentClassification?.keywords) {
        for (const keyword of agent.features.intentClassification.keywords) {
          if (!keywordMap[keyword]) {
            keywordMap[keyword] = [];
          }
          keywordMap[keyword].push(agent.metadata.type);
        }
      }
    }

    return keywordMap;
  }

  /**
   * Generate intent classification configurations for intentAnalysisService
   */
  generateIntentClassificationConfigs(): Record<string, any> {
    const intentConfigs: Record<string, any> = {};
    
    for (const agent of getEnabledAgents()) {
      const intentConfig = agent.features?.intentClassification;
      if (intentConfig) {
        intentConfigs[agent.metadata.type] = {
          keywords: intentConfig.keywords || [],
          patterns: intentConfig.patterns || [],
          threshold: intentConfig.threshold || 0.5,
          intentCategory: intentConfig.intentCategory || 'general',
          prompts: intentConfig.prompts || {},
          systemPrompts: intentConfig.systemPrompts || {},
          usageCriteria: intentConfig.usageCriteria || [],
          questionPatterns: intentConfig.questionPatterns || [],
          urgencyIndicators: intentConfig.urgencyIndicators || [],
          examples: intentConfig.examples || [],
          regexPatterns: intentConfig.regexPatterns || [],
        };
      }
    }

    return intentConfigs;
  }

  /**
   * Generate keyword arrays by intent category for intentAnalysisService
   */
  generateKeywordsByCategory(): Record<string, string[]> {
    const categories: Record<string, string[]> = {};
    
    for (const agent of getEnabledAgents()) {
      const intentConfig = agent.features?.intentClassification;
      if (intentConfig && intentConfig.intentCategory) {
        const category = intentConfig.intentCategory;
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(...(intentConfig.keywords || []));
      }
    }

    // Remove duplicates in each category
    for (const category in categories) {
      categories[category] = [...new Set(categories[category])];
    }

    return categories;
  }

  /**
   * Generate agent scoring configurations for intent analysis
   */
  generateAgentScoringConfigs(): Record<AgentType, any> {
    const scoringConfigs: Record<AgentType, any> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      const intentConfig = agent.features?.intentClassification;
      if (intentConfig) {
        scoringConfigs[agent.metadata.type] = {
          threshold: intentConfig.threshold,
          keywords: intentConfig.keywords || [],
          patterns: intentConfig.patterns || [],
          regexPatterns: intentConfig.regexPatterns || [],
          category: intentConfig.intentCategory,
          weight: agent.features?.intentAnalysis?.scoringWeight || 1.0,
          examples: intentConfig.examples || [],
        };
      }
    }

    return scoringConfigs;
  }

  /**
   * Generate confidence guidelines configurations
   */
  generateConfidenceGuidelines(): Record<AgentType, any> {
    const confidenceConfigs: Record<AgentType, any> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      const confidenceConfig = agent.features?.confidenceGuidelines;
      if (confidenceConfig) {
        confidenceConfigs[agent.metadata.type] = {
          ranges: confidenceConfig.ranges || {},
        };
      }
    }

    return confidenceConfigs;
  }

  /**
   * Generate agent exclusion patterns for user avoidance detection
   */
  generateExclusionPatterns(): Record<AgentType, any> {
    const exclusionConfigs: Record<AgentType, any> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      const exclusionConfig = agent.features?.exclusionPatterns;
      if (exclusionConfig) {
        exclusionConfigs[agent.metadata.type] = {
          avoidancePatterns: exclusionConfig.avoidancePatterns || [],
          negativePatterns: exclusionConfig.negativePatterns || [],
          exclusionKeywords: exclusionConfig.exclusionKeywords || [],
        };
      }
    }

    return exclusionConfigs;
  }

  /**
   * Generate enhanced classification schema for OpenAI structured responses
   */
  generateClassificationSchema(): any {
    const supportedAgentTypes = this.generateSupportedTypes();
    
    return {
      type: 'object' as const,
      properties: {
        agent_type: {
          type: 'string' as const,
          enum: supportedAgentTypes,
          description: 'The primary recommended agent type for handling this query',
        },
        confidence: {
          type: 'number' as const,
          minimum: 0,
          maximum: 1,
          description: 'Confidence score for the primary recommendation (0.00-1.00)',
        },
        reasoning: {
          type: 'string' as const,
          description: 'Detailed explanation for why this agent was recommended',
        },
        query: {
          type: 'string' as const,
          description: 'Optimized search query if applicable',
        },
        complexity: {
          type: 'string' as const,
          enum: ['simple', 'moderate', 'complex'],
          description: 'Assessment of query complexity',
        },
        time_sensitive: {
          type: 'boolean' as const,
          description: 'Whether the query is time-sensitive',
        },
      },
      required: [
        'agent_type',
        'confidence',
        'reasoning',
        'query',
        'complexity',
        'time_sensitive',
      ],
      additionalProperties: false,
    };
  }

  /**
   * Generate agent environment mappings
   */
  generateEnvironmentMappings(): Record<AgentType, AgentExecutionEnvironment> {
    const mappings: Record<AgentType, AgentExecutionEnvironment> = {} as any;
    
    for (const agent of getEnabledAgents()) {
      mappings[agent.metadata.type] = agent.execution.environment as AgentExecutionEnvironment;
    }

    return mappings;
  }

  /**
   * Generate supported agent types list
   */
  generateSupportedTypes(): AgentType[] {
    return getEnabledAgents().map(agent => agent.metadata.type);
  }

  /**
   * Generate complete configuration bundle for distribution
   */
  generateConfigBundle(): AgentConfigBundle {
    return {
      factory: this.generateFactoryConfigs(),
      commands: this.generateCommandConfigs(),
      api: this.generateAPIDefaults(),
      ui: this.generateUIConfigs(),
      errors: this.generateErrorConfigs(),
      intent: this.generateIntentConfigs(),
      parameters: this.generateParameterConfigs(),
      environments: this.generateEnvironmentMappings(),
      supportedTypes: this.generateSupportedTypes(),
      // Intent classification configurations
      intentClassification: this.generateIntentClassificationConfigs(),
      keywordMaps: this.generateIntentKeywordMaps(),
      keywordsByCategory: this.generateKeywordsByCategory(),
      agentScoring: this.generateAgentScoringConfigs(),
      // Advanced features
      confidenceGuidelines: this.generateConfidenceGuidelines(),
      exclusionPatterns: this.generateExclusionPatterns(),
      classificationSchema: this.generateClassificationSchema(),
      metadata: {
        generatedAt: new Date().toISOString(),
        environment: this.config.environment || 'development',
        agentCount: getEnabledAgents().length,
        commandCount: Object.keys(this.generateCommandConfigs()).length,
        version: '1.0.0',
      },
    };
  }

  /**
   * Get agent definition with environment overrides applied
   */
  getProcessedAgentDefinition(type: AgentType): AgentDefinition | undefined {
    const definition = getAgentDefinition(type);
    if (!definition) return undefined;

    // Apply environment-specific overrides
    const processed = { ...definition };
    
    if (this.config.featureOverrides) {
      processed.features = {
        ...processed.features,
        features: {
          ...processed.features?.features,
          ...this.config.featureOverrides,
        },
      };
    }

    return processed;
  }

  /**
   * Validate agent configuration
   */
  validateConfiguration(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate commands
    const commands = this.generateCommandConfigs();
    const commandNames = Object.keys(commands);
    const uniqueCommands = new Set(commandNames);
    if (commandNames.length !== uniqueCommands.size) {
      errors.push('Duplicate command names detected');
    }

    // Check for missing implementations
    for (const agent of getEnabledAgents()) {
      if (!agent.implementation.agentClass) {
        errors.push(`Agent ${agent.metadata.type} missing agentClass`);
      }
    }

    // Check for circular fallback dependencies
    const errorConfigs = this.generateErrorConfigs();
    for (const [agentType, config] of Object.entries(errorConfigs)) {
      if (config.fallbackAgent && config.fallbackAgent === agentType) {
        errors.push(`Agent ${agentType} has circular fallback dependency`);
      }
    }

    // Warnings for best practices
    for (const agent of getEnabledAgents()) {
      if (!agent.commands && agent.metadata.type !== AgentType.STANDARD_CHAT) {
        warnings.push(`Agent ${agent.metadata.type} has no commands defined`);
      }
      
      if (!agent.ui?.color) {
        warnings.push(`Agent ${agent.metadata.type} has no UI color defined`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Log configuration information if debug is enabled
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[AgentConfigProcessor] ${message}`, data || '');
    }
  }
}

/**
 * Configuration bundle interface
 */
export interface AgentConfigBundle {
  factory: Record<AgentType, any>;
  commands: Record<string, any>;
  api: Record<AgentType, any>;
  ui: Record<AgentType, any>;
  errors: Record<AgentType, any>;
  intent: Record<AgentType, any>;
  parameters: Record<AgentType, any>;
  environments: Record<AgentType, AgentExecutionEnvironment>;
  supportedTypes: AgentType[];
  // Intent classification configurations
  intentClassification: Record<string, any>;
  keywordMaps: Record<string, AgentType[]>;
  keywordsByCategory: Record<string, string[]>;
  agentScoring: Record<AgentType, any>;
  // Advanced features
  confidenceGuidelines: Record<AgentType, any>;
  exclusionPatterns: Record<AgentType, any>;
  classificationSchema: any;
  metadata: {
    generatedAt: string;
    environment: string;
    agentCount: number;
    commandCount: number;
    version: string;
  };
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Singleton processor instance
 */
let processorInstance: AgentConfigurationProcessor | null = null;

/**
 * Get the singleton processor instance
 */
export function getConfigProcessor(config?: ProcessorConfig): AgentConfigurationProcessor {
  if (!processorInstance) {
    processorInstance = new AgentConfigurationProcessor(config);
  }
  return processorInstance;
}

/**
 * Generate and return the complete configuration bundle
 */
export function generateAgentConfigs(config?: ProcessorConfig): AgentConfigBundle {
  const processor = getConfigProcessor(config);
  return processor.generateConfigBundle();
}

/**
 * Validate the current agent configuration
 */
export function validateAgentConfigs(config?: ProcessorConfig): ValidationResult {
  const processor = getConfigProcessor(config);
  return processor.validateConfiguration();
}