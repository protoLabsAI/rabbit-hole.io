/**
 * React Flow Adapter
 *
 * Adapter from Graphology to React Flow {nodes, edges} format
 */

import type { Node, Edge } from "@xyflow/react";
import type Graph from "graphology";

import { getNodeTypeFromEntity } from "../../../research/lib/node-type-mapper";
import type { GraphNodeAttributes, GraphEdgeAttributes } from "../graph";

/**
 * Convert Graphology graph to React Flow format
 * Filters out hidden nodes (AI context entities beyond display hops)
 */
export function graphToReactFlow(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  hiddenEntityTypes?: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Convert nodes (filter hidden and filtered entity types)
  graph.forEachNode((nodeId, attrs) => {
    // Skip hidden nodes (AI context only)
    if (attrs.hidden) return;

    // Skip entity types that user has filtered out
    if (hiddenEntityTypes?.has(attrs.type)) return;

    nodes.push({
      id: nodeId,
      type: getNodeTypeFromEntity(attrs.type), // Map entity type to node type
      position: {
        x: attrs.x ?? Math.random() * 500,
        y: attrs.y ?? Math.random() * 500,
      },
      data: {
        uid: attrs.uid,
        name: attrs.name,
        type: attrs.type,
        color: attrs.color,
        icon: attrs.icon,
        properties: attrs.properties,
        tags: attrs.tags,
        aliases: attrs.aliases,
      },
    });
  });

  // Convert edges (only include edges where both nodes are visible)
  const visibleNodeIds = new Set(nodes.map((n) => n.id));

  graph.forEachEdge((edgeId, attrs, source, target) => {
    // Only show edges where both source and target are visible
    if (!visibleNodeIds.has(source) || !visibleNodeIds.has(target)) return;

    edges.push({
      id: edgeId,
      source,
      target,
      type: "relation", // Use custom RelationEdge component
      data: {
        uid: attrs.uid,
        type: attrs.type,
        sentiment: attrs.sentiment,
        confidence: attrs.confidence,
        properties: attrs.properties,
      },
      label: attrs.type,
      animated: false,
    });
  });

  return { nodes, edges };
}

/**
 * Apply a node position update from React Flow back to Graphology
 */
export function applyReactFlowNodeMove(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  nodeId: string,
  position: { x: number; y: number }
): void {
  if (graph.hasNode(nodeId)) {
    graph.mergeNodeAttributes(nodeId, {
      x: position.x,
      y: position.y,
    });
  }
}

/**
 * Apply multiple node position updates
 */
export function applyReactFlowNodeMoves(
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>,
  changes: Array<{ nodeId: string; position: { x: number; y: number } }>
): void {
  changes.forEach(({ nodeId, position }) => {
    applyReactFlowNodeMove(graph, nodeId, position);
  });
}
