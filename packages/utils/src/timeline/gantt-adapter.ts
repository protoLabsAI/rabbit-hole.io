/**
 * Timeline Event to Gantt Chart Adapter
 *
 * Transforms TimelineEvent data to shadcn Gantt chart format while preserving
 * all metadata for event interactions, ego graph navigation, and evidence display.
 */

import type { TimelineEvent } from "../atlas/entity-timeline";

// Re-exported types for use in this adapter
export type GanttStatus = {
  id: string;
  name: string;
  color: string;
};

export type GanttFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: GanttStatus;
  lane?: string;
};

export type GroupByStrategy = "category" | "entity" | "importance";

export interface GanttAdapterOptions {
  groupBy?: GroupByStrategy;
  maxEvents?: number;
  timeWindow?: {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
  };
}

export interface EnrichedGanttFeature extends GanttFeature {
  // Preserve original event data for click handlers
  metadata: {
    event: TimelineEvent;
    entityUid?: string; // For ego graph navigation
    evidenceCount: number;
  };
}

// Importance to color mapping using semantic theme colors
const IMPORTANCE_COLORS: Record<
  TimelineEvent["importance"],
  { color: string; bgClass: string; borderClass: string }
> = {
  critical: {
    color: "#dc2626", // error-600 - semantic error color
    bgClass: "bg-error-500",
    borderClass: "border-error-600",
  },
  major: {
    color: "#ea580c", // warning-600 - semantic warning color
    bgClass: "bg-warning-500",
    borderClass: "border-warning-600",
  },
  minor: {
    color: "#2563eb", // info-600 - semantic info color
    bgClass: "bg-info-500",
    borderClass: "border-info-600",
  },
};

/**
 * Create GanttStatus from TimelineEvent importance
 */
function createStatusFromImportance(
  importance: TimelineEvent["importance"]
): GanttStatus {
  const config = IMPORTANCE_COLORS[importance];
  return {
    id: importance,
    name: importance.charAt(0).toUpperCase() + importance.slice(1),
    color: config.color,
  };
}

/**
 * Determine lane/row grouping based on strategy
 */
function getLane(event: TimelineEvent, strategy: GroupByStrategy): string {
  switch (strategy) {
    case "category":
      return event.category || "uncategorized";
    case "entity":
      return event.targetEntity?.uid || "no-entity";
    case "importance":
      return event.importance;
    default:
      return event.category || "uncategorized";
  }
}

/**
 * Get display name for lane group
 */
export function getLaneDisplayName(
  lane: string,
  strategy: GroupByStrategy,
  events: TimelineEvent[]
): string {
  switch (strategy) {
    case "category": {
      const formatted = lane
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return formatted;
    }
    case "entity": {
      if (lane === "no-entity") return "Intrinsic Events";
      const event = events.find((e) => e.targetEntity?.uid === lane);
      return event?.targetEntity?.name || lane;
    }
    case "importance": {
      return lane.charAt(0).toUpperCase() + lane.slice(1);
    }
    default:
      return lane;
  }
}

/**
 * Transform TimelineEvent to EnrichedGanttFeature
 */
function transformEvent(
  event: TimelineEvent,
  groupBy: GroupByStrategy
): EnrichedGanttFeature {
  const startAt = new Date(event.timestamp);
  let endAt: Date;

  if (event.endDate) {
    endAt = new Date(event.endDate);
  } else {
    // For point events (no endDate), show as 1-day bar
    endAt = new Date(startAt);
    endAt.setDate(endAt.getDate() + 1);
  }

  return {
    id: event.id,
    name: event.title,
    startAt,
    endAt,
    status: createStatusFromImportance(event.importance),
    lane: getLane(event, groupBy),
    metadata: {
      event,
      entityUid: event.targetEntity?.uid,
      evidenceCount: event.evidence?.length || 0,
    },
  };
}

/**
 * Filter events by time window
 */
