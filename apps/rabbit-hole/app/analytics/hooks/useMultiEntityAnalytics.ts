/**
 * Multi-Entity Analytics Data Fetching Hook
 *
 * Generalized data fetching for multiple entities supporting various chart types and data sources.
 * Extends the timeline pattern for flexible analytics data.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

import { getEntityColor } from "@proto/utils";

import type {
  ChartConfiguration,
  ChartData,
} from "../types/ChartConfiguration";

import type { AnalyticsFilters, TimeWindow } from "./useAnalyticsPageState";

// ==================== Types ====================

export interface AnalyticsDataState {
  data: ChartData[];
  loading: boolean;
  error: string | null;
  hasData: boolean;
  lastFetched: Date | null;
}

interface FetchOptions {
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

// ==================== Data Fetchers ====================

async function fetchTimelineData(
  entities: string[],
  timeWindow: TimeWindow,
  filters: AnalyticsFilters,
  options: { limit: number }
): Promise<ChartData[]> {
  const batchRequests = entities.map((entityUid) => ({
    entityUid,
    timeWindow,
    importance: filters.importance,
    limit: options.limit,
  }));

  const response = await fetch("/api/entity-timeline/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests: batchRequests }),
  });

  if (!response.ok) {
    throw new Error(`Timeline fetch failed: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Timeline fetch failed");
  }

  return result.data.map((item: any) => ({
    entityUid: item.entityUid,
    entityName: extractEntityName(item.entityUid),
    entityType: extractEntityType(item.entityUid),
    data: item.events || [],
    metadata: {
      total: (item.events || []).length,
      color: getEntityColor(item.entityUid),
    },
  }));
}

async function fetchSpeechActData(
  entities: string[],
  timeWindow: TimeWindow,
  filters: AnalyticsFilters
): Promise<ChartData[]> {
  // For now, simulate speech act data - in real implementation would call actual API
  console.log("Fetching speech act data for:", entities);

  return entities.map((entityUid) => ({
    entityUid,
    entityName: extractEntityName(entityUid),
    entityType: extractEntityType(entityUid),
    data: [
      { category: "hostile", count: Math.floor(Math.random() * 100) },
      { category: "supportive", count: Math.floor(Math.random() * 50) },
      { category: "neutral", count: Math.floor(Math.random() * 200) },
    ],
    metadata: {
      total: 300,
      color: getEntityColor(entityUid),
    },
  }));
}

async function fetchRelationshipData(
  entities: string[],
  timeWindow: TimeWindow,
  filters: AnalyticsFilters
): Promise<ChartData[]> {
  // Simulate relationship data
  console.log("Fetching relationship data for:", entities);

  return entities.map((entityUid) => ({
    entityUid,
    entityName: extractEntityName(entityUid),
    entityType: extractEntityType(entityUid),
    data: [
      { type: "mentioned", count: Math.floor(Math.random() * 50) },
      { type: "associated_with", count: Math.floor(Math.random() * 30) },
      { type: "opposed_to", count: Math.floor(Math.random() * 20) },
    ],
    metadata: {
      total: 100,
      color: getEntityColor(entityUid),
    },
  }));
}

async function fetchMetricsData(
  entities: string[],
  timeWindow: TimeWindow,
  filters: AnalyticsFilters
): Promise<ChartData[]> {
  // Simulate metrics data
  console.log("Fetching metrics data for:", entities);

  return entities.map((entityUid) => ({
    entityUid,
    entityName: extractEntityName(entityUid),
    entityType: extractEntityType(entityUid),
    data: [
      { metric: "speechActCount", value: Math.floor(Math.random() * 1000) },
      { metric: "degree", value: Math.floor(Math.random() * 100) },
      { metric: "activityInWindow", value: Math.floor(Math.random() * 500) },
    ],
    metadata: {
      total: 3,
      color: getEntityColor(entityUid),
    },
  }));
}

// ==================== Data Fetcher Registry ====================

const DATA_FETCHERS = {
  timeline: fetchTimelineData,
  speechActs: fetchSpeechActData,
  relationships: fetchRelationshipData,
  biographical: fetchTimelineData, // Reuse timeline fetcher for now
  activity: fetchMetricsData, // Simulate with metrics
  metrics: fetchMetricsData,
};

// ==================== Utility Functions ====================

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

function extractEntityType(entityUid: string): string {
  const parts = entityUid.split(":");
  return parts.length >= 2 ? parts[0] : "unknown";
}

// ==================== Hook Implementation ====================

export function useMultiEntityAnalytics(
  entities: string[],
  chartConfig: ChartConfiguration,
  timeWindow: TimeWindow,
  filters: AnalyticsFilters,
  options: FetchOptions = {}
) {
  const { limit = 200, enabled = true, refetchInterval } = options;

  const [state, setState] = useState<AnalyticsDataState>({
    data: [],
    loading: false,
    error: null,
    hasData: false,
    lastFetched: null,
  });

  // Memoize fetch parameters
  const fetchParams = useMemo(
    () => ({
      entities: [...entities].sort(),
      chartConfig: { ...chartConfig },
      timeWindow: { ...timeWindow },
      filters: { ...filters },
      limit,
    }),
    [entities, chartConfig, timeWindow, filters, limit]
  );

  const fetchAnalytics = useCallback(async () => {
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
      console.log(
        `📊 Fetching ${chartConfig.dataSource} analytics for ${entities.length} entities:`,
        entities
      );

      const fetcher = DATA_FETCHERS[chartConfig.dataSource];
      if (!fetcher) {
        throw new Error(`No data fetcher found for: ${chartConfig.dataSource}`);
      }

      const chartData = await fetcher(entities, timeWindow, filters, { limit });

      // Sort data by entity order
      const sortedData = chartData.sort((a, b) => {
        const aIndex = entities.indexOf(a.entityUid);
        const bIndex = entities.indexOf(b.entityUid);
        return aIndex - bIndex;
      });

      setState({
        data: sortedData,
        loading: false,
        error: null,
        hasData: sortedData.some((d) => d.data.length > 0),
        lastFetched: new Date(),
      });

      console.log(
        `✅ Successfully fetched ${chartConfig.dataSource} analytics for ${sortedData.length} entities`
      );
    } catch (err) {
      console.error("Multi-entity analytics fetch failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load analytics";

      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        hasData: false,
      }));
    }
  }, [enabled, entities, chartConfig, timeWindow, filters, limit]);

  // Fetch data when parameters change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Optional refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchAnalytics, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAnalytics, refetchInterval, enabled]);

  // Computed properties
  const totalDataPoints = useMemo(
    () => state.data.reduce((sum, entity) => sum + entity.data.length, 0),
    [state.data]
  );

  const entitiesWithData = useMemo(
    () => state.data.filter((entity) => entity.data.length > 0),
    [state.data]
  );

  const entitiesWithErrors = useMemo(
    () => state.data.filter((entity) => entity.metadata?.error),
    [state.data]
  );

  const isPartiallyLoaded = useMemo(
    () =>
      entitiesWithData.length > 0 && entitiesWithData.length < entities.length,
    [entitiesWithData.length, entities.length]
  );

  return {
    // Core state
    data: state.data,
    loading: state.loading,
    error: state.error,
    hasData: state.hasData,
    lastFetched: state.lastFetched,

    // Actions
    refetch: fetchAnalytics,

    // Computed properties
    totalDataPoints,
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
      : false,
  };
}
