import { AgentType } from '@/types/agent';
import { AgentSettings, AgentConfiguration, AgentPreferences, Settings } from '@/types/settings';
import { getSettings, saveSettings } from '@/utils/app/settings';

import { getAgentChatIntegration } from './agentChatIntegration';

/**
 * Agent Settings Service
 * Manages agent-specific configurations and preferences
 */
export class AgentSettingsService {
  private static instance: AgentSettingsService | null = null;
  
  private settings: AgentSettings;

  private constructor() {
    
    this.settings = this.loadAgentSettings();
    this.initializeDefaults();
  }

  /**
   * Singleton pattern - get or create settings service instance
   */
  public static getInstance(): AgentSettingsService {
    if (!AgentSettingsService.instance) {
      AgentSettingsService.instance = new AgentSettingsService();
    }
    return AgentSettingsService.instance;
  }

  /**
   * Get current agent settings
   */
  public getAgentSettings(): AgentSettings {
    return { ...this.settings };
  }

  /**
   * Update agent settings
   */
  public updateAgentSettings(newSettings: Partial<AgentSettings>): void {
    try {
      this.settings = { ...this.settings, ...newSettings };
      this.saveAgentSettings();
      this.applySettingsToIntegration();

      console.log('Agent settings updated', {
        updatedFields: Object.keys(newSettings),
        enabled: this.settings.enabled,
        confidenceThreshold: this.settings.confidenceThreshold,
        enabledAgentTypes: this.settings.enabledAgentTypes,
      });
    } catch (error) {
      console.error('Failed to update agent settings', error as Error, {
        newSettings: JSON.stringify(newSettings),
      });
      throw error;
    }
  }

  /**
   * Get configuration for a specific agent type
   */
  public getAgentConfiguration(agentType: AgentType): AgentConfiguration {
    return this.settings.agentConfigurations[agentType] || this.getDefaultAgentConfiguration(agentType);
  }

