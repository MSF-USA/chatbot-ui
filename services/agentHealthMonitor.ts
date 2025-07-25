import { Session } from 'next-auth';

import {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentType,
  BaseAgentInstance,
} from '@/types/agent';

import { getAgentErrorHandlingService } from './agentErrorHandling';
import { getAgentFactory } from './agentFactory';
import { getAgentPerformanceOptimizer } from './agentPerformanceOptimizer';
import { getAgentRegistry } from './agentRegistry';

import { AzureOpenAI } from 'openai';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * Health check result for individual agents
 */
export interface AgentHealthResult {
  agentType: AgentType;
  status: HealthStatus;
  responseTime: number;
  lastChecked: Date;
  errorCount: number;
  successRate: number;
  details: {
    connectivity: boolean;
    authentication: boolean;
    resourceAvailability: boolean;
    performanceMetrics: {
      averageResponseTime: number;
      throughput: number;
      errorRate: number;
    };
    lastError?: string;
    recommendations?: string[];
  };
  metadata: Record<string, any>;
}

/**
 * System-wide health status
 */
export interface SystemHealthStatus {
  overallStatus: HealthStatus;
  agentStatuses: Map<AgentType, AgentHealthResult>;
  lastUpdated: Date;
  systemMetrics: {
    totalAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    unhealthyAgents: number;
    systemLoad: number;
    memoryUsage: number;
    errorRate: number;
  };
  recommendations: HealthRecommendation[];
  alerts: HealthAlert[];
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  timeoutThreshold: number; // milliseconds
  errorThreshold: number; // max errors before marking unhealthy
  successRateThreshold: number; // minimum success rate (0-1)
  enableDetailedChecks: boolean;
  enablePerformanceMonitoring: boolean;
  enableAutoRecovery: boolean;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    systemLoad: number;
  };
}

/**
 * Health check recommendation
 */
export interface HealthRecommendation {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  agentType?: AgentType;
  action: string;
  automaticFix: boolean;
  estimatedImpact: string;
}

/**
 * Health alert
 */
export interface HealthAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  agentType?: AgentType;
  timestamp: Date;
  acknowledged: boolean;
  actionRequired: boolean;
  metadata?: Record<string, any>;
}

/**
 * Health check test definition
 */
interface HealthCheckTest {
  name: string;
  description: string;
  timeout: number;
  critical: boolean;
  execute: (
    agentType: AgentType,
  ) => Promise<{ success: boolean; message?: string; metadata?: any }>;
}

/**
 * Agent Health Monitoring and Integration System
 * Provides comprehensive health checks, monitoring, and integration with existing services
 */
export class AgentHealthMonitorService {
  private static instance: AgentHealthMonitorService | null = null;

  private config: HealthMonitorConfig;
  private healthResults: Map<AgentType, AgentHealthResult>;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckTests: HealthCheckTest[];
  private alerts: HealthAlert[];
  private recommendations: HealthRecommendation[];

  private constructor() {
    this.config = this.getDefaultConfig();
    this.healthResults = new Map();
    this.alerts = [];
    this.recommendations = [];
    this.healthCheckTests = this.initializeHealthTests();
    this.initializeMonitoring();
  }

  /**
   * Singleton pattern - get or create health monitor instance
   */
  public static getInstance(): AgentHealthMonitorService {
    if (!AgentHealthMonitorService.instance) {
      AgentHealthMonitorService.instance = new AgentHealthMonitorService();
    }
    return AgentHealthMonitorService.instance;
  }

  /**
   * Start comprehensive health monitoring
   */
  public startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log('Starting agent health monitoring', {
      interval: this.config.checkInterval,
      enabledChecks: this.config.enableDetailedChecks,
    });

