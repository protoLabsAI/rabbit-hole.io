"use client";

import React, { useCallback } from "react";

import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";
import { useToast } from "@proto/ui/hooks";
import type { CanvasType } from "@proto/workspace";

import { DialogRegistry } from "@/components/ui/DialogRegistry";
import { useCollaborationSettings } from "@/hooks/useCollaborationSettings";

import { useActiveSessions } from "../../hooks/queries/useCollaborationSessions";
import { useEntityImportFromUrl } from "../../hooks/useEntityImportFromUrl";
import { useWorkspaceKeyboardShortcuts } from "../../hooks/useWorkspaceKeyboardShortcuts";
import { useCollaborationStore } from "../../store/useCollaborationStore";

import { AgentBundleBridge } from "./AgentBundleBridge";
import { getCanvasRenderer } from "./canvas/CanvasRegistry";
import { TabBar } from "./TabBar";
import { WorkspacePersistence } from "./WorkspacePersistence";

export interface PendingImport {
  entityUid: string;
  settings: any;
  showLabels: boolean;
  showEdgeLabels: boolean;
  timeWindow: any;
}

interface WorkspaceContainerProps {
  workspaceId: string;
  defaultCanvasType?: CanvasType;
  canUseAIChat?: boolean;
  pendingImport?: PendingImport | null;
}

export function WorkspaceContainer({
  workspaceId,
  defaultCanvasType = "graph",
  canUseAIChat = false,
  pendingImport = null,
}: WorkspaceContainerProps) {
  const userId = "local-user";
  /* useOrganization removed - Clerk removed */

  // Collaboration settings (persisted to localStorage)
  const { showPresence } = useCollaborationSettings();

  // Auth guard
  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-semibold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-4">
            Sign in to access your workspace.
          </p>

          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // User workspaces work without org (Free/Basic tier)
  // Only Team+ tier requires org (not implemented yet)

  return (
    <>
      <WorkspacePersistence
        workspaceId={workspaceId}
        canvasType={defaultCanvasType}
      >
        {(context) => (
          <WorkspaceContent
            context={context}
            workspaceId={workspaceId}
            showPresence={showPresence}
            canUseAIChat={canUseAIChat}
            organization={organization}
            pendingImport={pendingImport}
          />
        )}
      </WorkspacePersistence>

      {/* Centralized Dialog Management */}
      <DialogRegistry />
    </>
  );
}

interface WorkspaceContentProps {
  context: any;
  workspaceId: string;
  showPresence: boolean;
  canUseAIChat?: boolean;
  organization: any;
  pendingImport?: PendingImport | null;
}

