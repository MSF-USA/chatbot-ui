import { DefaultAzureCredential } from '@azure/identity';

export interface ValidationResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
}

export interface InfrastructureReport {
  timestamp: string;
  environment: string;
  results: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

export class AzureInfrastructureValidator {
  private credential: DefaultAzureCredential;

  constructor() {
    this.credential = new DefaultAzureCredential();
  }

  async testAzureAIFoundryConnection(): Promise<ValidationResult> {
    try {
      const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;
      if (!endpoint) {
        throw new Error('AZURE_AI_FOUNDRY_ENDPOINT not configured');
      }

      // For Phase 1, we'll do basic validation without actual API calls
      // since the Azure AI Foundry SDK may not be available yet
      const isValidEndpoint = endpoint.match(/^https:\/\/.*\.ai\.azure\.com/);

      if (!isValidEndpoint) {
        throw new Error('Invalid Azure AI Foundry endpoint format');
      }

      return {
        name: 'Azure AI Foundry Connection',
        success: true,
        details: { endpoint },
      };
    } catch (error) {
      return {
        name: 'Azure AI Foundry Connection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testBingGroundingConnection(): Promise<ValidationResult> {
    try {
      const connectionId = process.env.AZURE_GROUNDING_CONNECTION_ID;
      if (!connectionId) {
        throw new Error('AZURE_GROUNDING_CONNECTION_ID not configured');
      }

      const isValidConnectionId = connectionId.match(
        /^\/subscriptions\/.*\/resourceGroups\/.*\/providers\/Microsoft\.CognitiveServices\/accounts\/.*\/projects\/.*\/connections\/.*$/,
      );

      if (!isValidConnectionId) {
        throw new Error('Invalid Azure Grounding connection ID format');
      }

      return {
        name: 'Bing Grounding Connection',
        success: true,
        details: { connectionId },
      };
    } catch (error) {
      return {
        name: 'Bing Grounding Connection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testModelDeploymentAccess(): Promise<ValidationResult> {
    try {
      const projectId = process.env.AZURE_AI_FOUNDRY_PROJECT_ID;
      if (!projectId) {
        throw new Error('AZURE_AI_FOUNDRY_PROJECT_ID not configured');
      }

      // Basic validation for now - ensure project ID is not empty and looks reasonable
      if (projectId.length < 10) {
        throw new Error('Azure AI Foundry project ID appears to be invalid');
      }

      return {
        name: 'Model Deployment Access',
        success: true,
        details: { projectId },
      };
    } catch (error) {
      return {
        name: 'Model Deployment Access',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testAuthenticationFlow(): Promise<ValidationResult> {
    try {
      // Test that we can create a DefaultAzureCredential instance
      const credential = new DefaultAzureCredential();

      // For Phase 1, we'll just validate that the credential can be created
      // and that required environment variables are present
      const requiredForAuth = ['AZURE_SUBSCRIPTION_ID', 'AZURE_RESOURCE_GROUP'];

      for (const envVar of requiredForAuth) {
        if (!process.env[envVar]) {
          throw new Error(`${envVar} not configured`);
        }
      }

      return {
        name: 'Authentication Flow',
        success: true,
        details: { credentialType: 'DefaultAzureCredential' },
      };
    } catch (error) {
      return {
        name: 'Authentication Flow',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateInfrastructure(): Promise<InfrastructureReport> {
    const tests = [
      {
        name: 'Azure AI Foundry Connection',
        test: () => this.testAzureAIFoundryConnection(),
      },
      {
        name: 'Bing Grounding Connection',
        test: () => this.testBingGroundingConnection(),
      },
      {
        name: 'Model Deployment Access',
        test: () => this.testModelDeploymentAccess(),
      },
      {
        name: 'Authentication Flow',
        test: () => this.testAuthenticationFlow(),
      },
    ];

    const results = await Promise.all(
      tests.map(async ({ test }) => {
        try {
          return await test();
        } catch (error) {
          return {
            name: 'Unknown Test',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    );

    const report: InfrastructureReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      results,
      summary: {
        total: tests.length,
        passed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    };

    return report;
  }
}

export async function validateInfrastructure(): Promise<InfrastructureReport> {
  const validator = new AzureInfrastructureValidator();
  return await validator.validateInfrastructure();
}
