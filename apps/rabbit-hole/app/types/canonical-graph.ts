/**
 * Canonical Graph Data Format
 *
 * Unified interfaces for all graph data across Atlas pipeline.
 * Eliminates 4 competing formats and standardizes field naming.
 */

import { EntityType } from "@protolabsai/types";

// Re-export EntityType from central schema (single source of truth)
export type { EntityType };

export type SentimentType = "hostile" | "supportive" | "neutral" | "ambiguous";

export type IntensityType = "low" | "medium" | "high" | "extreme";

export interface Position {
  x: number;
  y: number;
}

export interface DateRange {
  start?: string;
  end?: string;
}

// Node Interfaces
export interface CanonicalNode {
  /** Unique identifier - consistent across all formats */
  uid: string;

  /** Display name - primary label for entity */
  name: string;

  /** Entity classification */
  type: EntityType;

  /** Display configuration for UI components */
  display: {
    /** Primary title (usually same as name) */
    title: string;
    /** Secondary description (usually entity type) */
    subtitle?: string;
    /** Avatar/image URL */
    avatar?: string;
    /** Display badges/chips (tags, aliases, etc.) */
    badges?: string[];
  };

  /** Performance and activity metrics */
  metrics?: {
    /** Speech act analysis */
    speechActs?: {
      hostile: number;
      supportive: number;
      neutral: number;
      total: number;
    };
    /** Network degree centrality */
    degree?: {
      in: number;
      out: number;
      total: number;
    };
    /** Activity timestamps */
    lastActiveAt?: string;
    /** Activity within time window (for timeslice views) */
    activityInWindow?: number;
  };

  /** Entity metadata */
  metadata: {
    /** Alternative names and aliases */
    aliases?: string[];
    /** Categorization tags */
    tags?: string[];
    /** Temporal information */
    dates?: DateRange;
    /** Evidence source references */
    sources?: string[];
    /** Community detection ID */
    communityId?: number;
    /** Layout position */
    position?: Position;
    /** Data confidence score */
    confidence?: number;
  };
}

// Edge Interfaces
export interface CanonicalEdge {
  /** Unique identifier */
  uid: string;

  /** Source node UID */
  source: string;

  /** Target node UID */
  target: string;

  /** Relationship type */
  type: string;

  /** Sentiment classification - standardized field name */
  sentiment: SentimentType;

  /** Intensity level */
  intensity: IntensityType;

  /** Display configuration */
  display: {
    /** Human-readable label */
    label: string;
    /** Brief excerpt or description */
    excerpt?: string;
    /** UI color for visualization */
    color: string;
    /** Formatted timestamp */
    timestamp?: string;
  };

  /** Edge metadata */
  metadata: {
    /** Confidence score (0-1) */
    confidence: number;
    /** Raw timestamp */
    at?: string;
    /** Additional notes */
    notes?: string;
    /** Evidence source references */
    sources?: string[];
    /** Speech act category */
    category?: string;
  };
}

// Response Metadata
export interface CanonicalMetadata {
  /** Total node count */
  nodeCount: number;

  /** Total edge count */
  edgeCount: number;

  /** Data generation timestamp */
  generatedAt: string;

  /** Schema version identifier */
  schemaVersion: "canonical-v1";

  /** View mode context */
  viewMode?: "full-atlas" | "ego" | "community" | "timeslice" | "batch";

  /** Whether data is bounded/limited for performance */
  bounded?: boolean;

  /** Pagination metadata for batch processing */
  pagination?: {
    pageSize: number;
    hasMore: boolean;
    cursor?: string;
    totalEstimate?: number;
  };

  /** Performance metrics */
  performance?: {
    batchLoaded?: boolean;
    queryOptimized?: boolean;
    batchOptimized?: boolean;
    queryTime?: number;
    memoryTargetMB?: number;
  };

  /** Progressive loading metadata */
  progressive?: {
    enabled?: boolean;
    streamingSupported?: boolean;
    batchIndex?: number;
    batchesLoaded?: number;
    hasMoreBatches?: boolean;
    totalEstimate?: number;
  };

  /** Applied filters */
  filters?: {
    entityTypes?: string[];
    sentiments?: string[];
    timeWindow?: DateRange;
    centerEntity?: string;
    communityId?: number;
    hops?: number;
    nodeLimit?: number;
  };
}

// Main Data Structures
export interface CanonicalGraphData {
  /** Graph nodes */
  nodes: CanonicalNode[];

  /** Graph edges */
  edges: CanonicalEdge[];

  /** Metadata */
  meta: CanonicalMetadata;
}

export interface CanonicalResponse<T = CanonicalGraphData> {
  /** Operation success status */
  success: boolean;

  /** Response data */
  data?: T;

  /** Error message if failed */
  error?: string;

  /** Additional context */
  message?: string;
}

// Enhanced Details Interface (for node details API)
export interface CanonicalNodeDetails extends CanonicalNode {
  /** Enhanced entity information */
  entity: {
    /** Biographical information */
    bio?: string;
    /** Birth/founding date */
    birthDate?: string;
    /** Birth/founding place */
    birthPlace?: string;
    /** Death/dissolution date */
    deathDate?: string;
    /** Death/dissolution place */
    deathPlace?: string;
    /** Nationality */
    nationality?: string;
    /** Occupation/industry */
    occupation?: string;
    /** Political affiliation */
    politicalParty?: string;
    /** Education background */
    education?: string[];
    /** Net worth */
    netWorth?: number;
    /** Current residence */
    residence?: string;
  };

  /** Network analysis */
  network: {
    /** Total relationships */
    total: number;
    /** Incoming relationships */
    incoming: number;
    /** Outgoing relationships */
    outgoing: number;
    /** Sentiment breakdown */
    by_sentiment: {
      hostile: number;
      supportive: number;
      neutral: number;
    };
    /** Speech acts with context */
    speech_acts: Array<{
      category: string;
      sentiment: SentimentType;
      text_excerpt?: string;
      target?: string;
      date?: string;
      intensity?: IntensityType;
    }>;
  };

  /** Timeline data */
  timeline?: {
    events: Array<{
      id: string;
      timestamp: string;
      eventType: "intrinsic" | "relationship" | "milestone";
      category: string;
      title: string;
      description?: string;
      relationshipType?: string;
      targetEntity?: {
        uid: string;
        name: string;
        type: string;
      };
      evidence?: Array<{
        uid: string;
        title: string;
        publisher: string;
        url: string;
        reliability: number;
      }>;
      confidence: number;
      importance: "critical" | "major" | "minor";
    }>;
    summary: {
      totalEvents: number;
      dateRange: { earliest: string; latest: string };
      eventCategories: Record<string, number>;
    };
  };
}

// Type Guards
export function isCanonicalNode(obj: any): obj is CanonicalNode {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.uid === "string" &&
    typeof obj.name === "string" &&
    typeof obj.type === "string" &&
    typeof obj.display === "object"
  );
}

export function isCanonicalEdge(obj: any): obj is CanonicalEdge {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.uid === "string" &&
    typeof obj.source === "string" &&
    typeof obj.target === "string" &&
    typeof obj.sentiment === "string"
  );
}

export function isCanonicalGraphData(obj: any): obj is CanonicalGraphData {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Array.isArray(obj.nodes) &&
    Array.isArray(obj.edges) &&
    typeof obj.meta === "object"
  );
}
