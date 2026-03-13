/**
 * Atlas Data Transformation Utilities
 *
 * Simplified utilities for Atlas UI components.
 * Legacy transformation functions removed - now handled by GraphDataStandardizer.
 */

import {
  getEntityColor,
  getEntityImage,
  getSentimentColor,
} from "./entity-styling";
// Note: CanonicalNode is defined in the main app, so using duck typing for compatibility

// Legacy interfaces - deprecated, use CanonicalNode/CanonicalEdge instead
export interface AtlasNode {
  id: string;
  label: string;
  entityType: string;
  tags?: string[];
  position?: { x: number; y: number };
}

export interface AtlasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  confidence?: number;
  sentiment?: string;
}

export interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    type: string;
    image: string;
    color: string;
    size: number;
    connections: number;
    originalNode: AtlasNode;
  };
}

export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    sentiment: string;
    confidence: number;
    color: string;
    originalEdge: AtlasEdge;
  };
}

export interface EdgeDeduplicationOptions {
  deduplicate: boolean;
  strategy: "bidirectional" | "best_single" | "most_recent";
}

interface EdgePairKey {
  nodeA: string;
  nodeB: string;
}

export type ViewMode = "full-atlas" | "ego" | "community" | "timeslice";

export interface ViewModeEdgeOptions {
  showLabels: boolean;
  deduplicate: boolean;
}

export interface LegendItem {
  type: string;
  color: string;
  icon: string;
  count: number;
  visibleCount: number;
  visible: boolean;
}

export interface SentimentItem {
  sentiment: "hostile" | "supportive" | "neutral" | "ambiguous";
  color: string;
  label: string;
  count: number;
}

/**
 * @deprecated Use GraphDataStandardizer.toCytoscape() instead (handles internally)
 * Calculate connection counts for each node based on valid edges
 */
export function calculateConnectionCounts(
  nodes: AtlasNode[],
  edges: AtlasEdge[]
): Map<string, number> {
  const connectionCounts = new Map<string, number>();

  // Initialize all nodes with 0 connections
  nodes.forEach((node) => {
    connectionCounts.set(node.id, 0);
  });

  // Count valid edges and connections
  const nodeIds = new Set(nodes.map((n) => n.id));

  edges.forEach((edge) => {
    const sourceExists = nodeIds.has(edge.source);
    const targetExists = nodeIds.has(edge.target);

    if (sourceExists && targetExists) {
      const sourceCount = connectionCounts.get(edge.source) || 0;
      const targetCount = connectionCounts.get(edge.target) || 0;
      connectionCounts.set(edge.source, sourceCount + 1);
      connectionCounts.set(edge.target, targetCount + 1);
    }
  });

  return connectionCounts;
}

/**
 * Generate legend data from nodes with entity type grouping and visibility
 * Compatible with both legacy AtlasNode and canonical format
 */
export function generateLegendData(
  nodes: AtlasNode[] | any[],
  hiddenEntityTypes: Set<string>
): LegendItem[] {
  if (!nodes || nodes.length === 0) return [];

  // Get unique entity types from the actual graph data (handle both legacy and canonical)
  const entityTypeCounts = nodes.reduce<Record<string, number>>((acc, node) => {
    const entityType = "entityType" in node ? node.entityType : node.type;
    acc[entityType] = (acc[entityType] || 0) + 1;
    return acc;
  }, {});

  // Convert to legend format, sorted by count (descending)
  return Object.entries(entityTypeCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([type, count]) => {
      const isHidden = hiddenEntityTypes.has(type);
      const visibleCount = isHidden ? 0 : count;

      return {
        type,
        color: getEntityColor(type),
        icon: getEntityImage(type),
        count,
        visibleCount,
        visible: !isHidden,
      };
    });
}

/**
 * @deprecated Unused - consider removing
 * Generate sentiment data from edges with sentiment analysis
 */
