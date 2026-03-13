/**
 * Knowledge Graph Clustering Types
 *
 * Comprehensive TypeScript definitions for cluster-based graph visualization
 * and community detection in evidence graphs.
 */

import type { Position, GraphNode, GraphEdge } from "./evidence-graph.types";

/**
 * Community detection algorithm types supported by Neo4j
 */
export type ClusterAlgorithm =
  | "louvain" // Best for modularity optimization
  | "label_propagation" // Fast, good for large graphs
  | "weakly_connected" // Connected components
  | "strongly_connected" // Directed graph components
  | "leiden" // High-quality communities
  | "k_core" // Core-based clustering
  | "triangle_count"; // Triangle-based communities

/**
 * Layout algorithm for positioning clusters
 */
export type ClusterLayout =
  | "force_directed" // Physics-based positioning
  | "hierarchical" // Tree-like organization
  | "circular" // Circular arrangement
  | "grid" // Grid-based positioning
  | "atlas" // Data atlas style
  | "concentric"; // Concentric circles

/**
 * Individual cluster/community information
 */
export interface GraphCluster {
  /** Unique cluster identifier */
  id: string;
  /** Cluster display name */
  name: string;
  /** Algorithm that generated this cluster */
  algorithm: ClusterAlgorithm;
  /** Cluster quality metrics */
  metrics: ClusterMetrics;
  /** Nodes belonging to this cluster */
  nodeIds: string[];
  /** Visual styling for cluster */
  style: ClusterStyle;
  /** Cluster center position */
  position: Position;
  /** Bounding box for the cluster */
  bounds: BoundingBox;
  /** Parent cluster (for hierarchical clustering) */
  parentId?: string;
  /** Child clusters (for hierarchical clustering) */
  childIds?: string[];
}

/**
 * Cluster quality and statistical metrics
 */
export interface ClusterMetrics {
  /** Number of nodes in cluster */
  nodeCount: number;
  /** Number of internal edges */
  internalEdges: number;
  /** Number of edges to other clusters */
  externalEdges: number;
  /** Modularity score (higher = better separation) */
  modularity: number;
  /** Clustering coefficient */
  clustering: number;
  /** Average confidence of internal relationships */
  avgConfidence: number;
  /** Density (edges / possible edges) */
  density: number;
  /** Silhouette score (cluster quality) */
  silhouette?: number;
}

/**
 * Visual styling for cluster representation
 */
export interface ClusterStyle {
  /** Primary cluster color */
  color: string;
  /** Background fill color (with transparency) */
  backgroundColor: string;
  /** Border color */
  borderColor: string;
  /** Border width */
  borderWidth: number;
  /** Border style */
  borderStyle: "solid" | "dashed" | "dotted";
  /** Cluster size multiplier */
  scale: number;
  /** Whether cluster should be highlighted */
  highlighted: boolean;
}

/**
 * Bounding box for cluster positioning
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Complete clustering result from Neo4j analysis
 */
export interface ClusteringResult {
  /** Clustering algorithm used */
  algorithm: ClusterAlgorithm;
  /** Algorithm parameters */
  parameters: Record<string, any>;
  /** Generated timestamp */
  generatedAt: string;
  /** Total computation time (ms) */
  computationTime: number;
  /** All detected clusters */
  clusters: GraphCluster[];
  /** Overall clustering metrics */
  globalMetrics: GlobalClusterMetrics;
  /** Node-to-cluster mapping */
  nodeClusterMap: Record<string, string>;
  /** Inter-cluster relationships */
  clusterEdges: ClusterEdge[];
}

/**
 * Global clustering quality metrics
 */
export interface GlobalClusterMetrics {
  /** Total number of clusters */
  clusterCount: number;
  /** Overall modularity score */
  globalModularity: number;
  /** Average cluster size */
  avgClusterSize: number;
  /** Standard deviation of cluster sizes */
  clusterSizeStdDev: number;
  /** Percentage of nodes clustered */
  coverage: number;
  /** Silhouette score for entire clustering */
  globalSilhouette: number;
}

/**
 * Edge between clusters (meta-relationship)
 */
export interface ClusterEdge {
  /** Unique edge identifier */
  id: string;
  /** Source cluster ID */
  sourceCluster: string;
  /** Target cluster ID */
  targetCluster: string;
  /** Number of edges between clusters */
  edgeCount: number;
  /** Average confidence of inter-cluster edges */
  avgConfidence: number;
  /** Strength of connection (0-1) */
  strength: number;
  /** Edge types involved */
  edgeTypes: string[];
}

/**
 * Layout configuration for cluster positioning
 */
