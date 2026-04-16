/**
 * @protolabsai/auth/client - Client-only exports
 *
 * Pure client-side authentication utilities with no server dependencies.
 * Use this for all React components and client-side code.
 */

// Re-export only client-safe utilities
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

// Re-export types (safe for both client and server)
export {
  USER_ROLES,
  ROLE_HIERARCHY,
  ROLE_METADATA,
  DEFAULT_USER_ROLE,
  isValidUserRole,
  type UserRole,
  type AuthenticatedUser,
} from "./types";

// Re-export tier types
export { USER_TIERS, isValidUserTier, type UserTier } from "./types";

export {
  TIER_LIMITS,
  isUnlimited,
  isWithinLimit,
  type UserTierLimits,
} from "./tier-limits";

// Client-side tier utility functions
export {
  getUserTierClient,
  getTierLimitsClient,
  canAccessFeature,
  getTierLabel,
  getTierColor,
} from "./tier-utils.client";
