/**
 * Sync Strategy by User Tier
 *
 * Determines workspace sync behavior based on user tier.
 */

// Inline tier constants to avoid server imports
const USER_TIERS = {
  FREE: "free",
  BASIC: "basic",
  PRO: "pro",
  TEAM: "team",
  ENTERPRISE: "enterprise",
} as const;

export type UserTier = (typeof USER_TIERS)[keyof typeof USER_TIERS];

export interface SyncStrategy {
  usesHocuspocus: boolean;
  usesIndexedDB: boolean;
  canSync: boolean;
  syncLabel: string;
}

export function getSyncStrategy(tier: UserTier): SyncStrategy {
  switch (tier) {
    case USER_TIERS.FREE:
      return {
        usesHocuspocus: false, // Local only
        usesIndexedDB: true, // Local persistence
        canSync: false, // No device sync
        syncLabel: "Local Only",
      };

    case USER_TIERS.BASIC:
    case USER_TIERS.PRO:
      return {
        usesHocuspocus: true, // User-scoped sync
        usesIndexedDB: true, // Local cache
        canSync: true, // 3/10 devices
        syncLabel: "Synced",
      };

    case USER_TIERS.TEAM:
    case USER_TIERS.ENTERPRISE:
      return {
        usesHocuspocus: true, // Org-wide sync
        usesIndexedDB: true, // Local cache
        canSync: true, // Team-wide sync
        syncLabel: "Team Synced",
      };

    default:
      return {
        usesHocuspocus: false,
        usesIndexedDB: true,
        canSync: false,
        syncLabel: "Local Only",
      };
  }
}
