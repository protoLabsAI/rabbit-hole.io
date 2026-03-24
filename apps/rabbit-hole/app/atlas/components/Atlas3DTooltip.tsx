"use client";

import { getEntityVisual } from "../lib/atlas-schema";

// ─── Types ──────────────────────────────────────────────────────────

interface AtlasNode {
  id: string;
  name: string;
  type: string;
  color: string;
  size: number;
}

interface Atlas3DTooltipProps {
  node: AtlasNode | null;
  position: { x: number; y: number } | null;
  connectionCount?: number;
}

// ─── Component ──────────────────────────────────────────────────────

export default function Atlas3DTooltip({
  node,
  position,
  connectionCount,
}: Atlas3DTooltipProps) {
  if (!node || !position) return null;

  const visual = getEntityVisual(node.type);

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        left: position.x + 12,
        top: position.y - 8,
        transform: "translateY(-100%)",
      }}
    >
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
        <p className="text-xs font-semibold text-foreground truncate">
          {node.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: `${visual.color}20`,
              color: visual.color,
            }}
          >
            {visual.label}
          </span>
          {connectionCount !== undefined && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {connectionCount} connections
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
