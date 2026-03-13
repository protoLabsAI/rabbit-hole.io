/**
 * GraphVisualizerWrapper Component
 *
 * High-level wrapper component for graph visualization.
 * Handles configuration orchestration, data transformation, and provides clean API.
 */

import React, { useMemo, useRef, useCallback } from "react";

import { GraphDataStandardizer } from "../../lib/graph-data-standardizer";
import { getLayoutConfig } from "../config/default-layouts";
import { getPerformanceConfig } from "../config/default-performance";
import { createStyleConfig } from "../config/default-styles";

import {
  GraphVisualizationContainer,
  GraphVisualizationContainerRef,
} from "./GraphVisualizationContainer";
import type { GraphVisualizerProps, GraphEventHandlers } from "./types";

/**
 * Main Graph Visualizer Component
 *
 * **High-level wrapper for graph visualization with comprehensive features:**
 *
 * - **Data Transformation**: Automatic conversion from CanonicalGraphData to Cytoscape format
 * - **Configuration Management**: Merges user config with sensible defaults
 * - **Performance Optimization**: Automatic optimization based on dataset size
 * - **Event Handling**: Safe event handlers with error boundaries
 * - **State Management**: Loading, empty, and error states
 * - **Development Tools**: Debug panel in development mode
 *
 * @example
 * ```tsx
 * <GraphVisualizerWrapper
 *   data={canonicalGraphData}
 *   layoutType="atlas"
 *   showLabels={true}
 *   eventHandlers={{
 *     onNodeClick: (node) => console.log("Clicked:", node.name),
 *     onViewportChange: (zoom, pan) => saveViewportState(zoom, pan)
 *   }}
 * />
 * ```
 *
 * @param props - Graph visualizer configuration and data
 * @returns Rendered graph visualization component
 */
