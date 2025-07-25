/**
 * Health Check API Endpoint
 *
 * Provides comprehensive health monitoring for the Azure AI Agent system,
 * including agent pools, feature flags, and standard chat functionality.
 */
import { NextRequest, NextResponse } from 'next/server';

import { getAgentPoolingService } from '@/services/agentPoolingService';
import { getEnhancedChatService } from '@/services/enhancedChatService';
import { AzureMonitorLoggingService } from '@/services/loggingService';
import { getFeatureFlagService } from '@/services/simpleFeatureFlags';

/**
 * Health status types
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Component health check result
 */
interface ComponentHealth {
  status: HealthStatus;
  details?: any;
  responseTime?: number;
  lastChecked: string;
  error?: string;
}

/**
 * Overall health check response
 */
interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  components: {
    enhancedChatService?: ComponentHealth;
    featureFlags?: ComponentHealth;
    agentPooling?: ComponentHealth;
    azureMonitor?: ComponentHealth;
    standardChat?: ComponentHealth;
  };
  metrics?: {
    totalRequests?: number;
    agentUsagePercentage?: number;
    fallbackRate?: number;
    averageResponseTime?: number;
  };
}

/**
 * Check component health with timeout
 */
async function checkComponentHealth<T>(
  checkFunction: () => Promise<T>,
  componentName: string,
  timeout: number = 5000,
): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeout);
    });

    // Race the health check against timeout
    const result = await Promise.race([checkFunction(), timeoutPromise]);

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      details: result,
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      status: responseTime > timeout ? 'degraded' : 'unhealthy',
      responseTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * GET /api/health - Comprehensive health check
 */
