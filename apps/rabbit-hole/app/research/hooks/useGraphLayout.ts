/**
 * Graph Layout Management Hook
 *
 * Extracted from GraphCanvasIntegrated to reduce file size.
 * Handles layout algorithm application and position management.
 */

import type Graph from "graphology";
import { useCallback, useState } from "react";

import type { UserTier } from "@proto/auth/client";
import { logUserAction } from "@proto/logger";

import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "@/graph-visualizer/model/graph";
import { vlog } from "@/lib/verbose-logger";

import { applyLayout } from "../lib/layoutAlgorithms";
import type { LayoutType } from "../lib/layoutAlgorithms";

interface UseGraphLayoutOptions {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  data: any;
  userId?: string;
  userTier?: UserTier;
  onGraphChange: () => void;
  onDataChange: (data: any) => void;
}

export type GraphLayout = "force" | "elk" | "manual";

export function useGraphLayout({
  graph,
  data,
  userId,
  userTier,
  onGraphChange,
  onDataChange,
}: UseGraphLayoutOptions) {
  const [currentLayout, setCurrentLayout] = useState<GraphLayout>(
    (data.layoutMode as GraphLayout) || "force"
  );
  const [savedPositions, setSavedPositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  const handleLayoutChange = useCallback(
    async (layoutType: GraphLayout) => {
      vlog.log(`🔄 Layout change: ${currentLayout} → ${layoutType}`);

      if (userId) {
        const sessionId =
          typeof window !== "undefined"
            ? sessionStorage.getItem("sessionId") || undefined
            : undefined;

        logUserAction({
          action: "graph_layout_change",
          page: "/research",
          userId,
          tier: userTier,
          sessionId,
          target: layoutType,
        });
      }

      // Snapshot manual positions before switching away
      if (currentLayout === "manual" && layoutType !== "manual") {
        const snapshot = new Map<string, { x: number; y: number }>();
        graph.forEachNode((nodeId, attrs) => {
          if (attrs.x !== undefined && attrs.y !== undefined) {
            snapshot.set(nodeId, { x: attrs.x, y: attrs.y });
          }
        });
        setSavedPositions(snapshot);
        vlog.log("📸 Snapshotted manual positions:", {
          count: snapshot.size,
          unit: "nodes",
        });
      }

      // Restore manual positions
      if (layoutType === "manual") {
        vlog.log("♻️ Restoring manual positions:", {
          count: savedPositions.size,
          unit: "nodes",
        });
        savedPositions.forEach((pos, nodeId) => {
          if (graph.hasNode(nodeId)) {
            graph.mergeNodeAttributes(nodeId, pos);
          }
        });
        setCurrentLayout(layoutType);
        onGraphChange();

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("research:canvas:fit-view"));
        }, 100);

        onDataChange({
          ...data,
          layoutMode: layoutType,
        });
        return;
      }

      // Apply computed layout
      setCurrentLayout(layoutType);

      const layoutAlgorithm: LayoutType =
        layoutType === "elk" ? "elk" : "force";

      try {
        vlog.log(`🎯 Applying ${layoutAlgorithm} layout...`);
        const fromCache = !(await applyLayout(graph, layoutAlgorithm, {}));

        vlog.log(
          fromCache
            ? `✨ Layout cached`
            : `✨ Applied ${layoutAlgorithm} layout`
        );

        onGraphChange();

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("research:canvas:fit-view"));
        }, 100);

        onDataChange({
          ...data,
          layoutMode: layoutType,
        });
      } catch (error) {
        console.error("Layout failed:", error);
        vlog.log("❌ Layout failed:", { error });
      }
    },
    [
      currentLayout,
      savedPositions,
      graph,
      onGraphChange,
      onDataChange,
      data,
      userId,
      userTier,
    ]
  );

  return {
    currentLayout,
    savedPositions,
    handleLayoutChange,
  };
}
