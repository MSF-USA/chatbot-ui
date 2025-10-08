import {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionEnvironment,
  AgentResponse,
} from '@/types/agent';

import {
  AgentCreationError,
  AgentExecutionError,
  BaseAgent,
} from './baseAgent';

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Supported authentication methods for third-party services
 */
export enum AuthenticationMethod {
  NONE = 'none',
  API_KEY = 'api_key',
  BEARER_TOKEN = 'bearer_token',
  BASIC_AUTH = 'basic_auth',
  OAUTH2 = 'oauth2',
  CUSTOM_HEADER = 'custom_header',
}

/**
 * Third-party service configuration
 */
interface ThirdPartyServiceConfig {
  baseUrl: string;
  authMethod: AuthenticationMethod;
  credentials?: {
    apiKey?: string;
    bearerToken?: string;
    username?: string;
    password?: string;
    customHeaders?: Record<string, string>;
  };
  defaultHeaders?: Record<string, string>;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimiting?: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
}

/**
 * API request configuration
 */
interface ApiRequestConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  queryParams?: Record<string, any>;
  body?: any;
  timeout?: number;
}

/**
 * Rate limiter for API requests
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly requestsPerSecond: number;
  private readonly requestsPerMinute: number;

  constructor(requestsPerSecond: number, requestsPerMinute: number) {
    this.requestsPerSecond = requestsPerSecond;
    this.requestsPerMinute = requestsPerMinute;
  }

  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;

    // Clean old requests
    this.requests = this.requests.filter((time) => time > oneMinuteAgo);

    // Check rate limits
    const recentRequests = this.requests.filter((time) => time > oneSecondAgo);
    const requestsInLastMinute = this.requests.length;

    if (recentRequests.length >= this.requestsPerSecond) {
      const waitTime = 1000 - (now - recentRequests[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    if (requestsInLastMinute >= this.requestsPerMinute) {
      const waitTime = 60000 - (now - this.requests[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}

/**
 * ThirdPartyAgent - Implementation for third-party service integration
 * Provides secure and configurable integration with external APIs and services
 */
export class ThirdPartyAgent extends BaseAgent {
  private serviceConfig: ThirdPartyServiceConfig;
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiter | null = null;

  constructor(config: AgentConfig) {
    // Ensure this is a third-party agent
    if (config.environment !== AgentExecutionEnvironment.THIRD_PARTY) {
      throw new AgentCreationError(
        'ThirdPartyAgent can only be used with THIRD_PARTY environment',
        { providedEnvironment: config.environment },
      );
    }

    super(config);

    // Initialize service configuration from agent parameters
    this.serviceConfig = this.parseServiceConfig(config.parameters || {});

    // Create HTTP client
    this.httpClient = this.createHttpClient();

    // Initialize rate limiter if configured
    if (this.serviceConfig.rateLimiting) {
      this.rateLimiter = new RateLimiter(
        this.serviceConfig.rateLimiting.requestsPerSecond,
        this.serviceConfig.rateLimiting.requestsPerMinute,
      );
    }
  }

