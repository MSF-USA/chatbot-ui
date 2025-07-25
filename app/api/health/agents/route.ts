/**
 * Agent Health Check API Endpoint
 *
 * Provides detailed health monitoring specifically for the Azure AI Agent system,
 * including individual agent health, pool statistics, and performance metrics.
 */
import { NextRequest, NextResponse } from 'next/server';

import { AgentFactory } from '@/services/agentFactory';
import { getAgentPoolingService } from '@/services/agentPoolingService';
import { AzureMonitorLoggingService } from '@/services/loggingService';

import { AgentHealthResult, AgentType } from '@/types/agent';

/**
 * Agent-specific health response
 */
interface AgentHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  agentFactory: {
    status: string;
    registeredAgents: AgentType[];
    lastChecked: string;
  };
  agentPooling?: {
    status: string;
    poolStats: any;
    lastChecked: string;
  };
  agentHealth: Record<
    AgentType,
    {
      status: string;
      details: AgentHealthResult[];
      lastChecked: string;
      error?: string;
    }
  >;
  metrics: {
    totalAgents: number;
    activeAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    unhealthyAgents: number;
  };
}

/**
 * GET /api/health/agents - Detailed agent health check
 */
export async function GET(
  req: NextRequest,
): Promise<NextResponse<AgentHealthResponse>> {
  const startTime = Date.now();
  const logger = AzureMonitorLoggingService.getInstance();

  try {
    console.log('[INFO] Starting agent health check');

    // Initialize response structure
    const response: AgentHealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      agentFactory: {
        status: 'unknown',
        registeredAgents: [],
        lastChecked: new Date().toISOString(),
      },
      agentHealth: {} as Record<AgentType, any>,
      metrics: {
        totalAgents: 0,
        activeAgents: 0,
        healthyAgents: 0,
        degradedAgents: 0,
        unhealthyAgents: 0,
      },
    };

    // Check Agent Factory
    try {
      const agentFactory = AgentFactory.getInstance();

      // Get registered agent types (these are hardcoded for now since we don't have a discovery method)
      const agentTypes: AgentType[] = [
        AgentType.WEB_SEARCH,
        AgentType.CODE_INTERPRETER,
        AgentType.LOCAL_KNOWLEDGE,
      ];

      response.agentFactory = {
        status: 'healthy',
        registeredAgents: agentTypes,
        lastChecked: new Date().toISOString(),
      };

      console.log('[INFO] Agent factory health check passed');
    } catch (error) {
      console.error('[ERROR] Agent factory health check failed:', error);
      response.agentFactory = {
        status: 'unhealthy',
        registeredAgents: [],
        lastChecked: new Date().toISOString(),
      };
      response.status = 'unhealthy';
    }

    // Check Agent Pooling Service
    try {
      const poolingService = getAgentPoolingService();
      const poolStats = poolingService.getPoolStats();

      response.agentPooling = {
        status: poolStats.totalAgents > 0 ? 'healthy' : 'degraded',
        poolStats,
        lastChecked: new Date().toISOString(),
      };

      // Update metrics from pool stats
      response.metrics.totalAgents = poolStats.totalAgents;
      response.metrics.activeAgents = poolStats.activeAgents;

      console.log('[INFO] Agent pooling health check passed');
    } catch (error) {
      console.warn('[WARN] Agent pooling service not available:', error);
      response.agentPooling = {
        status: 'unavailable',
        poolStats: null,
        lastChecked: new Date().toISOString(),
      };
    }

    // Check Individual Agent Health
    const agentTypes: AgentType[] = [
      AgentType.WEB_SEARCH,
      AgentType.CODE_INTERPRETER,
      AgentType.LOCAL_KNOWLEDGE,
    ];

    for (const agentType of agentTypes) {
      try {
        let agentHealthResults: AgentHealthResult[] = [];

        if (response.agentPooling?.status === 'healthy') {
          // Get health from pooling service
          const poolingService = getAgentPoolingService();
          const healthResults = await poolingService.performHealthCheck();
          agentHealthResults = healthResults[agentType] || [];
        } else {
          // Agent pooling not available, provide basic status
          agentHealthResults = [
            {
              agentId: `basic-${agentType}`,
              healthy: false,
              timestamp: new Date(),
              responseTime: 0,
              error:
                'Agent pooling service not available - basic health check only',
            },
          ];
        }

        // Analyze agent health results
        const healthyCount = agentHealthResults.filter(
          (r) => r.healthy === true,
        ).length;
        const unhealthyCount = agentHealthResults.filter(
          (r) => r.healthy === false,
        ).length;

        let agentStatus = 'healthy';
        if (unhealthyCount > 0 && healthyCount === 0) {
          agentStatus = 'unhealthy';
        } else if (unhealthyCount > 0) {
          agentStatus = 'degraded';
        }

        response.agentHealth[agentType] = {
          status: agentStatus,
          details: agentHealthResults,
          lastChecked: new Date().toISOString(),
        };

        // Update overall metrics
        response.metrics.healthyAgents += healthyCount;
        response.metrics.degradedAgents += 0; // Simplified - not tracking degraded separately
        response.metrics.unhealthyAgents += unhealthyCount;

        console.log(
          `[INFO] Agent ${agentType} health check completed: ${agentStatus}`,
        );
      } catch (error) {
        console.error(
          `[ERROR] Failed to check health for agent ${agentType}:`,
          error,
        );

        response.agentHealth[agentType] = {
          status: 'unhealthy',
          details: [],
          lastChecked: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        };

        response.metrics.unhealthyAgents += 1;
      }
    }

    // Determine overall status
    const agentStatuses = Object.values(response.agentHealth).map(
      (h) => h.status,
    );

    if (response.agentFactory.status === 'unhealthy') {
      response.status = 'unhealthy';
    } else if (agentStatuses.includes('unhealthy')) {
      response.status = agentStatuses.every((s) => s === 'unhealthy')
        ? 'unhealthy'
        : 'degraded';
    } else if (
      agentStatuses.includes('degraded') ||
      response.agentPooling?.status === 'degraded'
    ) {
      response.status = 'degraded';
    }

    // Log health check results
    // Logging simplified for build compatibility
    console.log('Agent health check completed:', {
      eventName: 'AgentHealthCheckCompleted',
      properties: {
        overallStatus: response.status,
        totalAgents: response.metrics.totalAgents,
        healthyAgents: response.metrics.healthyAgents,
        degradedAgents: response.metrics.degradedAgents,
        unhealthyAgents: response.metrics.unhealthyAgents,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    });

    // Set appropriate HTTP status
    let httpStatus = 200;
    if (response.status === 'degraded') {
      httpStatus = 200; // Still operational
    } else if (response.status === 'unhealthy') {
      httpStatus = 503; // Service unavailable
    }

    console.log(
      `[INFO] Agent health check completed in ${
        Date.now() - startTime
      }ms, status: ${response.status}`,
    );

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    console.error('[ERROR] Agent health check failed:', error);

    // Error logging simplified for build compatibility
    console.error('Agent health check failed with error:', {
      error: error instanceof Error ? error.message : String(error),
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    const errorResponse: AgentHealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      agentFactory: {
        status: 'unknown',
        registeredAgents: [],
        lastChecked: new Date().toISOString(),
      },
      agentHealth: {} as any,
      metrics: {
        totalAgents: 0,
        activeAgents: 0,
        healthyAgents: 0,
        degradedAgents: 0,
        unhealthyAgents: 0,
      },
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

/**
 * POST /api/health/agents - Force agent health refresh
 */
export async function POST(): Promise<NextResponse> {
  try {
    // Trigger agent pool health check if available
    try {
      const poolingService = getAgentPoolingService();
      await poolingService.performHealthCheck();
    } catch (error) {
      console.warn('[WARN] Could not refresh agent pool health:', error);
    }

    return NextResponse.json({
      message: 'Agent health check refresh triggered',
      timestamp: new Date().toISOString(),
      redirect: '/api/health/agents',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to refresh agent health',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/health/agents - CORS preflight
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
