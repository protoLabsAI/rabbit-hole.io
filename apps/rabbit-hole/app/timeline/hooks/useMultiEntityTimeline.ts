/**
 * Multi-Entity Timeline Data Fetching Hook
 *
 * Optimizes timeline data fetching for multiple entities using the batch API
 * and intelligent caching. Handles loading states, errors, and data transformation.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

import type { TimelineEvent, CompactTimelineSummary } from "@protolabsai/types";

import type { TimeWindow, TimelineFilters } from "./useTimelinePageState";

// ==================== Types ====================

export interface EntityInfo {
  uid: string;
  name: string;
  type: string;
}

export interface MultiEntityTimelineData {
  entityUid: string;
  entityInfo: EntityInfo;
  timeline: TimelineEvent[];
  summary: CompactTimelineSummary | null;
  error?: string;
}

export interface MultiEntityTimelineState {
  data: MultiEntityTimelineData[];
  loading: boolean;
  error: string | null;
  hasData: boolean;
  lastFetched: Date | null;
}

interface BatchTimelineRequest {
  entityUid: string;
  timeWindow: TimeWindow;
  importance: string[];
  limit: number;
}

// ==================== Utility Functions ====================

/**
 * Extract entity name from UID
 */
function extractEntityName(entityUid: string): string {
  const parts = entityUid.split(":");
  if (parts.length >= 2) {
    return parts[1]
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return entityUid;
}

/**
 * Extract entity type from UID
 */
function extractEntityType(entityUid: string): string {
  const parts = entityUid.split(":");
  if (parts.length >= 2) {
    return parts[0];
  }
  return "unknown";
}

/**
 * Calculate summary statistics for timeline events
 */
function calculateMultiEntitySummary(
  events: TimelineEvent[]
): CompactTimelineSummary {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      peakActivity: {
        timestamp: new Date().toISOString(),
        count: 0,
      },
      activitySpan: {
        earliest: new Date().toISOString(),
        latest: new Date().toISOString(),
      },
      dominantImportance: "minor",
      dominantEventType: "intrinsic",
    };
  }

  // Calculate event distributions
  const importanceCounts = { critical: 0, major: 0, minor: 0 };
  const typeCounts = {
    intrinsic: 0,
    relationship: 0,
    milestone: 0,
    ongoing: 0,
  };

  events.forEach((event) => {
    if (event.importance in importanceCounts) {
      importanceCounts[event.importance as keyof typeof importanceCounts]++;
    }
    if (event.eventType in typeCounts) {
      typeCounts[event.eventType as keyof typeof typeCounts]++;
    }
  });

  // Find dominant importance and event type
  const dominantImportance = Object.entries(importanceCounts).sort(
    ([, a], [, b]) => b - a
  )[0][0] as "critical" | "major" | "minor";
  const dominantEventType = Object.entries(typeCounts).sort(
    ([, a], [, b]) => b - a
  )[0][0] as "intrinsic" | "relationship" | "milestone" | "ongoing";

  // Calculate date range
  const dates = events
    .map((e) => new Date(e.timestamp))
    .sort((a, b) => a.getTime() - b.getTime());
  const earliest = dates[0].toISOString();
  const latest = dates[dates.length - 1].toISOString();

  // Find peak activity (simplified - could be more sophisticated)
  const peakActivity = {
    timestamp: latest, // Most recent as peak for simplicity
    count: events.length,
  };

  return {
    totalEvents: events.length,
    peakActivity,
    activitySpan: {
      earliest,
      latest,
    },
    dominantImportance,
    dominantEventType,
  };
}

// ==================== Hook Implementation ====================

