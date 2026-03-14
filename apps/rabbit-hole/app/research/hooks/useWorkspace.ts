/**
 * Workspace Hook
 *
 * Manages multi-tab workspace with Yjs sync.
 * Supports main tab + collaboration session tabs.
 */

import { useState, useEffect, useCallback, useMemo } from "react";

import { logUserAction } from "@proto/logger";
import type {
  Workspace,
  UserPresence,
  CanvasType,
  WorkspaceTab,
} from "@proto/workspace";
import {
  useYjsHistory,
  IndexedDBVersionStorage,
  type VersionMetadata,
} from "@proto/yjs-history";

import { useLocalYjs } from "@/hooks/useLocalYjs";

import { getCanvasRenderer } from "../components/workspace/canvas/CanvasRegistry";

import {
  getTabsFromYMap,
  getTabById,
  updateTabCanvasData,
  addTabToYMap,
  removeTabFromYMap,
  reorderTabsInYMap,
  migrateLegacyTabsToYMap,
  isYMapWorkspace,
  initializeYMapTabs,
  tabExistsInYMap,
} from "./useWorkspaceYMapHelpers";

export interface OtherUser {
  clientId: number;
  userId: string;
  name?: string;
  color?: string;
  cursor?: { x: number; y: number } | null;
}

export interface UseWorkspaceOptions {
  mode?: "viewing" | "editing";
  draftId?: string;
  canvasType?: CanvasType; // For new workspaces
}

export interface UseWorkspaceReturn {
  ydoc: any;
  workspace: Workspace | null;
  activeTab: WorkspaceTab | null;
  users: Map<string, UserPresence>;
  userId: string | null;
  ready: boolean;
  error: string | null;
  others: OtherUser[];
  followMode: { enabled: boolean; followingUserId: string | null };
  updateCanvasData: (data: any) => void;
  switchTab: (tabId: string) => void;
  addTab: (canvasType: CanvasType, sessionId?: string) => void;
  closeTab: (tabId: string) => Promise<void>;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  toggleFollowMode: (targetUserId: string | null) => void;
  updateCursor: (x: number | null, y: number | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearUndoHistory: () => void;
  // Version management
  saveVersion: (
    name: string,
    description?: string,
    tags?: string[]
  ) => Promise<string>;
  loadVersion: (versionId: string) => Promise<void>;
  listVersions: () => Promise<VersionMetadata[]>;
}

export function useWorkspace(
  workspaceId: string,
  options?: UseWorkspaceOptions
): UseWorkspaceReturn {
  const userId = "local-user";
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [users, setUsers] = useState<Map<string, UserPresence>>(new Map());
  const [followMode, setFollowMode] = useState<{
    enabled: boolean;
    followingUserId: string | null;
  }>({ enabled: false, followingUserId: null });

  // Local-only provider (IndexedDB)
  const { ydoc, ready, others, error, updateCursor } = useLocalYjs({
    workspaceId,
    userId: userId || "",
    enabled: !!userId,
  });

  // Initialize undo manager and version history (only in editing mode)
  const yWorkspace = ydoc?.getMap("workspace");
  // Memoize version storage to prevent re-instantiation on every render
  const versionStorage = useMemo(
    () => new IndexedDBVersionStorage(workspaceId),
    [workspaceId]
  );

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearUndoHistory,
    createVersion,
    listVersions,
    restoreVersion,
  } = useYjsHistory({
    ydoc,
    userId: userId || null,
    scope: yWorkspace,
    enabled: options?.mode === "editing",
    maxUndoStackSize: 50,
    captureTimeout: 500,
    enableVersioning: true,
    versionStorage,
    autoVersionInterval: 50,
  });

