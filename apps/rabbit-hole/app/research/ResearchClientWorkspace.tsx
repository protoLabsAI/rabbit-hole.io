"use client";

/**
 * Research Client - Workspace Mode
 *
 * Single-user mode: chat + utility + collaboration removed. The page is now
 * a single full-viewport canvas workspace with local Yjs persistence.
 */

import { useState, useEffect, useMemo } from "react";

import { logPageView, logWorkspaceOperation } from "@protolabsai/logger";
import type { CanvasType } from "@protolabsai/workspace";

import { ConfirmDialogProvider } from "./components/ConfirmDialog";
import { WorkspaceContainer } from "./components/workspace/WorkspaceContainer";
import { useResearchPageState } from "./hooks/useResearchPageState";
import { QueryProvider } from "./providers";

// Register context menu items for research routes
import "../context-menu/registry/researchMenus.direct";

// Stable module-level userId avoids new-object-per-render churn that
// cascaded through the workspace memo tree and pinned the page in a loop.
const USER_ID = "local-user";

export default function ResearchClientWorkspace() {
  const research = useResearchPageState();
  const [mounted, setMounted] = useState(false);

  // Pending entity import from URL params — memoized to prevent re-render loops.
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

  const [canvasType] = useState<CanvasType>(() => {
    if (typeof window === "undefined") return "graph";
    const urlParams = new URLSearchParams(window.location.search);
    return (urlParams.get("canvas") as CanvasType) || "graph";
  });

  const [workspaceId, setWorkspaceId] = useState(() => {
    if (typeof window === "undefined") return "workspace-loading";
    const urlParams = new URLSearchParams(window.location.search);
    const urlWorkspaceId = urlParams.get("workspaceId");
    if (urlWorkspaceId) return urlWorkspaceId;
    const savedWorkspaceId = localStorage.getItem("current-workspace-id");
    if (savedWorkspaceId) return savedWorkspaceId;
    return "workspace-loading";
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <WorkspaceContainer
        workspaceId={workspaceId}
        defaultCanvasType={canvasType}
        pendingImport={pendingImport}
      />
    </div>
  );

  return (
    <ConfirmDialogProvider>
      <QueryProvider>{content}</QueryProvider>
    </ConfirmDialogProvider>
  );
}
