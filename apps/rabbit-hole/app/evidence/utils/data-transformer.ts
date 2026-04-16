import { Node, Edge } from "@xyflow/react";

import { getEntityTypeColor } from "@protolabsai/utils";

import type {
  EvidenceGraphData,
  GraphNode,
} from "../types/evidence-graph.types";

// Calculate radial positions around a center node
function calculateRadialPosition(
  centerX: number,
  centerY: number,
  radius: number,
  angle: number
): { x: number; y: number } {
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

export function transformDataToReactFlow(
  data: EvidenceGraphData,
  centerNodeId?: string | null
): { nodes: Node[]; edges: Edge[] } {
  // If we have pre-calculated positions, use them directly
  const usePresetPositions = data.nodes.some((node) => node.position);

  if (usePresetPositions) {
    // Use preset positions - show all nodes with their fixed positions
    const nodes: Node[] = data.nodes.map((node) => {
      const isCenter = centerNodeId === node.id;

      return {
        id: node.id,
        type: "default",
        position: node.position || { x: 0, y: 0 },
        data: {
          label: node.label,
          entityType: node.entityType,
          sources: node.sources,
          aka: node.aka,
        },
        style: {
          background: getEntityTypeColor(node.entityType),
          color: "white",
          border: isCenter ? "3px solid #000" : "2px solid #666",
          borderRadius: isCenter ? "8px" : "6px",
          width: isCenter ? 140 : 120,
          height: isCenter ? 70 : 60,
          fontSize: isCenter ? "13px" : "11px",
          fontWeight: isCenter ? "bold" : "normal",
        },
      };
    });

    // Create all edges
    const edges: Edge[] = data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "default",
      label: edge.label,
      style: {
        stroke: edge.confidence && edge.confidence < 0.5 ? "#999" : "#333",
        strokeWidth: edge.confidence && edge.confidence < 0.5 ? 1 : 2,
        strokeDasharray:
          edge.confidence && edge.confidence < 0.5 ? "5,5" : undefined,
      },
      labelStyle: {
        fontSize: "10px",
        fontWeight: "bold",
        fill: "#333",
        backgroundColor: "rgba(255,255,255,0.8)",
        padding: "2px 4px",
        borderRadius: "4px",
      },
      data: {
        confidence: edge.confidence,
        sources: edge.sources,
        since: edge.since,
        until: edge.until,
        type: edge.type,
        notes: edge.notes,
      },
    }));

    return { nodes, edges };
  }

  // Fallback to original radial layout logic for backward compatibility
  const centerX = 0;
  const centerY = 0;
  const baseRadius = 200;

  // Find center node or default to first node
  const centerNode = centerNodeId
    ? data.nodes.find((n) => n.id === centerNodeId)
    : data.nodes[0];

  if (!centerNode) {
    return { nodes: [], edges: [] };
  }

  // Find connected nodes (direct connections)
  const connectedEdges = data.edges.filter(
    (edge) => edge.source === centerNode.id || edge.target === centerNode.id
  );

  const connectedNodeIds = new Set<string>();
  connectedEdges.forEach((edge) => {
    if (edge.source !== centerNode.id) connectedNodeIds.add(edge.source);
    if (edge.target !== centerNode.id) connectedNodeIds.add(edge.target);
  });

  // Create nodes
  const nodes: Node[] = [];

  // Add center node
  nodes.push({
    id: centerNode.id,
    type: "default",
    position: { x: centerX, y: centerY },
    data: {
      label: centerNode.label,
      entityType: centerNode.entityType,
      sources: centerNode.sources,
      aka: centerNode.aka,
    },
    style: {
      background: getEntityTypeColor(centerNode.entityType),
      color: "white",
      border: "3px solid #000",
      borderRadius: "8px",
      width: 120,
      height: 60,
      fontSize: "12px",
      fontWeight: "bold",
    },
  });

  // Add connected nodes in a circle around center
  const connectedNodes = Array.from(connectedNodeIds)
    .map((id) => data.nodes.find((n) => n.id === id))
    .filter(Boolean) as GraphNode[];

  connectedNodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / connectedNodes.length;
    const position = calculateRadialPosition(
      centerX,
      centerY,
      baseRadius,
      angle
    );

    nodes.push({
      id: node.id,
      type: "default",
      position,
      data: {
        label: node.label,
        entityType: node.entityType,
        sources: node.sources,
        aka: node.aka,
      },
      style: {
        background: getEntityTypeColor(node.entityType),
        color: "white",
        border: "2px solid #666",
        borderRadius: "6px",
        width: 100,
        height: 50,
        fontSize: "11px",
      },
    });
  });

  // Add second-degree connections (nodes connected to the connected nodes)
  const secondDegreeNodeIds = new Set<string>();
  connectedNodes.forEach((connectedNode) => {
    const secondDegreeEdges = data.edges.filter(
      (edge) =>
        (edge.source === connectedNode.id ||
          edge.target === connectedNode.id) &&
        edge.source !== centerNode.id &&
        edge.target !== centerNode.id &&
        !connectedNodeIds.has(edge.source) &&
        !connectedNodeIds.has(edge.target)
    );

    secondDegreeEdges.forEach((edge) => {
      if (
        edge.source !== connectedNode.id &&
        !connectedNodeIds.has(edge.source) &&
        edge.source !== centerNode.id
      ) {
        secondDegreeNodeIds.add(edge.source);
      }
      if (
        edge.target !== connectedNode.id &&
        !connectedNodeIds.has(edge.target) &&
        edge.target !== centerNode.id
      ) {
        secondDegreeNodeIds.add(edge.target);
      }
    });
  });

  const secondDegreeNodes = Array.from(secondDegreeNodeIds)
    .map((id) => data.nodes.find((n) => n.id === id))
    .filter(Boolean) as GraphNode[];

  secondDegreeNodes.forEach((node, index) => {
    const angle =
      (2 * Math.PI * index) / secondDegreeNodes.length +
      Math.PI / secondDegreeNodes.length;
    const position = calculateRadialPosition(
      centerX,
      centerY,
      baseRadius * 1.6,
      angle
    );

    nodes.push({
      id: node.id,
      type: "default",
      position,
      data: {
        label: node.label,
        entityType: node.entityType,
        sources: node.sources,
        aka: node.aka,
      },
      style: {
        background: getEntityTypeColor(node.entityType),
        color: "white",
        border: "1px solid #999",
        borderRadius: "4px",
        width: 80,
        height: 40,
        fontSize: "10px",
        opacity: 0.8,
      },
    });
  });

  // Create edges for visible nodes
  const visibleNodeIds = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = data.edges
    .filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "default",
      label: edge.label,
      style: {
        stroke: edge.confidence && edge.confidence < 0.5 ? "#999" : "#333",
        strokeWidth: edge.confidence && edge.confidence < 0.5 ? 1 : 2,
        strokeDasharray:
          edge.confidence && edge.confidence < 0.5 ? "5,5" : undefined,
      },
      labelStyle: {
        fontSize: "10px",
        fontWeight: "bold",
      },
      data: {
        confidence: edge.confidence,
        sources: edge.sources,
        since: edge.since,
        until: edge.until,
      },
    }));

  return { nodes, edges };
}
