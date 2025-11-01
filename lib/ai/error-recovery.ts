/**
 * Error Recovery Utilities for AI Agents
 * Provides retry logic, error classification, and recovery strategies
 */

export interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: any, customRetryable: string[] = []): boolean {
  const errorMessage = error?.message?.toLowerCase() || "";
  const errorCode = error?.code?.toLowerCase() || "";

  const defaultRetryablePatterns = [
    "timeout",
    "network",
    "connection",
    "econnrefused",
    "econnreset",
    "etimedout",
    "429", // Rate limit
    "503", // Service unavailable
    "504", // Gateway timeout
    "checkpoint conflict",
    "lock",
    ...customRetryable.map(s => s.toLowerCase()),
  ];

  return defaultRetryablePatterns.some(
    (pattern) => errorMessage.includes(pattern) || errorCode.includes(pattern)
  );
}

/**
 * Exponential backoff retry with jitter
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryableErrors = [],
  } = config;

  let attempts = 0;
  let lastError: Error | undefined;
  const startTime = Date.now();

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts,
        totalDuration: Date.now() - startTime,
      };
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.log(`[Retry] Attempt ${attempts}/${maxAttempts} failed:`, {
        error: lastError.message,
        retryable: isRetryableError(error, retryableErrors),
      });

      // Don't retry if error is not retryable
      if (!isRetryableError(error, retryableErrors)) {
        console.log("[Retry] Error not retryable, failing immediately");
        break;
      }

      // Don't delay on last attempt
      if (attempts < maxAttempts) {
        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempts - 1),
          maxDelay
        );
        // Add random jitter (±25%)
        const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
        const delay = Math.max(0, baseDelay + jitter);

        console.log(`[Retry] Waiting ${Math.round(delay)}ms before retry ${attempts + 1}/${maxAttempts}`);
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts,
    totalDuration: Date.now() - startTime,
  };
}

/**
 * Parse JSON with fallback strategies
 */
export function safeJSONParse(text: string, fallbackValue: any = null): any {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract JSON from text (find first [...] or {...})
  try {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }

    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Try to fix common JSON errors
  try {
    // Remove trailing commas
    let fixed = text.replace(/,\s*([\]}])/g, "$1");
    // Fix single quotes to double quotes
    fixed = fixed.replace(/'/g, '"');
    // Remove comments
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

    return JSON.parse(fixed);
  } catch {
    // All strategies failed
  }

  console.warn("[SafeJSONParse] All parsing strategies failed, returning fallback");
  return fallbackValue;
}

/**
 * Extract structured data from text with multiple strategies
 */
export function extractJSONFromText(text: string, key?: string): any | null {
  if (!text) return null;

  // Strategy 1: If key provided, look for pattern like "key: {...}" or "key: [...]"
  if (key) {
    const patterns = [
      new RegExp(`${key}\\s*:\\s*(\\[[\\s\\S]*?\\])`, "i"),
      new RegExp(`${key}\\s*:\\s*(\\{[\\s\\S]*?\\})`, "i"),
      new RegExp(`"${key}"\\s*:\\s*(\\[[\\s\\S]*?\\])`, "i"),
      new RegExp(`"${key}"\\s*:\\s*(\\{[\\s\\S]*?\\})`, "i"),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsed = safeJSONParse(match[1]);
        if (parsed !== null) {
          return parsed;
        }
      }
    }
  }

  // Strategy 2: Look for any JSON array or object
  const parsed = safeJSONParse(text);
  if (parsed !== null) {
    // If key provided and parsed is object, try to extract that key
    if (key && typeof parsed === "object" && parsed !== null && key in parsed) {
      return parsed[key];
    }
    return parsed;
  }

  return null;
}

/**
 * Classify error severity for logging and alerting
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorContext {
  severity: ErrorSeverity;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  category: string;
}

export function classifyError(error: any): ErrorContext {
  const errorMessage = error?.message?.toLowerCase() || "";
  const errorCode = error?.code?.toLowerCase() || "";

  // Critical errors - immediate attention needed
  if (errorMessage.includes("authentication") || errorMessage.includes("unauthorized")) {
    return {
      severity: "critical",
      retryable: false,
      userMessage: "Authentication error. Please check your credentials.",
      technicalMessage: error.message,
      category: "authentication",
    };
  }

  // High severity - data integrity or corruption
  if (errorMessage.includes("constraint") || errorMessage.includes("foreign key")) {
    return {
      severity: "high",
      retryable: false,
      userMessage: "Database error. Please contact support.",
      technicalMessage: error.message,
      category: "database_integrity",
    };
  }

  // Medium severity - transient issues
  if (isRetryableError(error)) {
    return {
      severity: "medium",
      retryable: true,
      userMessage: "Temporary issue. Please try again.",
      technicalMessage: error.message,
      category: "transient",
    };
  }

  // Tool validation errors
  if (errorCode === "invalid_tool_results" || errorMessage.includes("tool_call_id")) {
    return {
      severity: "medium",
      retryable: true,
      userMessage: "AI processing error. Please try a simpler query.",
      technicalMessage: error.message,
      category: "tool_validation",
    };
  }

  // Low severity - expected errors
  if (errorMessage.includes("not found") || errorCode === "404") {
    return {
      severity: "low",
      retryable: false,
      userMessage: "Resource not found.",
      technicalMessage: error.message,
      category: "not_found",
    };
  }

  // Default - unknown error
  return {
    severity: "medium",
    retryable: false,
    userMessage: "An error occurred. Please try again or contact support.",
    technicalMessage: error.message || String(error),
    category: "unknown",
  };
}

/**
 * Wrap a function with error boundary
 */
export async function withErrorBoundary<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackValue?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorContext = classifyError(error);

    console.error(`[ErrorBoundary] ${context}:`, {
      severity: errorContext.severity,
      category: errorContext.category,
      message: errorContext.technicalMessage,
    });

    if (fallbackValue !== undefined) {
      console.log(`[ErrorBoundary] Returning fallback value for ${context}`);
      return fallbackValue;
    }

    throw error;
  }
}
