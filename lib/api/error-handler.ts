/**
 * Centralized API Error Handling
 *
 * Provides consistent error handling across all API routes
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Custom API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Common API error types
 */
export class ValidationError extends ApiError {
  constructor(message: string = "Validation error", details?: any) {
    super(400, message, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = "Resource conflict") {
    super(409, message);
    this.name = "ConflictError";
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = "Internal server error", details?: any) {
    super(500, message, details);
    this.name = "InternalServerError";
  }
}

/**
 * Centralized error handler for API routes
 *
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   try {
 *     // Your route logic
 *   } catch (error) {
 *     return handleApiError(error);
 *   }
 * }
 * ```
 */
export function handleApiError(error: unknown): NextResponse {
  // Handle our custom ApiError
  if (error instanceof ApiError) {
    logger.warn(`API Error [${error.statusCode}]: ${error.message}`, {
      details: error.details,
    });

    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    logger.warn("Validation error", { errors: error.errors });

    return NextResponse.json(
      {
        error: "Validation error",
        details: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    logger.error("Unhandled error in API route", error);

    // Don't expose internal error details in production
    const message =
      process.env.NODE_ENV === "development"
        ? error.message
        : "Internal server error";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }

  // Handle unknown error types
  logger.error("Unknown error type in API route", error);

  return NextResponse.json(
    {
      error: "Internal server error",
    },
    { status: 500 }
  );
}

/**
 * Async wrapper for API routes that automatically handles errors
 *
 * @example
 * ```ts
 * export const POST = withErrorHandler(async (request: Request) => {
 *   const body = await request.json();
 *   // Your logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}

/**
 * Validate request body against a Zod schema
 * Throws ValidationError if validation fails
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Invalid request body", error.errors);
    }
    throw error;
  }
}

/**
 * Validate query parameters against a Zod schema
 * Throws ValidationError if validation fails
 */
export function validateQuery<T>(
  url: URL,
  schema: z.ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(url.searchParams.entries());
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Invalid query parameters", error.errors);
    }
    throw error;
  }
}
