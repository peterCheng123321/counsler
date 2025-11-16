/**
 * Retry Utility with Exponential Backoff
 * Handles network failures gracefully with intelligent retry logic
 */

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class NetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ServerError extends Error {
  constructor(message = "Server error occurred", public status: number) {
    super(message);
    this.name = "ServerError";
  }
}

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(
  attempt: number,
  initialDelay: number,
  maxDelay: number
): number {
  const exponentialDelay = initialDelay * Math.pow(2, attempt);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Fetch with automatic retry and exponential backoff
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Response object
 * @throws NotFoundError for 404
 * @throws ServerError for 5xx
 * @throws NetworkError for network failures
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success - return immediately
      if (response.ok) {
        return response;
      }

      // 404 - Don't retry, resource doesn't exist
      if (response.status === 404) {
        throw new NotFoundError(`Resource not found: ${url}`);
      }

      // 4xx (except 404) - Don't retry, client error
      if (response.status >= 400 && response.status < 500) {
        throw new ServerError(
          `Client error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      // 5xx - Server error, should retry
      if (response.status >= 500) {
        const error = new ServerError(
          `Server error: ${response.status} ${response.statusText}`,
          response.status
        );
        lastError = error;

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Notify and retry
        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        const backoffDelay = calculateBackoff(attempt, initialDelay, maxDelay);
        await delay(backoffDelay);
        continue;
      }

      // Unexpected status code
      throw new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      // Network error (fetch failed)
      if (error instanceof TypeError) {
        const networkError = new NetworkError(
          `Network request failed: ${error.message}`
        );
        lastError = networkError;

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          throw networkError;
        }

        // Notify and retry
        if (onRetry) {
          onRetry(attempt + 1, networkError);
        }

        const backoffDelay = calculateBackoff(attempt, initialDelay, maxDelay);
        await delay(backoffDelay);
        continue;
      }

      // Known error types - throw immediately, don't retry
      if (
        error instanceof NotFoundError ||
        (error instanceof ServerError && error.status < 500)
      ) {
        throw error;
      }

      // Unknown error
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw lastError;
      }

      // Notify and retry
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      const backoffDelay = calculateBackoff(attempt, initialDelay, maxDelay);
      await delay(backoffDelay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Max retries exceeded");
}

/**
 * Fetch JSON data with retry
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Parsed JSON data
 */
export async function fetchJSONWithRetry<T = any>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryOptions);

  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Helper to determine if an error is retryable
 *
 * @param error - Error to check
 * @returns true if error should be retried
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NotFoundError) return false;
  if (error instanceof ServerError && error.status < 500) return false;
  return true;
}

/**
 * Get user-friendly error message
 *
 * @param error - Error object
 * @returns Human-readable error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof NotFoundError) {
    return "The requested item could not be found. It may have been deleted.";
  }

  if (error instanceof NetworkError) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  if (error instanceof ServerError) {
    if (error.status === 401) {
      return "You are not authorized to perform this action. Please log in again.";
    }
    if (error.status === 403) {
      return "You don't have permission to access this resource.";
    }
    if (error.status >= 500) {
      return "The server encountered an error. Please try again later.";
    }
    return `Server error: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}
