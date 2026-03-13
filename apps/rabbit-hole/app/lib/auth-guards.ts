/**
 * Authentication Guards for API Routes
 *
 * Reusable auth checks for different access levels
 */

import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  getUserRole,
  hasMinimumRole,
  USER_ROLES,
  type UserRole,
} from "@proto/auth";

export interface AuthResult {
  authorized: boolean;
  user?: any;
  userRole?: UserRole;
  error?: {
    message: string;
    status: number;
  };
}

/**
 * Require super admin role for API route
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<AuthResult> {
  const user = await currentUser();

  if (!user) {
    return {
      authorized: false,
      error: {
        message: "Authentication required",
        status: 401,
      },
    };
  }

  const userRole = getUserRole(user);
  const isSuperAdmin = hasMinimumRole(userRole, USER_ROLES.SUPER_ADMIN);

  if (!isSuperAdmin) {
    return {
      authorized: false,
      user,
      userRole,
      error: {
        message:
          "Super admin access required. Atlas is read-only for non-admin users. Use the Research page to create personal graphs.",
        status: 403,
      },
    };
  }

  return {
    authorized: true,
    user,
    userRole,
  };
}

/**
 * Require any authenticated user (member or above)
 */
export async function requireAuthenticated(
  request: NextRequest
): Promise<AuthResult> {
  const user = await currentUser();

  if (!user) {
    return {
      authorized: false,
      error: {
        message: "Authentication required",
        status: 401,
      },
    };
  }

  const userRole = getUserRole(user);

  return {
    authorized: true,
    user,
    userRole,
  };
}

/**
 * Helper to return unauthorized response
 */
export function unauthorizedResponse(
  authResult: AuthResult
): NextResponse<any> {
  return NextResponse.json(
    {
      success: false,
      error: authResult.error?.message || "Unauthorized",
    },
    { status: authResult.error?.status || 403 }
  );
}