export const GraphVisualizerWrapper = React.memo(
  function GraphVisualizerWrapper({
    data,
    loading = false,
    config = {},
    eventHandlers = {},
    layoutType = "atlas",
    showLabels = true,
    highlightConnections = true,
    className,
    style,
    initialViewport,
    enableTooltips = true,
    persistViewport = true,
  }: GraphVisualizerProps) {
    const containerRef = useRef<GraphVisualizationContainerRef>(null);
    const cytoscapeRef = useRef<any>(null);

    // Transform canonical data to Cytoscape format
    const cytoscapeElements = useMemo(() => {
      if (!data || loading) {
        console.log("🔍 GraphVisualizerWrapper: No data or loading", {
          data: !!data,
          loading,
        });
        return [];
      }

      console.log("🔍 GraphVisualizerWrapper: Transforming data", {
        nodeCount: data.nodes?.length || 0,
        edgeCount: data.edges?.length || 0,
      });

      try {
        const { nodes, edges } = GraphDataStandardizer.toCytoscape(data);
        console.log("🔍 GraphDataStandardizer result:", {
          nodes: nodes.length,
          edges: edges.length,
        });

        const elements = [
          ...nodes.map((node) => ({ data: node.data })),
          ...edges.map((edge) => ({ data: edge.data })),
        ];

        console.log("🔍 Final cytoscape elements count:", elements.length);
        return elements;
      } catch (error) {
        console.error("❌ Failed to transform graph data:", error);
        return [];
      }
    }, [data, loading]);

    // Merge configuration with defaults
    const mergedConfig = useMemo(() => {
      const styleConfig = createStyleConfig({
        showLabels,
        showEdgeLabels: config.styles?.showEdgeLabels,
        ...config.styles,
      });

      const layoutConfig = getLayoutConfig(layoutType);
      const performanceConfig = getPerformanceConfig(cytoscapeElements.length);

      return {
        style: styleConfig.styles,
        layout: { ...layoutConfig, ...(config.layout?.config || {}) },
        performance: { ...performanceConfig, ...(config.performance || {}) },
      };
    }, [config, layoutType, showLabels, cytoscapeElements.length]);

    // Create safe event handlers with error boundaries
    const safeEventHandlers: GraphEventHandlers = useMemo(() => {
      const wrapHandler = <T extends (...args: any[]) => any>(
        handler: T | undefined,
        handlerName: string
      ): T | undefined => {
        if (!handler) return undefined;

        return ((...args: Parameters<T>) => {
          try {
            return handler(...args);
          } catch (error) {
            console.error(`❌ Error in ${handlerName}:`, error);
          }
        }) as T;
      };

      return {
        onNodeClick: wrapHandler(eventHandlers.onNodeClick, "onNodeClick"),
        onNodeDoubleClick: wrapHandler(
          eventHandlers.onNodeDoubleClick,
          "onNodeDoubleClick"
        ),
        onBackgroundClick: wrapHandler(
          eventHandlers.onBackgroundClick,
          "onBackgroundClick"
        ),
        onContextMenu: wrapHandler(
          eventHandlers.onContextMenu,
          "onContextMenu"
        ),
        onViewportChange: wrapHandler(
          eventHandlers.onViewportChange,
          "onViewportChange"
        ),
        onNodeDetailsLoad: wrapHandler(
          eventHandlers.onNodeDetailsLoad,
          "onNodeDetailsLoad"
        ),
      };
    }, [eventHandlers]);

    // Public API methods
    const clearSelections = useCallback(() => {
      containerRef.current?.clearSelections();
    }, []);

    const fitGraph = useCallback(() => {
      containerRef.current?.fitGraph();
    }, []);

    const setViewport = useCallback(
      (zoom: number, pan: { x: number; y: number }) => {
        containerRef.current?.setViewport(zoom, pan);
      },
      []
    );

    const getCytoscapeInstance = useCallback(() => {
      return (
        containerRef.current?.getCytoscapeInstance() || cytoscapeRef.current
      );
    }, []);

    // Handle loading state
    if (loading) {
      return (
        <div
          className={
            className || "w-full h-full flex items-center justify-center"
          }
          style={style}
        >
          <div className="text-center py-8">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-24 mx-auto"></div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Loading graph...
            </p>
          </div>
        </div>
      );
    }

    // Handle empty data
    if (!data || (!data.nodes.length && !data.edges.length)) {
      console.log("🔍 GraphVisualizerWrapper: Empty data state", {
        hasData: !!data,
        nodeCount: data?.nodes?.length || 0,
        edgeCount: data?.edges?.length || 0,
      });

      return (
        <div
          className={
            className || "w-full h-full flex items-center justify-center"
          }
          style={style}
        >
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium mb-2">No Graph Data</p>
            <p className="text-sm">
              Provide nodes and edges in the data prop to visualize your graph
            </p>
            {data && (
              <p className="text-xs mt-2">
                Data: {data.nodes?.length || 0} nodes, {data.edges?.length || 0}{" "}
                edges
              </p>
            )}
          </div>
        </div>
      );
    }

    // Validation warning for mismatched data
    const orphanedEdges = data.edges.filter((edge) => {
      const nodeIds = new Set(data.nodes.map((n) => n.uid));
      return !nodeIds.has(edge.source) || !nodeIds.has(edge.target);
    });

    if (orphanedEdges.length > 0) {
      console.warn(
        `⚠️ Found ${orphanedEdges.length} orphaned edges (edges without corresponding nodes):`,
        orphanedEdges.map((e) => e.uid)
      );
    }

    return (
      <div className={className || "w-full h-full"} style={style}>
        <GraphVisualizationContainer
          ref={containerRef}
          cytoscapeRef={cytoscapeRef}
          elements={cytoscapeElements}
          cytoscapeConfig={mergedConfig}
          eventHandlers={safeEventHandlers}
          performanceConfig={mergedConfig.performance}
          enableTooltips={enableTooltips}
          initialViewport={initialViewport}
          persistViewport={persistViewport}
          className="w-full h-full"
        />

        {/* Development info panel (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <GraphDebugInfo
            data={data}
            elements={cytoscapeElements}
            config={mergedConfig}
            orphanedEdges={orphanedEdges}
          />
        )}
      </div>
    );
  }
);

// Expose public API methods through ref
export interface GraphVisualizerRef {
  clearSelections: () => void;
  fitGraph: () => void;
  setViewport: (zoom: number, pan: { x: number; y: number }) => void;
  getCytoscapeInstance: () => any;
  getContainer: () => HTMLElement | null;
}

export const GraphVisualizer = React.forwardRef<
  GraphVisualizerRef,
  GraphVisualizerProps & { children?: React.ReactNode }
>(({ children, ...props }, ref) => {
  const containerRef = useRef<GraphVisualizationContainerRef>(null);

  React.useImperativeHandle(
    ref,
    () => ({
      clearSelections: () => containerRef.current?.clearSelections(),
      fitGraph: () => containerRef.current?.fitGraph(),
      setViewport: (zoom: number, pan: { x: number; y: number }) =>
        containerRef.current?.setViewport(zoom, pan),
      getCytoscapeInstance: () => containerRef.current?.getCytoscapeInstance(),
      getContainer: () => containerRef.current?.getContainer() ?? null,
    }),
    []
  );

  return (
    <>
      <GraphVisualizerWrapper {...props} />
      {children}
    </>
  );
});

GraphVisualizer.displayName = "GraphVisualizer";
GraphVisualizerWrapper.displayName = "GraphVisualizerWrapper";

/**
 * Debug information panel for development
 *
 * Provides real-time debugging information about the graph state,
 * including node/edge counts, performance settings, and data validation issues.
 *
 * Only renders in development mode to avoid production bundle bloat.
 */
const GraphDebugInfo = React.memo(function GraphDebugInfo({
  data,
  elements,
  config,
  orphanedEdges,
}: {
  data: any;
  elements: any[];
  config: any;
  orphanedEdges: any[];
}) {
  const [showDebug, setShowDebug] = React.useState(false);

  if (!showDebug) {
    return (
      <button
        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs"
        onClick={() => setShowDebug(true)}
      >
        Debug
      </button>
    );
  }

  return (
    <div className="absolute top-2 right-2 bg-black bg-opacity-90 text-white p-3 rounded text-xs max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">Graph Debug Info</span>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-1">
        <div>Nodes: {data.nodes?.length || 0}</div>
        <div>Edges: {data.edges?.length || 0}</div>
        <div>Cytoscape Elements: {elements.length}</div>
        {orphanedEdges.length > 0 && (
          <div className="text-yellow-400">
            Orphaned Edges: {orphanedEdges.length}
          </div>
        )}
        <div>Layout: {config.layout?.name}</div>
        <div>
          Performance Mode: {elements.length > 1000 ? "Optimized" : "Standard"}
        </div>
        <div>View Mode: {data.meta?.viewMode || "unknown"}</div>
      </div>
    </div>
  );
});