export async function GET(
  req: NextRequest,
): Promise<NextResponse<HealthCheckResponse>> {
  const startTime = Date.now();
  const includeDetails = req.nextUrl.searchParams.get('details') === 'true';

  try {
    console.log('[INFO] Starting health check');

    // Check all components in parallel
    const [
      enhancedChatHealth,
      featureFlagsHealth,
      agentPoolingHealth,
      azureMonitorHealth,
      standardChatHealth,
    ] = await Promise.allSettled([
      // Enhanced Chat Service Health
      checkComponentHealth(async () => {
        try {
          const service = getEnhancedChatService();
          const health = await service.getHealth();
          return health;
        } catch (error) {
          return { status: 'unavailable', error: String(error) };
        }
      }, 'enhancedChatService'),

      // Feature Flags Health
      checkComponentHealth(async () => {
        try {
          const service = getFeatureFlagService();
          const health = service.getHealthStatus();
          return health;
        } catch (error) {
          return { status: 'unavailable', error: String(error) };
        }
      }, 'featureFlags'),

      // Agent Pooling Health
      checkComponentHealth(async () => {
        try {
          const service = getAgentPoolingService();
          const stats = service.getPoolStats();
          return {
            status: stats.totalAgents > 0 ? 'healthy' : 'degraded',
            poolStats: stats,
          };
        } catch (error) {
          return { status: 'unavailable', error: String(error) };
        }
      }, 'agentPooling'),

      // Azure Monitor Health
      checkComponentHealth(async () => {
        try {
          const service = AzureMonitorLoggingService.getInstance();
          if (service) {
            const healthStatus = service.getHealthStatus();
            return healthStatus;
          } else {
            return {
              status: 'degraded',
              isConfigured: false,
              error: 'Azure Monitor not configured',
            };
          }
        } catch (error) {
          return { status: 'degraded', error: String(error) };
        }
      }, 'azureMonitor'),

      // Standard Chat Health (basic connectivity test)
      checkComponentHealth(async () => {
        try {
          // Basic test - ensure we can create chat service instance
          const ChatService = (await import('@/services/chatService')).default;
          const service = new ChatService();
          return { status: 'healthy', type: 'standard' };
        } catch (error) {
          return { status: 'unhealthy', error: String(error) };
        }
      }, 'standardChat'),
    ]);

    // Process results
    const components: HealthCheckResponse['components'] = {};

    if (enhancedChatHealth.status === 'fulfilled') {
      components.enhancedChatService = enhancedChatHealth.value;
    } else {
      components.enhancedChatService = {
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        error: enhancedChatHealth.reason?.message || 'Health check failed',
      };
    }

    if (featureFlagsHealth.status === 'fulfilled') {
      components.featureFlags = featureFlagsHealth.value;
    } else {
      components.featureFlags = {
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        error: featureFlagsHealth.reason?.message || 'Health check failed',
      };
    }

    if (agentPoolingHealth.status === 'fulfilled') {
      components.agentPooling = agentPoolingHealth.value;
    } else {
      components.agentPooling = {
        status: 'degraded', // Agent pooling is optional
        lastChecked: new Date().toISOString(),
        error:
          agentPoolingHealth.reason?.message || 'Agent pooling unavailable',
      };
    }

    if (azureMonitorHealth.status === 'fulfilled') {
      components.azureMonitor = azureMonitorHealth.value;
    } else {
      components.azureMonitor = {
        status: 'degraded',
        lastChecked: new Date().toISOString(),
        error: azureMonitorHealth.reason?.message || 'Monitoring degraded',
      };
    }

    if (standardChatHealth.status === 'fulfilled') {
      components.standardChat = standardChatHealth.value;
    } else {
      components.standardChat = {
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        error:
          standardChatHealth.reason?.message || 'Standard chat unavailable',
      };
    }

    // Determine overall health status
    let overallStatus: HealthStatus = 'healthy';
    const componentStatuses = Object.values(components).map((c) => c.status);

    if (componentStatuses.includes('unhealthy')) {
      // Critical components are unhealthy
      const criticalUnhealthy = [
        components.standardChat?.status === 'unhealthy',
        components.enhancedChatService?.status === 'unhealthy' &&
          components.featureFlags?.status === 'unhealthy',
      ].some(Boolean);

      if (criticalUnhealthy) {
        overallStatus = 'unhealthy';
      } else {
        overallStatus = 'degraded';
      }
    } else if (componentStatuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    // Get metrics if enhanced service is available
    let metrics: HealthCheckResponse['metrics'] | undefined;
    if (components.enhancedChatService?.status === 'healthy') {
      try {
        const service = getEnhancedChatService();
        metrics = service.getMetrics();
      } catch (error) {
        console.warn('[WARN] Failed to get enhanced service metrics:', error);
      }
    }

    // Build response
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      components: includeDetails
        ? components
        : {
            enhancedChatService: {
              status: components.enhancedChatService?.status || 'unknown',
              lastChecked: new Date().toISOString(),
            },
            featureFlags: {
              status: components.featureFlags?.status || 'unknown',
              lastChecked: new Date().toISOString(),
            },
            agentPooling: {
              status: components.agentPooling?.status || 'unknown',
              lastChecked: new Date().toISOString(),
            },
            azureMonitor: {
              status: components.azureMonitor?.status || 'unknown',
              lastChecked: new Date().toISOString(),
            },
            standardChat: {
              status: components.standardChat?.status || 'unknown',
              lastChecked: new Date().toISOString(),
            },
          },
      ...(metrics && { metrics }),
    };

    // Set appropriate HTTP status code
    let httpStatus = 200;
    if (overallStatus === 'degraded') {
      httpStatus = 200; // Still operational
    } else if (overallStatus === 'unhealthy') {
      httpStatus = 503; // Service unavailable
    }

    console.log(
      `[INFO] Health check completed in ${
        Date.now() - startTime
      }ms, status: ${overallStatus}`,
    );

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    console.error('[ERROR] Health check failed:', error);

    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      components: {
        enhancedChatService: {
          status: 'unhealthy',
          lastChecked: new Date().toISOString(),
          error: 'Health check system failure',
        },
      },
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

/**
 * POST /api/health - Trigger manual health check
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Manual health check triggered',
    timestamp: new Date().toISOString(),
    redirect: '/api/health?details=true',
  });
}

/**
 * OPTIONS /api/health - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
