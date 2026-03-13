/**
 * Analytics Filters Component
 *
 * Enhanced filtering interface supporting multiple data sources and chart types.
 * Extends timeline filters with analytics-specific options.
 */

"use client";

import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proto/ui/atoms";

// Import existing timeline filters
import { TimelineFilters } from "../../timeline/components/TimelineFilters";
import type {
  AnalyticsFilters,
  TimeWindow,
  ChartConfiguration,
} from "../hooks/useAnalyticsPageState";

// ==================== Component Props ====================

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  timeWindow: TimeWindow;
  chartConfig: ChartConfiguration;
  onFiltersChange: (filters: Partial<AnalyticsFilters>) => void;
  onTimeWindowChange: (timeWindow: Partial<TimeWindow>) => void;
  onReset: () => void;
}

// ==================== Component ====================

export function AnalyticsFilters({
  filters,
  timeWindow,
  chartConfig,
  onFiltersChange,
  onTimeWindowChange,
  onReset,
}: AnalyticsFiltersProps) {
  // Convert analytics filters to timeline filters format for compatibility
  const timelineFilters = {
    categories: filters.categories,
    importance: filters.importance,
    eventTypes: filters.eventTypes,
    tags: filters.tags,
  };

  const handleTimelineFiltersChange = (newFilters: any) => {
    onFiltersChange({
      categories: newFilters.categories,
      importance: newFilters.importance,
      eventTypes: newFilters.eventTypes,
      tags: newFilters.tags,
    });
  };

  // Show different filter options based on data source
  const showTimelineFilters = ["timeline", "biographical"].includes(
    chartConfig.dataSource
  );
  const showSpeechActFilters = chartConfig.dataSource === "speechActs";
  const showMetricFilters = ["metrics", "activity"].includes(
    chartConfig.dataSource
  );

  return (
    <div className="space-y-4">
      {/* Time Window - always show for time-based data */}
      {showTimelineFilters && (
        <TimelineFilters
          filters={timelineFilters}
          timeWindow={timeWindow}
          onFiltersChange={handleTimelineFiltersChange}
          onTimeWindowChange={onTimeWindowChange}
          onReset={onReset}
          availableCategories={[
            "political",
            "legal",
            "business",
            "social",
            "scandal",
            "investigation",
            "election",
            "campaign",
            "speech",
          ]}
          availableTags={[
            "conspiracy",
            "misinformation",
            "hate_speech",
            "rhetoric",
            "democracy",
            "election_interference",
            "corruption",
          ]}
        />
      )}

      {/* Speech Act Specific Filters */}
      {showSpeechActFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Speech Act Filters</CardTitle>
            <CardDescription>
              Filter speech analysis data by sentiment and categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              Speech act filtering options will be implemented here. Current
              sentiments: {filters.sentiments.join(", ")}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Specific Filters */}
      {showMetricFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Metrics Filters</CardTitle>
            <CardDescription>
              Select which metrics to analyze and compare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              Metric selection interface will be implemented here. Current
              metrics: {filters.metrics.join(", ") || "All"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relationship Specific Filters */}
      {chartConfig.dataSource === "relationships" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Relationship Filters</CardTitle>
            <CardDescription>
              Filter relationship data by connection types and strength
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              Relationship filtering options will be implemented here.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
