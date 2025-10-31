/**
 * Shared backend services.
 *
 * These services encapsulate common logic used across specialized chat services:
 * - ModelSelector: Model selection, validation, and automatic upgrades
 * - ToneService: Tone application to system prompts
 * - StreamingService: Streaming and temperature configuration
 * - ChatLogger: Logging wrapper (alias for AzureMonitorLoggingService)
 *
 * All shared services are designed for dependency injection and easy testing.
 */

export { ModelSelector } from './ModelSelector';
export { ToneService } from './ToneService';
export { StreamingService } from './StreamingService';

// Re-export logging service as ChatLogger for clarity
export { AzureMonitorLoggingService as ChatLogger } from '../loggingService';
export type { AzureMonitorLoggingService } from '../loggingService';
