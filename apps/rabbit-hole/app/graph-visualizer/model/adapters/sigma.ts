/**
 * Sigma Adapter
 *
 * Adapter from Graphology to Sigma.js configuration
 * Sigma natively consumes Graphology, so this mainly configures display attributes
 */

import type Graph from "graphology";

import { getSentimentColor } from "@proto/utils/atlas";

import type { GraphNodeAttributes, GraphEdgeAttributes } from "../graph";

/**
 * Prepare Graphology graph for Sigma rendering
 * Sigma consumes Graphology directly but needs specific display attributes
 */
export function prepareGraphForSigma(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): Graph<GraphNodeAttributes, GraphEdgeAttributes> {
  // Add Sigma-specific node attributes
  graph.forEachNode((node, attrs) => {
    graph.mergeNodeAttributes(node, {
      label: attrs.name,
      size: attrs.size || 10,
      color: attrs.color,
      x: attrs.x ?? Math.random() * 1000,
      y: attrs.y ?? Math.random() * 1000,
    });
  });

  // Add Sigma-specific edge attributes
  graph.forEachEdge((edge, attrs) => {
    const color = attrs.sentiment
      ? getSentimentColor(attrs.sentiment)
      : "#999999";

    graph.mergeEdgeAttributes(edge, {
      label: attrs.type,
      color,
      size: attrs.confidence ? attrs.confidence * 2 : 1,
    });
  });

  return graph;
}

/**
 * Get Sigma settings optimized for different graph sizes
 */
export function getSigmaSettings(nodeCount: number) {
  // For large graphs (10k+), optimize for performance
  if (nodeCount > 10000) {
    return {
      renderLabels: false,
      renderEdgeLabels: false,
      enableEdgeEvents: false,
      defaultNodeColor: "#666",
      defaultEdgeColor: "#ccc",
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
    };
  }

  // For medium graphs (1k-10k), balance performance and detail
  if (nodeCount > 1000) {
    return {
      renderLabels: true,
      renderEdgeLabels: false,
      enableEdgeEvents: false,
      labelDensity: 0.5,
      labelRenderedSizeThreshold: 10,
      defaultNodeColor: "#666",
      defaultEdgeColor: "#ccc",
    };
  }

  // For small graphs (<1k), show all details
  return {
    renderLabels: true,
    renderEdgeLabels: true,
    enableEdgeEvents: true,
    labelDensity: 1,
    labelRenderedSizeThreshold: 0,
    defaultNodeColor: "#666",
    defaultEdgeColor: "#ccc",
  };
}

/**
 * Get node display data for tooltips/highlights
 */
export function getNodeDisplayData(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  nodeId: string
) {
  if (!graph.hasNode(nodeId)) {
    return null;
  }

  const attrs = graph.getNodeAttributes(nodeId);
  return {
    id: nodeId,
    uid: attrs.uid,
    name: attrs.name,
    type: attrs.type,
    color: attrs.color,
    icon: attrs.icon,
    properties: attrs.properties,
    tags: attrs.tags,
    aliases: attrs.aliases,
    position: { x: attrs.x, y: attrs.y },
  };
}
