/**
 * Tier Limit Enforcement (Neo4j-based)
 *
 * @deprecated For user workspaces, use client-side enforcement via useWorkspaceLimits hook.
 *
 * This module is reserved for:
 * - Rabbit Hole internal team operations
 * - Future enterprise Neo4j-backed workspaces
 * - Server-side validation when required
 *
 * User workspaces are local-first (Yjs + IndexedDB) and should be validated client-side.
 */

import { getEntityCount, getRelationshipCount } from "@proto/database";

import { getUserTier, getTierLimits } from "./tier-utils";

/**
 * Error thrown when a tier limit is exceeded
 */
export class TierLimitError extends Error {
  constructor(
    message: string,
    public limitType: string,
    public currentValue: number,
    public maxValue: number,
    public tier: string
  ) {
    super(message);
    this.name = "TierLimitError";
  }

  /**
   * Convert to API response format
   */
  toJSON() {
    return {
      error: this.message,
      limitType: this.limitType,
      currentValue: this.currentValue,
      maxValue: this.maxValue,
      tier: this.tier,
      upgradeUrl: "/pricing",
    };
  }
}

/**
 * Enforce entity creation limit
 *
 * @param user - Clerk user object
 * @param clerkOrgId - Organization ID for entity counting
 * @throws TierLimitError if limit exceeded
 */
export async function enforceEntityLimit(
  user: any,
  clerkOrgId: string
): Promise<void> {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  // Unlimited tier check
  if (limits.maxEntities === -1) {
    return; // No limit
  }

  const currentCount = await getEntityCount(clerkOrgId);

  if (currentCount >= limits.maxEntities) {
    throw new TierLimitError(
      `Entity limit reached (${limits.maxEntities}). Upgrade to add more.`,
      "entities",
      currentCount,
      limits.maxEntities,
      tier
    );
  }
}

/**
 * Check if bulk entity addition would exceed tier limit
 * Does NOT throw - returns result for pre-validation
 *
 * @param user - Clerk user object
 * @param clerkOrgId - Organization ID
 * @param additionalCount - Number of entities to be added
 * @returns Validation result with current/max counts
 */
export async function checkEntityLimitBulk(
  user: any,
  clerkOrgId: string,
  additionalCount: number
): Promise<{
  allowed: boolean;
  currentCount: number;
  maxCount: number;
  availableSlots: number;
  wouldExceedBy: number;
  tier: string;
}> {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  // Unlimited tier check
  if (limits.maxEntities === -1) {
    return {
      allowed: true,
      currentCount: 0,
      maxCount: -1,
      availableSlots: -1,
      wouldExceedBy: 0,
      tier,
    };
  }

  const currentCount = await getEntityCount(clerkOrgId);
  const totalAfterAddition = currentCount + additionalCount;
  const allowed = totalAfterAddition <= limits.maxEntities;
  const availableSlots = Math.max(0, limits.maxEntities - currentCount);
  const wouldExceedBy = allowed ? 0 : totalAfterAddition - limits.maxEntities;

  return {
    allowed,
    currentCount,
    maxCount: limits.maxEntities,
    availableSlots,
    wouldExceedBy,
    tier,
  };
}

/**
 * Enforce bulk entity addition limit
 * Throws TierLimitError if would exceed
 *
 * @param user - Clerk user object
 * @param clerkOrgId - Organization ID
 * @param additionalCount - Number of entities to be added
 * @throws TierLimitError if limit exceeded
 */
export async function enforceEntityLimitBulk(
  user: any,
  clerkOrgId: string,
  additionalCount: number
): Promise<void> {
  const result = await checkEntityLimitBulk(user, clerkOrgId, additionalCount);

  if (!result.allowed) {
    throw new TierLimitError(
      `Bulk operation would exceed entity limit. Current: ${result.currentCount}, ` +
        `Adding: ${additionalCount}, Limit: ${result.maxCount}. ` +
        `Available slots: ${result.availableSlots}.`,
      "entities",
      result.currentCount + additionalCount,
      result.maxCount,
      result.tier
    );
  }
}

/**
 * Enforce relationship creation limit
 *
 * @param user - Clerk user object
 * @param clerkOrgId - Organization ID for relationship counting
 * @throws TierLimitError if limit exceeded
 */
export async function enforceRelationshipLimit(
  user: any,
  clerkOrgId: string
): Promise<void> {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  // Unlimited tier check
  if (limits.maxRelationships === -1) {
    return;
  }

  const currentCount = await getRelationshipCount(clerkOrgId);

  if (currentCount >= limits.maxRelationships) {
    throw new TierLimitError(
      `Relationship limit reached (${limits.maxRelationships}). Upgrade to add more.`,
      "relationships",
      currentCount,
      limits.maxRelationships,
      tier
    );
  }
}

