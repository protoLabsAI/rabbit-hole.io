import { NodeResizer, type NodeProps } from "@xyflow/react";

export interface RectangleNodeData {
  width: number;
  height: number;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  userId?: string;
  createdAt?: number;
}

export function RectangleNode({
  data,
  width,
  height,
  selected,
  dragging,
}: NodeProps) {
  const rectData = data as unknown as RectangleNodeData;
  const fillColor = rectData.fillColor || "217 91% 60%";
  const fillOpacity = rectData.fillOpacity ?? 0.3;
  const strokeColor = rectData.strokeColor || "217 91% 40%";
  const strokeWidth = rectData.strokeWidth ?? 2;

  const nodeWidth = typeof width === "number" ? width : rectData.width;
  const nodeHeight = typeof height === "number" ? height : rectData.height;

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
        <rect
          x={0}
          y={0}
          width={nodeWidth}
          height={nodeHeight}
          fill={`hsl(${fillColor})`}
          fillOpacity={fillOpacity}
          stroke={`hsl(${strokeColor})`}
          strokeWidth={strokeWidth}
        />
      </svg>
    </div>
  );
}