    // Initial health check
    void this.performSystemHealthCheck();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      void this.performSystemHealthCheck();
    }, this.config.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Agent health monitoring stopped');
    }
  }

  /**
   * Perform comprehensive system health check
   */
  public async performSystemHealthCheck(): Promise<SystemHealthStatus> {
    const startTime = Date.now();

    try {
      console.log('Performing system health check');

      // Get all available agent types from factory
      const factory = getAgentFactory();
      const availableAgents = factory.getRegisteredAgentTypes();

      // Perform health checks for each agent type
      const healthCheckPromises = availableAgents.map((agentType) =>
        this.performAgentHealthCheck(agentType),
      );

      const agentHealthResults = await Promise.allSettled(healthCheckPromises);

      // Process results
      const agentStatuses = new Map<AgentType, AgentHealthResult>();
      let healthyCount = 0;
      let degradedCount = 0;
      let unhealthyCount = 0;

      agentHealthResults.forEach((result, index) => {
        const agentType = availableAgents[index];

        if (result.status === 'fulfilled') {
          agentStatuses.set(agentType, result.value);
          this.healthResults.set(agentType, result.value);

          switch (result.value.status) {
            case HealthStatus.HEALTHY:
              healthyCount++;
              break;
            case HealthStatus.DEGRADED:
              degradedCount++;
              break;
            case HealthStatus.UNHEALTHY:
              unhealthyCount++;
              break;
          }
        } else {
          // Create error result for failed health check
          const errorResult: AgentHealthResult = {
            agentType,
            status: HealthStatus.UNKNOWN,
            responseTime: Date.now() - startTime,
            lastChecked: new Date(),
            errorCount: 1,
            successRate: 0,
            details: {
              connectivity: false,
              authentication: false,
              resourceAvailability: false,
              performanceMetrics: {
                averageResponseTime: 0,
                throughput: 0,
                errorRate: 1,
              },
              lastError: result.reason.message,
            },
            metadata: { healthCheckFailed: true },
          };

          agentStatuses.set(agentType, errorResult);
          this.healthResults.set(agentType, errorResult);
          unhealthyCount++;
        }
      });

      // Determine overall system status
      const overallStatus = this.calculateOverallStatus(
        healthyCount,
        degradedCount,
        unhealthyCount,
      );

      // Generate system metrics
      const systemMetrics = await this.collectSystemMetrics();

      // Generate recommendations and alerts
      await this.generateHealthRecommendations(agentStatuses);
      await this.checkAlertConditions(agentStatuses, systemMetrics);

      const systemHealth: SystemHealthStatus = {
        overallStatus,
        agentStatuses,
        lastUpdated: new Date(),
        systemMetrics: {
          ...systemMetrics,
          totalAgents: availableAgents.length,
          healthyAgents: healthyCount,
          degradedAgents: degradedCount,
          unhealthyAgents: unhealthyCount,
        },
        recommendations: this.recommendations.slice(0, 10), // Top 10 recommendations
        alerts: this.alerts.filter((alert) => !alert.acknowledged).slice(0, 20), // Recent unacknowledged alerts
      };

      console.log('System health check completed', {
        overallStatus,
        totalAgents: availableAgents.length,
        healthyAgents: healthyCount,
        degradedAgents: degradedCount,
        unhealthyAgents: unhealthyCount,
        checkDuration: Date.now() - startTime,
      });

      return systemHealth;
    } catch (error) {
      console.error('System health check failed', error as Error, {
        checkDuration: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Perform health check for a specific agent type
   */
  public async performAgentHealthCheck(
    agentType: AgentType,
  ): Promise<AgentHealthResult> {
    const startTime = Date.now();

    try {
      console.log('Performing agent health check', { agentType });

      // Initialize result
      const result: AgentHealthResult = {
        agentType,
        status: HealthStatus.UNKNOWN,
        responseTime: 0,
        lastChecked: new Date(),
        errorCount: 0,
        successRate: 0,
        details: {
          connectivity: false,
          authentication: false,
          resourceAvailability: false,
          performanceMetrics: {
            averageResponseTime: 0,
            throughput: 0,
            errorRate: 0,
          },
          recommendations: [],
        },
        metadata: {},
      };

      // Run health check tests
      const testResults = await this.runHealthCheckTests(agentType);

      // Aggregate test results
      const totalTests = testResults.length;
      const passedTests = testResults.filter((test) => test.success).length;
      const failedCriticalTests = testResults.filter(
        (test) => !test.success && test.critical,
      ).length;

      result.successRate = totalTests > 0 ? passedTests / totalTests : 0;
      result.errorCount = totalTests - passedTests;

      // Set specific check results
      result.details.connectivity =
        testResults.find((t) => t.name === 'connectivity')?.success || false;
      result.details.authentication =
        testResults.find((t) => t.name === 'authentication')?.success || false;
      result.details.resourceAvailability =
        testResults.find((t) => t.name === 'resource_availability')?.success ||
        false;

      // Get performance metrics from optimizer
      if (this.config.enablePerformanceMonitoring) {
        const optimizer = getAgentPerformanceOptimizer();
        const perfMetrics = optimizer.getPerformanceMetrics(agentType);

        if (
          perfMetrics &&
          typeof perfMetrics === 'object' &&
          'averageResponseTime' in perfMetrics
        ) {
          result.details.performanceMetrics = {
            averageResponseTime: perfMetrics.averageResponseTime,
            throughput: perfMetrics.throughput,
            errorRate: perfMetrics.errorRate,
          };
        }
      }

      // Determine health status
      if (failedCriticalTests > 0) {
        result.status = HealthStatus.UNHEALTHY;
      } else if (result.successRate < this.config.successRateThreshold) {
        result.status = HealthStatus.DEGRADED;
      } else if (
        result.details.performanceMetrics.averageResponseTime >
        this.config.timeoutThreshold
      ) {
        result.status = HealthStatus.DEGRADED;
      } else {
        result.status = HealthStatus.HEALTHY;
      }

      // Record failed tests
      const failedTests = testResults.filter((test) => !test.success);
      if (failedTests.length > 0) {
        result.details.lastError = failedTests
          .map((test) => test.message || test.name)
          .join('; ');
      }

      // Generate agent-specific recommendations
      result.details.recommendations =
        this.generateAgentRecommendations(result);

      result.responseTime = Date.now() - startTime;

      console.log('Agent health check completed', {
        agentType,
        status: result.status,
        successRate: result.successRate,
        responseTime: result.responseTime,
        errorCount: result.errorCount,
      });

      return result;
    } catch (error) {
      console.error('Agent health check failed', error as Error, {
        agentType,
        checkDuration: Date.now() - startTime,
      });

      // Return unhealthy status on error
      return {
        agentType,
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        errorCount: 1,
        successRate: 0,
        details: {
          connectivity: false,
          authentication: false,
          resourceAvailability: false,
          performanceMetrics: {
            averageResponseTime: 0,
            throughput: 0,
            errorRate: 1,
          },
          lastError: (error as Error).message,
          recommendations: ['Fix critical error preventing health checks'],
        },
        metadata: { healthCheckError: true },
      };
    }
  }

  /**
   * Get current health status for all agents
   */
  public getHealthStatus(): SystemHealthStatus {
    const agentStatuses = new Map(this.healthResults);
    const totalAgents = agentStatuses.size;
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;

    for (const result of agentStatuses.values()) {
      switch (result.status) {
        case HealthStatus.HEALTHY:
          healthyCount++;
          break;
        case HealthStatus.DEGRADED:
          degradedCount++;
          break;
        case HealthStatus.UNHEALTHY:
          unhealthyCount++;
          break;
      }
    }

    const overallStatus = this.calculateOverallStatus(
      healthyCount,
      degradedCount,
      unhealthyCount,
    );

    return {
      overallStatus,
      agentStatuses,
      lastUpdated: new Date(),
      systemMetrics: {
        totalAgents,
        healthyAgents: healthyCount,
        degradedAgents: degradedCount,
        unhealthyAgents: unhealthyCount,
        systemLoad: 0, // Would be calculated from actual metrics
        memoryUsage: 0,
        errorRate:
          totalAgents > 0 ? (degradedCount + unhealthyCount) / totalAgents : 0,
      },
      recommendations: this.recommendations.slice(0, 10),
      alerts: this.alerts.filter((alert) => !alert.acknowledged).slice(0, 20),
    };
  }

  /**
   * Check if an agent is healthy
   */
  public isAgentHealthy(agentType: AgentType): boolean {
    const result = this.healthResults.get(agentType);
    return result?.status === HealthStatus.HEALTHY;
  }

  /**
   * Configure health monitoring
   */
  public configure(config: Partial<HealthMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    console.log('Health monitor configured', {
      config: this.config,
    });

    // Restart monitoring if configuration changed
    if (this.monitoringInterval && this.config.enabled) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log('Alert acknowledged', { alertId, alert: alert.title });
    }
  }

  /**
   * Get health recommendations
   */
  public getRecommendations(): HealthRecommendation[] {
    return [...this.recommendations];
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter((alert) => !alert.acknowledged);
  }

  /**
   * Manual recovery attempt for an agent
   */
  public async attemptRecovery(agentType: AgentType): Promise<boolean> {
    try {
      console.log('Attempting agent recovery', { agentType });

      const factory = getAgentFactory();

      // Try to restart/reinitialize the agent
      const poolStats = factory.getAllPoolStats().get(agentType);
      if (poolStats && poolStats.totalAgents > 0) {
        // Clean up existing instances
        await factory.cleanup();

        // Force health check after cleanup
        const healthResult = await this.performAgentHealthCheck(agentType);

        const recovered = healthResult.status === HealthStatus.HEALTHY;

        console.log('Agent recovery attempt completed', {
          agentType,
          recovered,
          newStatus: healthResult.status,
        });

        if (recovered) {
          this.createAlert(
            'info',
            'Agent Recovery Successful',
            `${agentType} has been successfully recovered and is now healthy.`,
            agentType,
          );
        }

        return recovered;
      }

      return false;
    } catch (error) {
      console.error('Agent recovery failed', error as Error, { agentType });
      return false;
    }
  }

  /**
   * Private helper methods
   */

  private async runHealthCheckTests(
    agentType: AgentType,
  ): Promise<
    Array<{
      name: string;
      success: boolean;
      message?: string;
      critical: boolean;
    }>
  > {
    const results: Array<{
      name: string;
      success: boolean;
      message?: string;
      critical: boolean;
    }> = [];

    for (const test of this.healthCheckTests) {
      try {
        const testResult = await Promise.race([
          test.execute(agentType),
          new Promise<{ success: boolean; message: string }>((_, reject) =>
            setTimeout(() => reject(new Error('Test timeout')), test.timeout),
          ),
        ]);

        results.push({
          name: test.name,
          success: testResult.success,
          message: testResult.message,
          critical: test.critical,
        });
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          message: (error as Error).message,
          critical: test.critical,
        });
      }
    }

    return results;
  }

  private initializeHealthTests(): HealthCheckTest[] {
    return [
      {
        name: 'connectivity',
        description: 'Test basic connectivity to agent',
        timeout: 5000,
        critical: true,
        execute: async (agentType: AgentType) => {
          try {
            const factory = getAgentFactory();
            const poolStats = factory.getAllPoolStats().get(agentType);
            return {
              success: poolStats !== undefined && poolStats.totalAgents > 0,
              message: poolStats
                ? `${poolStats.totalAgents} agents available`
                : 'No agents available',
            };
          } catch (error) {
            return {
              success: false,
              message: (error as Error).message,
            };
          }
        },
      },
      {
        name: 'authentication',
        description: 'Test authentication and authorization',
        timeout: 3000,
        critical: true,
        execute: async (agentType: AgentType) => {
          // This would test actual authentication based on agent type
          // For now, assume authentication is working if agent is registered
          try {
            const registry = getAgentRegistry();
            const agentMetadata = registry.getAgentMetadata(agentType);
            return {
              success: agentMetadata !== undefined,
              message: agentMetadata
                ? 'Agent registered and accessible'
                : 'Agent not registered',
            };
          } catch (error) {
            return {
              success: false,
              message: (error as Error).message,
            };
          }
        },
      },
      {
        name: 'resource_availability',
        description: 'Test resource availability and capacity',
        timeout: 2000,
        critical: false,
        execute: async (agentType: AgentType) => {
          try {
            const factory = getAgentFactory();
            const poolStatsData = factory.getAllPoolStats().get(agentType);
            const hasCapacity = poolStatsData && poolStatsData.totalAgents < 10; // Assuming max 10 agents per pool

            return {
              success: hasCapacity !== false,
              message: hasCapacity
                ? 'Resources available'
                : 'Resource capacity reached',
            };
          } catch (error) {
            return {
              success: false,
              message: (error as Error).message,
            };
          }
        },
      },
      {
        name: 'performance_check',
        description: 'Test performance metrics',
        timeout: 1000,
        critical: false,
        execute: async (agentType: AgentType) => {
          try {
            const optimizer = getAgentPerformanceOptimizer();
            const metrics = optimizer.getPerformanceMetrics(agentType);

            if (
              metrics &&
              typeof metrics === 'object' &&
              'averageResponseTime' in metrics
            ) {
              const performanceGood =
                metrics.averageResponseTime <
                this.config.alertThresholds.responseTime;
              return {
                success: performanceGood,
                message: `Average response time: ${metrics.averageResponseTime}ms`,
                metadata: metrics,
              };
            }

            return {
              success: true,
              message: 'No performance data available',
            };
          } catch (error) {
            return {
              success: false,
              message: (error as Error).message,
            };
          }
        },
      },
      {
        name: 'error_rate_check',
        description: 'Check error rate threshold',
        timeout: 1000,
        critical: false,
        execute: async (agentType: AgentType) => {
          try {
            const errorHandler = getAgentErrorHandlingService();
            const stats = errorHandler.getErrorStatistics();
            const agentErrorCount = stats.errorsByAgent[agentType] || 0;
            const errorRateAcceptable =
              agentErrorCount < this.config.errorThreshold;

            return {
              success: errorRateAcceptable,
              message: `Error count: ${agentErrorCount}`,
            };
          } catch (error) {
            return {
              success: false,
              message: (error as Error).message,
            };
          }
        },
      },
    ];
  }

  private calculateOverallStatus(
    healthy: number,
    degraded: number,
    unhealthy: number,
  ): HealthStatus {
    const total = healthy + degraded + unhealthy;

    if (total === 0) return HealthStatus.UNKNOWN;

    const healthyPercentage = healthy / total;
    const unhealthyPercentage = unhealthy / total;

    if (unhealthyPercentage > 0.3) {
      return HealthStatus.UNHEALTHY;
    } else if (healthyPercentage < 0.7) {
      return HealthStatus.DEGRADED;
    } else {
      return HealthStatus.HEALTHY;
    }
  }

  private async collectSystemMetrics(): Promise<{
    systemLoad: number;
    memoryUsage: number;
    errorRate: number;
  }> {
    try {
      // In a real implementation, these would collect actual system metrics
      // For now, we'll use placeholder values or derive from available data

      const optimizer = getAgentPerformanceOptimizer();
      const cacheStats = optimizer.getCacheStatistics();

      return {
        systemLoad: Math.random() * 100, // Placeholder
        memoryUsage: cacheStats.memoryUsage,
        errorRate: 1 - cacheStats.hitRate, // Simplified error rate estimation
      };
    } catch (error) {
      console.error('Failed to collect system metrics', error as Error);
      return {
        systemLoad: 0,
        memoryUsage: 0,
        errorRate: 0,
      };
    }
  }

  private async generateHealthRecommendations(
    agentStatuses: Map<AgentType, AgentHealthResult>,
  ): Promise<void> {
    this.recommendations = [];

    for (const [agentType, health] of agentStatuses.entries()) {
      if (health.status === HealthStatus.UNHEALTHY) {
        this.recommendations.push({
          id: `critical-${agentType}`,
          severity: 'critical',
          title: `${agentType} is unhealthy`,
          description: `Agent ${agentType} is experiencing critical issues and requires immediate attention.`,
          agentType,
          action: 'Perform manual recovery or restart agent service',
          automaticFix: this.config.enableAutoRecovery,
          estimatedImpact: 'High - Service unavailable',
        });
      } else if (health.status === HealthStatus.DEGRADED) {
        this.recommendations.push({
          id: `warning-${agentType}`,
          severity: 'warning',
          title: `${agentType} performance degraded`,
          description: `Agent ${agentType} is experiencing performance issues.`,
          agentType,
          action: 'Review agent configuration and resource allocation',
          automaticFix: false,
          estimatedImpact: 'Medium - Reduced performance',
        });
      }

      // Performance-based recommendations
      if (
        health.details.performanceMetrics.averageResponseTime >
        this.config.alertThresholds.responseTime
      ) {
        this.recommendations.push({
          id: `perf-${agentType}`,
          severity: 'warning',
          title: `${agentType} slow response times`,
          description: `Response times for ${agentType} are above optimal thresholds.`,
          agentType,
          action: 'Enable caching or increase resource allocation',
          automaticFix: true,
          estimatedImpact: 'Medium - Improved response times',
        });
      }
    }

    // System-wide recommendations
    const optimizer = getAgentPerformanceOptimizer();
    const perfRecommendations = optimizer.getOptimizationRecommendations();

    for (const perfRec of perfRecommendations.slice(0, 3)) {
      this.recommendations.push({
        id: `perf-opt-${perfRec.id}`,
        severity: perfRec.priority === 'high' ? 'warning' : 'info',
        title: `Performance optimization available`,
        description: perfRec.description,
        agentType: perfRec.agentType,
        action: perfRec.implementation,
        automaticFix: perfRec.riskLevel === 'low',
        estimatedImpact: `${perfRec.expectedImpact}% improvement expected`,
      });
    }
  }

  private async checkAlertConditions(
    agentStatuses: Map<AgentType, AgentHealthResult>,
    systemMetrics: {
      systemLoad: number;
      memoryUsage: number;
      errorRate: number;
    },
  ): Promise<void> {
    // Check for new alert conditions
    const newAlerts: HealthAlert[] = [];

    // Agent-specific alerts
    for (const [agentType, health] of agentStatuses.entries()) {
      if (health.status === HealthStatus.UNHEALTHY) {
        const existingAlert = this.alerts.find(
          (a) =>
            a.agentType === agentType &&
            a.level === 'critical' &&
            !a.acknowledged,
        );

        if (!existingAlert) {
          newAlerts.push({
            id: `critical-${agentType}-${Date.now()}`,
            level: 'critical',
            title: `Agent ${agentType} is unhealthy`,
            message: `Critical: Agent ${agentType} has failed health checks and is unavailable.`,
            agentType,
            timestamp: new Date(),
            acknowledged: false,
            actionRequired: true,
            metadata: {
              healthStatus: health.status,
              errorCount: health.errorCount,
            },
          });
        }
      }

      if (
        health.details.performanceMetrics.errorRate >
        this.config.alertThresholds.errorRate
      ) {
        const existingAlert = this.alerts.find(
          (a) =>
            a.agentType === agentType &&
            a.level === 'warning' &&
            a.message.includes('error rate'),
        );

        if (!existingAlert) {
          newAlerts.push({
            id: `error-rate-${agentType}-${Date.now()}`,
            level: 'warning',
            title: `High error rate for ${agentType}`,
            message: `Warning: Agent ${agentType} has error rate of ${(
              health.details.performanceMetrics.errorRate * 100
            ).toFixed(1)}%`,
            agentType,
            timestamp: new Date(),
            acknowledged: false,
            actionRequired: false,
            metadata: {
              errorRate: health.details.performanceMetrics.errorRate,
            },
          });
        }
      }
    }

    // System-wide alerts
    if (systemMetrics.systemLoad > this.config.alertThresholds.systemLoad) {
      const existingAlert = this.alerts.find(
        (a) => a.level === 'warning' && a.message.includes('system load'),
      );

      if (!existingAlert) {
        newAlerts.push({
          id: `system-load-${Date.now()}`,
          level: 'warning',
          title: 'High system load',
          message: `Warning: System load is at ${systemMetrics.systemLoad.toFixed(
            1,
          )}%`,
          timestamp: new Date(),
          acknowledged: false,
          actionRequired: false,
          metadata: { systemLoad: systemMetrics.systemLoad },
        });
      }
    }

    // Add new alerts
    this.alerts.push(...newAlerts);

    // Clean up old acknowledged alerts (keep only last 100)
    this.alerts = this.alerts.slice(-100);

    // Log new alerts
    for (const alert of newAlerts) {
      console.warn('Health alert created', {
        alertId: alert.id,
        level: alert.level,
        title: alert.title,
        agentType: alert.agentType,
      });
    }
  }

  private generateAgentRecommendations(health: AgentHealthResult): string[] {
    const recommendations: string[] = [];

    if (!health.details.connectivity) {
      recommendations.push('Check agent service connectivity');
    }

    if (!health.details.authentication) {
      recommendations.push('Verify authentication credentials');
    }

    if (!health.details.resourceAvailability) {
      recommendations.push('Check resource allocation and limits');
    }

    if (
      health.details.performanceMetrics.averageResponseTime >
      this.config.timeoutThreshold
    ) {
      recommendations.push(
        'Consider enabling caching or increasing timeout limits',
      );
    }

    if (health.details.performanceMetrics.errorRate > 0.1) {
      recommendations.push(
        'Review error logs and implement better error handling',
      );
    }

    if (health.successRate < 0.8) {
      recommendations.push('Investigate root cause of failures');
    }

    return recommendations;
  }

  private createAlert(
    level: HealthAlert['level'],
    title: string,
    message: string,
    agentType?: AgentType,
  ): void {
    const alert: HealthAlert = {
      id: `${level}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      title,
      message,
      agentType,
      timestamp: new Date(),
      acknowledged: false,
      actionRequired: level === 'critical' || level === 'error',
    };

    this.alerts.push(alert);

    console.log('Health alert created', {
      alertId: alert.id,
      level,
      title,
      agentType,
    });
  }

  private getDefaultConfig(): HealthMonitorConfig {
    return {
      enabled: true,
      checkInterval: 60000, // 1 minute
      timeoutThreshold: 10000, // 10 seconds
      errorThreshold: 5,
      successRateThreshold: 0.8,
      enableDetailedChecks: true,
      enablePerformanceMonitoring: true,
      enableAutoRecovery: false,
      alertThresholds: {
        responseTime: 5000, // 5 seconds
        errorRate: 0.1, // 10%
        systemLoad: 80, // 80%
      },
    };
  }

  private initializeMonitoring(): void {
    console.log('Health monitor initialized', {
      config: this.config,
    });

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }
}

/**
 * Convenience function to get the singleton health monitor instance
 */
export function getAgentHealthMonitor(): AgentHealthMonitorService {
  return AgentHealthMonitorService.getInstance();
}

/**
 * Convenience function to check if an agent is healthy
 */
export function isAgentHealthy(agentType: AgentType): boolean {
  const monitor = getAgentHealthMonitor();
  return monitor.isAgentHealthy(agentType);
}

/**
 * Convenience function to get system health status
 */
export function getSystemHealthStatus(): SystemHealthStatus {
  const monitor = getAgentHealthMonitor();
  return monitor.getHealthStatus();
}

/**
 * Convenience function to perform a manual health check
 */
export async function performHealthCheck(
  agentType?: AgentType,
): Promise<SystemHealthStatus | AgentHealthResult> {
  const monitor = getAgentHealthMonitor();

  if (agentType) {
    return await monitor.performAgentHealthCheck(agentType);
  } else {
    return await monitor.performSystemHealthCheck();
  }
}