  protected async initializeAgent(): Promise<void> {
    try {
      // Validate service configuration
      this.validateServiceConfig();

      // Test connection to third-party service
      await this.testConnection();

      this.logInfo('ThirdPartyAgent initialized successfully', {
        agentId: this.config.id,
        baseUrl: this.serviceConfig.baseUrl,
        authMethod: this.serviceConfig.authMethod,
        timeout: this.serviceConfig.timeout,
      });
    } catch (error) {
      const errorMessage = `Failed to initialize ThirdPartyAgent: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logError(errorMessage, error as Error, {
        agentId: this.config?.id,
        baseUrl: this.serviceConfig?.baseUrl,
      });
      throw new AgentCreationError(errorMessage, error);
    }
  }

  protected async executeInternal(
    context: AgentExecutionContext,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Parse request from context
      const apiRequest = this.parseRequestFromContext(context);

      // Apply rate limiting if configured
      if (this.rateLimiter) {
        await this.rateLimiter.waitForRateLimit();
      }

      // Execute API request with retry logic
      const response = await this.executeRequestWithRetry(apiRequest);

      const processingTime = Date.now() - startTime;

      // Process and format response
      const formattedContent = this.formatApiResponse(response, apiRequest);

      const agentResponse: AgentResponse = {
        content: formattedContent,
        agentId: this.config.id,
        agentType: this.config.type,
        success: true,
        metadata: {
          processingTime,
          confidence: this.calculateResponseConfidence(response),
          toolResults: [
            {
              requestUrl: `${this.serviceConfig.baseUrl}${apiRequest.endpoint}`,
              method: apiRequest.method,
              statusCode: response.status,
              responseTime: processingTime,
              success: response.status >= 200 && response.status < 300,
            },
          ],
          agentMetadata: {
            serviceUrl: this.serviceConfig.baseUrl,
            authMethod: this.serviceConfig.authMethod,
            endpoint: apiRequest.endpoint,
            method: apiRequest.method,
          },
        },
      };

      this.logInfo('ThirdPartyAgent execution completed successfully', {
        agentId: this.config.id,
        processingTime,
        endpoint: apiRequest.endpoint,
        statusCode: response.status,
      });

      return agentResponse;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logError('ThirdPartyAgent execution failed', error as Error, {
        agentId: this.config.id,
        processingTime,
        query: context.query?.substring(0, 100),
      });

      throw new AgentExecutionError(
        `Third-party service request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          agentId: this.config.id,
          processingTime,
          originalError: error,
        },
      );
    }
  }

  protected validateSpecificConfig(): string[] {
    const errors: string[] = [];

    // Validate service configuration
    if (!this.serviceConfig.baseUrl) {
      errors.push('Base URL is required for third-party services');
    }

    try {
      new URL(this.serviceConfig.baseUrl);
    } catch {
      errors.push('Invalid base URL format');
    }

    // Validate authentication configuration
    if (this.serviceConfig.authMethod !== AuthenticationMethod.NONE) {
      if (!this.serviceConfig.credentials) {
        errors.push(
          'Credentials are required for the selected authentication method',
        );
      } else {
        switch (this.serviceConfig.authMethod) {
          case AuthenticationMethod.API_KEY:
            if (!this.serviceConfig.credentials.apiKey) {
              errors.push('API key is required for API key authentication');
            }
            break;
          case AuthenticationMethod.BEARER_TOKEN:
            if (!this.serviceConfig.credentials.bearerToken) {
              errors.push(
                'Bearer token is required for bearer token authentication',
              );
            }
            break;
          case AuthenticationMethod.BASIC_AUTH:
            if (
              !this.serviceConfig.credentials.username ||
              !this.serviceConfig.credentials.password
            ) {
              errors.push(
                'Username and password are required for basic authentication',
              );
            }
            break;
        }
      }
    }

    // Validate timeout
    if (
      this.serviceConfig.timeout < 1000 ||
      this.serviceConfig.timeout > 300000
    ) {
      errors.push('Timeout must be between 1 second and 5 minutes');
    }

    // Validate retry configuration
    if (
      this.serviceConfig.retryAttempts < 0 ||
      this.serviceConfig.retryAttempts > 10
    ) {
      errors.push('Retry attempts must be between 0 and 10');
    }

    return errors;
  }

  protected getCapabilities(): string[] {
    return [
      'api_integration',
      'http_requests',
      'rest_apis',
      'authentication',
      'rate_limiting',
      'retry_logic',
      'response_formatting',
      'error_handling',
    ];
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // Perform a simple health check request
      const response = await this.httpClient.get('/health', {
        timeout: 5000,
        validateStatus: () => true, // Accept any status for health check
      });

      return response.status < 500; // Consider 4xx as healthy (service is responding)
    } catch (error) {
      this.logWarning('ThirdPartyAgent health check failed', {
        agentId: this.config.id,
        error: error instanceof Error ? error.message : String(error),
        baseUrl: this.serviceConfig.baseUrl,
      });
      return false;
    }
  }

  protected async performCleanup(): Promise<void> {
    try {
      // No specific cleanup needed for HTTP client
      this.logInfo('ThirdPartyAgent cleanup completed', {
        agentId: this.config.id,
      });
    } catch (error) {
      this.logError('ThirdPartyAgent cleanup failed', error as Error, {
        agentId: this.config.id,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private parseServiceConfig(
    parameters: Record<string, any>,
  ): ThirdPartyServiceConfig {
    return {
      baseUrl: parameters.baseUrl || '',
      authMethod: parameters.authMethod || AuthenticationMethod.NONE,
      credentials: parameters.credentials || {},
      defaultHeaders: parameters.defaultHeaders || {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: parameters.timeout || 30000,
      retryAttempts: parameters.retryAttempts || 3,
      retryDelay: parameters.retryDelay || 1000,
      rateLimiting: parameters.rateLimiting,
    };
  }

  private createHttpClient(): AxiosInstance {
    const config: AxiosRequestConfig = {
      baseURL: this.serviceConfig.baseUrl,
      timeout: this.serviceConfig.timeout,
      headers: { ...this.serviceConfig.defaultHeaders },
    };

    // Configure authentication
    this.configureAuthentication(config);

    const client = axios.create(config);

    // Add request/response interceptors for logging
    client.interceptors.request.use(
      (config) => {
        this.logInfo('Making API request', {
          agentId: this.config.id,
          url: config.url,
          method: config.method?.toUpperCase(),
        });
        return config;
      },
      (error) => {
        this.logError('API request failed', error, {
          agentId: this.config.id,
        });
        return Promise.reject(error);
      },
    );

    client.interceptors.response.use(
      (response) => {
        this.logInfo('API response received', {
          agentId: this.config.id,
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        this.logError('API response error', error, {
          agentId: this.config.id,
          status: error.response?.status,
          url: error.config?.url,
        });
        return Promise.reject(error);
      },
    );

    return client;
  }

  private configureAuthentication(config: AxiosRequestConfig): void {
    const { authMethod, credentials } = this.serviceConfig;

    if (!credentials || authMethod === AuthenticationMethod.NONE) {
      return;
    }

    switch (authMethod) {
      case AuthenticationMethod.API_KEY:
        if (credentials.apiKey) {
          config.headers = {
            ...config.headers,
            'X-API-Key': credentials.apiKey,
          };
        }
        break;

      case AuthenticationMethod.BEARER_TOKEN:
        if (credentials.bearerToken) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${credentials.bearerToken}`,
          };
        }
        break;

      case AuthenticationMethod.BASIC_AUTH:
        if (credentials.username && credentials.password) {
          const auth = Buffer.from(
            `${credentials.username}:${credentials.password}`,
          ).toString('base64');
          config.headers = {
            ...config.headers,
            Authorization: `Basic ${auth}`,
          };
        }
        break;

      case AuthenticationMethod.CUSTOM_HEADER:
        if (credentials.customHeaders) {
          config.headers = {
            ...config.headers,
            ...credentials.customHeaders,
          };
        }
        break;
    }
  }

  private validateServiceConfig(): void {
    if (!this.serviceConfig?.baseUrl) {
      throw new AgentCreationError('Base URL is required');
    }

    try {
      new URL(this.serviceConfig?.baseUrl);
    } catch {
      throw new AgentCreationError('Invalid base URL format');
    }
  }

  private async testConnection(): Promise<void> {
    try {
      // Test with a simple request - this might fail but we're just testing connectivity
      await this.httpClient.head('/', {
        timeout: 5000,
        validateStatus: () => true,
      });
    } catch (error) {
      // Network errors are more concerning than HTTP errors
      if (
        error instanceof Error &&
        'code' in error &&
        (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')
      ) {
        throw new AgentCreationError(
          `Cannot connect to service: ${error.message}`,
        );
      }
      // Other errors might be expected (e.g., 404, authentication required)
    }
  }

  private parseRequestFromContext(
    context: AgentExecutionContext,
  ): ApiRequestConfig {
    // This is a simplified implementation
    // In practice, you might parse the query to extract endpoint, method, etc.
    // or use predefined request templates

    return {
      endpoint: '/', // Default endpoint
      method: 'GET', // Default method
      queryParams: {
        query: context.query,
        locale: context.locale,
      },
    };
  }

  private async executeRequestWithRetry(
    request: ApiRequestConfig,
  ): Promise<AxiosResponse> {
    let lastError: any;

    for (
      let attempt = 0;
      attempt <= this.serviceConfig.retryAttempts;
      attempt++
    ) {
      try {
        const response = await this.httpClient.request({
          url: request.endpoint,
          method: request.method,
          headers: request.headers,
          params: request.queryParams,
          data: request.body,
          timeout: request.timeout || this.serviceConfig.timeout,
        });

        return response;
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx) except for specific cases
        if (
          error &&
          typeof error === 'object' &&
          'response' in error &&
          error.response &&
          typeof error.response === 'object' &&
          'status' in error.response
        ) {
          const status = (error.response as any).status;
          if (status >= 400 && status < 500) {
            if (status !== 429) {
              // Retry on rate limiting
              break;
            }
          }
        }

        // Wait before retry
        if (attempt < this.serviceConfig.retryAttempts) {
          const delay = this.serviceConfig.retryDelay * Math.pow(2, attempt); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private formatApiResponse(
    response: AxiosResponse,
    request: ApiRequestConfig,
  ): string {
    let content = `## Third-Party Service Response\n\n`;

    content += `**Service:** ${this.serviceConfig.baseUrl}\n`;
    content += `**Endpoint:** ${request.method} ${request.endpoint}\n`;
    content += `**Status:** ${response.status} ${response.statusText}\n\n`;

    if (response.data) {
      content += `**Response Data:**\n`;

      if (typeof response.data === 'string') {
        content += '```\n' + response.data + '\n```\n\n';
      } else {
        content +=
          '```json\n' + JSON.stringify(response.data, null, 2) + '\n```\n\n';
      }
    }

    return content;
  }

  private calculateResponseConfidence(response: AxiosResponse): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on status code
    if (response.status >= 200 && response.status < 300) {
      confidence += 0.3;
    } else if (response.status >= 400 && response.status < 500) {
      confidence += 0.1; // Client errors still provide useful information
    }

    // Adjust based on response content
    if (response.data) {
      confidence += 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Static factory method for creating ThirdPartyAgent instances
   */
  public static async create(config: AgentConfig): Promise<ThirdPartyAgent> {
    const agent = new ThirdPartyAgent(config);
    await agent.initializeAgent();
    return agent;
  }

  /**
   * Get supported authentication methods
   */
  public static getSupportedAuthMethods(): AuthenticationMethod[] {
    return Object.values(AuthenticationMethod);
  }

  /**
   * Validate service configuration
   */
  public static validateServiceConfig(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!config.baseUrl) {
      errors.push('Base URL is required');
    }

    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push('Invalid base URL format');
      }
    }

    return errors;
  }
}
