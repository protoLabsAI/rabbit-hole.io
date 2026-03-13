/**
 * Graph Data Standardizer
 *
 * Unified service to transform all graph data formats to canonical format.
 * Replaces scattered transformation logic and eliminates field mapping errors.
 */

import { ALL_ENTITY_TYPES } from "@proto/types";
import { getEntityImage, getEntityColor } from "@proto/utils/atlas";

import type {
  CanonicalNode,
  CanonicalEdge,
  CanonicalGraphData,
  CanonicalResponse,
  EntityType,
  SentimentType,
  IntensityType,
} from "../types/canonical-graph";

// Cytoscape output format
interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    type: string;
    image: string;
    color: string;
    size: number;
    connections: number;
    communityId?: number;
    metrics?: any;
    originalNode: CanonicalNode;
  };
  position?: { x: number; y: number };
  classes?: string;
}

interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    type: string;
    color: string;
    sentiment: string;
    originalEdge: CanonicalEdge;
  };
  classes?: string;
}

interface TransformOptions {
  communityColoring?: boolean;
  timelineMode?: boolean;
  nodeSizeRange?: { min: number; max: number };
  maxNodeSize?: number;
}

export class GraphDataStandardizer {
  /**
   * Transform canonical format to Cytoscape format
   */
  static toCytoscape(
    data: CanonicalGraphData,
    options: TransformOptions = {}
  ): {
    nodes: CytoscapeNode[];
    edges: CytoscapeEdge[];
  } {
    const opts: Required<TransformOptions> = {
      communityColoring: false,
      timelineMode: false,
      nodeSizeRange: { min: 30, max: 100 },
      maxNodeSize: 120,
      ...options,
    };
    // Calculate connection counts internally
    const connectionCounts = this.calculateConnectionCounts(data);

    const nodes: CytoscapeNode[] = data.nodes.map((node: CanonicalNode) => {
      const connections = connectionCounts.get(node.uid) || 0;
      const activity = node.metrics?.activityInWindow || 0;
      const sizeFactor = opts.timelineMode ? activity : connections;

      // Advanced size calculation with options
      const size = this.calculateAdvancedNodeSize(
        sizeFactor,
        opts.nodeSizeRange,
        opts.maxNodeSize
      );

      // Community coloring support
      const communityId = node.metadata?.communityId;
      const color =
        opts.communityColoring && communityId
          ? this.getCommunityColor(communityId)
          : getEntityColor(node.type);

      // Build CSS classes for styling
      const classes = [
        `entity-${node.type}`,
        communityId ? `community-${communityId}` : "",
        activity > 5 ? "high-activity" : "",
        connections > 10 ? "highly-connected" : "",
      ]
        .filter(Boolean)
        .join(" ");

      // Validate position is actually a position object, not a string or other value
      const position = this.validatePosition(node.metadata?.position);

      return {
        data: {
          id: node.uid,
          label: node.name,
          type: node.type,
          image: getEntityImage(node.type),
          color,
          size,
          connections,
          communityId,
          metrics: node.metrics,
          originalNode: node,
        },
        position,
        classes: classes || undefined,
      };
    });

    const edges: CytoscapeEdge[] = data.edges.map((edge: CanonicalEdge) => ({
      data: {
        id: edge.uid,
        source: edge.source,
        target: edge.target,
        label: edge.display.label,
        type: edge.type,
        color: edge.display.color,
        sentiment: edge.sentiment,
        originalEdge: edge,
      },
    }));

    return { nodes, edges };
  }

  /**
   * Wrap data in standard response format
   */
  static createResponse<T>(
    data: T,
    success: boolean = true,
    error?: string
  ): CanonicalResponse<T> {
    return { success, data: success ? data : undefined, error };
  }

  // Utility Methods

  private static normalizeEntityType(type: string): EntityType {
    const normalized = type.toLowerCase();
    const validTypes = ALL_ENTITY_TYPES.map((t) => t.toLowerCase());
    return validTypes.includes(normalized)
      ? (normalized as EntityType)
      : "organization";
  }

  private static capitalizeEntityType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }

  private static normalizeSentiment(sentiment?: string): SentimentType {
    if (!sentiment) return "neutral";
    const normalized = sentiment.toLowerCase();
    switch (normalized) {
      case "hostile":
      case "negative":
      case "attack":
        return "hostile";
      case "supportive":
      case "positive":
      case "endorsement":
        return "supportive";
      case "ambiguous":
      case "mixed":
        return "ambiguous";
      default:
        return "neutral";
    }
  }

  private static normalizeIntensity(intensity?: string): IntensityType {
    if (!intensity) return "medium";
    const normalized = intensity.toLowerCase();
    const validIntensities = ["low", "medium", "high", "extreme"];
    return validIntensities.includes(normalized)
      ? (normalized as IntensityType)
      : "medium";
  }

  private static getSentimentColor(sentiment: SentimentType): string {
    switch (sentiment) {
      case "hostile":
        return "#ff4444";
      case "supportive":
        return "#44ff44";
      case "ambiguous":
        return "#ffaa44";
      default:
        return "#666666";
    }
  }

  private static humanizeRelationType(type: string): string {
    return type.toLowerCase().replace(/_/g, " ");
  }

  private static calculateNodeSize(connections: number): number {
    if (connections === 0) return 30;
    if (connections <= 3) return 50;
    if (connections <= 10) return 70;
    return 90;
  }

  /**
   * Advanced node size calculation with options
   */
  private static calculateAdvancedNodeSize(
    factor: number,
    sizeRange: { min: number; max: number },
    maxSize: number
  ): number {
    if (factor === 0) return sizeRange.min;

    // Progressive scaling (from cytoscape-adapter)
    if (factor === 1) return sizeRange.min + 10;
    if (factor <= 3) return sizeRange.min + 25;
    if (factor <= 6) return sizeRange.min + 40;
    if (factor <= 10) return sizeRange.min + 55;

    return Math.min(maxSize, sizeRange.max);
  }

  /**
   * Generate consistent community colors using HSL
   */
  private static getCommunityColor(communityId: number): string {
    // Generate consistent colors using golden angle for good distribution
    const hue = (communityId * 137.508) % 360;
    const saturation = 65;
    const lightness = 50;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Validate that a position value is actually a valid position object
   */
  private static validatePosition(
    position: any
  ): { x: number; y: number } | undefined {
    if (!position || typeof position !== "object") {
      return undefined;
    }

    if (
      typeof position.x === "number" &&
      typeof position.y === "number" &&
      !isNaN(position.x) &&
      !isNaN(position.y)
    ) {
      return { x: position.x, y: position.y };
    }

    return undefined;
  }

  /**
   * Calculate connection counts for canonical format data
   */
  private static calculateConnectionCounts(
    data: CanonicalGraphData
  ): Map<string, number> {
    const connectionCounts = new Map<string, number>();

    // Initialize all nodes with 0 connections
    data.nodes.forEach((node: CanonicalNode) => {
      connectionCounts.set(node.uid, 0);
    });

    // Count valid edges and connections
    const nodeIds = new Set(data.nodes.map((n: CanonicalNode) => n.uid));

    data.edges.forEach((edge: CanonicalEdge) => {
      const sourceExists = nodeIds.has(edge.source);
      const targetExists = nodeIds.has(edge.target);

      if (sourceExists && targetExists) {
        connectionCounts.set(
          edge.source,
          (connectionCounts.get(edge.source) || 0) + 1
        );
        connectionCounts.set(
          edge.target,
          (connectionCounts.get(edge.target) || 0) + 1
        );
      }
    });

    return connectionCounts;
  }
}
