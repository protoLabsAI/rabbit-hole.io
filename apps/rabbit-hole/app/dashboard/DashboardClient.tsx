/**
 * Development Dashboard Client Component
 *
 * Administrative interface using PanelHub for memory-efficient panel loading.
 * Only one management panel is loaded at a time.
 */

"use client";

import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";

import { Icon } from "@proto/icon-system";
import { logPageView } from "@proto/logger";
import { PanelHub } from "@proto/ui";
import type { PanelRegistryEntry } from "@proto/ui";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@proto/ui/atoms";

import { dashboardPanelConfig } from "./registry/dashboard-panels";

export default function DashboardClient() {
  const user = { id: "local-user", firstName: "Local", lastName: "User", fullName: "Local User", imageUrl: "", publicMetadata: { tier: "free", role: "admin" }, emailAddresses: [{ emailAddress: "local@localhost" }], primaryEmailAddress: { emailAddress: "local@localhost" } } as any;
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user?.id) {
      const sessionId =
        sessionStorage.getItem("sessionId") ||
        `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("sessionId", sessionId);

      logPageView({
        page: "/dashboard",
        userId: user.id,
        tier: (user.publicMetadata?.tier as string) || undefined,
        sessionId,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      });
    }
  }, [user?.id]);

  // Check if user is admin (superadmin)
  const isAdmin =
    user?.emailAddresses[0]?.emailAddress === "josh@rabbit-hole.io" ||
    user?.emailAddresses[0]?.emailAddress === "admin@rabbit-hole.io";

  // Get workspaceId from URL, localStorage, or use default
  const workspaceIdFromUrl = searchParams?.get("workspaceId");
  const [workspaceId, setWorkspaceId] = useState<string>("default");

  useEffect(() => {
    if (workspaceIdFromUrl) {
      setWorkspaceId(workspaceIdFromUrl);
    } else {
      const savedWorkspaceId = localStorage.getItem("current-workspace-id");
      if (savedWorkspaceId) {
        setWorkspaceId(savedWorkspaceId);
      }
    }
  }, [workspaceIdFromUrl]);

  // Filter panels based on admin status
  const filterPanel = useMemo(() => {
    return (panel: PanelRegistryEntry) => {
      if (panel.adminOnly && !isAdmin) {
        return false;
      }
      return true;
    };
  }, [isAdmin]);

  // Determine default panel based on user role
  const defaultPanelId = isAdmin ? "files" : "shares";

  return (
    <div className="min-h-screen bg-background">
      <PanelHub
          config={dashboardPanelConfig}
          defaultPanelId={defaultPanelId}
          title={isAdmin ? "System Management" : "Workspace Dashboard"}
          subtitle={
            workspaceId && !isAdmin ? `Workspace: ${workspaceId}` : undefined
          }
          filterPanel={filterPanel}
          panelProps={{ workspaceId }}
          ui={{
            Badge,
            Card,
            CardContent,
            CardHeader,
            CardTitle,
            Input,
            Icon,
          }}
        />
    </div>
  );
}
