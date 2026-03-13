/**
 * Analytics Page State Management Hook
 *
 * Extended nuqs-powered URL state management for multi-entity analytics page.
 * Handles entities, chart configuration, data sources, and view modes with validation.
 * Maintains backward compatibility with timeline URLs.
 */

"use client";

import {
  useQueryState,
  useQueryStates,
  parseAsString,
  parseAsArrayOf,
  parseAsJson,
} from "nuqs";
import { useCallback } from "react";

// ==================== Types ====================

export interface TimeWindow {
  from: string; // YYYY-MM-DD format
  to: string; // YYYY-MM-DD format
}

export interface AnalyticsFilters {
  categories: string[]; // Data categories to include
  importance: string[]; // critical, major, minor (for timeline data)
  eventTypes: string[]; // intrinsic, relationship, milestone, ongoing
  tags: string[]; // Custom tag filtering
  sentiments: string[]; // For speech act data: hostile, supportive, neutral
  metrics: string[]; // Which metrics to include
}

export interface ChartConfiguration {
  type: "timeline" | "bar" | "line" | "pie" | "scatter" | "network" | "heatmap";
  dataSource:
    | "timeline"
    | "speechActs"
    | "relationships"
    | "biographical"
    | "activity"
    | "metrics";
  aggregation: "none" | "daily" | "weekly" | "monthly" | "yearly";
  viewMode: "comparison" | "merged" | "side-by-side" | "tracks" | "overlay";
}

export interface AnalyticsPageState {
  entities: string[]; // ["person:trump", "person:biden", ...]
  timeWindow: TimeWindow;
  filters: AnalyticsFilters;
  chartConfig: ChartConfiguration;
}

// ==================== Validation Functions ====================

const validateTimeWindow = (obj: any): TimeWindow | null => {
  if (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.from === "string" &&
    typeof obj.to === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.from) && // YYYY-MM-DD format validation
    /^\d{4}-\d{2}-\d{2}$/.test(obj.to)
  ) {
    const fromDate = new Date(obj.from);
    const toDate = new Date(obj.to);

    if (fromDate <= toDate) {
      return {
        from: obj.from,
        to: obj.to,
      };
    }
  }
  return null;
};

const validateAnalyticsFilters = (obj: any): AnalyticsFilters | null => {
  if (typeof obj === "object" && obj !== null) {
    return {
      categories: Array.isArray(obj.categories)
        ? obj.categories.filter((c: any) => typeof c === "string")
        : [],
      importance: Array.isArray(obj.importance)
        ? obj.importance.filter((i: any) =>
            ["critical", "major", "minor"].includes(i)
          )
        : ["critical", "major", "minor"],
      eventTypes: Array.isArray(obj.eventTypes)
        ? obj.eventTypes.filter((t: any) =>
            ["intrinsic", "relationship", "milestone", "ongoing"].includes(t)
          )
        : ["intrinsic", "relationship", "milestone", "ongoing"],
      tags: Array.isArray(obj.tags)
        ? obj.tags.filter((t: any) => typeof t === "string")
        : [],
      sentiments: Array.isArray(obj.sentiments)
        ? obj.sentiments.filter((s: any) =>
            ["hostile", "supportive", "neutral"].includes(s)
          )
        : ["hostile", "supportive", "neutral"],
      metrics: Array.isArray(obj.metrics)
        ? obj.metrics.filter((m: any) => typeof m === "string")
        : [],
    };
  }
  return null;
};

const validateChartConfiguration = (obj: any): ChartConfiguration | null => {
  if (typeof obj === "object" && obj !== null) {
    const validTypes = [
      "timeline",
      "bar",
      "line",
      "pie",
      "scatter",
      "network",
      "heatmap",
    ];
    const validDataSources = [
      "timeline",
      "speechActs",
      "relationships",
      "biographical",
      "activity",
      "metrics",
    ];
    const validAggregations = ["none", "daily", "weekly", "monthly", "yearly"];
    const validViewModes = [
      "comparison",
      "merged",
      "side-by-side",
      "tracks",
      "overlay",
    ];

    return {
      type: validTypes.includes(obj.type) ? obj.type : "timeline",
      dataSource: validDataSources.includes(obj.dataSource)
        ? obj.dataSource
        : "timeline",
      aggregation: validAggregations.includes(obj.aggregation)
        ? obj.aggregation
        : "none",
      viewMode: validViewModes.includes(obj.viewMode) ? obj.viewMode : "tracks",
    };
  }
  return null;
};

const validateEntityUid = (uid: string): boolean => {
  return /^[a-z_]+:[a-zA-Z0-9_\-]+$/.test(uid);
};

// ==================== nuqs Parsers ====================

const parseEntities = parseAsArrayOf(parseAsString, ",")
  .withDefault([])
  .withOptions({
    shallow: false,
    clearOnDefault: false,
  });

