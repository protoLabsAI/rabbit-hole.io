/**
 * Consolidated Validation Middleware
 *
 * Simplified version - focuses on working functionality over complex generics
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodType, ZodError } from "zod";

import {
  withAuth,
  withAuthAndLogging,
  type AuthenticatedUser,
} from "@protolabsai/auth";

// ==================== Simple Handler Types ====================

export type ValidatedHandler<TInput> = (
  data: TInput,
  request: NextRequest,
  user?: AuthenticatedUser
) => Promise<NextResponse>;

export type ValidatedAuthHandler<TInput> = (
  data: TInput,
  request: NextRequest,
  user: AuthenticatedUser
) => Promise<NextResponse>;

export interface ValidationOptions {
  schemaName?: string;
  allowEmptyBody?: boolean;
}

// ==================== Error Formatting ====================

function formatZodError(error: ZodError): string[] {
  return error.issues.map((err: any) => {
    const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
    return `${path}${err.message}`;
  });
}

// ==================== Core Validation Middleware ====================

/**
 * Validates request body against Zod schema
 */
export function withValidation<TInput>(
  schema: ZodType<TInput, any, any>,
  handler: ValidatedHandler<TInput>,
  options: ValidationOptions = {}
) {
  return async (request: NextRequest) => {
    const startTime = Date.now();

    try {
      let body: unknown;

      if (options.allowEmptyBody) {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      } else {
        try {
          body = await request.json();
        } catch {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid JSON in request body",
              metadata: { timestamp: new Date().toISOString() },
            },
            { status: 400 }
          );
        }
      }

      // Validate against schema
      const validation = schema.safeParse(body);

      if (!validation.success) {
        const errors = formatZodError(validation.error);
        return NextResponse.json(
          {
            success: false,
            error: `Validation failed: ${errors.join("; ")}`,
            errors,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
            },
          },
          { status: 400 }
        );
      }

      // Call handler with validated data
      return await handler(validation.data, request);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Validation failed",
          metadata: {
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Combines authentication + validation + logging
 */
export function withAuthValidation<TInput>(
  schema: ZodType<TInput, any, any>,
  handler: ValidatedAuthHandler<TInput>,
  options: ValidationOptions = {}
) {
  return withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
    const startTime = Date.now();

    try {
      let body: unknown;

      if (options.allowEmptyBody) {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      } else {
        try {
          body = await request.json();
        } catch {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid JSON in request body",
              metadata: {
                timestamp: new Date().toISOString(),
                userId: user.userId,
              },
            },
            { status: 400 }
          );
        }
      }

      // Validate against schema
      const validation = schema.safeParse(body);

      if (!validation.success) {
        const errors = formatZodError(validation.error);
        return NextResponse.json(
          {
            success: false,
            error: `Validation failed: ${errors.join("; ")}`,
            errors,
            metadata: {
              timestamp: new Date().toISOString(),
              userId: user.userId,
              processingTimeMs: Date.now() - startTime,
            },
          },
          { status: 400 }
        );
      }

      // Call handler with validated data
      return await handler(validation.data, request, user);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Request failed",
          metadata: {
            timestamp: new Date().toISOString(),
            userId: user.userId,
            processingTimeMs: Date.now() - startTime,
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * Quick wrapper for common pattern: Auth + Validation + Logging
 */
export function withAuthValidationLogging<TInput>(
  actionName: string,
  schema: ZodType<TInput, any, any>,
  handler: ValidatedAuthHandler<TInput>
) {
  return withAuthAndLogging(actionName)(
    async (request: NextRequest, user: AuthenticatedUser) => {
      return withAuthValidation(schema, handler)(request);
    }
  );
}
