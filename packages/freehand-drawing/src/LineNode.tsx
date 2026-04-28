import { NodeResizer, type NodeProps } from "@xyflow/react";

export interface LineNodeData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  strokeColor?: string;
  strokeWidth?: number;
  userId?: string;
  createdAt?: number;
}

export function LineNode({ data, selected, dragging }: NodeProps) {
  const lineData = data as unknown as LineNodeData;
  const strokeColor = lineData.strokeColor || "217 91% 40%";
  const strokeWidth = lineData.strokeWidth ?? 2;

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
        width={lineData.width}
        height={lineData.height}
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <line
          x1={lineData.x1}
          y1={lineData.y1}
          x2={lineData.x2}
          y2={lineData.y2}
          stroke={`hsl(${strokeColor})`}
          strokeWidth={strokeWidth}
        />
      </svg>
    </div>
  );
}
