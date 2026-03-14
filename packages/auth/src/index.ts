/**
 * @proto/auth - Authentication Package
 *
 * Centralized authentication middleware and role-based access control utilities.
 */

// Middleware functions
export {
  withAuth,
  withAuthAndLogging,
  withAdminAuth,
  withRoleAuth,
  withMemberAuth,
  withViewerAuth,
  withLogging,
  type AuthenticatedHandler,
  type AuthOptions,
} from "./middleware";

// Role types and utilities
export {
  USER_ROLES,
  ROLE_HIERARCHY,
  ROLE_METADATA,
  DEFAULT_USER_ROLE,
  isValidUserRole,
  type UserRole,
  type AuthenticatedUser,
} from "./types";

// Tier types and utilities
export { USER_TIERS, isValidUserTier, type UserTier } from "./types";

export {
  TIER_LIMITS,
  isUnlimited,
  isWithinLimit,
  type UserTierLimits,
} from "./tier-limits";

// Server-side tier utility functions (server components only)
export {
  getUserTier,
  getTierLimits,
  getTierExpiry,
  isTierExpired,
  hasTierOrHigher,
  canCreateWorkspace,
  canCreateRoom,
  canCreatePrivateWorkspace,
  canUseCanvasType,
  getRemainingCount,
  getUsagePercentage,
  type PermissionCheck,
} from "./tier-utils";

// Tier enforcement functions
export {
  TierLimitError,
  enforceEntityLimit,
  enforceWorkspaceLimit,
  checkEntityLimitBulk,
  enforceEntityLimitBulk,
  enforceRelationshipLimit,
  checkRelationshipLimitBulk,
  enforceRelationshipLimitBulk,
  enforceFileSizeLimit,
  enforceStorageLimit,
} from "./tier-enforcement";

// Server-side role utility functions (server components only)
export {
  getUserRole,
  hasMinimumRole as hasMinimumRoleServer,
  isAdmin,
  isMember,
  isViewer,
  canPerformAction,
  canUpdateRole,
} from "./role-utils";

// Legacy function for backward compatibility
export function checkAdminRole(user: {
  userId: string;
  emailAddress?: string;
}): boolean {
  const adminEmails = ["josh@rabbit-hole.io", "admin@rabbit-hole.io"];
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(",") || [];

  return (
    (user.emailAddress && adminEmails.includes(user.emailAddress)) ||
    adminUserIds.includes(user.userId)
  );
}

// Client-side role utility functions (client components only)
export {
  getUserRoleClient,
  hasMinimumRole,
  hasPermission,
  isAdminClient,
  isMemberClient,
  isViewerClient,
  getRoleDisplay,
  getAvailableRoles,
} from "./role-utils.client";

// Client-side tier utility functions (client components only)
export {
  getUserTierClient,
  getTierLimitsClient,
  canAccessFeature,
  getTierLabel,
  getTierColor,
} from "./tier-utils.client";

// File access control utilities
export { verifyFileAccess, type FileAccessResult } from "./file-access";

// Local auth provider (replaces Clerk for local development)
export {
  LocalAuthProvider,
  type LocalAuthSession,
} from "./local-auth-provider";
