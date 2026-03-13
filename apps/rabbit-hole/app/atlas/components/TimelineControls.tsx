/**
 * Timeline Controls Component
 *
 * Enhanced temporal controls for compact timeline with preset ranges,
 * custom date pickers, and granularity selection.
 */

"use client";

import React, { useState } from "react";

import { Icon } from "@proto/icon-system";
import type { Granularity } from "@proto/types";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@proto/ui/atoms";

export interface TimeRange {
  from: string; // ISO date string
  to: string; // ISO date string
  label: string;
}

export interface TimelineControlsProps {
  granularity: Granularity;
  currentTimeRange: TimeRange;
  onGranularityChange: (granularity: Granularity) => void;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  onCustomDateRange?: (from: string, to: string) => void;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

// Preset time range configurations
const PRESET_TIME_RANGES = [
  {
    key: "30d",
    label: "Last 30 days",
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "3m",
    label: "Last 3 months",
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setMonth(from.getMonth() - 3);
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "6m",
    label: "Last 6 months",
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setMonth(from.getMonth() - 6);
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "1y",
    label: "Last year",
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "ytd",
    label: "Year to date",
    getDates: () => {
      const to = new Date();
      const from = new Date(to.getFullYear(), 0, 1); // January 1st of current year
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "all",
    label: "All time",
    getDates: () => {
      const to = new Date();
      const from = new Date("2000-01-01"); // Far past date
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    },
  },
];

const GRANULARITY_OPTIONS = [
  { value: "day" as const, label: "Daily", icon: "📅" },
  { value: "week" as const, label: "Weekly", icon: "📊" },
  { value: "month" as const, label: "Monthly", icon: "📆" },
];

export function TimelineControls({
  granularity,
  currentTimeRange,
  onGranularityChange,
  onTimeRangeChange,
  onCustomDateRange,
  className = "",
  disabled = false,
  compact = false,
}: TimelineControlsProps) {
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Find active preset or mark as custom
  const activePreset = PRESET_TIME_RANGES.find((preset) => {
    const dates = preset.getDates();
    return (
      dates.from === currentTimeRange.from && dates.to === currentTimeRange.to
    );
  });

  const handlePresetClick = (preset: (typeof PRESET_TIME_RANGES)[0]) => {
    const dates = preset.getDates();
    onTimeRangeChange({
      from: dates.from,
      to: dates.to,
      label: preset.label,
    });
  };

  const handleCustomRangeSubmit = () => {
    if (customFrom && customTo && onCustomDateRange) {
      onCustomDateRange(customFrom, customTo);
      setShowCustomRange(false);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Granularity Selector */}
        <select
          value={granularity}
          onChange={(e) => onGranularityChange(e.target.value as Granularity)}
          disabled={disabled}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white disabled:opacity-50"
        >
          {GRANULARITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Quick Time Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="text-xs px-2 py-1"
            >
              <Icon name="clock" size={12} className="mr-1" />
              {activePreset ? activePreset.label : "Custom"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="space-y-1">
              {PRESET_TIME_RANGES.map((preset) => (
                <Button
                  key={preset.key}
                  variant={
                    activePreset?.key === preset.key ? "default" : "ghost"
                  }
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="w-full justify-start text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Granularity Control */}
      <div>
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          Time Granularity
        </label>
        <div className="flex items-center gap-1">
          {GRANULARITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={granularity === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onGranularityChange(option.value)}
              disabled={disabled}
              className="text-xs flex items-center gap-1"
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Time Range Control */}
      <div>
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          Time Range
        </label>

        {/* Preset Ranges */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          {PRESET_TIME_RANGES.map((preset) => (
            <Button
              key={preset.key}
              variant={activePreset?.key === preset.key ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              disabled={disabled}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Custom Range Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant={!activePreset ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCustomRange(!showCustomRange)}
            disabled={disabled}
            className="text-xs flex items-center gap-1"
          >
            <Icon name="calendar" size={12} />
            Custom Range
          </Button>

          {/* Current Range Display */}
          <div className="text-xs text-gray-500">
            {formatDateRange(currentTimeRange.from, currentTimeRange.to)}
          </div>
        </div>

        {/* Custom Range Inputs */}
        {showCustomRange && (
          <div className="mt-2 p-2 border border-gray-200 rounded bg-gray-50">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  max={customTo || new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  min={customFrom}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleCustomRangeSubmit}
                disabled={!customFrom || !customTo}
                className="text-xs flex-1"
              >
                Apply
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomRange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format date range
function formatDateRange(from: string, to: string): string {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const now = new Date();

  // Check if "to" is today
  const isToday = toDate.toDateString() === now.toDateString();

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year:
      fromDate.getFullYear() !== toDate.getFullYear() ? "numeric" : undefined,
  };

  const fromStr = fromDate.toLocaleDateString("en-US", formatOptions);
  const toStr = isToday
    ? "today"
    : toDate.toLocaleDateString("en-US", formatOptions);

  return `${fromStr} - ${toStr}`;
}
