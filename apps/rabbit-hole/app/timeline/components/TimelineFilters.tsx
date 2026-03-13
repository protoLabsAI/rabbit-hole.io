/**
 * Timeline Filters Component
 *
 * Comprehensive filtering interface for timeline events with date ranges,
 * categories, importance levels, event types, and tags. Features filter
 * presets and reset functionality.
 */

"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";

import { Icon } from "@proto/icon-system";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from "@proto/ui/atoms";

import type {
  TimelineFilters,
  TimeWindow,
} from "../hooks/useTimelinePageState";

// ==================== Types ====================

export interface TimelineFiltersProps {
  filters: TimelineFilters;
  timeWindow: TimeWindow;
  onFiltersChange: (filters: Partial<TimelineFilters>) => void;
  onTimeWindowChange: (timeWindow: Partial<TimeWindow>) => void;
  onReset: () => void;
  availableCategories?: string[];
  availableTags?: string[];
  className?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: Partial<TimelineFilters>;
  icon: string;
}

// ==================== Constants ====================

const IMPORTANCE_LEVELS = [
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700" },
  { value: "major", label: "Major", color: "bg-orange-100 text-orange-700" },
  { value: "minor", label: "Minor", color: "bg-blue-100 text-blue-700" },
];

const EVENT_TYPES = [
  {
    value: "intrinsic",
    label: "Intrinsic",
    description: "Birth, death, founding",
  },
  {
    value: "relationship",
    label: "Relationships",
    description: "Interactions between entities",
  },
  {
    value: "milestone",
    label: "Milestones",
    description: "Achievements, markers",
  },
  {
    value: "ongoing",
    label: "Ongoing",
    description: "Campaigns, investigations",
  },
];

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "critical-events",
    name: "Critical Events Only",
    description: "Show only the most important events",
    filters: {
      importance: ["critical"],
      eventTypes: ["intrinsic", "relationship", "milestone", "ongoing"],
    },
    icon: "🔥",
  },
  {
    id: "political-activity",
    name: "Political Activity",
    description: "Focus on political events and relationships",
    filters: {
      categories: ["political", "election", "campaign", "speech"],
      importance: ["critical", "major"],
      eventTypes: ["relationship", "milestone"],
    },
    icon: "🏛️",
  },
  {
    id: "scandals-investigations",
    name: "Scandals & Investigations",
    description: "Legal issues and controversies",
    filters: {
      categories: ["legal", "scandal", "investigation", "controversy"],
      importance: ["critical", "major"],
    },
    icon: "⚖️",
  },
  {
    id: "recent-activity",
    name: "Recent Activity",
    description: "Events from the last year",
    filters: {
      importance: ["critical", "major", "minor"],
      eventTypes: ["relationship", "milestone", "ongoing"],
    },
    icon: "📅",
  },
];

// ==================== Utility Functions ====================

/**
 * Validate date string format (YYYY-MM-DD)
 */
function validateDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Debounce utility for performance optimization
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ==================== Components ====================

/**
 * Date Range Filter Component
 */
