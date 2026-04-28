import { NodeResizer, type NodeProps } from "@xyflow/react";

export interface CircleNodeData {
  width: number;
  height: number;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  userId?: string;
  createdAt?: number;
}

export function CircleNode({
  data,
  width,
  height,
  selected,
  dragging,
}: NodeProps) {
  const circleData = data as unknown as CircleNodeData;
  const fillColor = circleData.fillColor || "217 91% 60%";
  const fillOpacity = circleData.fillOpacity ?? 0.3;
  const strokeColor = circleData.strokeColor || "217 91% 40%";
  const strokeWidth = circleData.strokeWidth ?? 2;

  const nodeWidth = typeof width === "number" ? width : circleData.width;
  const nodeHeight = typeof height === "number" ? height : circleData.height;

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
      />
      <svg
        width={nodeWidth}
        height={nodeHeight}
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <ellipse
          cx={nodeWidth / 2}
          cy={nodeHeight / 2}
          rx={nodeWidth / 2}
          ry={nodeHeight / 2}
          fill={`hsl(${fillColor})`}
          fillOpacity={fillOpacity}
          stroke={`hsl(${strokeColor})`}
          strokeWidth={strokeWidth}
        />
      </svg>
    </div>
  );
}
