/**
 * Agent Feature Toggle Service
 * 
 * Manages feature toggles specific to agent functionality,
 * integrating with LaunchDarkly and local settings to provide
 * fine-grained control over agent features and capabilities.
 */

import { AgentType } from '@/types/agent';
import { Settings, AgentSettings } from '@/types/settings';
import { SimpleFeatureFlagService as FeatureFlagService, UserContext } from './simpleFeatureFlags';
import { getSettings, saveSettings, settingsEvents } from '@/utils/app/settings';

/**
 * Agent feature toggle configuration
 */
export interface AgentFeatureToggle {
  key: string;
  name: string;
  description: string;
  defaultValue: boolean;
  agentTypes: AgentType[];
  category: 'core' | 'experimental' | 'performance' | 'security' | 'ui';
  dependencies?: string[]; // Other feature keys this depends on
  conflicts?: string[]; // Other feature keys this conflicts with
}

/**
 * Feature toggle evaluation result
 */
export interface ToggleEvaluationResult {
  enabled: boolean;
  source: 'local' | 'remote' | 'default';
  reason?: string;
  dependencies?: { [key: string]: boolean };
}

/**
 * Agent feature group configuration
 */
export interface AgentFeatureGroup {
  name: string;
  description: string;
  features: string[];
  enabledByDefault: boolean;
  requiredForBasicFunctionality: boolean;
}

/**
 * Agent Feature Toggle Service
 */
export class AgentFeatureToggleService {
  private featureFlagService: FeatureFlagService;
  private localToggles: Map<string, boolean> = new Map();
  private featureDefinitions: Map<string, AgentFeatureToggle> = new Map();
  private featureGroups: Map<string, AgentFeatureGroup> = new Map();

  constructor(featureFlagService: FeatureFlagService) {
    this.featureFlagService = featureFlagService;
    this.initializeFeatureDefinitions();
    this.initializeFeatureGroups();
    this.loadLocalToggles();
    
    // Listen for settings changes
    settingsEvents.addListener(this.handleSettingsChange.bind(this));
  }

  /**
   * Initialize all feature toggle definitions
   */
  private initializeFeatureDefinitions(): void {
    const features: AgentFeatureToggle[] = [
      // Core Agent Features
      {
        key: 'agent_web_search_enabled',
        name: 'Web Search Agent',
        description: 'Enable web search capabilities for agents',
        defaultValue: true,
        agentTypes: [AgentType.WEB_SEARCH],
        category: 'core',
      },
      {
        key: 'agent_code_interpreter_enabled',
        name: 'Code Interpreter Agent',
        description: 'Enable code execution and interpretation',
        defaultValue: true,
        agentTypes: [AgentType.CODE_INTERPRETER],
        category: 'core',
      },
      {
        key: 'agent_local_knowledge_enabled',
        name: 'Local Knowledge Agent',
        description: 'Enable local knowledge base integration',
        defaultValue: true,
        agentTypes: [AgentType.LOCAL_KNOWLEDGE],
        category: 'core',
      },
      {
        key: 'agent_url_pull_enabled',
        name: 'URL Pull Agent',
        description: 'Enable URL content extraction and analysis',
        defaultValue: true,
        agentTypes: [AgentType.URL_PULL],
        category: 'core',
      },
      {
        key: 'agent_foundry_enabled',
        name: 'Foundry Agent',
        description: 'Enable Foundry integration for specialized tasks',
        defaultValue: false,
        agentTypes: [AgentType.FOUNDRY],
        category: 'experimental',
      },

      // Performance Features
      {
        key: 'agent_parallel_processing',
        name: 'Parallel Agent Processing',
        description: 'Allow multiple agents to process requests simultaneously',
        defaultValue: true,
        agentTypes: Object.values(AgentType),
        category: 'performance',
      },
      {
        key: 'agent_result_caching',
        name: 'Agent Result Caching',
        description: 'Cache agent results to improve response times',
        defaultValue: true,
        agentTypes: Object.values(AgentType),
        category: 'performance',
      },
      {
        key: 'agent_streaming_responses',
        name: 'Streaming Agent Responses',
        description: 'Stream agent responses as they become available',
        defaultValue: true,
        agentTypes: Object.values(AgentType),
        category: 'performance',
      },

      // Security Features
      {
        key: 'agent_sandboxed_execution',
        name: 'Sandboxed Agent Execution',
        description: 'Run agents in isolated sandboxed environments',
        defaultValue: true,
        agentTypes: [AgentType.CODE_INTERPRETER, AgentType.THIRD_PARTY],
        category: 'security',
      },
      {
        key: 'agent_content_filtering',
        name: 'Agent Content Filtering',
        description: 'Apply content filters to agent inputs and outputs',
        defaultValue: true,
        agentTypes: Object.values(AgentType),
        category: 'security',
      },
      {
        key: 'agent_audit_logging',
        name: 'Agent Audit Logging',
        description: 'Log all agent activities for security auditing',
        defaultValue: true,
        agentTypes: Object.values(AgentType),
        category: 'security',
      },

      // UI Features
      {
        key: 'agent_response_panels',
        name: 'Agent Response Panels',
        description: 'Display specialized UI panels for agent responses',
        defaultValue: true,
        agentTypes: Object.values(AgentType),
        category: 'ui',
      },
      {
        key: 'agent_confidence_scores',
        name: 'Agent Confidence Scores',
        description: 'Display confidence scores for agent responses',
        defaultValue: false,
        agentTypes: Object.values(AgentType),
        category: 'ui',
      },
      {
        key: 'agent_processing_indicators',
        name: 'Agent Processing Indicators',
        description: 'Show real-time processing indicators for agents',
        defaultValue: true,
        agentTypes: Object.values(AgentType),
        category: 'ui',
      },

      // Experimental Features
      {
        key: 'agent_auto_routing',
        name: 'Automatic Agent Routing',
        description: 'Automatically route requests to the most appropriate agent',
        defaultValue: false,
        agentTypes: Object.values(AgentType),
        category: 'experimental',
      },
      {
        key: 'agent_learning_adaptation',
        name: 'Agent Learning Adaptation',
        description: 'Allow agents to learn and adapt from user interactions',
        defaultValue: false,
        agentTypes: Object.values(AgentType),
        category: 'experimental',
      },
      {
        key: 'agent_multi_modal_input',
        name: 'Multi-modal Agent Input',
        description: 'Enable agents to process multiple input types simultaneously',
        defaultValue: false,
        agentTypes: Object.values(AgentType),
        category: 'experimental',
        dependencies: ['agent_parallel_processing'],
      },
    ];

    features.forEach(feature => {
      this.featureDefinitions.set(feature.key, feature);
    });
  }

