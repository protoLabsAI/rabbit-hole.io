/**
 * LoadingOverlay Component
 *
 * Displays loading state with spinner and context-specific messages.
 * Shows different messages based on view mode and graph data status.
 */

import React from "react";

import type { CanonicalGraphData } from "../../types/canonical-graph";

interface LoadingOverlayProps {
  isLoading: boolean;
  viewMode: "full-atlas" | "ego" | "community" | "timeslice";
  graphData: CanonicalGraphData | null;
}

export function LoadingOverlay({
  isLoading,
  viewMode,
  graphData,
}: LoadingOverlayProps) {
  if (!isLoading) {
    return null;
  }

  const getMainMessage = () => {
    return viewMode === "full-atlas" ? "Knowledge Graph" : "Graph Tiles";
  };

  const getSubtitleMessage = () => {
    switch (viewMode) {
      case "ego":
        return "Bounded ego network for performance";
      case "community":
        return "Community cluster subgraph";
      case "timeslice":
        return "Time-filtered activity view";
      case "full-atlas":
        if (graphData) {
          return `${graphData.nodes.length} entities • ${graphData.edges.length} relationships`;
        }
        return "Initializing...";
      default:
        return "";
    }
  };

  return (
    <div
      className="absolute inset-0 bg-background/80 flex items-center justify-center z-50"
      data-testid="loading-overlay"
    >
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
          data-testid="loading-spinner"
        />
        <div className="text-lg font-medium text-foreground">
          Loading {getMainMessage()}...
        </div>
        <div className="text-sm text-muted-foreground">
          {getSubtitleMessage()}
        </div>
      </div>
    </div>
  );
}
