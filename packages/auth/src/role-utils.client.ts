/**
 * Client-side role utility functions for Clerk-based authentication
 *
 * Provides role checking and utilities safe for client-side use.
 */

import {
  USER_ROLES,
  ROLE_HIERARCHY,
  ROLE_METADATA,
  DEFAULT_USER_ROLE,
  type UserRole,
  isValidUserRole,
} from "./types";

// Define user type inline (no external auth dependency)
interface UserResource {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  publicMetadata?: {
    role?: string;
    [key: string]: any;
  };
}

/**
 * Extract user role from Clerk user object (client-side)
 * Falls back to default role if none set
 */
export function getUserRoleClient(user: UserResource | null): UserRole {
  if (!user) return DEFAULT_USER_ROLE;

  const roleFromMetadata = user.publicMetadata?.role as string;

  if (roleFromMetadata && isValidUserRole(roleFromMetadata)) {
    return roleFromMetadata;
  }

  // Legacy fallback - check if user is admin via email
  if (checkLegacyAdminUserClient(user)) {
    return USER_ROLES.ADMIN;
  }

  return DEFAULT_USER_ROLE;
}

/**
 * Legacy admin check for backward compatibility (client-side)
 */
function checkLegacyAdminUserClient(user: UserResource): boolean {
  const adminEmails = ["josh@rabbit-hole.io", "admin@rabbit-hole.io"];

  return adminEmails.includes(user.emailAddresses[0]?.emailAddress || "");
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
 * Check if user has specific permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  // Super admin has all permissions
  if ((userRole as string) === "super_admin") return true;

  return ROLE_METADATA[
    userRole as keyof typeof ROLE_METADATA
  ].permissions.includes(permission as any);
}

/**
 * Check if user has admin role (client-side)
 */
export function isAdminClient(user: UserResource | null): boolean {
  return getUserRoleClient(user) === USER_ROLES.ADMIN;
}

/**
 * Check if user has member role or higher (client-side)
 */
export function isMemberClient(user: UserResource | null): boolean {
  return hasMinimumRole(getUserRoleClient(user), USER_ROLES.MEMBER);
}

/**
 * Check if user has at least viewer role (client-side)
 */
export function isViewerClient(user: UserResource | null): boolean {
  return hasMinimumRole(getUserRoleClient(user), USER_ROLES.VIEWER);
}

/**
 * Get role display information for UI
 */
export function getRoleDisplay(role: UserRole) {
  // Super admin display info (not in metadata as it's emergency-only)
  if ((role as string) === "super_admin") {
    return {
      label: "Super Admin",
      description: "Emergency access - full system control",
      color: "text-red-600",
      permissions: ["*"],
    };
  }

  return ROLE_METADATA[role as keyof typeof ROLE_METADATA];
}

/**
 * Get all available roles for role selection UI
 */
export function getAvailableRoles(): Array<{
  value: UserRole;
  label: string;
  description: string;
  permissions: readonly string[];
}> {
  return Object.entries(ROLE_METADATA).map(([role, metadata]) => ({
    value: role as UserRole,
    label: metadata.label,
    description: metadata.description,
    permissions: metadata.permissions,
  }));
}
