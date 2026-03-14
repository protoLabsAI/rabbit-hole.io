/**
 * API Authentication Middleware
 *
 * Consolidated authentication wrapper for API routes with enhanced role-based access control.
 */

import { NextRequest, NextResponse } from "next/server";

import { getUserRole, isAdmin, canPerformAction } from "./role-utils";
import { getUserTier, getTierExpiry, isTierExpired } from "./tier-utils";
import {
  type UserRole,
  type AuthenticatedUser,
  USER_ROLES,
  type UserTier,
} from "./types";

export type AuthenticatedHandler<T = any> = (
  request: NextRequest,
  user: AuthenticatedUser
) => Promise<NextResponse<T>>;

export interface AuthOptions {
  errorMessage?: string;
  logAction?: string;
  requireAdmin?: boolean;
  requireRole?: UserRole;
  requireTier?: UserTier;
  skipAuth?: boolean;
}

/**
 * Enhanced authentication wrapper with role-based access control
 */
export function withAuth<T = any>(
  handler: AuthenticatedHandler<T>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    try {
      // Skip auth for development or public endpoints
      if (options.skipAuth) {
        return await handler(request, {
          userId: "anonymous",
          emailAddress: "anonymous",
          role: USER_ROLES.VIEWER,
          tier: "free" as const,
          tierExpiry: null,
        });
      }

      // Local user - no auth required
      const userId = "local-user";
      const clerkUser = { id: "local-user", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "" } as any;

      // Get user role and tier
      const userRole = getUserRole(clerkUser);
      const userTier = getUserTier(clerkUser);
      const tierExpiry = getTierExpiry(clerkUser);

      const authenticatedUser: AuthenticatedUser = {
        userId,
        emailAddress: clerkUser.emailAddresses[0]?.emailAddress || "",
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        role: userRole,
        tier: userTier,
        tierExpiry,
      };

      // Role-based access control
      if (options.requireAdmin || options.requireRole === USER_ROLES.ADMIN) {
        if (!isAdmin(clerkUser)) {
          return NextResponse.json(
            {
              success: false,
              error: options.errorMessage || "Admin access required",
            },
            { status: 403 }
          ) as NextResponse<T>;
        }
      } else if (options.requireRole) {
        const roleCheck = canPerformAction(clerkUser, options.requireRole);
        if (!roleCheck.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: options.errorMessage || roleCheck.message,
            },
            { status: 403 }
          ) as NextResponse<T>;
        }
      }

      // Tier-based access control
      if (options.requireTier) {
        // Check if tier is expired
        if (isTierExpired(clerkUser)) {
          return NextResponse.json(
            {
              success: false,
              error: "Your subscription has expired. Please renew to continue.",
              tierExpired: true,
              upgradeUrl: "/pricing",
            },
            { status: 402 } // Payment Required
          ) as NextResponse<T>;
        }

        // Check tier level (implement tier comparison if needed)
        // For now, just pass through - specific checks done in route handlers
      }

      // Log authenticated request with role info
      if (options.logAction) {
        console.log(
          `🔒 ${options.logAction} from user: ${userId} (role: ${userRole})`
        );
      }

      return await handler(request, authenticatedUser);
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
 * Quick wrapper for common API pattern with action logging
 */
export function withAuthAndLogging(actionName: string) {
  return <T = any>(handler: AuthenticatedHandler<T>) =>
    withAuth(handler, {
      errorMessage: `Authentication required to ${actionName}`,
      logAction: actionName,
    });
}

/**
 * Wrapper for admin-only operations
 */
export function withAdminAuth(actionName: string) {
  return <T = any>(handler: AuthenticatedHandler<T>) =>
    withAuth(handler, {
      errorMessage: `Admin access required to ${actionName}`,
      logAction: `Admin: ${actionName}`,
      requireAdmin: true,
    });
}

/**
 * Wrapper for role-based operations
 */
export function withRoleAuth(actionName: string, requiredRole: UserRole) {
  return <T = any>(handler: AuthenticatedHandler<T>) =>
    withAuth(handler, {
      errorMessage: `${actionName} requires ${requiredRole} access`,
      logAction: `${requiredRole}: ${actionName}`,
      requireRole: requiredRole,
    });
}

/**
 * Wrapper for member-level operations (member or admin)
 */
export function withMemberAuth(actionName: string) {
  return <T = any>(handler: AuthenticatedHandler<T>) =>
    withRoleAuth(actionName, USER_ROLES.MEMBER);
}

/**
 * Wrapper for viewer-level operations (any authenticated user)
 */
export function withViewerAuth(actionName: string) {
  return <T = any>(handler: AuthenticatedHandler<T>) =>
    withRoleAuth(actionName, USER_ROLES.VIEWER);
}

/**
 * Wrapper for public endpoints (no auth required but still logged)
 */
export function withLogging(actionName: string) {
  return <T = any>(handler: AuthenticatedHandler<T>) =>
    withAuth(handler, {
      logAction: `Public: ${actionName}`,
      skipAuth: true,
    });
}