function WorkspaceContent({
  context,
  workspaceId,
  showPresence,
  canUseAIChat = false,
  organization,
  pendingImport = null,
}: WorkspaceContentProps) {
  const userId = "local-user";
  const user = {
    id: "local-user",
    firstName: "Local",
    lastName: "User",
    username: "local-user",
    fullName: "Local User",
    emailAddresses: [{ emailAddress: "local@localhost" }],
    publicMetadata: { tier: "pro" },
    privateMetadata: { stats: {} },
    isSignedIn: true,
  };
  const { toast } = useToast();
  const [isViewMode, setIsViewMode] = React.useState(false);

  // Single-tab mode setting (default true, hydrate from localStorage in effect)
  const [singleTabMode, setSingleTabMode] = React.useState(true);

  // TODO: Expose singleTabMode toggle in workspace settings UI
  // when we revisit multi-tab workspaces feature.
  // For now, hardcoded to true (single-tab mode).
  // Settings UI should:
  // 1. Add toggle in WorkspaceHamburgerMenu → Settings
  // 2. Call setSingleTabMode(newValue)
  // 3. Persist to localStorage
  // 4. Show reload prompt (or hot-reload TabBar)
  // See: docs/developer/research-workspace/SINGLE_TAB_MODE_HANDOFF.md

  // Hydrate from localStorage after mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("workspace-single-tab-mode");
    if (saved !== null) {
      setSingleTabMode(saved === "true");
    }
  }, []);

  // Persist to localStorage when changed
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("workspace-single-tab-mode", String(singleTabMode));
  }, [singleTabMode]);

  // Use Zustand for collaboration state (prevents re-render loops)
  const {
    activeSessionsByTab,
    loaded: sessionsLoaded,
    addSession,
    removeSession,
    loadSessions,
    getSessionForTab,
    getActiveCount,
  } = useCollaborationStore();

  // Tier checking for collaboration
  const userTier = getUserTierClient(user || null);
  const tierLimits = getTierLimitsClient(userTier);
  const canUseCollaboration = tierLimits.maxActiveSessions > 0;

  // Handle entity import from URL parameters
  const { isPreparingImport, importError, pendingBundle, targetTabId } =
    useEntityImportFromUrl({
      ydoc: context.ydoc,
      userId: userId || "",
      workspace: context.workspace,
      workspaceReady: context.ready,
      pendingImport,
    });

  // Use React Query to poll active sessions (auto-polls every 10s)
  const { data: sessionsData } = useActiveSessions();

  // Sync React Query data to Zustand store
  React.useEffect(() => {
    if (!sessionsData?.sessions) return;

    const activeSessions = sessionsData.sessions
      .filter(
        (session: any) => session.status === "active" && !session.isExpired
      )
      .map((session: any) => ({
        sessionId: session.id,
        tabId: session.tabId,
        createdAt: session.createdAt,
      }));

    loadSessions(activeSessions);

    if (!sessionsLoaded && activeSessions.length > 0) {
      console.log(
        `🔄 Restored ${activeSessions.length} active sessions from database`
      );
    }
  }, [sessionsData, sessionsLoaded, loadSessions]);

  const {
    workspace,
    activeTab,
    ready,
    error,
    mode,
    updateCanvasData,
    switchTab,
    addTab,
    closeTab,
    reorderTabs,
    users,
    followMode,
    canUndo,
    canRedo,
    undo,
    redo,
    saveVersion,
    loadVersion,
    listVersions,
  } = context;

  // Determine if user is owner
  const isOwner = workspace?.metadata?.owner === userId;

  // Keyboard shortcuts for undo/redo
  useWorkspaceKeyboardShortcuts({
    canUndo: canUndo || false,
    canRedo: canRedo || false,
    onUndo: undo || (() => {}),
    onRedo: redo || (() => {}),
    enabled: true,
  });

  // Stable callback for canvas data changes
  const handleCanvasDataChange = useCallback(
    (data: any) => {
      updateCanvasData(data);
    },
    [updateCanvasData]
  );

  // Collaboration session handlers - Zustand prevents re-render loops
  const handleSessionCreated = useCallback(
    (sessionId: string, shareLink: string) => {
      if (!activeTab) return;

      addSession(activeTab.id, sessionId, shareLink);

      const count = getActiveCount();
      toast({
        title: "Session Created",
        description: `Active sessions: ${count}/${tierLimits.maxActiveSessions}`,
      });
    },
    [activeTab, addSession, getActiveCount, tierLimits.maxActiveSessions, toast]
  );

  const handleSessionEnded = useCallback(() => {
    if (!activeTab) return;

    removeSession(activeTab.id);

    const count = getActiveCount();
    toast({
      title: "Session Ended",
      description: `Active sessions: ${count}/${tierLimits.maxActiveSessions}`,
    });
  }, [
    activeTab,
    removeSession,
    getActiveCount,
    tierLimits.maxActiveSessions,
    toast,
  ]);

  // Enhanced closeTab with session cleanup
  const handleCloseTab = useCallback(
    async (tabId: string) => {
      // Prevent closing last tab in single-tab mode
      if (singleTabMode && workspace?.tabs?.length === 1) {
        toast({
          title: "Cannot Close Tab",
          description:
            "Single-tab mode requires at least one tab. Enable multi-tab mode in settings to manage tabs.",
          variant: "destructive",
        });
        return;
      }

      const sessionId = getSessionForTab(tabId);

      if (sessionId) {
        // End the session gracefully before closing tab
        try {
          const response = await fetch(
            `/api/collaboration/sessions/${sessionId}/end`,
            {
              method: "POST",
            }
          );

          if (response.ok) {
            console.log(
              `✅ Ended collaboration session: ${sessionId} (tab closing)`
            );
            toast({
              title: "Session Ended",
              description: "Collaboration session closed with tab",
            });
          }
        } catch (err) {
          console.error("Failed to end session on tab close:", err);
        }

        removeSession(tabId);
      }

      closeTab(tabId);
    },
    [singleTabMode, workspace, closeTab, getSessionForTab, removeSession, toast]
  );

  // Auto-create first tab if workspace has no tabs (fallback safety)
  React.useEffect(() => {
    if (!ready || !workspace?.tabs || workspace.tabs.length > 0) {
      return;
    }
    console.warn("⚠️ Workspace has no tabs - auto-creating first tab");
    addTab("graph");
  }, [ready, workspace?.tabs?.length, addTab]);

  // Cleanup all active sessions on unmount (browser close, navigation away)
  // EXCEPT when navigating to session host/guest pages
  React.useEffect(() => {
    return () => {
      // Don't cleanup if navigating to a session page
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/session/")) {
        console.log("Skipping session cleanup - navigating to session page");
        return;
      }

      // Get sessions at unmount time
      const sessions = useCollaborationStore.getState().activeSessionsByTab;
      Object.entries(sessions).forEach(([tabId, sessionId]) => {
        fetch(`/api/collaboration/sessions/${sessionId}/end`, {
          method: "POST",
          keepalive: true,
        }).catch((err) => {
          console.error("Failed to end session on unmount:", err);
        });
      });
    };
  }, []); // Empty deps - gets fresh state at unmount

  // Get active session ID for current tab
  const currentSessionId = getSessionForTab(activeTab?.id);

  // Dual-room sync removed - host now uses dedicated session view

  // Import error state
  if (importError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-semibold mb-2">Import Failed</h2>
          <p className="text-muted-foreground mb-4">{importError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold mb-2">Workspace Error</h2>
          <p className="text-muted-foreground mb-4">
            Failed to load workspace: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Import loading state
  if (isPreparingImport) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Importing entity...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Fetching ego network data
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!ready || !workspace) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // No tabs - show loading state while auto-creating
  if (!workspace.tabs || workspace.tabs.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Initializing workspace...</p>
        </div>
      </div>
    );
  }

  // No active tab selected
  if (!activeTab) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No tab selected</p>
          <button
            onClick={() => switchTab(workspace.tabs[0]?.id)}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Select First Tab
          </button>
        </div>
      </div>
    );
  }

  // Get canvas renderer for active tab
  const renderer = getCanvasRenderer(activeTab.canvasType);
  const CanvasComponent = renderer.component;

  const handleNewSession = async () => {
    // TODO: Call API to create session, then addTab with sessionId
    // Create session - TODO
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Conditionally render TabBar - hide in single-tab mode */}
      {!singleTabMode && (
        <TabBar
          tabs={workspace.tabs}
          activeTabId={workspace.activeTabId}
          isOwner={isOwner}
          isViewMode={isViewMode}
          onViewModeToggle={() => setIsViewMode(!isViewMode)}
          onTabClick={switchTab}
          onTabClose={handleCloseTab}
          onTabReorder={reorderTabs}
          onNewTab={addTab}
        />
      )}

      {/* Canvas - full height */}
      <div className="flex-1 relative overflow-hidden">
        {canUseAIChat ? (
          <AgentBundleBridge>
            {(agentPartialBundle) => (
              <CanvasComponent
                data={activeTab.canvasData}
                onDataChange={handleCanvasDataChange}
                readOnly={
                  isViewMode || !isOwner || activeTab.visibility === "view"
                }
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                saveVersion={saveVersion}
                loadVersion={loadVersion}
                listVersions={listVersions}
                ydoc={context.ydoc}
                userId={userId || undefined}
                userTier={userTier}
                canUseAIChat={canUseAIChat}
                workspaceId={workspaceId}
                tabId={activeTab.id}
                tabName={activeTab.name}
                canUseCollaboration={canUseCollaboration}
                workspaceReady={ready}
                activeSessionId={currentSessionId}
                onSessionCreated={handleSessionCreated}
                onSessionEnded={handleSessionEnded}
                pendingBundle={
                  activeTab.id === targetTabId ? pendingBundle : null
                }
                agentPartialBundle={agentPartialBundle}
              />
            )}
          </AgentBundleBridge>
        ) : (
          <CanvasComponent
            data={activeTab.canvasData}
            onDataChange={handleCanvasDataChange}
            readOnly={isViewMode || !isOwner || activeTab.visibility === "view"}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            saveVersion={saveVersion}
            loadVersion={loadVersion}
            listVersions={listVersions}
            ydoc={context.ydoc}
            userId={userId || undefined}
            userTier={userTier}
            canUseAIChat={canUseAIChat}
            workspaceId={workspaceId}
            tabId={activeTab.id}
            tabName={activeTab.name}
            canUseCollaboration={canUseCollaboration}
            workspaceReady={ready}
            activeSessionId={currentSessionId}
            onSessionCreated={handleSessionCreated}
            onSessionEnded={handleSessionEnded}
            pendingBundle={activeTab.id === targetTabId ? pendingBundle : null}
          />
        )}

        {/* Collaboration panel */}
        {showPresence && users && users.size > 1 && (
          <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur rounded-lg shadow-lg border p-4 max-w-xs">
            <div className="text-sm space-y-2">
              <div className="font-semibold">Collaborators ({users.size})</div>
              {Array.from(users.values()).map((user: any) => (
                <div
                  key={user.userId}
                  className="text-xs text-muted-foreground"
                >
                  {user.userName || user.userId}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow mode indicator */}
        {followMode?.enabled && followMode?.followingUserId && (
          <div className="absolute bottom-4 left-4 z-40 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm shadow-lg">
            Following {users?.get(followMode.followingUserId)?.userName}
          </div>
        )}
      </div>
    </div>
  );
}