const parseTimeWindow = parseAsJson<TimeWindow>(validateTimeWindow).withDefault(
  {
    from: new Date(Date.now() - 30 * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  }
);

const parseFilters = parseAsJson<AnalyticsFilters>(
  validateAnalyticsFilters
).withDefault({
  categories: [],
  importance: ["critical", "major", "minor"],
  eventTypes: ["intrinsic", "relationship", "milestone", "ongoing"],
  tags: [],
  sentiments: ["hostile", "supportive", "neutral"],
  metrics: [],
});

const parseChartConfig = parseAsJson<ChartConfiguration>(
  validateChartConfiguration
).withDefault({
  type: "timeline",
  dataSource: "timeline",
  aggregation: "none",
  viewMode: "comparison",
});

// ==================== Hook Implementation ====================

export function useAnalyticsPageState() {
  // Individual query state hooks
  const [entities, setEntities] = useQueryState("entities", parseEntities);
  const [timeWindow, setTimeWindow] = useQueryState(
    "timeWindow",
    parseTimeWindow
  );
  const [filters, setFilters] = useQueryState("filters", parseFilters);
  const [chartConfig, setChartConfig] = useQueryState(
    "chartConfig",
    parseChartConfig
  );

  // Backward compatibility: handle legacy timeline parameters
  const [legacyViewMode] = useQueryState(
    "viewMode",
    parseAsString.withDefault("")
  );
  const [legacyFilters] = useQueryState(
    "timelineFilters",
    parseAsJson((value: unknown) => value).withDefault({})
  );

  // Apply legacy compatibility
  if (legacyViewMode && !chartConfig.viewMode) {
    setChartConfig((prev) => ({
      ...prev,
      viewMode: (legacyViewMode as any) || "comparison",
    }));
  }

  if (
    legacyFilters &&
    Object.keys(filters).every((key) =>
      Array.isArray((filters as any)[key])
        ? (filters as any)[key].length === 0
        : !Boolean((filters as any)[key])
    )
  ) {
    setFilters((prev) => ({
      ...prev,
      ...legacyFilters,
    }));
  }

  // Batch state management for complex updates
  const [_batchState, setBatchState] = useQueryStates({
    entities: parseEntities,
    timeWindow: parseTimeWindow,
    filters: parseFilters,
    chartConfig: parseChartConfig,
  });

  // Entity management helpers
  const addEntity = useCallback(
    (entityUid: string) => {
      if (!validateEntityUid(entityUid)) {
        console.warn(`Invalid entity UID format: ${entityUid}`);
        return;
      }

      if (!entities.includes(entityUid) && entities.length < 5) {
        setEntities([...entities, entityUid]);
      }
    },
    [entities, setEntities]
  );

  const removeEntity = useCallback(
    (entityUid: string) => {
      setEntities(entities.filter((uid) => uid !== entityUid));
    },
    [entities, setEntities]
  );

  const replaceEntity = useCallback(
    (oldUid: string, newUid: string) => {
      if (!validateEntityUid(newUid)) {
        console.warn(`Invalid entity UID format: ${newUid}`);
        return;
      }

      setEntities(entities.map((uid) => (uid === oldUid ? newUid : uid)));
    },
    [entities, setEntities]
  );

  const clearEntities = useCallback(() => {
    setEntities([]);
  }, [setEntities]);

  // Filter management helpers
  const updateFilters = useCallback(
    (filterUpdates: Partial<AnalyticsFilters>) => {
      setFilters((prev) => ({ ...prev, ...filterUpdates }));
    },
    [setFilters]
  );

  const resetFilters = useCallback(() => {
    setFilters(parseFilters.defaultValue);
  }, [setFilters]);

  // Time window management
  const updateTimeWindow = useCallback(
    (updates: Partial<TimeWindow>) => {
      setTimeWindow((prev) => {
        const newWindow = { ...prev, ...updates };

        const fromDate = new Date(newWindow.from);
        const toDate = new Date(newWindow.to);

        if (fromDate > toDate) {
          console.warn("Invalid time window: from date must be <= to date");
          return prev;
        }

        return newWindow;
      });
    },
    [setTimeWindow]
  );

  // Chart configuration management
  const updateChartConfig = useCallback(
    (configUpdates: Partial<ChartConfiguration>) => {
      setChartConfig((prev) => ({ ...prev, ...configUpdates }));
    },
    [setChartConfig]
  );

  // Reset to default state
  const resetState = useCallback(() => {
    setBatchState({
      entities: [],
      timeWindow: parseTimeWindow.defaultValue,
      filters: parseFilters.defaultValue,
      chartConfig: parseChartConfig.defaultValue,
    });
  }, [setBatchState]);

  // URL generation for sharing
  const generateShareableUrl = useCallback(() => {
    const currentUrl = new URL(window.location.href);
    return currentUrl.toString();
  }, []);

  return {
    // State
    entities,
    timeWindow,
    filters,
    chartConfig,

    // Setters
    setEntities,
    setTimeWindow,
    setFilters,
    setChartConfig,
    setBatchState,

    // Helper methods
    addEntity,
    removeEntity,
    replaceEntity,
    clearEntities,
    updateFilters,
    resetFilters,
    updateTimeWindow,
    updateChartConfig,
    resetState,
    generateShareableUrl,

    // Computed properties
    hasEntities: entities.length > 0,
    maxEntities: entities.length >= 5,
    isComparable: entities.length > 1,
    validEntities: entities.filter(validateEntityUid),

    // State validation
    isStateValid: entities.every(validateEntityUid) && entities.length <= 5,
  };
}