function DateRangeFilter({
  timeWindow,
  onChange,
}: {
  timeWindow: TimeWindow;
  onChange: (updates: Partial<TimeWindow>) => void;
}) {
  const [fromValue, setFromValue] = useState(timeWindow.from);
  const [toValue, setToValue] = useState(timeWindow.to);
  const [errors, setErrors] = useState({ from: "", to: "" });

  // Debounce the date values to avoid excessive API calls while typing
  const debouncedFromValue = useDebounce(fromValue, 500);
  const debouncedToValue = useDebounce(toValue, 500);

  // Update parent when debounced values change
  useEffect(() => {
    if (
      validateDateString(debouncedFromValue) &&
      debouncedFromValue !== timeWindow.from
    ) {
      onChange({ from: debouncedFromValue });
    }
  }, [debouncedFromValue, onChange, timeWindow.from]);

  useEffect(() => {
    if (
      validateDateString(debouncedToValue) &&
      debouncedToValue !== timeWindow.to
    ) {
      onChange({ to: debouncedToValue });
    }
  }, [debouncedToValue, onChange, timeWindow.to]);

  // Sync with external changes to timeWindow
  useEffect(() => {
    if (timeWindow.from !== fromValue) {
      setFromValue(timeWindow.from);
    }
  }, [timeWindow.from]);

  useEffect(() => {
    if (timeWindow.to !== toValue) {
      setToValue(timeWindow.to);
    }
  }, [timeWindow.to]);

  const handleFromChange = useCallback((value: string) => {
    setFromValue(value);

    if (validateDateString(value)) {
      setErrors((prev) => ({ ...prev, from: "" }));
    } else if (value.length >= 10) {
      // Only show error for complete dates
      setErrors((prev) => ({
        ...prev,
        from: "Invalid date format (YYYY-MM-DD)",
      }));
    }
  }, []);

  const handleToChange = useCallback((value: string) => {
    setToValue(value);

    if (validateDateString(value)) {
      setErrors((prev) => ({ ...prev, to: "" }));
    } else if (value.length >= 10) {
      // Only show error for complete dates
      setErrors((prev) => ({
        ...prev,
        to: "Invalid date format (YYYY-MM-DD)",
      }));
    }
  }, []);

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 font-medium">
        <Icon name="calendar" size={16} />
        Time Window
      </Label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="date-from" className="text-xs text-gray-600">
            From
          </Label>
          <Input
            id="date-from"
            type="date"
            value={fromValue}
            onChange={(e) => handleFromChange(e.target.value)}
            className={errors.from ? "border-red-500" : ""}
          />
          {errors.from && (
            <p className="text-xs text-red-600 mt-1">{errors.from}</p>
          )}
        </div>

        <div>
          <Label htmlFor="date-to" className="text-xs text-gray-600">
            To
          </Label>
          <Input
            id="date-to"
            type="date"
            value={toValue}
            onChange={(e) => handleToChange(e.target.value)}
            className={errors.to ? "border-red-500" : ""}
          />
          {errors.to && (
            <p className="text-xs text-red-600 mt-1">{errors.to}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Multi-Select Checkbox Group
 */
function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  icon,
}: {
  label: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    color?: string;
  }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  icon?: React.ReactNode;
}) {
  const toggleOption = useCallback(
    (value: string) => {
      if (selected.includes(value)) {
        onChange(selected.filter((item) => item !== value));
      } else {
        onChange([...selected, value]);
      }
    },
    [selected, onChange]
  );

  const selectAll = useCallback(() => {
    onChange(options.map((opt) => opt.value));
  }, [options, onChange]);

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 font-medium">
          {icon}
          {label}
        </Label>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className="h-6 px-2 text-xs"
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2 text-xs"
          >
            None
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-start gap-2">
            <Checkbox
              id={`${label}-${option.value}`}
              checked={selected.includes(option.value)}
              onCheckedChange={() => toggleOption(option.value)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label
                htmlFor={`${label}-${option.value}`}
                className="text-sm cursor-pointer"
              >
                <span
                  className={
                    option.color
                      ? `px-2 py-1 rounded ${option.color} text-xs`
                      : ""
                  }
                >
                  {option.label}
                </span>
              </label>
              {option.description && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Filter Presets Component
 */
function FilterPresets({
  onApplyPreset,
}: {
  onApplyPreset: (preset: FilterPreset) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 font-medium">
        <Icon name="filter" size={16} />
        Quick Presets
      </Label>

      <div className="grid grid-cols-1 gap-2">
        {FILTER_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            size="sm"
            onClick={() => onApplyPreset(preset)}
            className="justify-start h-auto p-3 text-left"
          >
            <div className="flex items-start gap-2">
              <span className="text-base">{preset.icon}</span>
              <div>
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-gray-500">
                  {preset.description}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function TimelineFilters({
  filters,
  timeWindow,
  onFiltersChange,
  onTimeWindowChange,
  onReset,
  availableCategories = [],
  availableTags = [],
  className = "",
}: TimelineFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.importance.length < 3) count++; // Less than all importance levels
    if (filters.eventTypes.length < 4) count++; // Less than all event types
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  const handlePresetApply = useCallback(
    (preset: FilterPreset) => {
      onFiltersChange(preset.filters);
    },
    [onFiltersChange]
  );

  // Generate category options from available categories
  const categoryOptions = useMemo(
    () =>
      availableCategories.map((category) => ({
        value: category,
        label:
          category.charAt(0).toUpperCase() +
          category.slice(1).replace(/_/g, " "),
      })),
    [availableCategories]
  );

  // Generate tag options from available tags
  const tagOptions = useMemo(
    () =>
      availableTags.map((tag) => ({
        value: tag,
        label: tag.charAt(0).toUpperCase() + tag.slice(1).replace(/_/g, " "),
      })),
    [availableTags]
  );

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Icon name="filter" size={16} />
            <CardTitle className="text-lg">Timeline Filters</CardTitle>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                className="h-6 px-2"
              >
                <Icon name="refresh" size={12} />
              </Button>
            )}
            {isExpanded ? (
              <Icon name="chevron-down" size={16} />
            ) : (
              <Icon name="chevron-right" size={16} />
            )}
          </div>
        </div>
        <CardDescription>
          Refine your timeline analysis with advanced filtering options
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Date Range Filter */}
          <DateRangeFilter
            timeWindow={timeWindow}
            onChange={onTimeWindowChange}
          />

          {/* Filter Presets */}
          <FilterPresets onApplyPreset={handlePresetApply} />

          {/* Importance Levels */}
          <MultiSelectFilter
            label="Importance Levels"
            options={IMPORTANCE_LEVELS}
            selected={filters.importance}
            onChange={(importance) => onFiltersChange({ importance })}
            icon={<Badge className="w-4 h-4 p-0">!</Badge>}
          />

          {/* Event Types */}
          <MultiSelectFilter
            label="Event Types"
            options={EVENT_TYPES}
            selected={filters.eventTypes}
            onChange={(eventTypes) => onFiltersChange({ eventTypes })}
            icon={<Icon name="filter" size={16} />}
          />

          {/* Categories */}
          {categoryOptions.length > 0 && (
            <MultiSelectFilter
              label="Event Categories"
              options={categoryOptions}
              selected={filters.categories}
              onChange={(categories) => onFiltersChange({ categories })}
              icon={<span className="w-4 h-4 text-center">📂</span>}
            />
          )}

          {/* Tags */}
          {tagOptions.length > 0 && (
            <MultiSelectFilter
              label="Tags"
              options={tagOptions}
              selected={filters.tags}
              onChange={(tags) => onFiltersChange({ tags })}
              icon={<span className="w-4 h-4 text-center">🏷️</span>}
            />
          )}

          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={onReset}
                className="w-full flex items-center gap-2"
              >
                <Icon name="refresh" size={16} />
                Reset All Filters
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
