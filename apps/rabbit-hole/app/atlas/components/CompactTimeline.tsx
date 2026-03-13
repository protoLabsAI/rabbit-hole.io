/**
 * Compact Timeline Component
 *
 * Lower-fidelity timeline visualization for entity detail cards.
 * Shows event density over time periods with importance-based color coding.
 */

"use client";

import { useState, useMemo } from "react";

import type {
  CompactTimelineData,
  CompactTimelinePeriod,
  Granularity,
} from "@proto/types";
import { Button } from "@proto/ui/atoms";

import { TimelineControls, type TimeRange } from "./TimelineControls";

export interface CompactTimelineProps {
  entityUid: string;
  timelineData: CompactTimelineData | null;
  height?: number;
  showControls?: boolean;
  onExpandClick?: (entityUid: string, timestamp?: string) => void;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  onGranularityChange?: (granularity: Granularity) => void;
  onCustomDateRange?: (from: string, to: string) => void;
  className?: string;
  isLoading?: boolean;
  error?: string;
  disabled?: boolean;
}

export function CompactTimeline({
  entityUid,
  timelineData,
  height = 120,
  showControls = false,
  onExpandClick,
  onTimeRangeChange,
  onGranularityChange,
  onCustomDateRange,
  className = "",
  isLoading = false,
  error,
  disabled = false,
}: CompactTimelineProps) {
  const [selectedPeriod, setSelectedPeriod] =
    useState<CompactTimelinePeriod | null>(null);

  // Create current time range from timeline data
  const currentTimeRange: TimeRange = timelineData
    ? {
        from: timelineData.timeRange.from,
        to: timelineData.timeRange.to,
        label: "Current Range",
      }
    : {
        from: new Date().toISOString().split("T")[0],
        to: new Date().toISOString().split("T")[0],
        label: "Today",
      };

  // Handle loading state
  if (isLoading) {
    return (
      <div
        className={`bg-gray-50 rounded-lg border border-gray-200 ${className}`}
        style={{ height }}
      >
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
          </div>
        </div>
        <div className="px-4 py-3" style={{ height: height - 60 }}>
          <div className="h-full bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}
        style={{ height }}
      >
        <div className="text-red-600 text-sm font-medium mb-1">
          Timeline Error
        </div>
        <div className="text-red-500 text-xs">{error}</div>
      </div>
    );
  }

  // Validate timeline data structure
  const isValidTimelineData =
    timelineData &&
    timelineData.periods &&
    Array.isArray(timelineData.periods) &&
    timelineData.summary &&
    typeof timelineData.summary.totalEvents === "number";

  // Handle empty or invalid state
  if (!isValidTimelineData || timelineData.periods.length === 0) {
    return (
      <div
        className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center ${className}`}
        style={{ height }}
      >
        <div className="text-gray-500">
          <div className="text-sm font-medium mb-1">
            {!isValidTimelineData
              ? "Invalid Timeline Data"
              : "No Timeline Data"}
          </div>
          <div className="text-xs">
            {!isValidTimelineData
              ? "Timeline data structure is malformed"
              : "No events found for this entity"}
          </div>
        </div>
      </div>
    );
  }

  const { periods, summary } = timelineData;

  // Calculate visualization dimensions
  const chartHeight = height - (showControls ? 80 : 50); // More space for enhanced controls

  // Safely calculate max event count with fallback
  const maxEventCount =
    periods.length > 0
      ? Math.max(
          ...periods.map((p: CompactTimelinePeriod) => p.eventCount || 0)
        )
      : 1; // Prevent division by zero

  // Calculate bar widths and positions
  const totalWidth = 100; // Percentage
  const barSpacing = Math.min(4, (100 / periods.length) * 0.1); // Adaptive spacing, max 4%
  const availableWidth = totalWidth - (periods.length - 1) * barSpacing;
  const barWidth = availableWidth / periods.length;

  // Generate time axis labels - minimal for clean look
  const timeLabels = useMemo(() => {
    if (periods.length <= 3) {
      return periods.map((period: CompactTimelinePeriod) =>
        formatPeriodLabel(period.timestamp, timelineData.granularity)
      );
    }

    // Show only first and last for clean appearance
    return periods.map((period: CompactTimelinePeriod, index: number) => {
      if (index === 0 || index === periods.length - 1) {
        return formatPeriodLabel(period.timestamp, timelineData.granularity);
      }
      return "";
    });
  }, [periods, timelineData.granularity]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">
            Timeline ({summary.totalEvents} events)
          </div>
          {onExpandClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExpandClick(entityUid)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Details
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Controls */}
      {showControls && timelineData && (
        <div className="p-3 border-b border-gray-100">
          <TimelineControls
            granularity={timelineData.granularity}
            currentTimeRange={currentTimeRange}
            onGranularityChange={onGranularityChange || (() => {})}
            onTimeRangeChange={onTimeRangeChange || (() => {})}
            onCustomDateRange={onCustomDateRange}
            disabled={disabled}
            compact={true}
          />
        </div>
      )}

      {/* Chart */}
      <div className="px-4 py-3" style={{ height: chartHeight }}>
        <div className="relative h-full">
          {/* Bars */}
          <svg width="100%" height="100%" className="overflow-visible">
            {periods.map((period: CompactTimelinePeriod, index: number) => {
              const barHeight =
                (period.eventCount / maxEventCount) * (chartHeight - 30);
              const xPosition = index * (barWidth + barSpacing);
              const yPosition = chartHeight - 25 - barHeight;

              return (
                <g key={period.timestamp}>
                  {/* Bar */}
                  <rect
                    x={`${xPosition}%`}
                    y={yPosition}
                    width={`${barWidth}%`}
                    height={barHeight}
                    fill={getImportanceColor(period.peakImportance)}
                    className="cursor-pointer transition-all hover:opacity-80 hover:stroke-gray-300"
                    onClick={() => {
                      setSelectedPeriod(period);
                      onExpandClick?.(entityUid, period.timestamp);
                    }}
                    onMouseEnter={() => setSelectedPeriod(period)}
                    onMouseLeave={() => setSelectedPeriod(null)}
                  />

                  {/* Time label */}
                  {timeLabels[index] && (
                    <text
                      x={`${xPosition + barWidth / 2}%`}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      className="text-xs fill-gray-400"
                      fontSize="10"
                    >
                      {timeLabels[index]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {selectedPeriod && (
            <div className="absolute top-2 left-2 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none z-10">
              <div className="font-medium">
                {formatPeriodLabel(
                  selectedPeriod.timestamp,
                  timelineData.granularity
                )}
              </div>
              <div>{selectedPeriod.eventCount} events</div>
              <div className="text-gray-300">
                {selectedPeriod.importanceCounts.critical > 0 &&
                  `${selectedPeriod.importanceCounts.critical} critical`}
                {selectedPeriod.importanceCounts.critical > 0 &&
                  selectedPeriod.importanceCounts.major > 0 &&
                  ", "}
                {selectedPeriod.importanceCounts.major > 0 &&
                  `${selectedPeriod.importanceCounts.major} major`}
                {(selectedPeriod.importanceCounts.critical > 0 ||
                  selectedPeriod.importanceCounts.major > 0) &&
                  selectedPeriod.importanceCounts.minor > 0 &&
                  ", "}
                {selectedPeriod.importanceCounts.minor > 0 &&
                  `${selectedPeriod.importanceCounts.minor} minor`}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Click to view details
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
            <span className="text-gray-600">Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded-sm"></div>
            <span className="text-gray-600">Major</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
            <span className="text-gray-600">Minor</span>
          </div>
        </div>

        <div className="text-gray-400">Peak: {summary.peakActivity.count}</div>
      </div>
    </div>
  );
}

// Helper functions

function getImportanceColor(
  importance: "critical" | "major" | "minor"
): string {
  switch (importance) {
    case "critical":
      return "#ef4444"; // red-500
    case "major":
      return "#f97316"; // orange-500
    case "minor":
      return "#3b82f6"; // blue-500
    default:
      return "#6b7280"; // gray-500
  }
}

function formatPeriodLabel(
  timestamp: string,
  granularity: "day" | "week" | "month"
): string {
  const date = new Date(timestamp);

  switch (granularity) {
    case "day":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "week":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "month":
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    default:
      return date.toLocaleDateString();
  }
}

function formatDateRange(timeRange: { from: string; to: string }): string {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year:
      fromDate.getFullYear() !== toDate.getFullYear() ? "numeric" : undefined,
  };

  return `${fromDate.toLocaleDateString("en-US", formatOptions)} - ${toDate.toLocaleDateString("en-US", formatOptions)}`;
}
