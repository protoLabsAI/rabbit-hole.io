/**
 * Timeline Chart View Component
 *
 * Wrapper for existing timeline components to work with analytics data structure.
 * Maintains compatibility with timeline functionality while supporting new data formats.
 */

"use client";

import React, { useMemo } from "react";

import { MultiEntityTimelineChart } from "../../../timeline/components/MultiEntityTimelineChart";
import type { MultiEntityTimelineData } from "../../../timeline/hooks/useMultiEntityTimeline";
import type {
  AnalyticsFilters,
  TimeWindow,
} from "../../hooks/useAnalyticsPageState";
import type {
  ChartData,
  ChartConfiguration,
} from "../../types/ChartConfiguration";

// ==================== Component Props ====================

interface TimelineChartViewProps {
  entities: ChartData[];
  config: ChartConfiguration;
  height?: number;
  timeWindow?: TimeWindow;
  filters?: AnalyticsFilters;
  onDataPointClick?: (dataPoint: any, entityUid: string) => void;
  className?: string;
}

// ==================== Component ====================

export function TimelineChartView({
  entities,
  config,
  height = 600,
  timeWindow,
  filters,
  onDataPointClick,
  className = "",
}: TimelineChartViewProps) {
  // Transform analytics data to timeline data format
  const timelineData = useMemo((): MultiEntityTimelineData[] => {
    return entities.map((entity) => ({
      entityUid: entity.entityUid,
      entityInfo: {
        uid: entity.entityUid,
        name: entity.entityName,
        type: entity.entityType,
      },
      timeline: entity.data, // Timeline events should already be in correct format
      summary: {
        totalEvents: entity.data.length,
        peakActivity: {
          timestamp: new Date().toISOString(),
          count: entity.data.length,
        },
        activitySpan: {
          earliest: entity.data[0]?.timestamp || new Date().toISOString(),
          latest:
            entity.data[entity.data.length - 1]?.timestamp ||
            new Date().toISOString(),
        },
        dominantImportance: "major" as const,
        dominantEventType: "intrinsic" as const,
      },
      error: entity.metadata?.error as string | undefined,
    }));
  }, [entities]);

  // Transform analytics filters to timeline filters
  const timelineFilters = useMemo(
    () => ({
      categories: filters?.categories || [],
      importance: filters?.importance || ["critical", "major", "minor"],
      eventTypes: filters?.eventTypes || [
        "intrinsic",
        "relationship",
        "milestone",
        "ongoing",
      ],
      tags: filters?.tags || [],
    }),
    [filters]
  );

  // Default time window if not provided
  const defaultTimeWindow = useMemo(
    () => ({
      from: new Date(Date.now() - 30 * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      to: new Date().toISOString().split("T")[0],
    }),
    []
  );

  return (
    <div className={className}>
      <MultiEntityTimelineChart
        entities={timelineData}
        viewMode={
          (config.viewMode as
            | "comparison"
            | "merged"
            | "side-by-side"
            | "tracks") || "tracks"
        }
        filters={timelineFilters}
        timeWindow={timeWindow || defaultTimeWindow}
        height={height}
        onEventClick={(event, entityUid) => {
          onDataPointClick?.(event, entityUid);
        }}
      />
    </div>
  );
}
