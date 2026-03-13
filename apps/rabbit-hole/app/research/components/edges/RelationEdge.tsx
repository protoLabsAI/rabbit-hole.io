/**
 * Relation Edge
 *
 * Custom React Flow edge for relationships with contextual zoom:
 * - Hides labels at zoom < 0.5 (skeleton mode)
 * - Shows labels at zoom >= 0.5
 */

import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  useStore,
} from "@xyflow/react";
import React from "react";

import { getSentimentColor } from "@proto/utils/atlas";

interface RelationEdgeData {
  type?: string;
  sentiment?: string;
}

interface RelationEdgeProps extends Omit<EdgeProps, "data"> {
  data?: RelationEdgeData;
}

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: RelationEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeColor = data?.sentiment
    ? getSentimentColor(data.sentiment)
    : "#666";

  // Optimize: subscribe only to derived boolean to avoid re-renders on every zoom change
  // Only re-render when crossing the visibility threshold (0.5x zoom)
  const showLabel = useStore((state) => state.transform[2] >= 0.5);

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 3 : 2,
          opacity: selected ? 1 : 0.8,
        }}
      />

      {data?.type && showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <div
              className="text-xs px-2 py-1 rounded shadow-sm bg-background border border-border text-foreground font-medium"
              style={{
                ...(data.sentiment && {
                  borderColor: edgeColor,
                  color: edgeColor,
                }),
              }}
            >
              {data.type}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
