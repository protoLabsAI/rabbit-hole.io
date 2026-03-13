/**
 * Cytoscape Adapter
 *
 * Bidirectional adapter between Graphology and Cytoscape.js elements format
 */

import GraphologyDefault from "graphology";
import type Graph from "graphology";

import { getEntityColor, getEntityImage } from "@proto/utils/atlas";

import type { GraphNodeAttributes, GraphEdgeAttributes } from "../graph";

/**
 * Convert Graphology graph to Cytoscape elements
 */
export function graphToCytoscapeElements(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): any[] {
  const elements: any[] = [];

  // Add nodes
  graph.forEachNode((nodeId, attrs) => {
    elements.push({
      group: "nodes",
      data: {
        id: nodeId,
        uid: attrs.uid,
        name: attrs.name,
        type: attrs.type,
        entityType: attrs.type,
        color: attrs.color,
        icon: attrs.icon,
        properties: attrs.properties,
        tags: attrs.tags,
        aliases: attrs.aliases,
      },
      position: {
        x: attrs.x ?? 0,
        y: attrs.y ?? 0,
      },
    });
  });

  // Add edges
  graph.forEachEdge((edgeId, attrs, source, target) => {
    elements.push({
      group: "edges",
      data: {
        id: edgeId,
        uid: attrs.uid,
        source,
        target,
        type: attrs.type,
        relType: attrs.type,
        sentiment: attrs.sentiment,
        confidence: attrs.confidence,
        properties: attrs.properties,
      },
    });
  });

  return elements;
}

/**
 * Convert Cytoscape elements to Graphology graph
 */
export function cytoscapeElementsToGraph(
  elements: any[],
  graph?: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): Graph<GraphNodeAttributes, GraphEdgeAttributes> {
  if (!graph) {
    graph = new GraphologyDefault<GraphNodeAttributes, GraphEdgeAttributes>({
      type: "directed",
      multi: false,
      allowSelfLoops: false,
    });
  }

  // Clear existing graph
  graph.clear();

  // Add nodes first
  const nodes = elements.filter((el) => el.group === "nodes" || !el.group);
  nodes.forEach((element) => {
    const data = element.data;
    const nodeId = data.id || data.uid;

    if (!nodeId) {
      console.warn("Node without ID found:", data);
      return;
    }

    const nodeAttrs: GraphNodeAttributes = {
      uid: data.uid || nodeId,
      name: data.name || data.label || nodeId,
      type: data.type || data.entityType || "Unknown",
      x: element.position?.x,
      y: element.position?.y,
      color:
        data.color || getEntityColor(data.type || data.entityType || "Unknown"),
      icon:
        data.icon || getEntityImage(data.type || data.entityType || "Unknown"),
      size: data.size,
      properties: data.properties,
      tags: data.tags,
      aliases: data.aliases,
    };

    graph.addNode(nodeId, nodeAttrs);
  });

  // Add edges
  const edges = elements.filter((el) => el.group === "edges");
  edges.forEach((element) => {
    const data = element.data;
    const edgeId = data.id || data.uid || `${data.source}-${data.target}`;

    if (!data.source || !data.target) {
      console.warn("Edge without source/target found:", data);
      return;
    }

    // Skip if nodes don't exist
    if (!graph.hasNode(data.source) || !graph.hasNode(data.target)) {
      console.warn("Edge references non-existent nodes:", data);
      return;
    }

    const edgeAttrs: GraphEdgeAttributes = {
      uid: data.uid || edgeId,
      type: data.type || data.relType || "RELATED_TO",
      source: data.source,
      target: data.target,
      sentiment: data.sentiment,
      confidence: data.confidence,
      properties: data.properties,
    };

    graph.addEdgeWithKey(edgeId, data.source, data.target, edgeAttrs);
  });

  return graph;
}
