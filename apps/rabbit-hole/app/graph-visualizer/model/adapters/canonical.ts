/**
 * Canonical Graph Data Adapter
 *
 * Converts between CanonicalGraphData and Graphology
 * Bridges existing data format with new graph model
 */

import type Graph from "graphology";

import { getEntityColor, getEntityImage } from "@proto/utils/atlas";

import type {
  CanonicalGraphData,
  SentimentType,
} from "../../../types/canonical-graph";
import type { GraphNodeAttributes, GraphEdgeAttributes } from "../graph";
import { newGraph, upsertNode, upsertEdge } from "../graph";

/**
 * Convert CanonicalGraphData to Graphology
 */
export function canonicalToGraph(
  data: CanonicalGraphData
): Graph<GraphNodeAttributes, GraphEdgeAttributes> {
  const graph = newGraph();

  // Add nodes - filter out invalid entities
  data.nodes.forEach((node) => {
    // Skip nodes with invalid/missing type or uid
    if (!node.type || !node.uid || typeof node.type !== "string") {
      console.warn(`Skipping invalid node: uid=${node.uid}, type=${node.type}`);
      return;
    }

    // Validate and provide fallback coordinates
    const x = node.metadata?.position?.x;
    const y = node.metadata?.position?.y;
    const hasValidCoords =
      typeof x === "number" &&
      !isNaN(x) &&
      isFinite(x) &&
      typeof y === "number" &&
      !isNaN(y) &&
      isFinite(y);

    if (!hasValidCoords) {
      console.warn(
        `Node ${node.uid} has invalid coordinates (x=${x}, y=${y}), using random position`
      );
    }

    upsertNode(graph, node.uid, {
      uid: node.uid,
      name: node.name,
      type: node.type, // Entity type (person, organization, etc.) - NOT Sigma node type
      x: hasValidCoords ? x : Math.random() * 1000,
      y: hasValidCoords ? y : Math.random() * 1000,
      color: getEntityColor(node.type),
      icon: getEntityImage(node.type),
      properties: node.metadata?.tags,
      tags: node.metadata?.tags,
      aliases: node.metadata?.aliases,
    });
  });

  // Add edges
  data.edges.forEach((edge) => {
    upsertEdge(graph, edge.uid, edge.source, edge.target, {
      uid: edge.uid,
      type: edge.type,
      source: edge.source,
      target: edge.target,
      sentiment: edge.sentiment,
      confidence: edge.metadata?.confidence,
      properties: edge.metadata,
    });
  });

  return graph;
}

/**
 * Convert Graphology to CanonicalGraphData
 */
export function graphToCanonical(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): CanonicalGraphData {
  const nodes = graph.mapNodes((nodeId, attrs) => ({
    uid: attrs.uid,
    name: attrs.name,
    type: attrs.type,
    display: {
      title: attrs.name,
      subtitle: attrs.type,
    },
    metadata: {
      position:
        attrs.x !== undefined && attrs.y !== undefined
          ? { x: attrs.x, y: attrs.y }
          : undefined,
      tags: attrs.tags,
      aliases: attrs.aliases,
      confidence: attrs.properties?.confidence || 1.0,
    },
  }));

  const edges = graph.mapEdges((_edgeId, attrs, source, target) => ({
    uid: attrs.uid,
    type: attrs.type,
    source,
    target,
    sentiment:
      (attrs.sentiment as SentimentType) || ("neutral" as SentimentType),
    intensity: "medium" as const,
    display: {
      label: attrs.type,
      color: getEntityColor(attrs.type),
    },
    metadata: {
      confidence: attrs.confidence || 1.0,
    },
  }));

  return {
    nodes,
    edges,
    meta: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      generatedAt: new Date().toISOString(),
      schemaVersion: "canonical-v1" as const,
    },
  };
}