/**
 * Check if bulk relationship addition would exceed tier limit
 *
 * @param user - Clerk user object
 * @param clerkOrgId - Organization ID
 * @param additionalCount - Number of relationships to be added
 * @returns Validation result
 */
export async function checkRelationshipLimitBulk(
  user: any,
  clerkOrgId: string,
  additionalCount: number
): Promise<{
  allowed: boolean;
  currentCount: number;
  maxCount: number;
  availableSlots: number;
  wouldExceedBy: number;
  tier: string;
}> {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  if (limits.maxRelationships === -1) {
    return {
      allowed: true,
      currentCount: 0,
      maxCount: -1,
      availableSlots: -1,
      wouldExceedBy: 0,
      tier,
    };
  }

  const currentCount = await getRelationshipCount(clerkOrgId);
  const totalAfterAddition = currentCount + additionalCount;
  const allowed = totalAfterAddition <= limits.maxRelationships;
  const availableSlots = Math.max(0, limits.maxRelationships - currentCount);
  const wouldExceedBy = allowed
    ? 0
    : totalAfterAddition - limits.maxRelationships;

  return {
    allowed,
    currentCount,
    maxCount: limits.maxRelationships,
    availableSlots,
    wouldExceedBy,
    tier,
  };
}

/**
 * Enforce bulk relationship addition limit
 *
 * @param user - Clerk user object
 * @param clerkOrgId - Organization ID
 * @param additionalCount - Number of relationships to be added
 * @throws TierLimitError if limit exceeded
 */
export async function enforceRelationshipLimitBulk(
  user: any,
  clerkOrgId: string,
  additionalCount: number
): Promise<void> {
  const result = await checkRelationshipLimitBulk(
    user,
    clerkOrgId,
    additionalCount
  );

  if (!result.allowed) {
    throw new TierLimitError(
      `Bulk operation would exceed relationship limit. Current: ${result.currentCount}, ` +
        `Adding: ${additionalCount}, Limit: ${result.maxCount}. ` +
        `Available slots: ${result.availableSlots}.`,
      "relationships",
      result.currentCount + additionalCount,
      result.maxCount,
      result.tier
    );
  }
}

/**
 * Enforce file size limit (single file)
 *
 * @param user - Clerk user object
 * @param fileSize - File size in bytes
 * @throws TierLimitError if file exceeds tier's max file size
 */
export async function enforceFileSizeLimit(
  user: any,
  fileSize: number
): Promise<void> {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  // Unlimited tier check
  if (limits.maxFileSize === -1) {
    return;
  }

  if (fileSize > limits.maxFileSize) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const limitMB = (limits.maxFileSize / (1024 * 1024)).toFixed(2);

    throw new TierLimitError(
      `File size (${sizeMB} MB) exceeds ${tier} tier limit of ${limitMB} MB. Upgrade to upload larger files.`,
      "fileSize",
      fileSize,
      limits.maxFileSize,
      tier
    );
  }
}

/**
 * Enforce storage limit (total storage)
 *
 * @param user - Clerk user object
 * @param clerkOrgId - Organization ID
 * @param additionalSize - Additional storage in bytes to be added
 * @throws TierLimitError if would exceed storage limit
 */
export async function enforceStorageLimit(
  user: any,
  clerkOrgId: string,
  additionalSize: number
): Promise<void> {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  // Unlimited tier check
  if (limits.fileStorage === -1) {
    return;
  }

  // Import here to avoid circular dependency
  const { getStorageUsed } = await import("@proto/database");
  const currentStorage = await getStorageUsed(clerkOrgId);

  if (currentStorage + additionalSize > limits.fileStorage) {
    const currentMB = (currentStorage / (1024 * 1024)).toFixed(2);
    const additionalMB = (additionalSize / (1024 * 1024)).toFixed(2);
    const limitMB = (limits.fileStorage / (1024 * 1024)).toFixed(2);

    throw new TierLimitError(
      `Upload would exceed storage limit. Current: ${currentMB} MB, Upload: ${additionalMB} MB, Limit: ${limitMB} MB. Upgrade for more storage.`,
      "storage",
      currentStorage + additionalSize,
      limits.fileStorage,
      tier
    );
  }
}

/**
 * Enforce workspace creation limit
 *
 * STUB: Workspace counting not yet implemented.
 * Placeholder for future implementation.
 *
 * @param user - Clerk user object
 * @param userId - User ID for workspace counting
 */
export async function enforceWorkspaceLimit(
  user: any,
  userId: string
): Promise<void> {
  // TODO: Implement when workspace registry is available
  // For now, always allow (Free tier gets 1 workspace anyway)
  return;
}
