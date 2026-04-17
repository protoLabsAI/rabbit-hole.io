"use client";

import React, { useCallback } from "react";

import { useToast } from "@protolabsai/ui/hooks";
import type { CanvasType } from "@protolabsai/workspace";

import { DialogRegistry } from "@/components/ui/DialogRegistry";

import { useEntityImportFromUrl } from "../../hooks/useEntityImportFromUrl";
import { useWorkspaceKeyboardShortcuts } from "../../hooks/useWorkspaceKeyboardShortcuts";

import { AgentBundleBridge } from "./AgentBundleBridge";
import { getCanvasRenderer } from "./canvas/CanvasRegistry";
import { TabBar } from "./TabBar";
import { WorkspacePersistence } from "./WorkspacePersistence";

// Single-user mode: auth/tier scaffolding removed. Stable module-level
// constants keep prop identities stable and avoid a render loop through
// the workspace memo tree.
const USER_ID = "local-user";
const USER_TIER = "enterprise" as const;

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
  pendingImport?: PendingImport | null;
}

export function WorkspaceContainer({
  workspaceId,
  defaultCanvasType = "graph",
  pendingImport = null,
}: WorkspaceContainerProps) {
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
            pendingImport={pendingImport}
          />
        )}
      </WorkspacePersistence>

      <DialogRegistry />
    </>
  );
}

interface WorkspaceContentProps {
  context: any;
  workspaceId: string;
  pendingImport?: PendingImport | null;
}

function WorkspaceContent({
  context,
  workspaceId,
  pendingImport = null,
}: WorkspaceContentProps) {
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

  // Collaboration dropped with the multiplayer pieces — these remain as
  // no-op shims until the canvas stops asking for them.
  const removeSession = (_tabId: string) => {};
  const getSessionForTab = (_tabId: string): string | null => null;

  const { isPreparingImport, importError, pendingBundle, targetTabId } =
    useEntityImportFromUrl({
      ydoc: context.ydoc,
      userId: USER_ID,
      workspace: context.workspace,
      workspaceReady: context.ready,
      pendingImport,
    });

  const {
    workspace,
    activeTab,
    ready,
    error,
    updateCanvasData,
    switchTab,
    addTab,
    closeTab,
    reorderTabs,
    canUndo,
    canRedo,
    undo,
    redo,
    saveVersion,
    loadVersion,
    listVersions,
  } = context;

  // Single-user mode — the local user always owns the workspace.
  const isOwner = true;

  useWorkspaceKeyboardShortcuts({
    canUndo: canUndo || false,
    canRedo: canRedo || false,
    onUndo: undo || (() => {}),
    onRedo: redo || (() => {}),
    enabled: true,
  });

  const handleCanvasDataChange = useCallback(
    (data: any) => {
      updateCanvasData(data);
    },
    [updateCanvasData]
  );

  // Collaboration removed — these remain as stable no-ops so the canvas
  // prop surface stays unchanged.
  const handleSessionCreated = useCallback(() => {}, []);
  const handleSessionEnded = useCallback(() => {}, []);

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

  // Collaboration session cleanup removed (store removed)

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
              userId={USER_ID}
              userTier={USER_TIER}
              canUseAIChat={true}
              workspaceId={workspaceId}
              tabId={activeTab.id}
              tabName={activeTab.name}
              canUseCollaboration={false}
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
      </div>
    </div>
  );
}