export interface ClusterLayoutConfig {
  /** Layout algorithm to use */
  algorithm: ClusterLayout;
  /** Layout parameters */
  parameters: {
    /** Canvas dimensions */
    width: number;
    height: number;
    /** Padding around clusters */
    padding: number;
    /** Force strength (for force-directed) */
    forceStrength?: number;
    /** Number of iterations */
    iterations?: number;
    /** Minimum distance between clusters */
    minDistance?: number;
    /** Whether to use cluster size in positioning */
    sizeInfluence?: boolean;
  };
  /** Whether to animate layout changes */
  animated: boolean;
  /** Animation duration (ms) */
  animationDuration: number;
}

/**
 * Node with cluster membership information
 */
export interface ClusteredNode extends GraphNode {
  /** Cluster this node belongs to */
  clusterId: string;
  /** Position within cluster (relative to cluster center) */
  clusterPosition: Position;
  /** Distance from cluster center */
  distanceFromCenter: number;
  /** Role within cluster */
  clusterRole: "center" | "peripheral" | "bridge" | "outlier";
  /** Importance score within cluster (0-1) */
  clusterImportance: number;
}

/**
 * Enhanced edge with cluster context
 */
export interface ClusteredEdge extends GraphEdge {
  /** Whether edge is within a cluster */
  isIntraCluster: boolean;
  /** Source node's cluster */
  sourceCluster: string;
  /** Target node's cluster */
  targetCluster: string;
  /** Edge importance for clustering */
  clusterImportance: number;
}

/**
 * Atlas-style view configuration
 */
export interface AtlasViewConfig {
  /** Zoom levels for different detail */
  zoomLevels: {
    /** Overview - show only clusters */
    overview: number;
    /** Intermediate - show clusters + key nodes */
    intermediate: number;
    /** Detail - show all nodes */
    detail: number;
  };
  /** Cluster visibility by zoom level */
  clusterVisibility: {
    showLabels: boolean;
    showMetrics: boolean;
    showBounds: boolean;
    minNodesForVisibility: number;
  };
  /** Interaction settings */
  interactions: {
    /** Enable cluster drilling */
    enableDrillDown: boolean;
    /** Enable cluster expansion */
    enableExpansion: boolean;
    /** Enable cluster merging */
    enableMerging: boolean;
  };
}

/**
 * Cluster analysis configuration
 */
export interface ClusterAnalysisConfig {
  /** Algorithms to run */
  algorithms: ClusterAlgorithm[];
  /** Minimum cluster size */
  minClusterSize: number;
  /** Maximum number of clusters */
  maxClusters?: number;
  /** Edge weight property */
  weightProperty?: string;
  /** Node properties to consider */
  nodeProperties?: string[];
  /** Whether to include singleton clusters */
  includeSingletons: boolean;
  /** Resolution parameter (for modularity-based algorithms) */
  resolution?: number;
}

/**
 * Cluster navigation state
 */
export interface ClusterNavigationState {
  /** Currently selected clusters */
  selectedClusters: string[];
  /** Current zoom level */
  zoomLevel: number;
  /** Focused cluster (drill-down) */
  focusedCluster?: string;
  /** Hidden clusters */
  hiddenClusters: string[];
  /** Filter applied to clusters */
  clusterFilter?: ClusterFilter;
}

/**
 * Cluster filtering options
 */
export interface ClusterFilter {
  /** Minimum cluster size */
  minSize?: number;
  /** Maximum cluster size */
  maxSize?: number;
  /** Minimum modularity score */
  minModularity?: number;
  /** Entity types to include */
  entityTypes?: string[];
  /** Algorithm types to include */
  algorithms?: ClusterAlgorithm[];
  /** Confidence threshold */
  minConfidence?: number;
}

/**
 * Type guards for cluster data
 */
export function isClusterAlgorithm(value: string): value is ClusterAlgorithm {
  const algorithms: ClusterAlgorithm[] = [
    "louvain",
    "label_propagation",
    "weakly_connected",
    "strongly_connected",
    "leiden",
    "k_core",
    "triangle_count",
  ];
  return algorithms.includes(value as ClusterAlgorithm);
}

export function isClusterLayout(value: string): value is ClusterLayout {
  const layouts: ClusterLayout[] = [
    "force_directed",
    "hierarchical",
    "circular",
    "grid",
    "atlas",
    "concentric",
  ];
  return layouts.includes(value as ClusterLayout);
}

/**
 * Default cluster styles by algorithm
 */
export const DEFAULT_CLUSTER_STYLES: Record<
  ClusterAlgorithm,
  Partial<ClusterStyle>
> = {
  louvain: {
    color: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "#3B82F6",
  },
  label_propagation: {
    color: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "#10B981",
  },
  weakly_connected: {
    color: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "#F59E0B",
  },
  strongly_connected: {
    color: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "#EF4444",
  },
  leiden: {
    color: "#8B5CF6",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderColor: "#8B5CF6",
  },
  k_core: {
    color: "#06B6D4",
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderColor: "#06B6D4",
  },
  triangle_count: {
    color: "#84CC16",
    backgroundColor: "rgba(132, 204, 22, 0.1)",
    borderColor: "#84CC16",
  },
} as const;
