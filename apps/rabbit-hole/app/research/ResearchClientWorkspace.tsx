"use client";

/**
 * Research Client - Workspace Mode
 *
 * Single-canvas collaborative workspace with Yjs persistence.
 * - Yjs for persistence (replaces IndexedDB)
 * - Canvas support (Graph, Map, Timeline, etc.)
 * - Real-time collaboration with follow mode
 * - CopilotKit integration (chat panel)
 */

import { useState, useCallback, useEffect, useMemo } from "react";

import { logPageView, logWorkspaceOperation } from "@protolabsai/logger";
import { ResizableChatLayout } from "@protolabsai/ui/templates";
import type { CanvasType } from "@protolabsai/workspace";

import { ConfirmDialogProvider } from "./components/ConfirmDialog";
import { ResearchChatInterface } from "./components/ResearchChatInterface";
import { WorkspaceContainer } from "./components/workspace/WorkspaceContainer";
import { useResearchPageState } from "./hooks/useResearchPageState";
import { QueryProvider } from "./providers";

// Register context menu items for research routes
import "../context-menu/registry/researchMenus.direct";

// Single-user mode: auth/tier scaffolding removed. A stable module-level
// userId avoids new-object-per-render churn that cascaded through the
// workspace memo tree and pinned the page in a render loop.
const USER_ID = "local-user";

export default function ResearchClientWorkspace() {
  const research = useResearchPageState();
  const [mounted, setMounted] = useState(false);

  // Prepare pending import from URL parameters (memoized to prevent re-render loops)
  const pendingImport = useMemo(
    () =>
      research.entity
        ? {
            entityUid: research.entity,
            settings: research.settings,
            showLabels: research.showLabels,
            showEdgeLabels: research.showEdgeLabels,
            timeWindow: research.timeWindow,
          }
        : null,
    [
      research.entity,
      research.settings,
      research.showLabels,
      research.showEdgeLabels,
      research.timeWindow,
    ]
  );

  // Get canvas type from URL
  const [canvasType] = useState<CanvasType>(() => {
    if (typeof window === "undefined") return "graph";
    const urlParams = new URLSearchParams(window.location.search);
    return (urlParams.get("canvas") as CanvasType) || "graph";
  });

  // Generate workspace ID only on client
  const [workspaceId, setWorkspaceId] = useState(() => {
    if (typeof window === "undefined") return "workspace-loading";

    // Check for existing workspace ID in URL (takes priority)
    const urlParams = new URLSearchParams(window.location.search);
    const urlWorkspaceId = urlParams.get("workspaceId");
    if (urlWorkspaceId) {
      return urlWorkspaceId;
    }

    // Try to get from localStorage (avoids hydration issues)
    const savedWorkspaceId = localStorage.getItem("current-workspace-id");
    if (savedWorkspaceId) {
      return savedWorkspaceId;
    }

    // Default fallback
    return "workspace-loading";
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Resolve the active workspace ID on mount: URL override → saved → default.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlWorkspaceId = urlParams.get("workspaceId");
    if (urlWorkspaceId) {
      setWorkspaceId(urlWorkspaceId);
      return;
    }

    const defaultWorkspaceId = `ws-default-${USER_ID}`;
    localStorage.setItem("current-workspace-id", defaultWorkspaceId);
    setWorkspaceId(defaultWorkspaceId);
  }, []);

  useEffect(() => {
    if (workspaceId && workspaceId !== "workspace-loading" && mounted) {
      const sessionId =
        sessionStorage.getItem("sessionId") ||
        `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("sessionId", sessionId);

      logPageView({
        page: "/research",
        userId: USER_ID,
        sessionId,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      });

      logWorkspaceOperation({
        operation: "load",
        workspaceId,
        userId: USER_ID,
      });
    }
  }, [workspaceId, mounted]);

  const setChatOpen = research.setChatOpen;
  const handleChatCollapseChange = useCallback(
    (collapsed: boolean) => {
      setChatOpen(!collapsed);
    },
    [setChatOpen]
  );

  const isWorkspaceReady = workspaceId !== "workspace-loading" && mounted;

  const content = !isWorkspaceReady ? (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading workspace...</p>
      </div>
    </div>
  ) : (
    <div className="h-screen bg-background">
      <div className="h-screen">
        <ResizableChatLayout
          chatTitle="Research Agent"
          chatDescription="AI-powered research with collaborative workspace"
          chatInterface={
            <ResearchChatInterface
              sessionConfig={research.sessionConfig}
              onSessionConfigChange={research.setSessionConfig}
            />
          }
          layoutId="research-workspace-layout"
          collapsible={true}
          defaultChatSize={33}
          minChatSize={20}
          maxChatSize={50}
          showResizeHandle={false}
          hideFloatingToggle={true}
          defaultCollapsed={!research.chatOpen}
          onCollapseChange={handleChatCollapseChange}
          customChatHeader={undefined}
          showChatHeader={false}
        >
          <WorkspaceContainer
            workspaceId={workspaceId}
            defaultCanvasType={canvasType}
            pendingImport={pendingImport}
          />
        </ResizableChatLayout>
      </div>
    </div>
  );

  return (
    <ConfirmDialogProvider>
      <QueryProvider>{content}</QueryProvider>
    </ConfirmDialogProvider>
  );
}
