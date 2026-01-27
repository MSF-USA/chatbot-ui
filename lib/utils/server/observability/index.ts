/**
 * Server Observability Utilities
 *
 * Utilities to reduce boilerplate in API route handlers when working with
 * the Azure Monitor logging service. These utilities are complements to
 * the main logging service, not replacements.
 *
 * @example
 * ```typescript
 * import { createApiLoggingContext } from '@/lib/utils/server/observability';
 *
 * export async function POST(req: NextRequest) {
 *   const ctx = createApiLoggingContext();
 *   // ... use ctx.logger, ctx.timer.elapsed(), ctx.getErrorMessage(error), etc.
 * }
 * ```
 */

export { createTimer, withTiming } from './timing';
export type { Timer, TimedResult } from './timing';

export { getErrorDetails, getErrorMessage } from './errorUtils';
export type { ErrorDetails } from './errorUtils';

export { createApiLoggingContext } from './apiLoggingContext';
export type { ApiLoggingContext } from './apiLoggingContext';