export function useMultiEntityTimeline(
  entities: string[],
  timeWindow: TimeWindow,
  filters: TimelineFilters,
  options: {
    limit?: number;
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) {
  const { limit = 200, enabled = true, refetchInterval } = options;

  const [state, setState] = useState<MultiEntityTimelineState>({
    data: [],
    loading: false,
    error: null,
    hasData: false,
    lastFetched: null,
  });

  // Memoize fetch parameters to prevent unnecessary refetches
  const fetchParams = useMemo(
    () => ({
      entities: [...entities].sort(), // Sort for consistent cache keys
      timeWindow: { ...timeWindow },
      filters: { ...filters },
      limit,
    }),
    [entities, timeWindow, filters, limit]
  );

  const fetchTimelines = useCallback(async () => {
    if (!enabled || entities.length === 0) {
      setState((prev) => ({
        ...prev,
        data: [],
        loading: false,
        error: null,
        hasData: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Prepare batch request
      const batchRequests: BatchTimelineRequest[] = entities.map(
        (entityUid) => ({
          entityUid,
          timeWindow: fetchParams.timeWindow,
          importance: fetchParams.filters.importance,
          limit: fetchParams.limit,
        })
      );

      console.log(
        `🔍 Fetching timelines for ${entities.length} entities:`,
        entities
      );

      // Make batch API request
      const response = await fetch("/api/entity-timeline/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: batchRequests }),
      });

      if (!response.ok) {
        throw new Error(
          `Batch timeline fetch failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Batch timeline fetch failed");
      }

      // Process and transform results
      const processedData: MultiEntityTimelineData[] = result.data.map(
        (item: any) => {
          const events = item.events || [];

          return {
            entityUid: item.entityUid,
            entityInfo: {
              uid: item.entityUid,
              name: extractEntityName(item.entityUid),
              type: extractEntityType(item.entityUid),
            },
            timeline: events,
            summary: item.summary || calculateMultiEntitySummary(events),
            error: item.error,
          };
        }
      );

      // Sort data by entity order to maintain consistent display
      const sortedData = processedData.sort((a, b) => {
        const aIndex = entities.indexOf(a.entityUid);
        const bIndex = entities.indexOf(b.entityUid);
        return aIndex - bIndex;
      });

      setState({
        data: sortedData,
        loading: false,
        error: null,
        hasData: sortedData.some((d) => d.timeline.length > 0),
        lastFetched: new Date(),
      });

      console.log(
        `✅ Successfully fetched timelines for ${sortedData.length} entities`
      );
    } catch (err) {
      console.error("Multi-entity timeline fetch failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load timelines";

      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        hasData: false,
      }));
    }
  }, [enabled, entities, fetchParams]);

  // Fetch data when parameters change
  useEffect(() => {
    fetchTimelines();
  }, [fetchTimelines]);

  // Optional refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchTimelines, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchTimelines, refetchInterval, enabled]);

  // Computed properties
  const totalEvents = useMemo(
    () => state.data.reduce((sum, entity) => sum + entity.timeline.length, 0),
    [state.data]
  );

  const entitiesWithData = useMemo(
    () => state.data.filter((entity) => entity.timeline.length > 0),
    [state.data]
  );

  const entitiesWithErrors = useMemo(
    () => state.data.filter((entity) => entity.error),
    [state.data]
  );

  const isPartiallyLoaded = useMemo(
    () => entitiesWithData.length > 0 && entitiesWithErrors.length > 0,
    [entitiesWithData.length, entitiesWithErrors.length]
  );

  return {
    // Core state
    data: state.data,
    loading: state.loading,
    error: state.error,
    hasData: state.hasData,
    lastFetched: state.lastFetched,

    // Actions
    refetch: fetchTimelines,

    // Computed properties
    totalEvents,
    entitiesWithData,
    entitiesWithErrors,
    isPartiallyLoaded,
    successRate:
      entities.length > 0 ? entitiesWithData.length / entities.length : 0,

    // Status helpers
    isEmpty: !state.loading && !state.hasData && !state.error,
    hasErrors: entitiesWithErrors.length > 0,
    isStale: state.lastFetched
      ? Date.now() - state.lastFetched.getTime() > 5 * 60 * 1000
      : false, // 5 minutes
  };
}
