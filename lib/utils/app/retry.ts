/**
 * Retry utilities with exponential backoff
 */

/**
 * Wrapper function to implement exponential backoff retry logic.
 * @param {Function} fn - The function to retry.
 * @param {number} maxRetries - Maximum number of retries.
 * @param {number} baseDelay - Base delay in milliseconds.
 * @returns {Promise<any>} - The result of the function call.
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = Math.min(Math.pow(2, attempt) * baseDelay, 10000); // Max delay of 10 seconds
      console.warn(
        `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed after maximum retries');
}

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - The async operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds between retries
 * @returns {Promise<T>} - The result of the operation
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000,
): Promise<T> {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Attempt ${attempt + 1} failed. Retrying...`);
      await delay(Math.pow(2, attempt) * baseDelay); // Exponential backoff
    }
  }
  throw new Error('Failed after maximum retries');
}
