/**
 * Workspace Limits Hook
 *
 * Track workspace usage against tier limits (client-side).
 * Updates reactively as Yjs document changes.
 */

import { useEffect, useState } from "react";
import * as Y from "yjs";

import { getTierLimitsClient, type UserTier } from "@protolabsai/auth/client";
import {
  countWorkspaceEntities,
  type WorkspaceUsage,
} from "@protolabsai/utils";

export interface WorkspaceLimitsState {
  usage: WorkspaceUsage | null;
  limits: {
    maxEntities: number;
    maxRelationships: number;
    maxStorage: number;
    maxTabs: number;
  } | null;
  percentages: {
    entities: number;
    relationships: number;
    storage: number;
    tabs: number;
  };
  warnings: {
    entities: boolean;
    relationships: boolean;
    storage: boolean;
    tabs: boolean;
  };
  blocked: {
    entities: boolean;
    relationships: boolean;
    storage: boolean;
    tabs: boolean;
  };
  ready: boolean;
}

/**
 * Track workspace usage against tier limits (client-side)
 * Updates reactively as Yjs document changes
 */
export function useWorkspaceLimits(
  ydoc: Y.Doc | null,
  userTier: UserTier
): WorkspaceLimitsState {
  const [state, setState] = useState<WorkspaceLimitsState>({
    usage: null,
    limits: null,
    percentages: { entities: 0, relationships: 0, storage: 0, tabs: 0 },
    warnings: {
      entities: false,
      relationships: false,
      storage: false,
      tabs: false,
    },
    blocked: {
      entities: false,
      relationships: false,
      storage: false,
      tabs: false,
    },
    ready: false,
  });

  useEffect(() => {
    if (!ydoc) return;

    const limits = getTierLimitsClient(userTier);

    const updateUsage = () => {
      const usage = countWorkspaceEntities(ydoc);

      const entityPercent =
        limits.maxEntities === -1
          ? 0
          : (usage.totalEntities / limits.maxEntities) * 100;

      const relPercent =
        limits.maxRelationships === -1
          ? 0
          : (usage.totalRelationships / limits.maxRelationships) * 100;

      const storagePercent =
        limits.fileStorage === -1
          ? 0
          : (usage.totalStorageBytes / limits.fileStorage) * 100;

      const tabPercent =
        limits.canvasPerWorkspace === -1
          ? 0
          : (usage.tabCount / limits.canvasPerWorkspace) * 100;

      setState({
        usage,
        limits: {
          maxEntities: limits.maxEntities,
          maxRelationships: limits.maxRelationships,
          maxStorage: limits.fileStorage,
          maxTabs: limits.canvasPerWorkspace,
        },
        percentages: {
          entities: entityPercent,
          relationships: relPercent,
          storage: storagePercent,
          tabs: tabPercent,
        },
        warnings: {
          entities: entityPercent >= 80,
          relationships: relPercent >= 80,
          storage: storagePercent >= 80,
          tabs: tabPercent >= 80,
        },
        blocked: {
          entities: entityPercent >= 100,
          relationships: relPercent >= 100,
          storage: storagePercent >= 100,
          tabs: tabPercent >= 100,
        },
        ready: true,
      });
    };

    // Initial count
    updateUsage();

    // Watch for tab changes
    const yTabs = ydoc.getArray("tabs");
    const observer = () => updateUsage();
    yTabs.observe(observer);

    return () => {
      yTabs.unobserve(observer);
    };
  }, [ydoc, userTier]);

  return state;
}
