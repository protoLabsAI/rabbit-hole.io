"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import { Icon } from "@proto/icon-system";
import { Badge } from "@proto/ui/atoms";

export interface EntityNodeData extends Record<string, unknown> {
  uid: string;
  name: string;
  type: string;
  properties?: Record<string, any>;
  color?: string;
  icon?: string;
  /** Loading state for incremental updates */
  loadingState?: "discovered" | "enriched" | "complete";
}

/**
 * Entity Node Component
 *
 * React 19: memo() removed - React Compiler handles memoization.
 *
 * Supports three visual states:
 * - discovered: Subtle border glow, spinner icon
 * - enriched: Partial data loaded, amber indicator
 * - complete: Fully loaded, green checkmark
 */
export function EntityNode({ data, selected }: NodeProps) {
  const nodeData = data as EntityNodeData;
  const loadingState = nodeData.loadingState || "complete";
  const color = nodeData.color || "#6B7280";

  const isDiscovered = loadingState === "discovered";
  const isEnriched = loadingState === "enriched";
  const isComplete = loadingState === "complete";

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-card
        shadow-lg transition-all duration-500
        ${selected ? "ring-2 ring-primary ring-offset-2" : ""}
        ${isDiscovered ? "opacity-80" : ""}
        ${isEnriched ? "opacity-90" : ""}
        hover:shadow-xl
      `}
      style={{
        borderColor: color,
        minWidth: "180px",
        maxWidth: "220px",
        // Subtle glow for loading states - no animation
        boxShadow: isDiscovered
          ? `0 0 12px ${color}30, 0 4px 6px -1px rgb(0 0 0 / 0.1)`
          : isEnriched
            ? `0 0 8px ${color}20, 0 4px 6px -1px rgb(0 0 0 / 0.1)`
            : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground"
      />

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Entity name */}
            <div className="font-semibold text-sm truncate">
              {nodeData.name || "Loading..."}
            </div>

            {/* Type badge */}
            {nodeData.type && (
              <Badge
                variant="outline"
                className="text-xs mt-1"
                style={{ borderColor: color, color }}
              >
                {nodeData.type}
              </Badge>
            )}
          </div>

          {/* Status indicator - spinner for loading, static icons otherwise */}
          <div className="flex-shrink-0">
            {isDiscovered && (
              <Icon
                name="loader-2"
                size={16}
                className="text-muted-foreground animate-spin"
              />
            )}
            {isEnriched && (
              <Icon name="circle-dot" size={16} className="text-amber-500" />
            )}
            {isComplete && (
              <Icon
                name="check-circle"
                size={16}
                className="text-emerald-500"
              />
            )}
          </div>
        </div>

        {/* Status text */}
        {isComplete &&
          nodeData.properties &&
          Object.keys(nodeData.properties).length > 0 && (
            <div className="text-xs text-muted-foreground">
              {Object.keys(nodeData.properties).length} properties
            </div>
          )}
        {isEnriched && (
          <div className="text-xs text-amber-600/80">Enriching...</div>
        )}
        {isDiscovered && (
          <div className="text-xs text-muted-foreground">Researching...</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-muted-foreground"
      />
    </div>
  );
}