  /**
   * Initialize feature groups
   */
  private initializeFeatureGroups(): void {
    const groups: AgentFeatureGroup[] = [
      {
        name: 'Core Agent Functionality',
        description: 'Essential features required for basic agent operation',
        features: [
          'agent_web_search_enabled',
          'agent_code_interpreter_enabled',
          'agent_local_knowledge_enabled',
          'agent_url_pull_enabled',
        ],
        enabledByDefault: true,
        requiredForBasicFunctionality: true,
      },
      {
        name: 'Performance Optimizations',
        description: 'Features that improve agent performance and responsiveness',
        features: [
          'agent_parallel_processing',
          'agent_result_caching',
          'agent_streaming_responses',
        ],
        enabledByDefault: true,
        requiredForBasicFunctionality: false,
      },
      {
        name: 'Security & Privacy',
        description: 'Security and privacy features for agent operations',
        features: [
          'agent_sandboxed_execution',
          'agent_content_filtering',
          'agent_audit_logging',
        ],
        enabledByDefault: true,
        requiredForBasicFunctionality: false,
      },
      {
        name: 'User Interface Enhancements',
        description: 'UI features that enhance the agent interaction experience',
        features: [
          'agent_response_panels',
          'agent_confidence_scores',
          'agent_processing_indicators',
        ],
        enabledByDefault: false,
        requiredForBasicFunctionality: false,
      },
      {
        name: 'Experimental Features',
        description: 'Cutting-edge features that are still in development',
        features: [
          'agent_foundry_enabled',
          'agent_auto_routing',
          'agent_learning_adaptation',
          'agent_multi_modal_input',
        ],
        enabledByDefault: false,
        requiredForBasicFunctionality: false,
      },
    ];

    groups.forEach(group => {
      this.featureGroups.set(group.name, group);
    });
  }

  /**
   * Load local toggle overrides from settings
   */
  private loadLocalToggles(): void {
    try {
      const settings = getSettings();
      const agentSettings = settings.agentSettings;
      
      if (agentSettings?.preferences) {
        // Load from new preferences structure if available
        this.localToggles.clear();
        // Add logic to extract toggles from preferences when structure is defined
      }
    } catch (error) {
      console.error('[AgentFeatureToggle] Failed to load local toggles:', error);
    }
  }

