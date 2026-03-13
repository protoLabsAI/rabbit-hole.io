/**
 * Strongly typed interfaces for the Evidence Graph data structure
 * Based on the enhanced evidence_graph_positions.json schema
 */

// ==================== Core Types ====================

/**
 * Entity types that can appear in the evidence graph
 */
export type EntityType = "person" | "platform" | "event" | "movement" | "media";

/**
 * Edge types that define the nature of relationships
 */
export type EdgeType =
  | "platforming"
  | "platform_control"
  | "coauthor_suspect"
  | "media_platforming"
  | "endorsement_signal"
  | "event_trigger"
  | "narrative_shift"
  | "legal_linkage"
  | "endorsement"
  | "funding"
  | "narrative_precedent"
  | "gov_contract"
  | "event_presence";

/**
 * Evidence source types
 */
export type EvidenceType = "primary" | "secondary" | "analysis";

// ==================== Schema Definitions ====================

/**
 * Schema examples for documentation and validation
 */
export interface SchemaExamples {
  node: {
    required: string[];
    example: {
      id: string;
      label: string;
      entityType: EntityType;
      dates?: {
        start: string;
      };
      sources: string[];
    };
  };
  edge: {
    required: string[];
    example: {
      id: string;
      source: string;
      target: string;
      label: string;
      since?: string;
      type?: EdgeType;
      confidence?: number;
      notes?: string;
    };
  };
  evidence: {
    required: string[];
    example: {
      id: string;
      title: string;
      date: string;
      publisher: string;
      url: string;
    };
  };
}

// ==================== Data Interfaces ====================

/**
 * Metadata about the evidence graph version and generation
 */
export interface EvidenceGraphMeta {
  version: string;
  generated_at: string;
  description: string;
}

/**
 * Evidence entry with source information
 */
export interface EvidenceEntry {
  /** Unique identifier (prefix: ev_) */
  id: string;
  /** Human-readable title of the evidence */
  title: string;
  /** ISO date string when the evidence was published */
  date: string;
  /** Publisher/source organization */
  publisher: string;
  /** URL to the evidence source */
  url: string;
  /** Optional evidence classification */
  type?: EvidenceType;
  /** Optional contextual notes */
  notes?: string;
}

/**
 * Date range information for nodes
 */
export interface DateRange {
  /** Start date in ISO format (YYYY-MM-DD or YYYY-MM) */
  start?: string;
  /** End date in ISO format (YYYY-MM-DD or YYYY-MM) */
  end?: string;
}

/**
 * Position coordinates for graph layout
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Graph node representing entities in the evidence network
 */
export interface GraphNode {
  /** Unique identifier (prefix: n_) */
  id: string;
  /** Human-readable display name */
  label: string;
  /** Classification of the entity */
  entityType: EntityType;
  /** Optional date range for temporal entities */
  dates?: DateRange;
  /** Alternative names or aliases */
  aka?: string[];
  /** Categorization tags */
  tags?: string[];
  /** References to supporting evidence entries */
  sources: string[];
  /** Pre-calculated position for graph layout */
  position?: Position;
}

/**
 * Graph edge representing relationships between nodes
 */
export interface GraphEdge {
  /** Unique identifier (prefix: e_) */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Short description of the relationship */
  label: string;
  /** Start date of the relationship (ISO format) */
  since?: string;
  /** End date of the relationship (ISO format) */
  until?: string;
  /** Confidence score (0-1, default 0.8) */
  confidence?: number;
  /** Type classification of the relationship */
  type?: EdgeType;
  /** Optional contextual notes */
  notes?: string;
  /** References to supporting evidence entries */
  sources: string[];
}

/**
 * Complete evidence graph data structure
 */
export interface EvidenceGraphData {
  /** Graph metadata */
  meta: EvidenceGraphMeta;
  /** Schema documentation and examples */
  schemas?: SchemaExamples;
  /** Evidence source registry */
  evidence: EvidenceEntry[];
  /** Network nodes (entities) */
  nodes: GraphNode[];
  /** Network edges (relationships) */
  edges: GraphEdge[];
}

// ==================== Utility Types ====================

/**
 * Node with computed metadata for UI components
 */
export interface EnhancedGraphNode extends GraphNode {
  /** Number of connections */
  connectionCount: number;
  /** Whether this node is currently selected/centered */
  isCenter: boolean;
}

/**
 * Edge with computed metadata for UI components
 */
export interface EnhancedGraphEdge extends GraphEdge {
  /** Source node data */
  sourceNode: GraphNode;
  /** Target node data */
  targetNode: GraphNode;
  /** Whether this edge has low confidence (< 0.5) */
  isLowConfidence: boolean;
}

/**
 * Validation result for evidence graph data
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    evidenceCount: number;
    nodeCount: number;
    edgeCount: number;
    entityTypeBreakdown: Record<EntityType, number>;
    edgeTypeBreakdown: Record<string, number>;
  };
}

// ==================== Type Guards ====================

/**
 * Type guard to check if an object is a valid EntityType
 */
export function isEntityType(value: string): value is EntityType {
  return ["person", "platform", "event", "movement", "media"].includes(value);
}

/**
 * Type guard to check if an object is a valid EdgeType
 */
export function isEdgeType(value: string): value is EdgeType {
  const validTypes: EdgeType[] = [
    "platforming",
    "platform_control",
    "coauthor_suspect",
    "media_platforming",
    "endorsement_signal",
    "event_trigger",
    "narrative_shift",
    "legal_linkage",
    "endorsement",
    "funding",
    "narrative_precedent",
    "gov_contract",
    "event_presence",
  ];
  return validTypes.includes(value as EdgeType);
}

/**
 * Type guard to check if an object is a valid EvidenceGraphData
 */
export function isEvidenceGraphData(obj: unknown): obj is EvidenceGraphData {
  if (typeof obj !== "object" || obj === null) return false;

  const data = obj as Record<string, unknown>;

  return (
    typeof data.meta === "object" &&
    Array.isArray(data.evidence) &&
    Array.isArray(data.nodes) &&
    Array.isArray(data.edges)
  );
}
