/**
 * Graph Visualizer Component Types
 */

import type Graph from "graphology";

import type {
  CanonicalGraphData,
  CanonicalNode,
} from "../../types/canonical-graph";
import type { GraphVisualizationConfig } from "../config/types";

// Re-export config types for external usage
export type { GraphVisualizationConfig };

// Re-export Graphology types
export type { GraphNodeAttributes, GraphEdgeAttributes } from "../model/graph";

/**
 * Supported graph renderers
 */
export type GraphRenderer = "cytoscape" | "reactflow" | "sigma";

/**
 * Graphology graph type for type safety
 */
export type GraphologyGraph = Graph<any, any>;

export interface GraphEventHandlers {
  onNodeClick?: (node: CanonicalNode, event: any) => void;
  onNodeDoubleClick?: (node: CanonicalNode, event: any) => void;
  onBackgroundClick?: (event: any) => void;
  onContextMenu?: (type: string, x: number, y: number, target?: any) => void;
  onViewportChange?: (zoom: number, pan: { x: number; y: number }) => void;
  onNodeDetailsLoad?: (nodeId: string) => Promise<any>;
}

export interface GraphVisualizerProps {
  /** Graph data in canonical format */
  data: CanonicalGraphData;

  /** Whether the graph is currently loading */
  loading?: boolean;

  /** Configuration overrides */
  config?: GraphVisualizationConfig;

  /** Event handlers */
  eventHandlers?: GraphEventHandlers;

  /** Layout type */
  layoutType?: "breadthfirst" | "force" | "atlas";

  /** Whether to show node labels */
  showLabels?: boolean;

  /** Whether to highlight connections on node selection */
  highlightConnections?: boolean;

  /** Container class name */
  className?: string;

  /** Container style */
  style?: React.CSSProperties;

  /** Initial viewport state */
  initialViewport?: {
    zoom?: number;
    pan?: { x: number; y: number };
  };

  /** Whether to enable tooltips */
  enableTooltips?: boolean;

  /** Whether to persist viewport state */
  persistViewport?: boolean;
}

export interface GraphVisualizationContainerProps {
  /** Cytoscape instance reference */
  cytoscapeRef?: React.MutableRefObject<any>;

  /** Graph elements for Cytoscape */
  elements: any[];

  /** Cytoscape configuration */
  cytoscapeConfig: {
    style: any[];
    layout: any;
    minZoom?: number;
    maxZoom?: number;
    boxSelectionEnabled?: boolean;
  };

  /** Event handlers */
  eventHandlers?: GraphEventHandlers;

  /** Container class name */
  className?: string;

  /** Container style */
  style?: React.CSSProperties;

  /** Performance configuration */
  performanceConfig?: any;

  /** Whether to enable tooltips */
  enableTooltips?: boolean;

  /** Initial viewport state */
  initialViewport?: {
    zoom?: number;
    pan?: { x: number; y: number };
  };

  /** Whether to persist viewport state */
  persistViewport?: boolean;
}
