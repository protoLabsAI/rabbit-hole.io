/**
 * Tier Limits Configuration
 *
 * Defines feature limits and capabilities for each user tier.
 * Based on pricing matrix in docs/USER_TIERS_AND_PERMISSIONS.md
 */

import { USER_TIERS, type UserTier } from "./types";

// Canvas types for tier limits
type CanvasType = "graph" | "map" | "timeline" | "table" | "kanban" | "mindmap";

export interface UserTierLimits {
  // Storage & Limits
  workspaces: number;
  canvasPerWorkspace: number;
  maxEntities: number;
  maxRelationships: number;
  fileStorage: number; // bytes
  maxFileSize: number; // bytes
  versionHistoryDays: number;

  // Yjs Document Management
  maxDocumentSize: number; // bytes - hard limit for Yjs documents
  documentHistoryRetentionDays: number; // days - auto-prune policy (0 = no history)

  // YouTube Processing
  youtubeVideoQuality: "720p" | "1080p";
  maxYouTubeVideoSize: number; // bytes
  maxYouTubeVideosPerBatch: number;

  // Collaboration
  canCreatePrivateWorkspace: boolean;
  viewOnlyLinks: number;
  linkExpiryDays: number;
  canPasswordProtectLinks: boolean;
  canCreateRooms: boolean;
  activeRooms: number;
  collaboratorsPerRoom: number;
  guestTierRestrictions: UserTier | null; // Minimum tier for guests
  roomPersistenceDays: number;

  // Collaboration Sessions (Live Share model)
  maxActiveSessions: number; // How many live sessions at once
  maxEditorsPerSession: number; // How many can edit
  maxViewersPerSession: number; // How many view-only
  sessionDurationMinutes: number; // Auto-expire after X min idle
  canHideSessionTabs: boolean; // Can mark tabs as "hidden"

  // Canvas & Visualization
  availableCanvasTypes: CanvasType[];

  // AI & Automation
  aiQueriesPerDay: number;
  hasAIChatAccess: boolean; // Access to AI chat interface
  hasAutoRelationshipDiscovery: boolean;
  hasSmartSuggestions: boolean;
  hasBulkOperations: boolean;
  hasCustomAIPrompts: boolean;
  hasAPIAccess: boolean;

  // Features
  has2FA: boolean;
  hasSSO: boolean;
  hasAuditLogs: boolean;
  hasCustomDataRetention: boolean;
  hasSelfHosted: boolean;
  hasDrawingTools: boolean; // tldraw integration (paid feature)
  hasCustomThemes: boolean; // Theme customization (paid feature)

  // Support
  emailSupport: string | null; // "48h", "24h", "12h", "4h"
  hasPrioritySupport: boolean;
  hasPhoneSupport: boolean;
  hasDedicatedAccountManager: boolean;
  hasOnboarding: boolean;
  hasCustomTraining: boolean;
}

