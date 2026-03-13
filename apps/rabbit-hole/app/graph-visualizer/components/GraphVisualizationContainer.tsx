/**
 * GraphVisualizationContainer Component
 *
 * Core Cytoscape visualization component with DOM container management.
 * Extracted from AtlasPage DOM logic and ref handling.
 */

import React, { useRef, forwardRef, useImperativeHandle } from "react";

import { useCytoscape } from "../hooks/useCytoscape";

import type { GraphVisualizationContainerProps } from "./types";

/**
 * Imperative API interface for GraphVisualizationContainer
 *
 * Provides programmatic access to the graph visualization functionality.
 */
export interface GraphVisualizationContainerRef {
  /** Get the Cytoscape instance for advanced operations */
  getCytoscapeInstance: () => any;

  /** Clear all node/edge selections and highlighting */
  clearSelections: () => void;

  /** Fit the entire graph to the container viewport */
  fitGraph: () => void;

  /** Set viewport zoom and pan programmatically */
  setViewport: (zoom: number, pan: { x: number; y: number }) => void;

  /** Hide all visible tooltips (useful when opening menus/panels) */
  hideAllTooltips: () => void;

  /** Get the DOM container element */
  getContainer: () => HTMLElement | null;
}

/**
 * Core Graph Visualization Container
 *
 * **Low-level component that directly manages Cytoscape.js instance:**
 *
 * - **DOM Management**: Handles container mounting and cleanup
 * - **Cytoscape Integration**: Direct interface with Cytoscape.js library
 * - **Event Forwarding**: Passes through event handlers from parent
 * - **Performance Monitoring**: Applies performance optimizations
 * - **Imperative API**: Exposes methods via ref for external control
 *
 * This component is typically wrapped by GraphVisualizerWrapper for easier usage.
 *
 * @example
 * ```tsx
 * const containerRef = useRef<GraphVisualizationContainerRef>(null);
 *
 * <GraphVisualizationContainer
 *   ref={containerRef}
 *   elements={cytoscapeElements}
 *   cytoscapeConfig={config}
 *   eventHandlers={handlers}
 * />
 *
 * // Later...
 * containerRef.current?.fitGraph();
 * ```
 */
export const GraphVisualizationContainer = React.memo(
  forwardRef<GraphVisualizationContainerRef, GraphVisualizationContainerProps>(
    function GraphVisualizationContainer(props, ref) {
      const {
        cytoscapeRef,
        elements,
        cytoscapeConfig,
        eventHandlers,
        className = "w-full h-full min-h-96",
        style = { cursor: "grab" },
        performanceConfig,
        enableTooltips = true,
        initialViewport,
        persistViewport = true,
      } = props;
      const containerRef = useRef<HTMLDivElement | null>(null);

      // Initialize Cytoscape with the extracted hook
      const { cy, clearSelections, fitGraph, setViewport, hideAllTooltips } =
        useCytoscape({
          containerRef,
          elements,
          loading: !elements.length,
          layoutType: getLayoutTypeFromConfig(cytoscapeConfig.layout),
          showLabels: getShowLabelsFromConfig(cytoscapeConfig.style),
          highlightConnections: true, // Default to true for better UX
          viewMode: "full-atlas", // Default view mode
          eventHandlers,
          initialViewport,
          enableTooltips,
          persistViewport,
        });

      // Expose imperative API through ref
      useImperativeHandle(
        ref,
        () => ({
          getCytoscapeInstance: () => cy,
          clearSelections,
          fitGraph,
          setViewport,
          hideAllTooltips,
          getContainer: () => containerRef.current,
        }),
        [cy, clearSelections, fitGraph, setViewport, hideAllTooltips]
      );

      // Forward Cytoscape instance to external ref if provided
      React.useEffect(() => {
        if (cytoscapeRef) {
          cytoscapeRef.current = cy;
        }
      }, [cy, cytoscapeRef]);

      // Handle empty state
      if (!elements.length) {
        return (
          <div
            className={`flex items-center justify-center ${className}`}
            style={{ ...style, minHeight: "400px" }}
          >
            <div className="text-center py-8 text-muted-foreground">
              <p>No graph data to visualize</p>
              <p className="text-sm">
                Add some entities and relationships to see the graph
              </p>
            </div>
          </div>
        );
      }

      return (
        <div
          ref={containerRef}
          className={className}
          style={style}
          data-testid="graph-visualization-container"
          role="application"
          aria-label="Interactive graph visualization"
        />
      );
    }
  )
);

/**
 * Extract layout type from Cytoscape config
 */
function getLayoutTypeFromConfig(
  layout: any
): "breadthfirst" | "force" | "atlas" {
  if (!layout || typeof layout !== "object") return "atlas";

  const layoutName = layout.name?.toLowerCase();

  switch (layoutName) {
    case "breadthfirst":
      return "breadthfirst";
    case "cola":
      return "force";
    case "cise":
    default:
      return "atlas";
  }
}

/**
 * Extract showLabels setting from Cytoscape styles
 */
function getShowLabelsFromConfig(styles: any[]): boolean {
  if (!Array.isArray(styles)) return true;

  // Look for node style with label configuration
  const nodeStyle = styles.find((s) => s.selector === "node");
  if (!nodeStyle || !nodeStyle.style) return true;

  const label = nodeStyle.style.label;

  // If label is explicitly empty string, labels are disabled
  if (label === "") return false;

  // If label uses data binding or has content, labels are enabled
  return Boolean(label);
}
