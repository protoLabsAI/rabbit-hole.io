"use client";

/**
 * Workspace Persistence
 *
 * Unified Hocuspocus persistence for ALL tiers.
 * Seat limits enforced server-side (Free: 1, Pro: 5, Enterprise: 50).
 */

import { useMemo } from "react";

import type { CanvasType } from "@protolabsai/workspace";

import { useWorkspace } from "../../hooks/useWorkspace";

export interface PersistenceContext {
  workspace: any;
  activeTab: any;
  ready: boolean;
  error: string | null;
  mode: "collaborative";
  updateCanvasData: (data: any) => void;
  switchTab: (tabId: string) => void;
  addTab: (canvasType: any, sessionId?: string) => void;
  closeTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  users?: Map<string, any>;
  others?: any[];
  followMode?: { enabled: boolean; followingUserId: string | null };
  canUndo?: boolean;
  canRedo?: boolean;
  undo?: () => void;
  redo?: () => void;
  saveVersion?: (
    name: string,
    description?: string,
    tags?: string[]
  ) => Promise<string>;
  loadVersion?: (versionId: string) => Promise<void>;
  listVersions?: () => Promise<any[]>;
  ydoc?: any;
  userId?: string;
}

interface WorkspacePersistenceProps {
  workspaceId: string;
  canvasType?: CanvasType;
  children: (context: PersistenceContext) => React.ReactNode;
}

export function WorkspacePersistence({
  workspaceId,
  canvasType = "graph",
  children,
}: WorkspacePersistenceProps) {
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    fullName: "Local User",
    imageUrl: "",
    publicMetadata: { tier: "free", role: "admin" },
    emailAddresses: [{ emailAddress: "local@localhost" }],
    primaryEmailAddress: { emailAddress: "local@localhost" },
  } as any;
  const workspace = useWorkspace(workspaceId, {
    mode: "editing",
    canvasType,
  });

  // Memoize context to prevent child re-renders
  const context: PersistenceContext = useMemo(
    () => ({
      workspace: workspace.workspace,
      activeTab: workspace.activeTab,
      ready: workspace.ready || false,
      error: workspace.error || null,
      mode: "collaborative" as const,
      updateCanvasData: workspace.updateCanvasData,
      switchTab: workspace.switchTab,
      addTab: workspace.addTab,
      closeTab: workspace.closeTab,
      reorderTabs: workspace.reorderTabs,
      users: workspace.users,
      others: workspace.others,
      followMode: workspace.followMode,
      canUndo: workspace.canUndo,
      canRedo: workspace.canRedo,
      undo: workspace.undo,
      redo: workspace.redo,
      saveVersion: workspace.saveVersion,
      loadVersion: workspace.loadVersion,
      listVersions: workspace.listVersions,
      ydoc: workspace.ydoc,
      userId: user?.id,
    }),
    [
      workspace.workspace,
      workspace.activeTab,
      workspace.ready,
      workspace.error,
      workspace.updateCanvasData,
      workspace.switchTab,
      workspace.addTab,
      workspace.closeTab,
      workspace.reorderTabs,
      workspace.users,
      workspace.others,
      workspace.followMode,
      workspace.canUndo,
      workspace.canRedo,
      workspace.undo,
      workspace.redo,
      workspace.saveVersion,
      workspace.loadVersion,
      workspace.listVersions,
      workspace.ydoc,
      user?.id,
    ]
  );

  return <>{children(context)}</>;
}