export const TIER_LIMITS: Record<UserTier, UserTierLimits> = {
  [USER_TIERS.FREE]: {
    // Storage & Limits
    workspaces: 1,
    canvasPerWorkspace: 1,
    maxEntities: 50,
    maxRelationships: 100,
    fileStorage: 100 * 1024 * 1024, // 100 MB
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    versionHistoryDays: 0, // No version history

    // Yjs Document Management
    maxDocumentSize: 10 * 1024 * 1024, // 10 MB
    documentHistoryRetentionDays: 0, // No history - snapshot only

    // YouTube Processing
    youtubeVideoQuality: "720p",
    maxYouTubeVideoSize: 500 * 1024 * 1024, // 500 MB
    maxYouTubeVideosPerBatch: 5,

    // Collaboration
    canCreatePrivateWorkspace: false,
    viewOnlyLinks: 3,
    linkExpiryDays: 7,
    canPasswordProtectLinks: false,
    canCreateRooms: false,
    activeRooms: 0,
    collaboratorsPerRoom: 0,
    guestTierRestrictions: null, // Can't create rooms anyway
    roomPersistenceDays: 0,

    // Collaboration Sessions
    maxActiveSessions: 0, // Cannot create sessions
    maxEditorsPerSession: 0,
    maxViewersPerSession: 0,
    sessionDurationMinutes: 0,
    canHideSessionTabs: false,

    // Canvas & Visualization
    availableCanvasTypes: ["graph"], // Only graph canvas

    // AI & Automation
    aiQueriesPerDay: 10,
    hasAIChatAccess: false, // Free tier: No AI chat access
    hasAutoRelationshipDiscovery: false,
    hasSmartSuggestions: false,
    hasBulkOperations: false,
    hasCustomAIPrompts: false,
    hasAPIAccess: false,

    // Features
    has2FA: false,
    hasSSO: false,
    hasAuditLogs: false,
    hasCustomDataRetention: false,
    hasSelfHosted: false,
    hasDrawingTools: true, // Drawing tools enabled for all users
    hasCustomThemes: false, // Free tier: Default theme only

    // Support
    emailSupport: null, // Community only
    hasPrioritySupport: false,
    hasPhoneSupport: false,
    hasDedicatedAccountManager: false,
    hasOnboarding: false,
    hasCustomTraining: false,
  },

  [USER_TIERS.BASIC]: {
    // Storage & Limits
    workspaces: 5,
    canvasPerWorkspace: 1,
    maxEntities: 500,
    maxRelationships: 1000,
    fileStorage: 5 * 1024 * 1024 * 1024, // 5 GB
    maxFileSize: 25 * 1024 * 1024, // 25 MB
    versionHistoryDays: 7,

    // Yjs Document Management
    maxDocumentSize: 25 * 1024 * 1024, // 25 MB
    documentHistoryRetentionDays: 14, // 14 days

    // YouTube Processing
    youtubeVideoQuality: "1080p",
    maxYouTubeVideoSize: 2 * 1024 * 1024 * 1024, // 2 GB
    maxYouTubeVideosPerBatch: 20,

    // Collaboration
    canCreatePrivateWorkspace: true,
    viewOnlyLinks: 10,
    linkExpiryDays: 30,
    canPasswordProtectLinks: true,
    canCreateRooms: true,
    activeRooms: 1,
    collaboratorsPerRoom: 1, // Self + 1 other person = 2 total (updated from 2)
    guestTierRestrictions: USER_TIERS.FREE, // Free+ can join
    roomPersistenceDays: 30,

    // Collaboration Sessions
    maxActiveSessions: 1, // 1 active session at a time
    maxEditorsPerSession: 1, // Owner + 1 editor = 2 total editors
    maxViewersPerSession: 0, // Basic tier: no view-only guests
    sessionDurationMinutes: 30, // 30 minute sessions
    canHideSessionTabs: false,

    // Canvas & Visualization
    availableCanvasTypes: ["graph", "map", "timeline"],

    // AI & Automation
    aiQueriesPerDay: 100,
    hasAIChatAccess: true, // Basic tier: AI chat enabled
    hasAutoRelationshipDiscovery: true,
    hasSmartSuggestions: true,
    hasBulkOperations: false,
    hasCustomAIPrompts: false,
    hasAPIAccess: false,

    // Features
    has2FA: true,
    hasSSO: false,
    hasAuditLogs: false,
    hasCustomDataRetention: false,
    hasSelfHosted: false,
    hasDrawingTools: true, // Basic tier: Drawing tools enabled
    hasCustomThemes: true, // Basic tier: Theme customization enabled

    // Support
    emailSupport: "48h",
    hasPrioritySupport: false,
    hasPhoneSupport: false,
    hasDedicatedAccountManager: false,
    hasOnboarding: false,
    hasCustomTraining: false,
  },

  [USER_TIERS.PRO]: {
    // Storage & Limits
    workspaces: 25,
    canvasPerWorkspace: 1,
    maxEntities: 5000,
    maxRelationships: 10000,
    fileStorage: 50 * 1024 * 1024 * 1024, // 50 GB
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    versionHistoryDays: 30,

    // Yjs Document Management
    maxDocumentSize: 100 * 1024 * 1024, // 100 MB
    documentHistoryRetentionDays: 30, // 30 days

    // YouTube Processing
    youtubeVideoQuality: "1080p",
    maxYouTubeVideoSize: 5 * 1024 * 1024 * 1024, // 5 GB
    maxYouTubeVideosPerBatch: 50,

    // Collaboration
    canCreatePrivateWorkspace: true,
    viewOnlyLinks: 50,
    linkExpiryDays: 0, // Custom expiry
    canPasswordProtectLinks: true,
    canCreateRooms: true,
    activeRooms: 5,
    collaboratorsPerRoom: 5,
    guestTierRestrictions: USER_TIERS.FREE,
    roomPersistenceDays: 365,

    // Collaboration Sessions
    maxActiveSessions: 5, // 5 concurrent sessions
    maxEditorsPerSession: 5, // Owner + 5 editors
    maxViewersPerSession: 10, // 10 view-only
    sessionDurationMinutes: 120, // 2 hours
    canHideSessionTabs: true,

    // Canvas & Visualization
    availableCanvasTypes: [
      "graph",
      "map",
      "timeline",
      "table",
      "kanban",
      "mindmap",
    ],

    // AI & Automation
    aiQueriesPerDay: 1000,
    hasAIChatAccess: true, // Pro tier: AI chat enabled
    hasAutoRelationshipDiscovery: true,
    hasSmartSuggestions: true,
    hasBulkOperations: true,
    hasCustomAIPrompts: false,
    hasAPIAccess: false,

    // Features
    has2FA: true,
    hasSSO: false,
    hasAuditLogs: true,
    hasCustomDataRetention: false,
    hasSelfHosted: false,
    hasDrawingTools: true, // Pro tier: Drawing tools enabled
    hasCustomThemes: true, // Pro tier: Theme customization enabled

    // Support
    emailSupport: "24h",
    hasPrioritySupport: true,
    hasPhoneSupport: false,
    hasDedicatedAccountManager: false,
    hasOnboarding: false,
    hasCustomTraining: false,
  },

  [USER_TIERS.TEAM]: {
    // Storage & Limits
    workspaces: -1, // Unlimited
    canvasPerWorkspace: 1,
    maxEntities: 50000,
    maxRelationships: 100000,
    fileStorage: 500 * 1024 * 1024 * 1024, // 500 GB
    maxFileSize: 500 * 1024 * 1024, // 500 MB
    versionHistoryDays: 365,

    // Yjs Document Management
    maxDocumentSize: 250 * 1024 * 1024, // 250 MB
    documentHistoryRetentionDays: 90, // 90 days

    // YouTube Processing
    youtubeVideoQuality: "1080p",
    maxYouTubeVideoSize: 10 * 1024 * 1024 * 1024, // 10 GB
    maxYouTubeVideosPerBatch: 100,

    // Collaboration
    canCreatePrivateWorkspace: true,
    viewOnlyLinks: 200,
    linkExpiryDays: 0, // Custom
    canPasswordProtectLinks: true,
    canCreateRooms: true,
    activeRooms: 25,
    collaboratorsPerRoom: 25,
    guestTierRestrictions: null, // Any tier
    roomPersistenceDays: -1, // Unlimited

    // Collaboration Sessions
    maxActiveSessions: 25,
    maxEditorsPerSession: 25,
    maxViewersPerSession: 50,
    sessionDurationMinutes: 480,
    canHideSessionTabs: true,

    // Canvas & Visualization
    availableCanvasTypes: [
      "graph",
      "map",
      "timeline",
      "table",
      "kanban",
      "mindmap",
    ],

    // AI & Automation
    aiQueriesPerDay: 10000,
    hasAIChatAccess: true, // Team tier: AI chat enabled
    hasAutoRelationshipDiscovery: true,
    hasSmartSuggestions: true,
    hasBulkOperations: true,
    hasCustomAIPrompts: true,
    hasAPIAccess: true,

    // Features
    has2FA: true,
    hasSSO: true,
    hasAuditLogs: true,
    hasCustomDataRetention: true,
    hasSelfHosted: false,
    hasDrawingTools: true, // Team tier: Drawing tools enabled
    hasCustomThemes: true, // Team tier: Theme customization enabled

    // Support
    emailSupport: "12h",
    hasPrioritySupport: true,
    hasPhoneSupport: true,
    hasDedicatedAccountManager: false,
    hasOnboarding: true,
    hasCustomTraining: false,
  },

  [USER_TIERS.ENTERPRISE]: {
    // Storage & Limits
    workspaces: -1, // Unlimited
    canvasPerWorkspace: 1,
    maxEntities: -1, // Unlimited
    maxRelationships: -1, // Unlimited
    fileStorage: -1, // Custom
    maxFileSize: -1, // Custom
    versionHistoryDays: -1, // Custom

    // Yjs Document Management
    maxDocumentSize: 500 * 1024 * 1024, // 500 MB
    documentHistoryRetentionDays: -1, // Unlimited - no auto-pruning

    // YouTube Processing
    youtubeVideoQuality: "1080p",
    maxYouTubeVideoSize: -1, // Unlimited
    maxYouTubeVideosPerBatch: -1, // Unlimited

    // Collaboration
    canCreatePrivateWorkspace: true,
    viewOnlyLinks: -1, // Unlimited
    linkExpiryDays: 0, // Custom
    canPasswordProtectLinks: true,
    canCreateRooms: true,
    activeRooms: -1, // Unlimited
    collaboratorsPerRoom: -1, // Unlimited
    guestTierRestrictions: null, // Any tier
    roomPersistenceDays: -1, // Unlimited

    // Collaboration Sessions
    maxActiveSessions: -1,
    maxEditorsPerSession: -1,
    maxViewersPerSession: -1,
    sessionDurationMinutes: -1,
    canHideSessionTabs: true,

    // Canvas & Visualization
    availableCanvasTypes: [
      "graph",
      "map",
      "timeline",
      "table",
      "kanban",
      "mindmap",
    ],

    // AI & Automation
    aiQueriesPerDay: -1, // Unlimited
    hasAIChatAccess: true, // Enterprise tier: AI chat enabled
    hasAutoRelationshipDiscovery: true,
    hasSmartSuggestions: true,
    hasBulkOperations: true,
    hasCustomAIPrompts: true,
    hasAPIAccess: true,

    // Features
    has2FA: true,
    hasSSO: true,
    hasAuditLogs: true,
    hasCustomDataRetention: true,
    hasSelfHosted: true,
    hasDrawingTools: true, // Enterprise tier: Drawing tools enabled
    hasCustomThemes: true, // Enterprise tier: Theme customization enabled

    // Support
    emailSupport: "4h",
    hasPrioritySupport: true,
    hasPhoneSupport: true,
    hasDedicatedAccountManager: true,
    hasOnboarding: true,
    hasCustomTraining: true,
  },
};

/**
 * Check if a limit is unlimited (-1)
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Check if user is within limit
 */
export function isWithinLimit(current: number, limit: number): boolean {
  if (isUnlimited(limit)) return true;
  return current < limit;
}
