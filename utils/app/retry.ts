export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetryTime: number = 10000
): Promise<T> {
  const startTime = Date.now();
  let retryCount = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= maxRetryTime) {
        throw error;
      }

      const delay = Math.min(Math.pow(2, retryCount) * 100, maxRetryTime - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }
}
