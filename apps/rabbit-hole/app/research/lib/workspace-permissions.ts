/**
 * Workspace Permissions Utilities
 *
 * Centralized permission checks for workspace actions.
 * Guards for owner-only operations and view mode restrictions.
 */

import type { Workspace } from "../types/workspace";

export interface WorkspacePermissions {
  isOwner: boolean;
  isViewMode: boolean;
  canEdit: boolean;
  canAddTabs: boolean;
  canCloseTabs: boolean;
  canReorderTabs: boolean;
  canCreateSessions: boolean;
  canToggleViewMode: boolean;
}

/**
 * Calculate workspace permissions for a user
 */
export function getWorkspacePermissions(
  workspace: Workspace | null,
  userId: string | null | undefined,
  isViewMode: boolean = false
): WorkspacePermissions {
  const isOwner = workspace?.metadata?.owner === userId;

  return {
    isOwner,
    isViewMode,
    canEdit: isOwner && !isViewMode,
    canAddTabs: isOwner && !isViewMode,
    canCloseTabs: isOwner && !isViewMode,
    canReorderTabs: isOwner && !isViewMode,
    canCreateSessions: isOwner && !isViewMode,
    canToggleViewMode: isOwner,
  };
}

/**
 * Guard functions for specific actions
 */
export const workspaceGuards = {
  canEdit: (perms: WorkspacePermissions) => perms.canEdit,
  canAddTab: (perms: WorkspacePermissions) => perms.canAddTabs,
  canCloseTab: (perms: WorkspacePermissions) => perms.canCloseTabs,
  canReorderTab: (perms: WorkspacePermissions) => perms.canReorderTabs,
  canCreateSession: (perms: WorkspacePermissions) => perms.canCreateSessions,
  canToggleView: (perms: WorkspacePermissions) => perms.canToggleViewMode,
};
