/**
 * API Logging Context
 *
 * Provides a combined context object for API route handlers that bundles
 * session tracking, logger instance, timing, and error utilities. Reduces
 * boilerplate at logging call sites while maintaining full flexibility.
 */
import { Session } from 'next-auth';

import {
  AzureMonitorLoggingService,
  getAzureMonitorLogger,
} from '@/lib/services/observability/AzureMonitorLoggingService';

import { getErrorDetails, getErrorMessage } from './errorUtils';
import { Timer, createTimer } from './timing';

/**
 * Combined context for API route logging.
 *
 * Provides convenient access to session, logger, timer, and error utilities
 * in a single object that can be created at the start of a route handler.
 */
export interface ApiLoggingContext {
  /**
   * The NextAuth session. Set this after calling `auth()`.
   * Initialize as `null` and assign after authentication check.
   */
  session: Session | null;

  /**
   * Convenience getter for `session?.user`.
   * Returns undefined if session is null or has no user.
   */
  readonly user: Session['user'] | undefined;

  /** The Azure Monitor logging service instance */
  readonly logger: AzureMonitorLoggingService;

  /** Timer started when the context was created */
  readonly timer: Timer;

  /**
   * Extracts an error message from an unknown error value.
   * @see getErrorMessage
   */
  readonly getErrorMessage: typeof getErrorMessage;

  /**
   * Extracts detailed error information including stack trace.
   * @see getErrorDetails
   */
  readonly getErrorDetails: typeof getErrorDetails;
}

/**
 * Creates a logging context for an API route handler.
 *
 * The returned context provides:
 * - `session`: Mutable field to store the authenticated session
 * - `user`: Getter that returns `session?.user`
 * - `logger`: The Azure Monitor logging service singleton
 * - `timer`: A timer started at context creation
 * - `getErrorMessage`: Utility to extract error messages
 * - `getErrorDetails`: Utility to extract error details with stack trace
 *
 * @returns An ApiLoggingContext instance
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const ctx = createApiLoggingContext();
 *
 *   try {
 *     ctx.session = await auth();
 *     if (!ctx.user) return unauthorizedResponse();
 *
 *     // ... perform work ...
 *
 *     void ctx.logger.logSuccess({ user: ctx.user, duration: ctx.timer.elapsed() });
 *     return successResponse(data);
 *   } catch (error) {
 *     if (ctx.user) {
 *       void ctx.logger.logError({
 *         user: ctx.user,
 *         errorMessage: ctx.getErrorMessage(error),
 *       });
 *     }
 *     return handleApiError(error);
 *   }
 * }
 * ```
 */
export function createApiLoggingContext(): ApiLoggingContext {
  const logger = getAzureMonitorLogger();
  const timer = createTimer();

  return {
    session: null,
    get user() {
      return this.session?.user;
    },
    logger,
    timer,
    getErrorMessage,
    getErrorDetails,
  };
}
