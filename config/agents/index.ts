/**
 * Centralized Agent Configuration System
 * 
 * This is the single entry point for all agent configurations.
 * Instead of scattering agent configuration across 25+ files,
 * this centralized system provides type-safe, validated,
 * and automatically distributed agent settings.
 * 
 * Usage:
 * ```typescript
 * import { getAgentConfigs, getAgentByType, validateConfigs } from '@/config/agents';
 * 
 * // Get all configurations for use throughout the app
 * const configs = getAgentConfigs();
 * 
 * // Get specific agent definition
 * const translationAgent = getAgentByType(AgentType.TRANSLATION);
 * 
 * // Validate configuration
 * const validation = validateConfigs();
 * ```
 */

// Re-export all schema types
export type {
  AgentMetadata,
  AgentCommandConfig,
  AgentExecutionConfig,
  AgentUIConfig,
  AgentAPIConfig,
  AgentErrorConfig,
  AgentFeatureConfig,
  AgentImplementationConfig,
  AgentDefinition,
  AgentRegistry,
  ProcessorConfig,
} from './schemas';

// Re-export validation functions
export {
  isValidAgentDefinition,
  isValidAgentRegistry,
} from './schemas';

// Re-export registry functions
export {
  AGENT_REGISTRY,
  getAgentDefinition,
  getEnabledAgents,
  getAvailableAgents,
  getAgentsWithCommands,
  getAgentByCommand,
} from './registry';

// Re-export processor functionality
export {
  AgentConfigurationProcessor,
  getConfigProcessor,
  generateAgentConfigs,
  validateAgentConfigs,
} from './processor';

export type {
  AgentConfigBundle,
  ValidationResult,
} from './processor';

import { AgentType } from '@/types/agent';
import { AGENT_REGISTRY, getAgentDefinition } from './registry';
import { generateAgentConfigs, validateAgentConfigs } from './processor';

/**
 * Convenience functions for common operations
 */

/**
 * Get complete agent configuration bundle
 * This replaces all the scattered configuration objects throughout the app
 */
export function getAgentConfigs() {
  return generateAgentConfigs();
}

/**
 * Get agent definition by type
 * This replaces individual agent lookups
 */
export function getAgentByType(type: AgentType) {
  return getAgentDefinition(type);
}

/**
 * Validate all agent configurations
 * This ensures configuration integrity
 */
export function validateConfigs() {
  return validateAgentConfigs();
}

/**
 * Get agent default configuration for API usage
 * This replaces the DEFAULT_AGENT_CONFIGS object
 */
export function getAgentAPIDefaults() {
  return generateAgentConfigs().api;
}

/**
 * Get agent UI configurations
 * This replaces scattered UI color and display configs
 */
export function getAgentUIConfigs() {
  return generateAgentConfigs().ui;
}

/**
 * Get agent command configurations
 * This replaces manual command parser registrations
 */
export function getAgentCommandConfigs() {
  return generateAgentConfigs().commands;
}

/**
 * Get agent error handling configurations
 * This replaces scattered error handling configs
 */
export function getAgentErrorConfigs() {
  return generateAgentConfigs().errors;
}

/**
 * Get supported agent types
 * This replaces the SUPPORTED_AGENT_TYPES array
 */
export function getSupportedAgentTypes() {
  return generateAgentConfigs().supportedTypes;
}

/**
 * Get agent environment mappings
 * This replaces manual environment mappings in API routes
 */
export function getAgentEnvironments() {
  return generateAgentConfigs().environments;
}

/**
 * Check if an agent is enabled
 */
export function isAgentEnabled(type: AgentType): boolean {
  const agent = getAgentDefinition(type);
  return agent?.metadata.enabled || false;
}

/**
 * Check if an agent has commands
 */
export function agentHasCommands(type: AgentType): boolean {
  const agent = getAgentDefinition(type);
  return !!agent?.commands;
}

/**
 * Get agent capabilities
 */
export function getAgentCapabilities(type: AgentType): string[] {
  const agent = getAgentDefinition(type);
  return agent?.execution.capabilities || [];
}

/**
 * Get agent supported models
 */
export function getAgentSupportedModels(type: AgentType): string[] {
  const agent = getAgentDefinition(type);
  return agent?.execution.supportedModels || [];
}

/**
 * Get intent classification configurations
 * This replaces the hardcoded intentClassificationPrompts.ts
 */
export function getIntentClassificationConfigs() {
  return generateAgentConfigs().intentClassification;
}

/**
 * Get keyword maps for intent analysis
 * This replaces hardcoded keyword arrays
 */
export function getIntentKeywordMaps() {
  return generateAgentConfigs().keywordMaps;
}

/**
 * Get keywords organized by category
 * This replaces category-specific keyword arrays
 */
export function getIntentKeywordsByCategory() {
  return generateAgentConfigs().keywordsByCategory;
}

/**
 * Get agent scoring configurations for intent analysis
 * This replaces hardcoded scoring logic
 */
export function getAgentScoringConfigs() {
  return generateAgentConfigs().agentScoring;
}

/**
 * Development utilities
 */

/**
 * Print configuration summary (development only)
 */
export function printConfigSummary(): void {
  if (process.env.NODE_ENV !== 'development') return;

  const configs = getAgentConfigs();
  const validation = validateConfigs();

  console.log('🤖 Agent Configuration Summary');
  console.log('=====================================');
  console.log(`📊 Total Agents: ${configs.metadata.agentCount}`);
  console.log(`⌨️  Total Commands: ${configs.metadata.commandCount}`);
  console.log(`✅ Valid: ${validation.valid ? 'Yes' : 'No'}`);
  
  if (validation.errors.length > 0) {
    console.log(`❌ Errors: ${validation.errors.length}`);
    validation.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log(`⚠️  Warnings: ${validation.warnings.length}`);
    validation.warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  console.log('\n🎛️  Agents:');
  Object.values(AGENT_REGISTRY.agents).forEach(agent => {
    const status = agent.metadata.enabled ? '✅' : '❌';
    const commands = agent.commands ? `/${agent.commands.primary}` : 'no commands';
    console.log(`   ${status} ${agent.metadata.name} (${commands})`);
  });

  console.log('=====================================\n');
}

/**
 * Export configuration as JSON (development only)
 */
export function exportConfigAsJSON(): string {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('exportConfigAsJSON is only available in development');
  }
  
  return JSON.stringify(generateAgentConfigs(), null, 2);
}

/**
 * Initialize and validate configuration on import
 */
const initializeConfig = () => {
  const validation = validateConfigs();
  
  if (!validation.valid) {
    console.error('❌ Agent configuration validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Invalid agent configuration detected. Please fix the errors above.');
    }
  }

  if (process.env.NODE_ENV === 'development' && validation.warnings.length > 0) {
    console.warn('⚠️  Agent configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
};

// Initialize configuration when module is imported
initializeConfig();

/**
 * Default export for convenience
 */
export default {
  getConfigs: getAgentConfigs,
  getAgent: getAgentByType,
  validate: validateConfigs,
  registry: AGENT_REGISTRY,
};