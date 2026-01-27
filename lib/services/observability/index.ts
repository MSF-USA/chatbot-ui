/**
 * Observability Services
 *
 * Centralized exports for all observability-related services including
 * OpenTelemetry metrics and Azure Monitor log ingestion.
 *
 * Also re-exports utility functions from `@/lib/utils/server/observability`
 * for convenient single-import usage in API routes.
 */

export { MetricsService } from './MetricsService';
export {
  AzureMonitorLoggingService,
  getAzureMonitorLogger,
} from './AzureMonitorLoggingService';

// Re-export utilities for convenient single-import usage
export {
  createApiLoggingContext,
  createTimer,
  getErrorDetails,
  getErrorMessage,
  withTiming,
} from '@/lib/utils/server/observability';
export type {
  ApiLoggingContext,
  ErrorDetails,
  TimedResult,
  Timer,
} from '@/lib/utils/server/observability';
