/**
 * Server-side role utility functions
 *
 * Provides server-only role checking and utilities.
 */

<<<<<<< HEAD
// Inline User type (replaces external auth dependency)
interface User {
  id: string;
  publicMetadata: Record<string, unknown>;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
}

=======
>>>>>>> origin/main
import {
  USER_ROLES,
  ROLE_HIERARCHY,
  ROLE_METADATA,
  DEFAULT_USER_ROLE,
  type UserRole,
  isValidUserRole,
} from "./types";

/**
 * Extract user role from Clerk user object (server-side)
 * Falls back to default role if none set
 */
export function getUserRole(user: any | null): UserRole {
  if (!user) return DEFAULT_USER_ROLE;

  const roleFromMetadata = user.publicMetadata?.role as string;

  if (roleFromMetadata && isValidUserRole(roleFromMetadata)) {
    return roleFromMetadata;
  }

  // Legacy fallback - check if user is admin via email/env vars
  if (checkLegacyAdminUser(user)) {
    return USER_ROLES.ADMIN;
  }

  return DEFAULT_USER_ROLE;
}

/**
 * Legacy admin check for backward compatibility (server-side)
 * Will be removed once all users have roles in metadata
 */
function checkLegacyAdminUser(user: any): boolean {
  const adminEmails = ["josh@rabbit-hole.io", "admin@rabbit-hole.io"];
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(",") || [];

  return (
    adminEmails.includes(user.emailAddresses[0]?.emailAddress || "") ||
    adminUserIds.includes(user.id)
  );
}

/**
 * Check if user has minimum required role level
 * Uses role hierarchy where higher levels include lower level permissions
 */
export function hasMinimumRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  // Super admin not in hierarchy (emergency role), treat as highest
  if ((userRole as string) === "super_admin") return true;
  if ((requiredRole as string) === "super_admin")
    return (userRole as string) === "super_admin";

  return (
    ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] >=
    ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY]
  );
}

/**
 * Check if user has admin role (server-side)
 */
export function isAdmin(user: any | null): boolean {
  return getUserRole(user) === USER_ROLES.ADMIN;
}

/**
 * Check if user has member role or higher (server-side)
 */
export function isMember(user: any | null): boolean {
  return hasMinimumRole(getUserRole(user), USER_ROLES.MEMBER);
}

/**
 * Check if user has at least viewer role (server-side)
 */
export function isViewer(user: any | null): boolean {
  return hasMinimumRole(getUserRole(user), USER_ROLES.VIEWER);
}

/**
 * Check if current user can perform action requiring specific role
 */
export function canPerformAction(
  currentUser: any | null,
  requiredRole: UserRole
): { allowed: boolean; message?: string } {
  if (!currentUser) {
    return {
      allowed: false,
      message: "Authentication required",
    };
  }

  const userRole = getUserRole(currentUser);
  const allowed = hasMinimumRole(userRole, requiredRole);

  if (!allowed) {
    // Handle super_admin display (not in metadata)
    const requiredRoleInfo =
      (requiredRole as string) === "super_admin"
        ? { label: "Super Admin" }
        : ROLE_METADATA[requiredRole as keyof typeof ROLE_METADATA];
    const currentRoleInfo =
      (userRole as string) === "super_admin"
        ? { label: "Super Admin" }
        : ROLE_METADATA[userRole as keyof typeof ROLE_METADATA];

    return {
      allowed: false,
      message: `This action requires ${requiredRoleInfo.label} access. Current role: ${currentRoleInfo.label}`,
    };
  }

  return { allowed: true };
}

/**
 * Validate role transition (for role updates)
 * Prevents unauthorized role escalation
 */
export function canUpdateRole(
  currentUser: any | null,
  targetRole: UserRole
): { allowed: boolean; message?: string } {
  if (!currentUser) {
    return { allowed: false, message: "Authentication required" };
  }

  // Only admins can change roles
  if (!isAdmin(currentUser)) {
    return {
      allowed: false,
      message: "Only administrators can update user roles",
    };
  }

  // Admins can set any role
  return { allowed: true };
}
