/**
 * Evidence Graph Types - Main Export
 *
 * This file exports all the strongly typed interfaces and utilities
 * for working with evidence graph data in a type-safe manner.
 */

// Core type definitions
export type {
  // Main data structures
  EvidenceGraphData,
  EvidenceEntry,
  GraphNode,
  GraphEdge,

  // Metadata types
  EvidenceGraphMeta,
  DateRange,
  Position,
  SchemaExamples,

  // Enum-like types
  EntityType,
  EdgeType,
  EvidenceType,

  // Enhanced types for UI
  EnhancedGraphNode,
  EnhancedGraphEdge,

  // Validation types
  ValidationResult,
} from "./evidence-graph.types";

// Cluster types
export type {
  // Clustering algorithms and layouts
  ClusterAlgorithm,
  ClusterLayout,

  // Core cluster structures
  GraphCluster,
  ClusteringResult,
  ClusterEdge,

  // Cluster metrics and analysis
  ClusterMetrics,
  GlobalClusterMetrics,
  ClusterAnalysisConfig,

  // Layout and visualization
  ClusterLayoutConfig,
  ClusterStyle,
  BoundingBox,
  AtlasViewConfig,

  // Enhanced node/edge types
  ClusteredNode,
  ClusteredEdge,

  // Navigation and filtering
  ClusterNavigationState,
  ClusterFilter,
} from "./cluster.types";

// Cluster values and constants
export { DEFAULT_CLUSTER_STYLES } from "./cluster.types";

// Cluster type guards
export { isClusterAlgorithm, isClusterLayout } from "./cluster.types";

// Type guards and utilities
export {
  isEntityType,
  isEdgeType,
  isEvidenceGraphData,
} from "./evidence-graph.types";

// Validation utilities
export { validateEvidenceGraph } from "../utils/validation";
export { getEntityTypeColor } from "@protolabsai/utils";

// Data access
export {
  evidenceGraphData,
  isEvidenceGraphData as isValidEvidenceGraph,
} from "../data/evidence-graph-data";

// Transform utilities
export { transformDataToReactFlow } from "../utils/data-transformer";
