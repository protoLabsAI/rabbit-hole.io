/**
 * ViewModeIndicator Component
 *
 * Displays the current view mode status with context-specific information.
 * Shows view type, entity details, and bounded status.
 */

import React from "react";

interface ExistingEntity {
  id: string;
  label: string;
  entityType: string;
}

interface TimeWindow {
  from: string;
  to: string;
}

interface ViewModeIndicatorProps {
  viewMode: "full-atlas" | "ego" | "community" | "timeslice";
  centerEntity: string | null;
  communityId: number | null;
  timeWindow: TimeWindow;
  isBounded: boolean;
  existingEntities: ExistingEntity[];
  activeDateFilter?: {
    from?: string;
    to?: string;
  };
}

export function ViewModeIndicator({
  viewMode,
  centerEntity,
  communityId,
  timeWindow,
  isBounded,
  existingEntities,
  activeDateFilter,
}: ViewModeIndicatorProps) {
  const getViewModeText = () => {
    switch (viewMode) {
      case "full-atlas":
        return "🌐 Full Atlas";
      case "ego":
        if (centerEntity) {
          const entity = existingEntities.find((e) => e.id === centerEntity);
          const entityLabel = entity?.label || "Unknown";
          return `🎯 Ego: ${entityLabel}`;
        }
        return "🎯 Ego: Select Entity";
      case "community":
        return `🏘️ Community ${communityId || "?"}`;
      case "timeslice":
        return `⏰ ${timeWindow.from} to ${timeWindow.to}`;
      default:
        return "Unknown View";
    }
  };

  return (
    <div
      className="flex items-center space-x-2 text-sm"
      data-testid="view-mode-indicator"
    >
      <span className="text-slate-500">View:</span>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {getViewModeText()}
      </span>
      {isBounded && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
          Bounded
        </span>
      )}
      {activeDateFilter && (activeDateFilter.from || activeDateFilter.to) && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
          📅 Date Filtered
          {activeDateFilter.from && (
            <span className="ml-1">from {activeDateFilter.from}</span>
          )}
          {activeDateFilter.to && (
            <span className="ml-1">to {activeDateFilter.to}</span>
          )}
        </span>
      )}
    </div>
  );
}