  /**
   * Handle settings changes
   */
  private handleSettingsChange(newSettings: Settings, changedKeys: string[]): void {
    const agentRelatedKeys = changedKeys.filter(key => key.startsWith('agentSettings.'));
    if (agentRelatedKeys.length > 0) {
      this.loadLocalToggles();
    }
  }

  /**
   * Evaluate a feature toggle for a specific agent type
   */
  async evaluateToggle(
    featureKey: string,
    agentType: AgentType,
    userContext?: UserContext
  ): Promise<ToggleEvaluationResult> {
    const feature = this.featureDefinitions.get(featureKey);
    
    if (!feature) {
      return {
        enabled: false,
        source: 'default',
        reason: 'Feature not found',
      };
    }

    // Check if feature applies to this agent type
    if (!feature.agentTypes.includes(agentType)) {
      return {
        enabled: false,
        source: 'default',
        reason: 'Feature not applicable to agent type',
      };
    }

    // Check local override first
    if (this.localToggles.has(featureKey)) {
      const enabled = this.localToggles.get(featureKey)!;
      return {
        enabled,
        source: 'local',
        reason: 'Local override',
      };
    }

    // Check remote feature flag if user context available
    if (userContext) {
      try {
        const remoteValue = await this.featureFlagService.evaluateFlag(
          featureKey,
          userContext,
          feature.defaultValue
        );
        
        return {
          enabled: remoteValue,
          source: 'remote',
          reason: 'Remote feature flag',
        };
      } catch (error) {
        console.warn(`[AgentFeatureToggle] Remote evaluation failed for ${featureKey}:`, error);
      }
    }

    // Check dependencies
    if (feature.dependencies && feature.dependencies.length > 0) {
      const dependencyResults = await Promise.all(
        feature.dependencies.map(dep => this.evaluateToggle(dep, agentType, userContext))
      );
      
      const allDependenciesEnabled = dependencyResults.every(result => result.enabled);
      if (!allDependenciesEnabled) {
        return {
          enabled: false,
          source: 'default',
          reason: 'Dependencies not satisfied',
          dependencies: Object.fromEntries(
            feature.dependencies.map((dep, i) => [dep, dependencyResults[i].enabled])
          ),
        };
      }
    }

    // Check conflicts
    if (feature.conflicts && feature.conflicts.length > 0) {
      const conflictResults = await Promise.all(
        feature.conflicts.map(conflict => this.evaluateToggle(conflict, agentType, userContext))
      );
      
      const hasActiveConflicts = conflictResults.some(result => result.enabled);
      if (hasActiveConflicts) {
        return {
          enabled: false,
          source: 'default',
          reason: 'Conflicting features enabled',
        };
      }
    }

    // Use default value
    return {
      enabled: feature.defaultValue,
      source: 'default',
      reason: 'Default value',
    };
  }

  /**
   * Check if an agent type is enabled
   */
  async isAgentEnabled(agentType: AgentType, userContext?: UserContext): Promise<boolean> {
    const coreFeatureKey = `agent_${agentType.toLowerCase().replace(/-/g, '_')}_enabled`;
    const result = await this.evaluateToggle(coreFeatureKey, agentType, userContext);
    return result.enabled;
  }

  /**
   * Get all available features
   */
  getAllFeatures(): AgentFeatureToggle[] {
    return Array.from(this.featureDefinitions.values());
  }

  /**
   * Get features by category
   */
  getFeaturesByCategory(category: AgentFeatureToggle['category']): AgentFeatureToggle[] {
    return this.getAllFeatures().filter(feature => feature.category === category);
  }

  /**
   * Get features for a specific agent type
   */
  getFeaturesForAgent(agentType: AgentType): AgentFeatureToggle[] {
    return this.getAllFeatures().filter(feature => feature.agentTypes.includes(agentType));
  }

  /**
   * Get all feature groups
   */
  getAllFeatureGroups(): AgentFeatureGroup[] {
    return Array.from(this.featureGroups.values());
  }

  /**
   * Enable/disable a feature locally
   */
  setLocalToggle(featureKey: string, enabled: boolean): void {
    this.localToggles.set(featureKey, enabled);
    this.saveLocalToggles();
  }

  /**
   * Remove local override for a feature
   */
  removeLocalToggle(featureKey: string): void {
    this.localToggles.delete(featureKey);
    this.saveLocalToggles();
  }