  // Initialize workspace from Yjs or create new
  useEffect(() => {
    console.log("🔍 useWorkspace effect running:", {
      ydoc: !!ydoc,
      userId: !!userId,
      ready,
      workspaceId,
    });

    if (!ydoc || !userId || !ready) {
      console.log("⚠️ useWorkspace effect blocked:", {
        hasYdoc: !!ydoc,
        hasUserId: !!userId,
        ready,
      });
      return;
    }

    console.log("✅ useWorkspace effect proceeding with initialization");

    const yWorkspace = ydoc.getMap("workspace");
    const yUsers = ydoc.getMap("users");

    // Auto-migrate legacy Y.Array tabs to Y.Map if needed
    const migrationResult = migrateLegacyTabsToYMap(ydoc, userId);
    if (migrationResult.migratedCount > 0) {
      console.log(`✅ Migrated ${migrationResult.migratedCount} tabs to Y.Map`);
    }

    // If migration failed due to type conflict, bail out
    if (!migrationResult.success) {
      console.error(
        "❌ Migration failed - workspace unusable. Clear data and refresh."
      );
      console.error("   Run: ./scripts/clear-workspace-data.sh");
      console.error(
        "   Or: DevTools → Application → IndexedDB → Delete workspace databases"
      );
      return;
    }

    // Load or create workspace
    console.log("📋 yWorkspace.size:", yWorkspace.size);
    if (yWorkspace.size === 0) {
      console.log("🆕 Creating new workspace");
      const now = Date.now();

      const newWorkspace: Workspace = {
        id: workspaceId,
        name: "Research Workspace",
        tabs: [], // Start empty - auto-created below
        activeTabId: null,
        metadata: {
          createdAt: now,
          updatedAt: now,
          owner: userId,
          isPublic: false,
        },
      };

      ydoc.transact(() => {
        yWorkspace.set("id", newWorkspace.id);
        yWorkspace.set("name", newWorkspace.name);
        yWorkspace.set("activeTabId", null);
        yWorkspace.set("metadata", newWorkspace.metadata);

        // Initialize Y.Map structure
        initializeYMapTabs(ydoc, userId);
      }, userId);
      console.log("✅ New workspace created in Yjs with Y.Map structure");

      // Auto-create first tab after Yjs transaction completes
      setTimeout(() => {
        const hasTabs = getTabsFromYMap(ydoc).length > 0;
        if (!hasTabs) {
          console.log("🆕 Auto-creating first tab (single-tab mode)");
          addTab("graph");
        }
      }, 0);
    } else {
      console.log("📥 Loading existing workspace from Yjs");
    }

    // Load workspace state
    const loadWorkspace = () => {
      // Use Y.Map helpers to get tabs
      const tabs = getTabsFromYMap(ydoc);
      const activeTabId = yWorkspace.get("activeTabId") as string | null;

      console.log("📊 Loading workspace state (Y.Map):", {
        id: yWorkspace.get("id"),
        tabCount: tabs.length,
        activeTabId,
        usesYMap: isYMapWorkspace(ydoc),
      });

      const ws: Workspace = {
        id: yWorkspace.get("id") as string,
        name: yWorkspace.get("name") as string,
        tabs,
        activeTabId: activeTabId,
        metadata: (yWorkspace.get("metadata") as Workspace["metadata"]) || {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          owner: userId,
          isPublic: false,
        },
      };
      setWorkspace(ws);
      console.log("✅ Workspace state loaded:", {
        id: ws.id,
        name: ws.name,
        tabCount: ws.tabs.length,
        activeTabId: ws.activeTabId,
      });
    };

    // Load users presence
    const loadUsers = () => {
      const userMap = new Map<string, UserPresence>();
      yUsers.forEach((presence: any, uid: string) => {
        userMap.set(uid, presence);
      });
      setUsers(userMap);
    };

    // Observe changes (debounce to prevent sync loops)
    let reloadTimeout: NodeJS.Timeout;
    const workspaceObserver = () => {
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => loadWorkspace(), 100);
    };

    const tabsObserver = () => {
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => loadWorkspace(), 100);
    };

    const usersObserver = () => {
      loadUsers();
    };

    // Observe Y.Map tabs structure (uses "tabsMap" to avoid legacy conflicts)
    const yTabsMap = ydoc.getMap("tabsMap");
    const yTabOrder = ydoc.getArray("tabOrder");

    yWorkspace.observe(workspaceObserver);
    yTabsMap.observeDeep(tabsObserver); // Deep observe for nested Y.Maps
    yTabOrder.observe(tabsObserver); // Observe order changes
    yUsers.observe(usersObserver);

    // Initial load
    loadWorkspace();
    loadUsers();

    // Auto-select first tab if needed (run once, not in observer)
    const tabs = getTabsFromYMap(ydoc);
    const currentActiveTabId = yWorkspace.get("activeTabId");
    if (!currentActiveTabId && tabs.length > 0) {
      console.log("🔄 Auto-selecting first tab:", tabs[0].id);
      ydoc.transact(() => {
        yWorkspace.set("activeTabId", tabs[0].id);
      }, userId);
    }

    // Update own presence
    const updatePresence = () => {
      if (!userId) return;
      const presence: UserPresence = {
        userId,
        userName: "User", // TODO: Get from user profile
        userColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        lastSeen: Date.now(),
        isFollowing: followMode.followingUserId,
      };
      yUsers.set(userId, presence);
    };

    updatePresence();
    const presenceInterval = setInterval(updatePresence, 5000);

