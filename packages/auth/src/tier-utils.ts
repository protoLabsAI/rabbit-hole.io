/**
 * Server-side tier utility functions
 *
 * Provides server-only tier checking and limit utilities.
 */

// Inline User type (replaces external auth dependency)
interface User {
  id: string;
  publicMetadata: Record<string, unknown>;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
}

import { TIER_LIMITS, type UserTierLimits, isUnlimited } from "./tier-limits";
import { USER_TIERS, type UserTier, isValidUserTier } from "./types";

/**
 * Tier hierarchy for comparison
 * Higher number = higher tier
 */
const TIER_HIERARCHY: Record<UserTier, number> = {
  [USER_TIERS.FREE]: 0,
  [USER_TIERS.BASIC]: 1,
  [USER_TIERS.PRO]: 2,
  [USER_TIERS.TEAM]: 3,
  [USER_TIERS.ENTERPRISE]: 4,
};

/**
 * Extract user tier from Clerk user object (server-side)
 * Falls back to FREE tier if none set
 */
export function getUserTier(user: User | null): UserTier {
  if (!user) return USER_TIERS.FREE;

  const tierFromMetadata = user.publicMetadata?.tier as string;

  if (tierFromMetadata && isValidUserTier(tierFromMetadata)) {
    return tierFromMetadata;
  }

  // Default to free tier for all users
  return USER_TIERS.FREE;
}

/**
 * Get tier limits configuration for a given tier
 */
export function getTierLimits(tier: UserTier): UserTierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Get tier expiry date from user metadata
 */
export function getTierExpiry(user: User | null): Date | null {
  if (!user) return null;

  const expiryString = user.publicMetadata?.tierExpiry as string | null;
  if (!expiryString) return null;

  try {
    return new Date(expiryString);
  } catch {
    return null;
  }
}

/**
 * Check if user's tier subscription has expired
 */
export function isTierExpired(user: User | null): boolean {
  const expiry = getTierExpiry(user);
  if (!expiry) return false; // No expiry = doesn't expire

  return new Date() > expiry;
}

/**
 * Check if user has a specific tier or higher
 */
export function hasTierOrHigher(
  userTier: UserTier,
  requiredTier: UserTier
): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

/**
 * Check if user can create a workspace
 */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  upgradeUrl?: string;
}

export function canCreateWorkspace(
  user: User,
  currentWorkspaceCount: number
): PermissionCheck {
  if (isTierExpired(user)) {
    return {
      allowed: false,
      reason: "Your subscription has expired. Please renew to continue.",
      upgradeUrl: "/pricing",
    };
  }

  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  if (isUnlimited(limits.workspaces)) {
    return { allowed: true };
  }

  if (currentWorkspaceCount >= limits.workspaces) {
    return {
      allowed: false,
      reason: `Workspace limit reached (${limits.workspaces}). Upgrade to create more workspaces.`,
      upgradeUrl: "/pricing",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can create a collaborative room
 */
export function canCreateRoom(
  user: User,
  currentRoomCount: number
): PermissionCheck {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  if (!limits.canCreateRooms) {
    return {
      allowed: false,
      reason: "Upgrade to Basic to create collaborative rooms.",
      upgradeUrl: "/pricing",
    };
  }

  if (isUnlimited(limits.activeRooms)) {
    return { allowed: true };
  }

  if (currentRoomCount >= limits.activeRooms) {
    return {
      allowed: false,
      reason: `Room limit reached (${limits.activeRooms}). Upgrade to create more rooms.`,
      upgradeUrl: "/pricing",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can create a private workspace
 */
export function canCreatePrivateWorkspace(user: User): PermissionCheck {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  if (!limits.canCreatePrivateWorkspace) {
    return {
      allowed: false,
      reason: "Upgrade to Basic for private workspaces.",
      upgradeUrl: "/pricing",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can use a specific canvas type
 */
export function canUseCanvasType(
  user: User,
  canvasType: string
): PermissionCheck {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  if (!limits.availableCanvasTypes.includes(canvasType as any)) {
    return {
      allowed: false,
      reason: `${canvasType} canvas requires ${tier === USER_TIERS.FREE ? "Basic" : "Pro"} tier or higher.`,
      upgradeUrl: "/pricing",
    };
  }

  return { allowed: true };
}

/**
 * Get remaining count for a specific limit
 */
export function getRemainingCount(limit: number, current: number): number {
  if (isUnlimited(limit)) return Infinity;
  return Math.max(0, limit - current);
}

/**
 * Get usage percentage for display
 */
export function getUsagePercentage(current: number, limit: number): number {
  if (isUnlimited(limit)) return 0;
  if (limit === 0) return 100;
  return Math.min(100, (current / limit) * 100);
}
