import { useReactFlow } from "@xyflow/react";
import { useRef, useEffect } from "react";

import type { Points } from "../types";

/**
 * Eraser Tool
 *
 * Deletes drawing tool outputs (freehand, shapes, etc.) by wiping over them.
 * Only erases nodes created by drawing tools - preserves entity nodes and graph edges.
 * Uses path intersection detection to determine what to erase.
 */

interface EraserProps {
  points: Points;
  eraserSize: number;
  onEraseNodes: (nodeIds: string[]) => void;
  /** Reserved for future use - edge deletion currently disabled */
  onEraseEdges: (edgeIds: string[]) => void;
}

export function Eraser({
  points,
  eraserSize,
  onEraseNodes,
  onEraseEdges,
}: EraserProps) {
  const { getNodes, screenToFlowPosition } = useReactFlow();
  const checkedNodesRef = useRef<Set<string>>(new Set());
  const checkedEdgesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (points.length === 0) {
      checkedNodesRef.current.clear();
      checkedEdgesRef.current.clear();
      return;
    }

    const nodes = getNodes();
    const nodesToDelete: string[] = [];

    // Convert screen points to flow coordinates
    const flowPoints = points.map(([x, y, pressure]) => {
      const flow = screenToFlowPosition({ x, y });
      return [flow.x, flow.y, pressure] as [number, number, number];
    });

    // Check nodes for intersection - ONLY drawing tool nodes (freehand, etc.)
    nodes.forEach((node) => {
      if (checkedNodesRef.current.has(node.id)) return;

      // Only erase drawing tool outputs (freehand, rectangle, etc.)
      // Skip entity nodes and other non-drawing types (blacklist approach)
      if (node.type === "entity") return;

      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const nodeWidth = node.width ?? 100;
      const nodeHeight = node.height ?? 50;

      // Check if any point intersects with node bounds
      const intersects = flowPoints.some(([x, y]) => {
        return (
          x >= nodeX - eraserSize / 2 &&
          x <= nodeX + nodeWidth + eraserSize / 2 &&
          y >= nodeY - eraserSize / 2 &&
          y <= nodeY + nodeHeight + eraserSize / 2
        );
      });

      if (intersects) {
        nodesToDelete.push(node.id);
        checkedNodesRef.current.add(node.id);
      }
    });

    // Skip edge deletion for now - only erase drawing tool nodes
    // Future: Add edge erasing for edges between drawing nodes only

    if (nodesToDelete.length > 0) {
      onEraseNodes(nodesToDelete);
    }
  }, [points, eraserSize, getNodes, screenToFlowPosition, onEraseNodes]);

  return null; // Eraser has no visual output - handled by overlay
}
