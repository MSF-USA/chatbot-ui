/**
 * Timer Utilities for API Observability
 *
 * Provides simple utilities for timing API operations, replacing the common
 * pattern of `Date.now()` bookkeeping at route call sites.
 */

/**
 * Represents a timer that can report elapsed time since creation.
 */
export interface Timer {
  /**
   * Returns the number of milliseconds elapsed since the timer was created.
   *
   * @returns Elapsed time in milliseconds
   */
  elapsed: () => number;
}

/**
 * Creates a timer that tracks elapsed time from the moment of creation.
 *
 * @returns A Timer object with an `elapsed()` method
 *
 * @example
 * ```typescript
 * const timer = createTimer();
 * // ... perform work ...
 * console.log(`Operation took ${timer.elapsed()}ms`);
 * ```
 */
export function createTimer(): Timer {
  const startTime = Date.now();
  return {
    elapsed: () => Date.now() - startTime,
  };
}

/**
 * Result of a timed operation, containing both the result and duration.
 */
export interface TimedResult<T> {
  /** The result of the timed operation */
  result: T;
  /** Duration of the operation in milliseconds */
  duration: number;
}

/**
 * Executes an async function and returns both its result and the duration.
 *
 * @param fn - The async function to execute and time
 * @returns An object containing the result and duration in milliseconds
 *
 * @example
 * ```typescript
 * const { result, duration } = await withTiming(async () => {
 *   return await fetchData();
 * });
 * console.log(`Fetched data in ${duration}ms`);
 * ```
 */
export async function withTiming<T>(
  fn: () => Promise<T>,
): Promise<TimedResult<T>> {
  const timer = createTimer();
  const result = await fn();
  return { result, duration: timer.elapsed() };
}