  /**
   * Update configuration for a specific agent type
   */
  public updateAgentConfiguration(agentType: AgentType, config: Partial<AgentConfiguration>): void {
    try {
      const currentConfig = this.getAgentConfiguration(agentType);
      this.settings.agentConfigurations[agentType] = { ...currentConfig, ...config };
      this.saveAgentSettings();

      console.log('Agent configuration updated', {
        agentType,
        updatedFields: Object.keys(config),
        enabled: this.settings.agentConfigurations[agentType].enabled,
        priority: this.settings.agentConfigurations[agentType].priority,
      });
    } catch (error) {
      console.error('Failed to update agent configuration', error as Error, {
        agentType,
        config: JSON.stringify(config),
      });
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  public getAgentPreferences(): AgentPreferences {
    return { ...this.settings.preferences };
  }

  /**
   * Update user preferences
   */
  public updateAgentPreferences(preferences: Partial<AgentPreferences>): void {
    try {
      this.settings.preferences = { ...this.settings.preferences, ...preferences };
      this.saveAgentSettings();

      console.log('Agent preferences updated', {
        updatedFields: Object.keys(preferences),
        autoRouting: this.settings.preferences.autoRouting,
        preferredAgents: this.settings.preferences.preferredAgents,
        disabledAgents: this.settings.preferences.disabledAgents,
      });
    } catch (error) {
      console.error('Failed to update agent preferences', error as Error, {
        preferences: JSON.stringify(preferences),
      });
      throw error;
    }
  }

  /**
   * Enable or disable a specific agent type
   */
  public setAgentEnabled(agentType: AgentType, enabled: boolean): void {
    try {
      const config = this.getAgentConfiguration(agentType);
      config.enabled = enabled;
      this.updateAgentConfiguration(agentType, config);

      // Update enabled agent types list
      if (enabled && !this.settings.enabledAgentTypes.includes(agentType)) {
        this.settings.enabledAgentTypes.push(agentType);
      } else if (!enabled && this.settings.enabledAgentTypes.includes(agentType)) {
        this.settings.enabledAgentTypes = this.settings.enabledAgentTypes.filter(type => type !== agentType);
      }

      this.saveAgentSettings();
      this.applySettingsToIntegration();

      console.log('Agent enabled state changed', {
        agentType,
        enabled,
        enabledAgentTypes: this.settings.enabledAgentTypes,
      });
    } catch (error) {
      console.error('Failed to set agent enabled state', error as Error, {
        agentType,
        enabled,
      });
      throw error;
    }
  }

  /**
   * Set agent priority
   */
  public setAgentPriority(agentType: AgentType, priority: number): void {
    try {
      const config = this.getAgentConfiguration(agentType);
      config.priority = Math.max(0, Math.min(100, priority)); // Clamp between 0-100
      this.updateAgentConfiguration(agentType, config);

      console.log('Agent priority updated', {
        agentType,
        priority: config.priority,
      });
    } catch (error) {
      console.error('Failed to set agent priority', error as Error, {
        agentType,
        priority,
      });
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  public resetToDefaults(): void {
    try {
      this.settings = this.getDefaultAgentSettings();
      this.saveAgentSettings();
      this.applySettingsToIntegration();

      console.log('Agent settings reset to defaults');
    } catch (error) {
      console.error('Failed to reset agent settings to defaults', error as Error);
      throw error;
    }
  }

  /**
   * Export settings for backup
   */
  public exportSettings(): string {
    try {
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        agentSettings: this.settings,
      };

      console.log('Agent settings exported');
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export agent settings', error as Error);
      throw error;
    }
  }

  /**
   * Import settings from backup
   */
  public importSettings(exportedData: string): void {
    try {
      const data = JSON.parse(exportedData);
      
      if (!data.agentSettings) {
        throw new Error('Invalid export data: missing agentSettings');
      }

      // Validate imported settings structure
      this.validateAgentSettings(data.agentSettings);
      
      this.settings = data.agentSettings;
      this.saveAgentSettings();
      this.applySettingsToIntegration();

      console.log('Agent settings imported successfully', {
        version: data.version,
        timestamp: data.timestamp,
      });
    } catch (error) {
      console.error('Failed to import agent settings', error as Error, {
        exportedData: exportedData.substring(0, 200),
      });
      throw error;
    }
  }

  /**
   * Get settings validation result
   */
  public validateSettings(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate basic settings structure
      if (typeof this.settings.enabled !== 'boolean') {
        errors.push('Agent enabled setting must be a boolean');
      }

      if (typeof this.settings.confidenceThreshold !== 'number' || 
          this.settings.confidenceThreshold < 0 || 
          this.settings.confidenceThreshold > 1) {
        errors.push('Confidence threshold must be a number between 0 and 1');
      }

      if (!Array.isArray(this.settings.enabledAgentTypes)) {
        errors.push('Enabled agent types must be an array');
      }

      // Validate agent configurations
      for (const [agentType, config] of Object.entries(this.settings.agentConfigurations)) {
        if (!Object.values(AgentType).includes(agentType as AgentType)) {
          warnings.push(`Unknown agent type: ${agentType}`);
        }

        if (typeof config.priority !== 'number' || config.priority < 0 || config.priority > 100) {
          errors.push(`Invalid priority for ${agentType}: must be between 0 and 100`);
        }

        if (typeof config.timeout !== 'number' || config.timeout < 1000) {
          warnings.push(`Low timeout for ${agentType}: consider increasing for better reliability`);
        }
      }

      // Validate preferences
      if (!Array.isArray(this.settings.preferences.preferredAgents)) {
        errors.push('Preferred agents must be an array');
      }

      if (!Array.isArray(this.settings.preferences.disabledAgents)) {
        errors.push('Disabled agents must be an array');
      }

      // Check for conflicts
      const conflictingAgents = this.settings.preferences.preferredAgents.filter(agent =>
        this.settings.preferences.disabledAgents.includes(agent)
      );
      if (conflictingAgents.length > 0) {
        warnings.push(`Agents in both preferred and disabled lists: ${conflictingAgents.join(', ')}`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
      };
    }
  }

  /**
   * Private helper methods
   */

  private loadAgentSettings(): AgentSettings {
    try {
      const settings = getSettings();
      return settings.agentSettings || this.getDefaultAgentSettings();
    } catch (error) {
      console.warn('Failed to load agent settings, using defaults', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.getDefaultAgentSettings();
    }
  }

  private saveAgentSettings(): void {
    try {
      const currentSettings = getSettings();
      const updatedSettings: Settings = {
        ...currentSettings,
        agentSettings: this.settings,
      };
      saveSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save agent settings', error as Error);
      throw error;
    }
  }

  private getDefaultAgentSettings(): AgentSettings {
    return {
      enabled: true,
      confidenceThreshold: 0.6,
      fallbackEnabled: true,
      enabledAgentTypes: [
        AgentType.WEB_SEARCH,
        AgentType.CODE_INTERPRETER,
        AgentType.URL_PULL,
        AgentType.LOCAL_KNOWLEDGE,
        AgentType.FOUNDRY,
      ],
      agentConfigurations: Object.values(AgentType).reduce((configs, agentType) => {
        configs[agentType] = this.getDefaultAgentConfiguration(agentType);
        return configs;
      }, {} as Record<AgentType, AgentConfiguration>),
      preferences: {
        preferredAgents: [],
        disabledAgents: [],
        autoRouting: true,
        showAgentAttribution: true,
        confirmBeforeAgentUse: false,
      },
    };
  }

  private getDefaultAgentConfiguration(agentType: AgentType): AgentConfiguration {
    const baseConfig: AgentConfiguration = {
      enabled: true,
      priority: 50,
      timeout: 30000,
      maxRetries: 2,
      parameters: {},
    };

    // Agent-specific defaults
    switch (agentType) {
      case AgentType.WEB_SEARCH:
        return {
          ...baseConfig,
          priority: 80,
          parameters: {
            freshness: 'week',
            count: 15,
            market: 'en-US',
          },
        };

      case AgentType.CODE_INTERPRETER:
        return {
          ...baseConfig,
          priority: 85,
          timeout: 45000,
          parameters: {
            language: 'python',
            libraries: ['pandas', 'numpy'],
            file_upload: true,
          },
        };

      case AgentType.URL_PULL:
        return {
          ...baseConfig,
          priority: 90,
          parameters: {
            analysis_type: 'content',
            output_format: 'summary',
          },
        };

      case AgentType.LOCAL_KNOWLEDGE:
        return {
          ...baseConfig,
          priority: 70,
          parameters: {
            category: 'general',
          },
        };

      case AgentType.FOUNDRY:
        return {
          ...baseConfig,
          priority: 60,
          timeout: 60000,
          parameters: {
            model: 'gpt-4o',
            temperature: 0.3,
          },
        };

      case AgentType.THIRD_PARTY:
        return {
          ...baseConfig,
          priority: 40,
          enabled: false, // Disabled by default
          parameters: {
            service: 'custom',
            action: 'read',
          },
        };

      case AgentType.STANDARD_CHAT:
        return {
          ...baseConfig,
          priority: 30,
          parameters: {},
        };

      default:
        return baseConfig;
    }
  }

  private initializeDefaults(): void {
    // Ensure all agent types have configurations
    let needsSave = false;

    for (const agentType of Object.values(AgentType)) {
      if (!this.settings.agentConfigurations[agentType]) {
        this.settings.agentConfigurations[agentType] = this.getDefaultAgentConfiguration(agentType);
        needsSave = true;
      }
    }

    if (needsSave) {
      this.saveAgentSettings();
    }

    // Apply settings to integration service
    this.applySettingsToIntegration();
  }

  private applySettingsToIntegration(): void {
    try {
      const integration = getAgentChatIntegration();
      integration.configure({
        enabledAgentTypes: this.settings.enabledAgentTypes,
        confidenceThreshold: this.settings.confidenceThreshold,
        fallbackEnabled: this.settings.fallbackEnabled,
      });
    } catch (error) {
      console.error('Failed to apply settings to integration', error as Error);
    }
  }

  private validateAgentSettings(settings: any): void {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings object');
    }

    const requiredFields = ['enabled', 'confidenceThreshold', 'fallbackEnabled', 'enabledAgentTypes', 'agentConfigurations', 'preferences'];
    for (const field of requiredFields) {
      if (!(field in settings)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
}

/**
 * Convenience function to get the singleton settings service instance
 */
export function getAgentSettingsService(): AgentSettingsService {
  return AgentSettingsService.getInstance();
}

/**
 * Convenience function to get agent settings
 */
export function getAgentSettings(): AgentSettings {
  const service = getAgentSettingsService();
  return service.getAgentSettings();
}

/**
 * Convenience function to update agent settings
 */
export function updateAgentSettings(settings: Partial<AgentSettings>): void {
  const service = getAgentSettingsService();
  service.updateAgentSettings(settings);
}

/**
 * Convenience function to get agent configuration
 */
export function getAgentConfiguration(agentType: AgentType): AgentConfiguration {
  const service = getAgentSettingsService();
  return service.getAgentConfiguration(agentType);
}

/**
 * Convenience function to set agent enabled state
 */
export function setAgentEnabled(agentType: AgentType, enabled: boolean): void {
  const service = getAgentSettingsService();
  service.setAgentEnabled(agentType, enabled);
}