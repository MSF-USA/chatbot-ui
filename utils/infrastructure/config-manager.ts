import * as fs from 'fs';
import * as path from 'path';

export interface AzureConfig {
  aiFoundry: {
    endpoint: string;
    projectId: string;
    subscriptionId: string;
    resourceGroup: string;
  };
  grounding: {
    connectionId: string;
    searchResource?: string;
  };
  authentication: {
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
  };
  featureFlags: {
    forceAIAgents: boolean;
    forceStandardChat: boolean;
  };
  legacy: {
    bingSearchApiKey?: string;
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigurationManager {
  private config: Partial<AzureConfig>;

  constructor() {
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): Partial<AzureConfig> {
    return {
      aiFoundry: {
        endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT || '',
        projectId: process.env.AZURE_AI_FOUNDRY_PROJECT_ID || '',
        subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || '',
        resourceGroup: process.env.AZURE_RESOURCE_GROUP || '',
      },
      grounding: {
        connectionId: process.env.AZURE_GROUNDING_CONNECTION_ID || '',
        searchResource: process.env.AZURE_GROUNDING_SEARCH_RESOURCE,
      },
      authentication: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        tenantId: process.env.AZURE_TENANT_ID,
      },
      featureFlags: {
        forceAIAgents: process.env.FORCE_AI_AGENTS?.toLowerCase() === 'true',
        forceStandardChat:
          process.env.FORCE_STANDARD_CHAT?.toLowerCase() === 'true',
      },
      legacy: {
        bingSearchApiKey: process.env.BING_SEARCH_API_KEY,
      },
    };
  }

  getConfig(): Partial<AzureConfig> {
    return { ...this.config };
  }

  validateConfiguration(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required AI Foundry configuration
    if (!this.config.aiFoundry?.endpoint) {
      errors.push('AZURE_AI_FOUNDRY_ENDPOINT is required');
    } else if (
      !this.config.aiFoundry.endpoint.match(/^https:\/\/.*\.ai\.azure\.com/)
    ) {
      errors.push(
        'AZURE_AI_FOUNDRY_ENDPOINT must be a valid Azure AI Foundry endpoint',
      );
    }

    if (!this.config.aiFoundry?.projectId) {
      errors.push('AZURE_AI_FOUNDRY_PROJECT_ID is required');
    } else if (this.config.aiFoundry.projectId.length < 10) {
      errors.push('AZURE_AI_FOUNDRY_PROJECT_ID appears to be invalid');
    }

    if (!this.config.aiFoundry?.subscriptionId) {
      errors.push('AZURE_SUBSCRIPTION_ID is required');
    } else if (
      !this.config.aiFoundry.subscriptionId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      errors.push('AZURE_SUBSCRIPTION_ID must be a valid UUID');
    }

    if (!this.config.aiFoundry?.resourceGroup) {
      errors.push('AZURE_RESOURCE_GROUP is required');
    }

    // Validate grounding configuration
    if (!this.config.grounding?.connectionId) {
      errors.push('AZURE_GROUNDING_CONNECTION_ID is required');
    } else if (
      !this.config.grounding.connectionId.match(
        /^\/subscriptions\/.*\/resourceGroups\/.*\/providers\/Microsoft\.CognitiveServices\/accounts\/.*\/projects\/.*\/connections\/.*$/,
      )
    ) {
      errors.push(
        'AZURE_GROUNDING_CONNECTION_ID must be a valid Azure resource path',
      );
    }

    // Validate consistency between subscription ID and connection ID
    if (
      this.config.aiFoundry?.subscriptionId &&
      this.config.grounding?.connectionId
    ) {
      if (
        !this.config.grounding.connectionId.includes(
          `/subscriptions/${this.config.aiFoundry.subscriptionId}/`,
        )
      ) {
        errors.push(
          'AZURE_GROUNDING_CONNECTION_ID must reference the same subscription as AZURE_SUBSCRIPTION_ID',
        );
      }
    }

    // Validate consistency between resource group and connection ID
    if (
      this.config.aiFoundry?.resourceGroup &&
      this.config.grounding?.connectionId
    ) {
      if (
        !this.config.grounding.connectionId.includes(
          `/resourceGroups/${this.config.aiFoundry.resourceGroup}/`,
        )
      ) {
        errors.push(
          'AZURE_GROUNDING_CONNECTION_ID must reference the same resource group as AZURE_RESOURCE_GROUP',
        );
      }
    }

    // Validate authentication configuration
    const hasClientCredentials =
      this.config.authentication?.clientId &&
      this.config.authentication?.clientSecret;
    const hasTenantId = this.config.authentication?.tenantId;

    if (hasClientCredentials && !hasTenantId) {
      errors.push('AZURE_TENANT_ID is required when using client credentials');
    }

    // Warnings
    if (!hasClientCredentials && process.env.NODE_ENV === 'production') {
      warnings.push(
        'No client credentials configured - ensure DefaultAzureCredential has appropriate authentication method in production',
      );
    }

    if (this.config.legacy?.bingSearchApiKey) {
      warnings.push(
        'Legacy BING_SEARCH_API_KEY detected - should be removed in Phase 4',
      );
    }

    if (
      this.config.featureFlags?.forceAIAgents &&
      process.env.NODE_ENV === 'production'
    ) {
      warnings.push(
        'FORCE_AI_AGENTS is enabled in production - ensure this is intentional',
      );
    }

    // Check for placeholder values
    const configString = JSON.stringify(this.config);
    if (
      configString.includes('YOUR_') ||
      configString.includes('<') ||
      configString.includes('>')
    ) {
      errors.push(
        'Configuration contains placeholder values - replace with actual values',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  generateConfigTemplate(): string {
    const template = `# Azure AI Foundry Configuration
# Replace placeholders with actual values from Azure portal
AZURE_AI_FOUNDRY_ENDPOINT=https://YOUR_AI_FOUNDRY_INSTANCE.cognitiveservices.azure.com
AZURE_AI_FOUNDRY_PROJECT_ID=YOUR_PROJECT_ID
AZURE_SUBSCRIPTION_ID=YOUR_SUBSCRIPTION_ID
AZURE_RESOURCE_GROUP=YOUR_RESOURCE_GROUP_NAME

# Grounding with Bing Search Configuration
# Get connection ID from AI Foundry portal > Connections
AZURE_GROUNDING_CONNECTION_ID=/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/YOUR_RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/YOUR_ACCOUNT/projects/YOUR_PROJECT/connections/YOUR_CONNECTION

# Authentication (for production environments)
# For local development, use Azure CLI login instead
AZURE_CLIENT_ID=YOUR_SERVICE_PRINCIPAL_CLIENT_ID
AZURE_CLIENT_SECRET=YOUR_SERVICE_PRINCIPAL_SECRET
AZURE_TENANT_ID=YOUR_TENANT_ID

# Feature Flags for Gradual Migration
FORCE_AI_AGENTS=false
FORCE_STANDARD_CHAT=false

# Legacy Configuration (will be removed in Phase 4)
BING_SEARCH_API_KEY=YOUR_LEGACY_BING_KEY`;

    return template;
  }

  saveConfigTemplate(filePath: string): void {
    const template = this.generateConfigTemplate();
    fs.writeFileSync(filePath, template);
  }

  exportConfig(filePath: string): void {
    const configData = {
      ...this.config,
      exportTimestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    fs.writeFileSync(filePath, JSON.stringify(configData, null, 2));
  }

  static createFromFile(filePath: string): ConfigurationManager {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    const configData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Set environment variables from config
    Object.entries(configData).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          const envKey = `${key.toUpperCase()}_${subKey.toUpperCase()}`;
          if (subValue) {
            process.env[envKey] = String(subValue);
          }
        });
      }
    });

    return new ConfigurationManager();
  }

  getEnvironmentSpecificConfig(environment: string): Partial<AzureConfig> {
    const baseConfig = this.getConfig();

    // Environment-specific overrides
    const envOverrides: Record<string, Partial<AzureConfig>> = {
      development: {
        featureFlags: {
          forceAIAgents: false,
          forceStandardChat: false,
        },
      },
      staging: {
        featureFlags: {
          forceAIAgents: false,
          forceStandardChat: false,
        },
      },
      production: {
        featureFlags: {
          forceAIAgents: false,
          forceStandardChat: false,
        },
      },
    };

    const envConfig = envOverrides[environment] || {};

    return {
      ...baseConfig,
      ...envConfig,
    };
  }
}

export function createConfigManager(): ConfigurationManager {
  return new ConfigurationManager();
}

export function validateCurrentConfig(): ConfigValidationResult {
  const manager = new ConfigurationManager();
  return manager.validateConfiguration();
}
