/**
 * Logger Utility
 *
 * Centralized logging utility that:
 * - Gates console.log behind development mode
 * - Prevents sensitive data from being logged in production
 * - Provides consistent logging format
 * - Can be extended to send errors to monitoring services (Sentry, etc.)
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: any;
}

const IS_DEV = process.env.NODE_ENV === "development";
const IS_BROWSER = typeof window !== "undefined";

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context, null, 2)}`;
    }

    return `${prefix} ${message}`;
  }

  /**
   * Debug logs - only shown in development
   * Use for detailed debugging information that's not needed in production
   */
  debug(message: string, context?: LogContext): void {
    if (IS_DEV) {
      console.log(this.formatMessage("debug", message, context));
    }
  }

  /**
   * Info logs - shown in all environments
   * Use for important application flow information
   */
  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage("info", message, context));
  }

  /**
   * Warning logs - shown in all environments
   * Use for recoverable errors or unexpected situations
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("warn", message, context));
  }

  /**
   * Error logs - shown in all environments
   * Use for errors that should be tracked and monitored
   * In production, these should be sent to error tracking service
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };

    console.error(this.formatMessage("error", message, errorContext));

    // TODO: Send to error tracking service (Sentry, Rollbar, etc.)
    // if (!IS_DEV) {
    //   Sentry.captureException(error, { extra: context });
    // }
  }

  /**
   * Sanitize sensitive data from logs
   * Removes API keys, passwords, tokens, etc.
   */
  private sanitize(data: any): any {
    if (typeof data === "string") {
      return data
        .replace(/api[_-]?key[s]?["']?\s*[:=]\s*["']?[\w-]+/gi, "api_key=***")
        .replace(/password["']?\s*[:=]\s*["']?[\w-]+/gi, "password=***")
        .replace(/token["']?\s*[:=]\s*["']?[\w-]+/gi, "token=***")
        .replace(/bearer\s+[\w-]+/gi, "bearer ***");
    }

    if (typeof data === "object" && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};

      for (const key in data) {
        const lowerKey = key.toLowerCase();

        if (
          lowerKey.includes("password") ||
          lowerKey.includes("token") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("key")
        ) {
          sanitized[key] = "***";
        } else {
          sanitized[key] = this.sanitize(data[key]);
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Log with sanitized data (removes sensitive information)
   */
  safe(level: LogLevel, message: string, data?: any): void {
    const sanitized = data ? this.sanitize(data) : undefined;

    switch (level) {
      case "debug":
        this.debug(message, sanitized);
        break;
      case "info":
        this.info(message, sanitized);
        break;
      case "warn":
        this.warn(message, sanitized);
        break;
      case "error":
        this.error(message, sanitized);
        break;
    }
  }

  /**
   * Performance timing utility
   */
  time(label: string): void {
    if (IS_DEV) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (IS_DEV) {
      console.timeEnd(label);
    }
  }

  /**
   * Group logs together (useful for debugging complex operations)
   */
  group(label: string): void {
    if (IS_DEV) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (IS_DEV) {
      console.groupEnd();
    }
  }

  /**
   * Table output for arrays of objects (great for debugging data)
   */
  table(data: any[]): void {
    if (IS_DEV) {
      console.table(data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { LogLevel, LogContext };
