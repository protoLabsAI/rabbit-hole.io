/**
 * Timeline Page State Management Hook
 *
 * nuqs-powered URL state management for multi-entity timeline comparison page.
 * Handles entities, time windows, filters, and view modes with validation.
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

export interface TimelineFilters {
  categories: string[]; // Event categories to include
  importance: string[]; // critical, major, minor
  eventTypes: string[]; // intrinsic, relationship, milestone, ongoing
  tags: string[]; // Custom tag filtering
}

export interface TimelinePageState {
  entities: string[]; // ["person:trump", "person:biden", ...]
  timeWindow: TimeWindow;
  filters: TimelineFilters;
  viewMode: string; // "comparison" | "merged" | "side-by-side"
  granularity: string; // "day" | "week" | "month" for aggregation
  sortBy: string; // "chronological" | "importance" | "entity"
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
    // Validate that from <= to
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

const validateTimelineFilters = (obj: any): TimelineFilters | null => {
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
    };
  }
  return null;
};

const validateEntityUid = (uid: string): boolean => {
  // Validate entity UID format (e.g., "person:trump", "organization:meta")
  return /^[a-z_]+:[a-zA-Z0-9_\-]+$/.test(uid);
};

// ==================== nuqs Parsers ====================

const parseEntities = parseAsArrayOf(parseAsString, ",")
  .withDefault([])
  .withOptions({
    shallow: false, // Deep URL updates for sharing
    clearOnDefault: false, // Keep empty arrays in URL
  });

const parseTimeWindow = parseAsJson<TimeWindow>(validateTimeWindow).withDefault(
  {
    // Default to last 30 years to capture comprehensive historical timeline data
    from: new Date(Date.now() - 30 * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  }
);

const parseFilters = parseAsJson<TimelineFilters>(
  validateTimelineFilters
).withDefault({
  categories: [],
  importance: ["critical", "major", "minor"],
  eventTypes: ["intrinsic", "relationship", "milestone", "ongoing"],
  tags: [],
});

const parseViewMode = parseAsString.withDefault("comparison").withOptions({
  clearOnDefault: true,
});

const parseGranularity = parseAsString.withDefault("day").withOptions({
  clearOnDefault: true,
});

const parseSortBy = parseAsString.withDefault("chronological").withOptions({
  clearOnDefault: true,
});

// ==================== Hook Implementation ====================

export function useTimelinePageState() {
  // Individual query state hooks
  const [entities, setEntities] = useQueryState("entities", parseEntities);
  const [timeWindow, setTimeWindow] = useQueryState(
    "timeWindow",
    parseTimeWindow
  );
  const [filters, setFilters] = useQueryState("filters", parseFilters);
  const [viewMode, setViewMode] = useQueryState("viewMode", parseViewMode);
  const [granularity, setGranularity] = useQueryState(
    "granularity",
    parseGranularity
  );
  const [sortBy, setSortBy] = useQueryState("sortBy", parseSortBy);

  // Batch state management for complex updates
  const [_batchState, setBatchState] = useQueryStates({
    entities: parseEntities,
    timeWindow: parseTimeWindow,
    filters: parseFilters,
    viewMode: parseViewMode,
    granularity: parseGranularity,
    sortBy: parseSortBy,
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
    (filterUpdates: Partial<TimelineFilters>) => {
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

        // Validate date range
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

  // Reset to default state
  const resetState = useCallback(() => {
    setBatchState({
      entities: [],
      timeWindow: parseTimeWindow.defaultValue,
      filters: parseFilters.defaultValue,
      viewMode: "comparison",
      granularity: "day",
      sortBy: "chronological",
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
    viewMode,
    granularity,
    sortBy,

    // Setters
    setEntities,
    setTimeWindow,
    setFilters,
    setViewMode,
    setGranularity,
    setSortBy,
    setBatchState,

    // Helper methods
    addEntity,
    removeEntity,
    replaceEntity,
    clearEntities,
    updateFilters,
    resetFilters,
    updateTimeWindow,
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