export function generateSentimentData(edges: AtlasEdge[]): SentimentItem[] {
  if (!edges || edges.length === 0) return [];

  const sentimentCounts = edges.reduce((acc: Record<string, number>, edge) => {
    const sentiment = (edge as any).sentiment || "neutral";
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {});

  // Define sentiment order and labels
  const sentimentOrder = ["hostile", "supportive", "neutral", "ambiguous"];
  const sentimentLabels = {
    hostile: "Hostile Speech",
    supportive: "Supportive",
    neutral: "Neutral",
    ambiguous: "Ambiguous",
  };

  return sentimentOrder
    .filter((sentiment) => sentimentCounts[sentiment] > 0) // Only show sentiments that exist
    .map((sentiment) => ({
      sentiment: sentiment as
        | "hostile"
        | "supportive"
        | "neutral"
        | "ambiguous",
      color: getSentimentColor(sentiment),
      label: sentimentLabels[sentiment as keyof typeof sentimentLabels],
      count: sentimentCounts[sentiment],
    }));
}

/**
 * Determine if edge labels should be shown based on view mode and global setting
 */
export function shouldShowEdgeLabels(
  viewMode: ViewMode,
  globalShowLabels: boolean
): boolean {
  switch (viewMode) {
    case "ego":
      // EVO mode: Show labels if global setting is enabled
      return globalShowLabels;
    case "full-atlas":
      // Atlas mode: Never show labels (for decluttering)
      return false;
    case "community":
    case "timeslice":
      // Community/Timeslice modes: Hide labels to reduce clutter
      return false;
    default: {
      // Exhaustive checking - ensures all ViewMode values are handled
      const _exhaustiveCheck: never = viewMode;
      return globalShowLabels;
    }
  }
}

/**
 * Get view-mode-specific edge processing options
 */
export function getViewModeEdgeOptions(
  viewMode: ViewMode
): ViewModeEdgeOptions & EdgeDeduplicationOptions {
  switch (viewMode) {
    case "full-atlas":
      return {
        showLabels: false,
        deduplicate: true,
        strategy: "bidirectional", // Keep one edge in each direction
      };
    case "ego":
      return {
        showLabels: true,
        deduplicate: false, // Show all relationships for detailed view
        strategy: "bidirectional",
      };
    case "community":
      return {
        showLabels: false,
        deduplicate: true,
        strategy: "best_single", // Keep only the strongest connection
      };
    case "timeslice":
      return {
        showLabels: false,
        deduplicate: true,
        strategy: "most_recent", // Keep most recent relationship
      };
    default: {
      // Exhaustive checking - ensures all ViewMode values are handled
      const _exhaustiveCheck: never = viewMode;
      return {
        showLabels: false,
        deduplicate: false,
        strategy: "bidirectional",
      };
    }
  }
}

/**
 * Create a normalized edge pair key for deduplication
 */
function createEdgePairKey(sourceId: string, targetId: string): EdgePairKey {
  // Always put the lexicographically smaller ID first for consistency
  const [nodeA, nodeB] = [sourceId, targetId].sort();
  return { nodeA, nodeB };
}

/**
 * @deprecated Use simplified canonical format instead
 * Deduplicate edges between entity pairs based on strategy
 */
export function deduplicateEdges(
  edges: AtlasEdge[],
  options: EdgeDeduplicationOptions
): AtlasEdge[] {
  if (!options.deduplicate) {
    return edges;
  }

  // Group edges by entity pairs
  const edgeGroups = new Map<string, AtlasEdge[]>();

  edges.forEach((edge) => {
    const pairKey = createEdgePairKey(edge.source, edge.target);
    const keyString = `${pairKey.nodeA}-${pairKey.nodeB}`;

    if (!edgeGroups.has(keyString)) {
      edgeGroups.set(keyString, []);
    }
    edgeGroups.get(keyString)!.push(edge);
  });

  const deduplicatedEdges: AtlasEdge[] = [];

  // Apply deduplication strategy for each group
  edgeGroups.forEach((groupEdges) => {
    switch (options.strategy) {
      case "bidirectional": {
        // Keep one edge in each direction (source->target and target->source)
        const forwardEdges = groupEdges.filter((e) => e.source <= e.target);
        const reverseEdges = groupEdges.filter((e) => e.source > e.target);

        if (forwardEdges.length > 0) {
          const bestForward = getBestEdge(forwardEdges);
          deduplicatedEdges.push(bestForward);
        }

        if (reverseEdges.length > 0) {
          const bestReverse = getBestEdge(reverseEdges);
          deduplicatedEdges.push(bestReverse);
        }
        break;
      }

      case "best_single": {
        // Keep only the single best edge between the pair
        const bestEdge = getBestEdge(groupEdges);
        deduplicatedEdges.push(bestEdge);
        break;
      }

      case "most_recent": {
        // Keep the most recent edge (assuming edges have timestamps)
        const sortedByRecency = [...groupEdges].sort((a, b) => {
          // If edges have timestamps, use them; otherwise fall back to confidence
          return (b.confidence || 0) - (a.confidence || 0);
        });
        deduplicatedEdges.push(sortedByRecency[0]);
        break;
      }

      default:
        // Fallback: just take the first edge
        deduplicatedEdges.push(groupEdges[0]);
    }
  });

  return deduplicatedEdges;
}

/**
 * Select the best representative edge from a group based on confidence and sentiment
 */
function getBestEdge(edges: AtlasEdge[]): AtlasEdge {
  if (edges.length === 1) return edges[0];

  // Sort by confidence (descending), then prefer non-neutral sentiments
  return edges.sort((a, b) => {
    const confA = a.confidence || 0;
    const confB = b.confidence || 0;

    if (confA !== confB) {
      return confB - confA; // Higher confidence wins
    }

    // If confidence is equal, prefer non-neutral sentiments
    const sentA = (a as any).sentiment || "neutral";
    const sentB = (b as any).sentiment || "neutral";

    if (sentA !== "neutral" && sentB === "neutral") return -1;
    if (sentA === "neutral" && sentB !== "neutral") return 1;

    return 0;
  })[0];
}

/**
 * @deprecated Use GraphDataStandardizer.toCytoscape() instead
 * Transform atlas nodes to Cytoscape format with progressive sizing based on connections
 */
export function transformNodesToCytoscape(
  nodes: AtlasNode[],
  connectionCounts: Map<string, number>
): CytoscapeNode[] {
  return nodes
    .filter((node) => node.id && node.label && node.entityType) // Filter out invalid nodes
    .map((node) => {
      const connectionCount = connectionCounts.get(node.id) || 0;

      // Progressive sizing algorithm
      let nodeSize: number;
      if (connectionCount === 0) {
        nodeSize = 30; // Isolated nodes
      } else if (connectionCount === 1) {
        nodeSize = 40; // Single connection
      } else if (connectionCount <= 3) {
        nodeSize = 55; // Few connections
      } else if (connectionCount <= 6) {
        nodeSize = 70; // Moderate connections
      } else if (connectionCount <= 10) {
        nodeSize = 85; // Many connections
      } else {
        nodeSize = 100; // Highly connected hubs
      }

      return {
        data: {
          id: node.id,
          label: node.label,
          type: node.entityType,
          image: getEntityImage(node.entityType),
          color: getEntityColor(node.entityType),
          size: nodeSize,
          connections: connectionCount,
          originalNode: node,
        },
      };
    });
}

/**
 * @deprecated Use GraphDataStandardizer.toCytoscape() instead
 * Transform atlas edges to Cytoscape format with sentiment-based styling and optional deduplication
 */
export function transformEdgesToCytoscape(
  edges: AtlasEdge[],
  options?: EdgeDeduplicationOptions
): CytoscapeEdge[] {
  // Apply deduplication if options are provided
  let processedEdges = edges;
  if (options) {
    processedEdges = deduplicateEdges(edges, options);
  }

  return processedEdges
    .filter((edge) => edge.id && edge.source && edge.target) // Filter out invalid edges
    .map((edge) => {
      const sentiment = (edge as any).sentiment || "neutral";

      return {
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label || "connection",
          sentiment: sentiment,
          confidence: edge.confidence || 0.5,
          color: getSentimentColor(sentiment),
          originalEdge: edge,
        },
      };
    });
}
