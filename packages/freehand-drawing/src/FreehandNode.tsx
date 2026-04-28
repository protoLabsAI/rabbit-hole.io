import { NodeResizer, type NodeProps, useReactFlow } from "@xyflow/react";
import { useMemo, useState, useEffect } from "react";

import { pointsToPath } from "./path";
import type { FreehandNodeType, Points } from "./types";

/**
 * Custom React Flow node for freehand drawings
 *
 * Features:
 * - Renders SVG path from points
 * - Resizable with NodeResizer
 * - Scales points based on resize ratio
 *
 * Note: Deletion from Yjs is handled by parent component's onNodesDelete handler
 */
export function FreehandNode({
  data,
  width,
  height,
  selected,
  dragging,
  id,
}: NodeProps<FreehandNodeType>) {
  const { deleteElements: _deleteElements } = useReactFlow();
  // CRITICAL: Use initialSize as fallback when width/height undefined
  // Otherwise scale becomes 1/initialSize.width (e.g., 1/100 = 0.01) making brush tiny
  const scaleX = (width ?? data.initialSize.width) / data.initialSize.width;
  const scaleY = (height ?? data.initialSize.height) / data.initialSize.height;

  // Extract resize handler from data (performance: fires once per resize, not continuously)
  const onResizeEndHandler = (data as any).onResizeEnd;

  // Get color from data or fallback to theme primary
  const [fillColor, setFillColor] = useState<string>("hsl(var(--primary))");

  useEffect(() => {
    if (data.color) {
      setFillColor(`hsl(${data.color})`);
    } else {
      // Fallback to theme primary
      if (typeof window !== "undefined") {
        const hslValue = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary")
          .trim();
        if (hslValue) {
          setFillColor(`hsl(${hslValue})`);
        }
      }
    }
  }, [data.color]);

  // Scale points based on node resize
  const scaledPoints = useMemo(
    () =>
      data.points.map((point) => [
        point[0] * scaleX,
        point[1] * scaleY,
        point[2],
      ]) satisfies Points,
    [data.points, scaleX, scaleY]
  );

  // CRITICAL: Also scale the brush size to match resize
  // Use average scale (in case of non-uniform resize)
  const averageScale = (scaleX + scaleY) / 2;
  const scaledSize = (data.size ?? 8) * averageScale;

  const pathD = pointsToPath(scaledPoints, {
    size: scaledSize,
    smoothing: data.smoothing,
    thinning: data.thinning,
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <NodeResizer
        isVisible={selected && !dragging}
        minWidth={20}
        minHeight={20}
        onResizeEnd={(_event, params) => {
          // Sync dimensions to Yjs (performance: only on resize end, not during)
          if (onResizeEndHandler) {
            onResizeEndHandler(id, {
              width: params.width,
              height: params.height,
            });
          }
        }}
      />
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none", // SVG doesn't block resize handles
        }}
      >
        {/* Transparent clickable area for selection */}
        <rect
          x={0}
          y={0}
          width={width ?? data.initialSize.width}
          height={height ?? data.initialSize.height}
          fill="transparent"
          style={{
            pointerEvents: "auto",
            cursor: "move",
          }}
        />
        <path
          style={{
            pointerEvents: "none", // Path doesn't block transparent rect
            fill: fillColor,
            stroke: "none",
            opacity: data.opacity ?? 0.7,
          }}
          d={pathD}
        />
      </svg>
    </div>
  );
}
