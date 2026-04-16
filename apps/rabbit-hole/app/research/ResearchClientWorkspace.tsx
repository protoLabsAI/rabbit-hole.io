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

import {
  getUserTierClient,
  getTierLimitsClient,
} from "@protolabsai/auth/client";
import { logPageView, logWorkspaceOperation } from "@protolabsai/logger";
import { ResizableChatLayout } from "@protolabsai/ui/templates";
import type { CanvasType } from "@protolabsai/workspace";

import { ConfirmDialogProvider } from "./components/ConfirmDialog";
import { ResearchChatInterface } from "./components/ResearchChatInterface";
import { WorkspaceContainer } from "./components/workspace/WorkspaceContainer";
import { useFeaturePreloader } from "./hooks/useFeaturePreloader";
import { useResearchPageState } from "./hooks/useResearchPageState";
import { QueryProvider } from "./providers";

// Register context menu items for research routes
import "../context-menu/registry/researchMenus.direct";

export default function ResearchClientWorkspace() {
  const userId = "local-user";
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
  const research = useResearchPageState();
  const [mounted, setMounted] = useState(false);

  // Check tier for AI chat access
  const userTier = getUserTierClient(user || null);
  const tierLimits = getTierLimitsClient(userTier);
  const canUseAIChat = tierLimits.hasAIChatAccess;

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

  // Preload paid features in background for eligible users
  useFeaturePreloader();

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

  // Update workspace ID when userId becomes available
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    // Check URL first
    const urlParams = new URLSearchParams(window.location.search);
    const urlWorkspaceId = urlParams.get("workspaceId");
    if (urlWorkspaceId) {
      setWorkspaceId(urlWorkspaceId);
      return;
    }

    // Generate user-default workspace ID
    const defaultWorkspaceId = `ws-default-${userId}`;
    localStorage.setItem("current-workspace-id", defaultWorkspaceId);
    setWorkspaceId(defaultWorkspaceId);
  }, [userId]);

  useEffect(() => {
    if (
      userId &&
      workspaceId &&
      workspaceId !== "workspace-loading" &&
      mounted
    ) {
      const sessionId =
        sessionStorage.getItem("sessionId") ||
        `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("sessionId", sessionId);

      logPageView({
        page: "/research",
        userId,
        tier: (user?.publicMetadata?.tier as string) || undefined,
        sessionId,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      });

      logWorkspaceOperation({
        operation: "load",
        workspaceId,
        userId,
        tier: (user?.publicMetadata?.tier as string) || undefined,
      });
    }
  }, [userId, workspaceId, mounted, user?.publicMetadata?.tier]);

  const handleChatCollapseChange = useCallback(
    (collapsed: boolean) => {
      research.setChatOpen(!collapsed);
    },
    [research]
  );

  // Wait for proper workspace ID before rendering
  const isWorkspaceReady = workspaceId !== "workspace-loading" && mounted;

  // // Custom chat header with workspace info
  const chatHeader = (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <div>
        <h2 className="text-lg font-semibold">Research Agent</h2>
        <p className="text-xs text-muted-foreground">
          Collaborative Workspace
          {isWorkspaceReady && ` • ${workspaceId.slice(0, 12)}`}
        </p>
      </div>
    </div>
  );

  // Conditionally wrap with CopilotKit based on tier
  const content = !isWorkspaceReady ? (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading workspace...</p>
      </div>
    </div>
  ) : (
    <div className="h-screen bg-background">
      {/* Main Content - Full viewport height */}
      <div className="h-screen">
        <ResizableChatLayout
          chatTitle="Research Agent"
          chatDescription="AI-powered research with collaborative workspace"
          chatInterface={
            canUseAIChat ? (
              <ResearchChatInterface
                sessionConfig={research.sessionConfig}
                onSessionConfigChange={research.setSessionConfig}
              />
            ) : (
              <div />
            )
          }
          layoutId="research-workspace-layout"
          collapsible={canUseAIChat}
          defaultChatSize={canUseAIChat ? 33 : 0}
          minChatSize={canUseAIChat ? 20 : 0}
          maxChatSize={canUseAIChat ? 50 : 0}
          showResizeHandle={false}
          hideFloatingToggle={true}
          defaultCollapsed={!research.chatOpen || !canUseAIChat}
          onCollapseChange={handleChatCollapseChange}
          customChatHeader={undefined}
          showChatHeader={false}
        >
          <WorkspaceContainer
            workspaceId={workspaceId}
            defaultCanvasType={canvasType}
            canUseAIChat={canUseAIChat}
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
