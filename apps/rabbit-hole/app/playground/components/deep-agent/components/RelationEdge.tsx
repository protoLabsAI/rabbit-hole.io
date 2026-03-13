"use client";

import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  useStore,
} from "@xyflow/react";

interface RelationEdgeData {
  type?: string;
  sentiment?: string;
  loadingState?: "discovered" | "complete";
}

interface RelationEdgeProps extends Omit<EdgeProps, "data"> {
  data?: RelationEdgeData;
}

/**
 * Get sentiment-based color for relationship edges
 */
function getSentimentColor(sentiment: string): string {
  switch (sentiment?.toLowerCase()) {
    case "positive":
      return "#22c55e";
    case "negative":
      return "#ef4444";
    case "neutral":
      return "#6b7280";
    default:
      return "#6b7280";
  }
}

/**
 * Relation Edge Component
 *
 * React 19: memo() removed - React Compiler handles memoization.
 * Loading state indicated by dashed line (no animation to avoid visual noise)
 */
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

  const isDiscovered = data?.loadingState === "discovered";
  const edgeColor = data?.sentiment
    ? getSentimentColor(data.sentiment)
    : isDiscovered
      ? "#f59e0b" // Amber for discovering
      : "#666";

  const showLabel = useStore((state) => state.transform[2] >= 0.5);

  return (
    <>
      {/* Main edge path - dashed when loading */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 3 : 2,
          opacity: selected ? 1 : 0.8,
          strokeDasharray: isDiscovered ? "6 4" : undefined,
        }}
      />

      {/* Edge label */}
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
              className="text-xs px-2 py-1 rounded shadow-sm bg-background border font-medium transition-colors duration-300"
              style={{
                borderColor: isDiscovered
                  ? "#f59e0b"
                  : data.sentiment
                    ? edgeColor
                    : undefined,
                color: isDiscovered
                  ? "#d97706"
                  : data.sentiment
                    ? edgeColor
                    : undefined,
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