  /**
   * Enable/disable an entire feature group
   */
  async setFeatureGroup(groupName: string, enabled: boolean): Promise<void> {
    const group = this.featureGroups.get(groupName);
    if (!group) {
      throw new Error(`Feature group '${groupName}' not found`);
    }

    group.features.forEach(featureKey => {
      this.setLocalToggle(featureKey, enabled);
    });
  }

  /**
   * Reset all local overrides
   */
  resetLocalToggles(): void {
    this.localToggles.clear();
    this.saveLocalToggles();
  }

  /**
   * Get current local toggle states
   */
  getLocalToggles(): Map<string, boolean> {
    return new Map(this.localToggles);
  }

  /**
   * Save local toggles to settings
   */
  private saveLocalToggles(): void {
    try {
      const settings = getSettings();
      
      // Create new agent settings structure if it doesn't exist
      if (!settings.agentSettings) {
        settings.agentSettings = {
          enabled: true,
          confidenceThreshold: 0.6,
          fallbackEnabled: true,
          enabledAgentTypes: Object.values(AgentType),
          agentConfigurations: {} as any,
          preferences: {
            preferredAgents: [],
            disabledAgents: [],
            autoRouting: true,
            showAgentAttribution: true,
            confirmBeforeAgentUse: false,
          },
        };
      }

      // Add feature toggles to agent settings
      (settings.agentSettings as any).featureToggles = Object.fromEntries(this.localToggles);
      
      saveSettings(settings);
    } catch (error) {
      console.error('[AgentFeatureToggle] Failed to save local toggles:', error);
    }
  }

  /**
   * Export feature configuration
   */
  exportConfiguration(): string {
    return JSON.stringify({
      localToggles: Object.fromEntries(this.localToggles),
      timestamp: Date.now(),
      version: '1.0.0',
    }, null, 2);
  }

  /**
   * Import feature configuration
   */
  importConfiguration(configString: string): boolean {
    try {
      const config = JSON.parse(configString);
      
      if (config.localToggles) {
        this.localToggles.clear();
        Object.entries(config.localToggles).forEach(([key, value]) => {
          if (typeof value === 'boolean' && this.featureDefinitions.has(key)) {
            this.localToggles.set(key, value);
          }
        });
        
        this.saveLocalToggles();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[AgentFeatureToggle] Failed to import configuration:', error);
      return false;
    }
  }

  /**
   * Get feature toggle statistics
   */
  getStatistics(): {
    totalFeatures: number;
    enabledFeatures: number;
    localOverrides: number;
    featuresByCategory: Record<string, number>;
  } {
    const totalFeatures = this.featureDefinitions.size;
    const localOverrides = this.localToggles.size;
    const enabledFeatures = Array.from(this.localToggles.values()).filter(Boolean).length;
    
    const featuresByCategory: Record<string, number> = {};
    this.getAllFeatures().forEach(feature => {
      featuresByCategory[feature.category] = (featuresByCategory[feature.category] || 0) + 1;
    });

    return {
      totalFeatures,
      enabledFeatures,
      localOverrides,
      featuresByCategory,
    };
  }
}

/**
 * Global service instance
 */
let agentFeatureToggleServiceInstance: AgentFeatureToggleService | null = null;

/**
 * Get or create the agent feature toggle service instance
 */
export function getAgentFeatureToggleService(): AgentFeatureToggleService {
  if (!agentFeatureToggleServiceInstance) {
    // Import the feature flag service
    const { getFeatureFlagService } = require('./simpleFeatureFlags');
    const featureFlagService = getFeatureFlagService();
    
    agentFeatureToggleServiceInstance = new AgentFeatureToggleService(featureFlagService);
  }

  return agentFeatureToggleServiceInstance;
}

/**
 * Convenience function to check if a feature is enabled
 */
export async function isFeatureEnabled(
  featureKey: string,
  agentType: AgentType,
  userContext?: UserContext
): Promise<boolean> {
  const service = getAgentFeatureToggleService();
  const result = await service.evaluateToggle(featureKey, agentType, userContext);
  return result.enabled;
}

/**
 * Convenience function to check if an agent is enabled
 */
export async function isAgentTypeEnabled(
  agentType: AgentType,
  userContext?: UserContext
): Promise<boolean> {
  const service = getAgentFeatureToggleService();
  return await service.isAgentEnabled(agentType, userContext);
}