function filterByTimeWindow(
  events: TimelineEvent[],
  timeWindow?: { from: string; to: string }
): TimelineEvent[] {
  if (!timeWindow) return events;

  const from = new Date(timeWindow.from + "T00:00:00Z");
  const to = new Date(timeWindow.to + "T23:59:59Z");

  return events.filter((event) => {
    const eventDate = new Date(event.timestamp);
    const eventEndDate = event.endDate ? new Date(event.endDate) : eventDate;

    // Include if event overlaps with time window
    return eventDate <= to && eventEndDate >= from;
  });
}

/**
 * Sort events by timestamp (earliest first)
 */
function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Main adapter function: Transform TimelineEvent[] to EnrichedGanttFeature[]
 */
export function transformTimelineToGantt(
  events: TimelineEvent[],
  options: GanttAdapterOptions = {}
): EnrichedGanttFeature[] {
  const { groupBy = "category", maxEvents = 50, timeWindow } = options;

  // 1. Use provided timeWindow or calculate auto window with 1 month buffer
  const effectiveTimeWindow = timeWindow || calculateAutoTimeWindow(events, 1);

  // 2. Filter by time window
  let filteredEvents = filterByTimeWindow(
    events,
    effectiveTimeWindow || undefined
  );

  // 3. Sort by timestamp
  filteredEvents = sortEvents(filteredEvents);

  // 4. Apply max events limit
  const limitedEvents = filteredEvents.slice(0, maxEvents);

  // 5. Transform to Gantt features
  return limitedEvents.map((event) => transformEvent(event, groupBy));
}

/**
 * Group features by lane for sidebar rendering
 */
export function groupFeaturesByLane(
  features: EnrichedGanttFeature[]
): Map<string, EnrichedGanttFeature[]> {
  const grouped = new Map<string, EnrichedGanttFeature[]>();

  for (const feature of features) {
    const lane = feature.lane || "default";
    if (!grouped.has(lane)) {
      grouped.set(lane, []);
    }
    grouped.get(lane)!.push(feature);
  }

  return grouped;
}

/**
 * Get importance color classes for styling
 */
export function getImportanceClasses(importance: TimelineEvent["importance"]): {
  color: string;
  bgClass: string;
  borderClass: string;
} {
  return IMPORTANCE_COLORS[importance];
}

/**
 * Calculate automatic time window with buffer before/after events
 */
export function calculateAutoTimeWindow(
  events: TimelineEvent[],
  bufferMonths: number = 1
): { from: string; to: string } | null {
  if (events.length === 0) return null;

  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const event of events) {
    const eventDate = new Date(event.timestamp);
    const eventEndDate = event.endDate ? new Date(event.endDate) : eventDate;

    if (!earliest || eventDate < earliest) {
      earliest = eventDate;
    }
    if (!latest || eventEndDate > latest) {
      latest = eventEndDate;
    }
  }

  if (!earliest || !latest) return null;

  // Add buffer before earliest
  const bufferedStart = new Date(earliest);
  bufferedStart.setMonth(bufferedStart.getMonth() - bufferMonths);

  // Add buffer after latest
  const bufferedEnd = new Date(latest);
  bufferedEnd.setMonth(bufferedEnd.getMonth() + bufferMonths);

  return {
    from: bufferedStart.toISOString().split("T")[0],
    to: bufferedEnd.toISOString().split("T")[0],
  };
}

/**
 * Calculate summary statistics for a group of events
 */
export interface TimelineSummary {
  totalEvents: number;
  byImportance: Record<string, number>;
  byCategory: Record<string, number>;
  dateRange: { earliest: string; latest: string } | null;
}

export function calculateSummary(events: TimelineEvent[]): TimelineSummary {
  const byImportance: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const event of events) {
    // Count by importance
    byImportance[event.importance] = (byImportance[event.importance] || 0) + 1;

    // Count by category
    byCategory[event.category] = (byCategory[event.category] || 0) + 1;

    // Track date range
    const eventDate = new Date(event.timestamp);
    if (!earliest || eventDate < earliest) {
      earliest = eventDate;
    }
    if (!latest || eventDate > latest) {
      latest = eventDate;
    }
  }

  return {
    totalEvents: events.length,
    byImportance,
    byCategory,
    dateRange:
      earliest && latest
        ? {
            earliest: earliest.toISOString().split("T")[0],
            latest: latest.toISOString().split("T")[0],
          }
        : null,
  };
}
