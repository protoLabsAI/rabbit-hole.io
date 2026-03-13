/**
 * API Authentication Middleware
 *
 * Shared authentication wrapper for API routes to eliminate duplication.
 * Provides consistent auth checking and error responses.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export interface AuthenticatedUser {
  userId: string;
}

export type AuthenticatedHandler<T = any> = (
  request: NextRequest,
  user: AuthenticatedUser
) => Promise<NextResponse<T>>;

/**
 * Wraps an API handler with authentication checking
 */
export function withAuth<T = any>(
  handler: AuthenticatedHandler<T>,
  options: {
    errorMessage?: string;
    logAction?: string;
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    try {
      // Check authentication
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            error: options.errorMessage || "Authentication required",
          },
          { status: 401 }
        ) as NextResponse<T>;
      }

      // Log authenticated request if action specified
      if (options.logAction) {
        console.log(
          `🔒 ${options.logAction} from authenticated user: ${userId}`
        );
      }

      // Call the wrapped handler with user info
      return await handler(request, { userId });
    } catch (error) {
      console.error(`❌ Authentication middleware error:`, error);
      return NextResponse.json(
        {
          success: false,
          error: "Authentication check failed",
        },
        { status: 500 }
      ) as NextResponse<T>;
    }
  };
}

/**
 * Quick wrapper for common API pattern
 */
export function withAuthAndLogging(actionName: string) {
  return <T = any>(handler: AuthenticatedHandler<T>) =>
    withAuth(handler, {
      errorMessage: `Authentication required to ${actionName}`,
      logAction: actionName,
    });
}