    return () => {
      yWorkspace.unobserve(workspaceObserver);
      yTabsMap.unobserveDeep(tabsObserver);
      yTabOrder.unobserve(tabsObserver);
      yUsers.unobserve(usersObserver);
      clearInterval(presenceInterval);
    };
  }, [
    ydoc,
    userId,
    ready, // Keep ready - effect must run when connection becomes ready to load workspace
    workspaceId,
    followMode.followingUserId,
    options?.canvasType,
  ]);

  // Update active tab's canvas data
  const updateCanvasData = useCallback(
    (data: any) => {
      if (!ydoc || !userId || !workspace?.activeTabId) return;

      // Use Y.Map helper - direct property update, no delete+insert
      updateTabCanvasData(ydoc, workspace.activeTabId, data, userId);
    },
    [ydoc, userId, workspace?.activeTabId]
  );

  // Switch active tab
  const switchTab = useCallback(
    (tabId: string) => {
      if (!ydoc || !userId) return;

      const sessionId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("sessionId") || undefined
          : undefined;

      logUserAction({
        action: "workspace_tab_switch",
        page: "/research",
        userId,
        sessionId,
        target: tabId,
      });

      const yWorkspace = ydoc.getMap("workspace");
      ydoc.transact(() => {
        yWorkspace.set("activeTabId", tabId);
      }, userId);
    },
    [ydoc, userId]
  );

  // Add new tab
  const addTab = useCallback(
    (canvasType: CanvasType, sessionId?: string) => {
      if (!ydoc || !userId) return;

      const trackingSessionId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("sessionId") || undefined
          : undefined;

      logUserAction({
        action: "workspace_tab_create",
        page: "/research",
        userId,
        sessionId: trackingSessionId,
        target: canvasType,
        value: { isCollabSession: !!sessionId },
      });

      const renderer = getCanvasRenderer(canvasType);
      const now = Date.now();
      const newTabId = sessionId || `tab-${now}`;

      // Check if tab already exists using Y.Map helper
      if (tabExistsInYMap(ydoc, newTabId)) {
        console.warn(
          `⚠️ Tab with ID ${newTabId} already exists, skipping addTab`
        );
        // Switch to existing tab instead
        const yWorkspace = ydoc.getMap("workspace");
        ydoc.transact(() => {
          yWorkspace.set("activeTabId", newTabId);
        }, userId);
        return;
      }

      const newTab: WorkspaceTab = {
        id: newTabId,
        name: sessionId ? "Collaboration Session" : `New ${renderer.label}`,
        type: sessionId ? "session" : "main",
        canvasType,
        canvasData: renderer.createDefaultData(),
        roomId: sessionId ? `session:${sessionId}` : workspaceId,
        visibility: "edit",
        sessionId,
        metadata: {
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
        },
      };

      // Use Y.Map helper to add tab
      addTabToYMap(ydoc, newTab, userId);

      // Set as active
      const yWorkspace = ydoc.getMap("workspace");
      ydoc.transact(() => {
        yWorkspace.set("activeTabId", newTab.id);
      }, userId);
    },
    [ydoc, userId, workspaceId]
  );

  // Reorder tabs
  const reorderTabs = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!ydoc || !userId) return;

      // Use Y.Map helper for reordering
      reorderTabsInYMap(ydoc, fromIndex, toIndex, userId);
    },
    [ydoc, userId]
  );

  // Close tab (with cleanup)
  const closeTab = useCallback(
    async (tabId: string) => {
      if (!ydoc || !userId) return;

      const tab = getTabById(ydoc, tabId);
      if (!tab) return;

      // If session tab, end the session via API
      if (tab.type === "session" && tab.sessionId) {
        try {
          await fetch(`/api/collaboration/sessions/${tab.sessionId}`, {
            method: "DELETE",
          });
          console.log(`✅ Ended session: ${tab.sessionId}`);
        } catch (err) {
          console.error("Failed to end session:", err);
        }
      }

      // Remove tab using Y.Map helper
      removeTabFromYMap(ydoc, tabId, userId);

      // Switch to another tab if closing active
      const yWorkspace = ydoc.getMap("workspace");
      if (yWorkspace.get("activeTabId") === tabId) {
        const remainingTabs = getTabsFromYMap(ydoc);
        const newActiveTab = remainingTabs[0]?.id || null;

        ydoc.transact(() => {
          yWorkspace.set("activeTabId", newActiveTab);
        }, userId);
      }

      // Clear IndexedDB for session rooms (if applicable)
      if (tab.type === "session" && typeof indexedDB !== "undefined") {
        try {
          await indexedDB.deleteDatabase(`y-${tab.roomId}`);
          console.log(`🗑️ Cleared IndexedDB for: ${tab.roomId}`);
        } catch (err) {
          console.error("Failed to clear IndexedDB:", err);
        }
      }
    },
    [ydoc, userId]
  );

  // Follow mode
  const toggleFollowMode = useCallback((targetUserId: string | null) => {
    setFollowMode({
      enabled: targetUserId !== null,
      followingUserId: targetUserId,
    });
  }, []);

  return {
    ydoc,
    workspace,
    activeTab:
      workspace?.tabs.find((t) => t.id === workspace.activeTabId) || null,
    users,
    userId: userId ?? null,
    ready,
    error,
    others,
    followMode,

    // Actions
    updateCanvasData,
    switchTab,
    addTab,
    closeTab,
    reorderTabs,
    toggleFollowMode,
    updateCursor,

    // Undo/Redo (editing mode only)
    undo,
    redo,
    canUndo,
    canRedo,
    clearUndoHistory,

    // Version management
    saveVersion: createVersion,
    loadVersion: restoreVersion,
    listVersions,
  };
}
