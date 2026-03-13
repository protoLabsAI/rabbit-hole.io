/**
 * Legend Component
 *
 * Displays entity type legend with filtering, statistics, and interactions.
 * Supports click-to-filter, show all functionality, and right-click context menus.
 */

import React from "react";

import { generateLegendData } from "@proto/utils/atlas";

import { LegendItem } from "../../evidence/components/atlas/LegendContextMenu";
import type { CanonicalGraphData } from "../../types/canonical-graph";

interface LegendProps {
  graphData: CanonicalGraphData | null;
  hiddenEntityTypes: Set<string>;
  onToggleEntityType: (entityType: string) => void;
  onShowAllEntityTypes: () => void;
  onLegendRightClick: (event: React.MouseEvent, entityType: string) => void;
  settingsPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  viewMode: "full-atlas" | "ego" | "community" | "timeslice";
}

export function Legend({
  graphData,
  hiddenEntityTypes,
  onToggleEntityType,
  onShowAllEntityTypes,
  onLegendRightClick,
  settingsPosition,
  viewMode,
}: LegendProps) {
  const getPositionClasses = () => {
    return settingsPosition === "bottom-left"
      ? "bottom-4 left-20"
      : "bottom-4 left-4";
  };

  const getEntityStats = () => {
    if (!graphData) return "loading...";

    const visibleCount = graphData.nodes.filter(
      (node) => !hiddenEntityTypes.has(node.type)
    ).length;

    let stats = `${visibleCount} entities • ${graphData.edges.length} relationships`;

    if (hiddenEntityTypes.size > 0) {
      stats += ` • ${hiddenEntityTypes.size} hidden`;
    }

    return stats;
  };

  // Generate legend data directly from canonical format
  const legendData = generateLegendData(
    (graphData?.nodes || []) as any,
    hiddenEntityTypes
  );

  return (
    <div
      className={`absolute ${getPositionClasses()}`}
      data-testid="legend-container"
    >
      <div className="bg-card/90 rounded-xl shadow-lg border border-border p-4">
        {/* Legend Title */}
        <div className="mb-4 text-center">
          <div className="text-lg font-semibold text-slate-900">Legend</div>
        </div>

        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-1">
              <h4 className="text-sm font-semibold text-slate-900">
                Entity Types
              </h4>
            </div>
            <div className="text-xs text-slate-500">
              {getEntityStats()}
              {viewMode !== "full-atlas" && (
                <div className="text-blue-600 mt-1">
                  📊 Bounded {viewMode} view for performance
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 w-16 text-right">
            <button
              onClick={onShowAllEntityTypes}
              className={`text-xs font-medium transition-opacity ${
                hiddenEntityTypes.size > 0
                  ? "text-blue-600 hover:text-blue-800 opacity-100"
                  : "text-transparent opacity-0 pointer-events-none"
              }`}
            >
              Show All
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {legendData.map((item) => (
            <div
              key={item.type}
              onClick={() => onToggleEntityType(item.type)}
              className="cursor-pointer hover:bg-slate-50 rounded-lg p-1 transition-colors"
              title={`Click to ${item.visible ? "hide" : "show"} ${item.type} entities`}
            >
              <LegendItem
                type={item.type}
                color={item.color}
                icon={item.icon}
                count={item.visibleCount}
                visible={item.visible}
                onRightClick={onLegendRightClick}
              />
            </div>
          ))}
          {legendData.length === 0 && (
            <div className="text-slate-400 italic text-center w-full">
              No entities loaded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
