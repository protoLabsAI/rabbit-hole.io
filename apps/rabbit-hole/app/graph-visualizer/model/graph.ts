/**
 * Graphology Graph Model
 *
 * Canonical in-memory graph model using Graphology.
 * Serves as the single source of truth for graph data across all renderers.
 */

import Graph from "graphology";
import type { Attributes } from "graphology-types";

import type { EntityType } from "@proto/types";
import { getEntityColor, getEntityImage } from "@proto/utils/atlas";

/**
 * Node attributes stored in Graphology
 */
export interface GraphNodeAttributes extends Attributes {
  uid: string;
  name: string;
  type: EntityType | string;
  x?: number;
  y?: number;
  color: string;
  icon: string;
  size?: number;
  properties?: Record<string, any>;
  tags?: string[];
  aliases?: string[];
  hidden?: boolean; // For AI context entities (beyond display hops)
}

/**
 * Edge attributes stored in Graphology
 */
export interface GraphEdgeAttributes extends Attributes {
  uid: string;
  type: string;
  source: string;
  target: string;
  sentiment?: string;
  confidence?: number;
  properties?: Record<string, any>;
}

/**
 * Create a new Graphology graph instance
 */
export function newGraph(): Graph<GraphNodeAttributes, GraphEdgeAttributes> {
  return new Graph<GraphNodeAttributes, GraphEdgeAttributes>({
    type: "directed",
    multi: false,
    allowSelfLoops: false,
  });
}

/**
 * Upsert a node into the graph
 * Updates if exists, creates if not
 */
export function upsertNode(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  id: string,
  attrs: Partial<GraphNodeAttributes>
): void {
  const existingAttrs = graph.hasNode(id)
    ? graph.getNodeAttributes(id)
    : ({} as Partial<GraphNodeAttributes>);

  const nodeAttrs: GraphNodeAttributes = {
    uid: id,
    name: attrs.name || existingAttrs.name || id,
    type:
      (attrs.type as EntityType) ||
      existingAttrs.type ||
      ("Unknown" as EntityType),
    color:
      attrs.color ||
      existingAttrs.color ||
      getEntityColor((attrs.type as EntityType) || ("Unknown" as EntityType)),
    icon:
      attrs.icon ||
      existingAttrs.icon ||
      getEntityImage((attrs.type as EntityType) || ("Unknown" as EntityType)),
    x: attrs.x ?? existingAttrs.x,
    y: attrs.y ?? existingAttrs.y,
    size: attrs.size ?? existingAttrs.size ?? 10,
    properties: { ...existingAttrs.properties, ...attrs.properties },
    tags: attrs.tags || existingAttrs.tags,
    aliases: attrs.aliases || existingAttrs.aliases,
  };

  if (graph.hasNode(id)) {
    graph.mergeNodeAttributes(id, nodeAttrs);
  } else {
    graph.addNode(id, nodeAttrs);
  }
}

/**
 * Upsert an edge into the graph
 * Updates if exists, creates if not
 */
export function upsertEdge(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  id: string,
  source: string,
  target: string,
  attrs: Partial<GraphEdgeAttributes>
): void {
  // Ensure source and target nodes exist
  if (!graph.hasNode(source)) {
    upsertNode(graph, source, { name: source });
  }
  if (!graph.hasNode(target)) {
    upsertNode(graph, target, { name: target });
  }

  const existingAttrs = graph.hasEdge(id)
    ? graph.getEdgeAttributes(id)
    : ({} as Partial<GraphEdgeAttributes>);

  const edgeAttrs: GraphEdgeAttributes = {
    uid: id,
    type: attrs.type || existingAttrs.type || "RELATED_TO",
    source,
    target,
    sentiment: attrs.sentiment || existingAttrs.sentiment,
    confidence: attrs.confidence ?? existingAttrs.confidence,
    properties: { ...existingAttrs.properties, ...attrs.properties },
  };

  // Check if edge with this ID exists
  if (graph.hasEdge(id)) {
    graph.mergeEdgeAttributes(id, edgeAttrs);
  }
  // Check if any edge exists between these nodes (prevent duplicate edges)
  else if (graph.hasEdge(source, target)) {
    // Update the existing edge between these nodes
    const existingEdgeId = graph.edge(source, target);
    graph.mergeEdgeAttributes(existingEdgeId, edgeAttrs);
  } else {
    graph.addEdgeWithKey(id, source, target, edgeAttrs);
  }
}

/**
 * Remove a node and its connected edges
 */
export function removeNode(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  id: string
): void {
  if (graph.hasNode(id)) {
    graph.dropNode(id);
  }
}

/**
 * Remove an edge
 */
export function removeEdge(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  id: string
): void {
  if (graph.hasEdge(id)) {
    graph.dropEdge(id);
  }
}

/**
 * Update node position
 */
export function updateNodePosition(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  id: string,
  x: number,
  y: number
): void {
  if (graph.hasNode(id)) {
    graph.mergeNodeAttributes(id, { x, y });
  }
}

/**
 * Get all nodes with their attributes
 */
export function getNodes(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): Array<{ id: string; attributes: GraphNodeAttributes }> {
  return graph.mapNodes((node, attributes) => ({ id: node, attributes }));
}

/**
 * Get all edges with their attributes
 */
export function getEdges(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): Array<{
  id: string;
  source: string;
  target: string;
  attributes: GraphEdgeAttributes;
}> {
  return graph.mapEdges((edge, attributes, source, target) => ({
    id: edge,
    source,
    target,
    attributes,
  }));
}

/**
 * Clear the graph
 */
export function clearGraph(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>
): void {
  graph.clear();
}
