/**
 * User role definitions for Rabbit Hole application
 *
 * Roles are stored in Clerk's publicMetadata and define access levels:
 * - viewer: Read-only access to data
 * - member: Standard user with data modification capabilities
 * - admin: Full system access including admin functions
 * - super_admin: Emergency access (production capable)
 */

export const USER_ROLES = {
  VIEWER: "viewer",
  MEMBER: "member",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * User tier definitions for pricing and feature limits
 *
 * Tiers are stored in Clerk's publicMetadata and control:
 * - Feature access (canvas types, collaboration, etc.)
 * - Usage limits (entities, workspaces, storage, etc.)
 * - Billing and subscriptions
 */

export const USER_TIERS = {
  FREE: "free",
  BASIC: "basic",
  PRO: "pro",
  TEAM: "team",
  ENTERPRISE: "enterprise",
} as const;

export type UserTier = (typeof USER_TIERS)[keyof typeof USER_TIERS];

/**
 * Role hierarchy for permission checking
 * Higher level includes all permissions of lower levels
 */
export const ROLE_HIERARCHY = {
  [USER_ROLES.VIEWER]: 0,
  [USER_ROLES.MEMBER]: 1,
  [USER_ROLES.ADMIN]: 2,
} as const;

/**
 * Role metadata for UI display and description
 */
export const ROLE_METADATA = {
  [USER_ROLES.VIEWER]: {
    label: "Viewer",
    description: "Read-only access - can view data but not modify",
    color: "text-blue-600",
    permissions: ["view_entities", "view_relationships", "view_evidence"],
  },
  [USER_ROLES.MEMBER]: {
    label: "Member",
    description: "Standard access - can create and modify data",
    color: "text-green-600",
    permissions: [
      "view_entities",
      "view_relationships",
      "view_evidence",
      "create_entities",
      "edit_entities",
      "create_relationships",
      "edit_relationships",
      "use_ai_research",
      "export_data",
    ],
  },
  [USER_ROLES.ADMIN]: {
    label: "Admin",
    description: "Full system access - can manage users and system settings",
    color: "text-red-600",
    permissions: [
      "view_entities",
      "view_relationships",
      "view_evidence",
      "create_entities",
      "edit_entities",
      "delete_entities",
      "create_relationships",
      "edit_relationships",
      "delete_relationships",
      "use_ai_research",
      "export_data",
      "import_data",
      "merge_entities",
      "manage_users",
      "system_admin",
      "access_admin_panel",
    ],
  },
} as const;

/**
 * Default role for new users
 */
export const DEFAULT_USER_ROLE: UserRole = USER_ROLES.MEMBER;

/**
 * Extended user interface including role and tier information
 */
export interface AuthenticatedUser {
  userId: string;
  emailAddress: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  tier: UserTier;
  tierExpiry: Date | null;
}

/**
 * Type guard to check if a string is a valid user role
 */
export function isValidUserRole(role: string): role is UserRole {
  return Object.values(USER_ROLES).includes(role as UserRole);
}

/**
 * Type guard to check if a string is a valid user tier
 */
export function isValidUserTier(tier: string): tier is UserTier {
  return Object.values(USER_TIERS).includes(tier as UserTier);
}
