/**
 * Centralized Agent Configuration Schema
 * 
 * This file defines comprehensive type-safe schemas for all agent configurations.
 * Instead of scattering agent config across 25+ files, everything is defined here
 * and automatically processed throughout the application.
 */

import { AgentType, AgentExecutionEnvironment } from '@/types/agent';

/**
 * Core agent metadata and identification
 */
export interface AgentMetadata {
  /** Unique identifier for the agent */
  type: AgentType;
  /** Human-readable name */
  name: string;
  /** Brief description of agent capabilities */
  description: string;
  /** Version of the agent implementation */
  version?: string;
  /** Author or team responsible */
  author?: string;
  /** Whether agent is currently enabled */
  enabled: boolean;
  /** Whether agent is only available in development */
  developmentOnly?: boolean;
}

/**
 * Command configuration for slash commands
 */
export interface AgentCommandConfig {
  /** Primary command (e.g., "translate") */
  primary: string;
  /** Alternative command aliases */
  aliases?: string[];
  /** Usage description for help */
  usage: string;
  /** Example usage patterns */
  examples: string[];
  /** Whether command should be hidden from help */
  hidden?: boolean;
}

/**
 * Agent execution and runtime configuration
 */
export interface AgentExecutionConfig {
  /** Execution environment */
  environment: AgentExecutionEnvironment;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Whether to skip standard chat post-processing */
  skipStandardChatProcessing?: boolean;
  /** Supported model IDs */
  supportedModels?: string[];
  /** Agent capabilities list */
  capabilities: string[];
  /** Maximum concurrent executions */
  maxConcurrency?: number;
  /** Default temperature for AI operations */
  temperature?: number;
}

/**
 * UI appearance and interaction configuration
 */
export interface AgentUIConfig {
  /** Primary color for UI elements */
  color?: string;
  /** Icon identifier or path */
  icon?: string;
  /** Component path for custom settings UI */
  settingsComponent?: string;  
  /** Display order in UI lists */
  displayOrder?: number;
  /** Whether to show in agent selector */
  showInSelector?: boolean;
  /** Custom CSS classes */
  cssClasses?: string[];
}

/**
 * API and service configuration
 */
export interface AgentAPIConfig {
  /** Default configuration values */
  defaultConfig: Record<string, any>;
  /** Configuration schema for validation */
  configSchema?: Record<string, any>;
  /** Rate limiting configuration */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /** Caching configuration */
  caching?: {
    enabled: boolean;
    ttl?: number;
    keyPrefix?: string;
  };
}

/**
 * Error handling and fallback configuration
 */
export interface AgentErrorConfig {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Fallback agent type */
  fallbackAgent?: AgentType;
  /** Error handling strategies by error type */
  strategies?: Record<string, 'retry' | 'fail' | 'fallback'>;
  /** Custom error messages */
  errorMessages?: Record<string, string>;
}

/**
 * Agent feature flags and routing configuration
 */
export interface AgentFeatureConfig {
  /** Feature flags that control agent behavior */
  features?: Record<string, boolean>;
  /** Intent analysis configuration */
  intentAnalysis?: {
    keywords?: string[];
    patterns?: RegExp[];
    confidenceThreshold?: number;
    /** Primary intent type this agent handles */
    primaryIntent?: string;
    /** Scoring weight for this agent */
    scoringWeight?: number;
  };
  /** Parameter extraction rules */
  parameterExtraction?: {
    patterns?: Record<string, RegExp>;
    defaults?: Record<string, any>;
    validators?: Record<string, (value: any) => boolean>;
  };
  /** Intent classification configuration for auto-routing */
  intentClassification?: {
    /** Keywords that indicate this agent should be used */
    keywords: string[];
    /** Additional patterns for matching */
    patterns?: string[];
    /** RegExp patterns for advanced matching */
    regexPatterns?: RegExp[];
    /** Minimum confidence threshold */
    threshold: number;
    /** Intent category this agent handles */
    intentCategory: string;
    /** Multi-language prompts for intent detection */
    prompts?: {
      [language: string]: string;
    };
    /** Question patterns that match this agent */
    questionPatterns?: string[];
    /** Urgency indicators for this agent type */
    urgencyIndicators?: string[];
    /** Example queries for this agent */
    examples?: string[];
  };
  /** Confidence scoring guidelines */
  confidenceGuidelines?: {
    /** Confidence ranges and descriptions */
    ranges: {
      [level: string]: {
        range: [number, number];
        description: string;
        examples: string[];
      };
    };
  };
  /** Agent exclusion patterns for user avoidance detection */
  exclusionPatterns?: {
    /** Phrases that indicate users want to avoid this agent */
    avoidancePatterns: string[];
    /** Regex patterns for detecting avoidance */
    negativePatterns: RegExp[];
    /** Keywords that exclude this agent */
    exclusionKeywords: string[];
  };
}

/**
 * Agent implementation paths and dependencies
 */
export interface AgentImplementationConfig {
  /** Path to the main agent class */
  agentClass: string;
  /** Path to optional service class */
  serviceClass?: string;
  /** External dependencies */
  dependencies?: string[];
  /** Lazy loading configuration */
  lazyLoad?: boolean;
}

/**
 * Complete agent definition combining all configuration aspects
 */
export interface AgentDefinition {
  /** Core metadata and identification */
  metadata: AgentMetadata;
  /** Command configuration for slash commands */
  commands?: AgentCommandConfig;
  /** Execution and runtime configuration */
  execution: AgentExecutionConfig;
  /** UI appearance and interaction */
  ui?: AgentUIConfig;
  /** API and service configuration */
  api: AgentAPIConfig;
  /** Error handling and fallbacks */
  error?: AgentErrorConfig;
  /** Feature flags and routing */
  features?: AgentFeatureConfig;
  /** Implementation details */
  implementation: AgentImplementationConfig;
}

/**
 * Registry configuration for all agents
 */
export interface AgentRegistry {
  /** Map of agent type to agent definition */
  agents: Record<AgentType, AgentDefinition>;
  /** Global configuration overrides */
  global?: {
    defaultTimeout?: number;
    enableLogging?: boolean;
    environment?: 'development' | 'staging' | 'production';
  };
  /** Feature flags that affect all agents */
  globalFeatures?: Record<string, boolean>;
}

/**
 * Configuration processor options
 */
export interface ProcessorConfig {
  /** Whether to validate configurations */
  validate?: boolean;
  /** Environment overrides */
  environment?: 'development' | 'staging' | 'production';
  /** Feature flag overrides */
  featureOverrides?: Record<string, boolean>;
  /** Debug logging */
  debug?: boolean;
}

/**
 * Type guard to check if an agent definition is valid
 */
export function isValidAgentDefinition(definition: any): definition is AgentDefinition {
  return (
    definition &&
    typeof definition === 'object' &&
    definition.metadata &&
    definition.execution &&
    definition.api &&
    definition.implementation &&
    typeof definition.metadata.type === 'string' &&
    typeof definition.metadata.name === 'string' &&
    typeof definition.implementation.agentClass === 'string'
  );
}

/**
 * Type guard to check if a registry is valid
 */
export function isValidAgentRegistry(registry: any): registry is AgentRegistry {
  return (
    registry &&
    typeof registry === 'object' &&
    registry.agents &&
    typeof registry.agents === 'object' &&
    Object.values(registry.agents).every(isValidAgentDefinition)
  );
}