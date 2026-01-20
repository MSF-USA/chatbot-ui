/**
 * Health Check Module
 *
 * Exports the health check service and types for monitoring Azure service dependencies.
 */

export { HealthCheckService } from './healthCheckService';
export type {
  CheckLevel,
  CheckStatus,
  HealthCheckConfig,
  HealthCheckResult,
  HealthStatus,
  ServiceCheck,
  ServiceName,
} from './types';
