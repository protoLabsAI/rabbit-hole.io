/**
 * Client-side tier utility functions for React components
 *
 * Uses Clerk's useUser() hook type for client compatibility
 */

import { TIER_LIMITS, type UserTierLimits } from "./tier-limits";
import { USER_TIERS, type UserTier, isValidUserTier } from "./types";

/**
 * Clerk user resource type from useUser() hook
 */
interface UserResource {
  id: string;
  publicMetadata?: {
    tier?: string;
    role?: string;
    tierExpiry?: string;
  };
}

/**
 * Extract user tier from Clerk user object (client-side)
 * Falls back to FREE tier if none set
 */
export function getUserTierClient(user: UserResource | null): UserTier {
  if (!user) return USER_TIERS.FREE;

  const tierFromMetadata = user.publicMetadata?.tier as string;

  if (tierFromMetadata && isValidUserTier(tierFromMetadata)) {
    return tierFromMetadata;
  }

  return USER_TIERS.FREE;
}

/**
 * Get tier limits configuration (client-side)
 */
export function getTierLimitsClient(tier: UserTier): UserTierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if user can access a feature based on tier
 */
export function canAccessFeature(
  user: UserResource | null,
  feature: keyof UserTierLimits
): boolean {
  const tier = getUserTierClient(user);
  const limits = getTierLimitsClient(tier);

  const value = limits[feature];

  // Boolean features
  if (typeof value === "boolean") {
    return value;
  }

  // Numeric features (if > 0, feature is available)
  if (typeof value === "number") {
    return value !== 0;
  }

  // Array features (if not empty, feature is available)
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return false;
}

/**
 * Get tier display name
 */
export function getTierLabel(tier: UserTier): string {
  const labels: Record<UserTier, string> = {
    [USER_TIERS.FREE]: "Free",
    [USER_TIERS.BASIC]: "Basic",
    [USER_TIERS.PRO]: "Pro",
    [USER_TIERS.TEAM]: "Team",
    [USER_TIERS.ENTERPRISE]: "Enterprise",
  };

  return labels[tier];
}

/**
 * Get tier badge color for UI
 */
export function getTierColor(tier: UserTier): string {
  const colors: Record<UserTier, string> = {
    [USER_TIERS.FREE]: "text-gray-600",
    [USER_TIERS.BASIC]: "text-blue-600",
    [USER_TIERS.PRO]: "text-purple-600",
    [USER_TIERS.TEAM]: "text-green-600",
    [USER_TIERS.ENTERPRISE]: "text-orange-600",
  };

  return colors[tier];
}
