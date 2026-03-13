/**
 * Compact Timeline Utilities
 *
 * Data aggregation and processing utilities for compact timeline visualization
 * in entity detail cards. Converts timeline events into aggregated periods
 * for lower-fidelity but performant visualization.
 */

import type {
  TimelineEvent,
  CompactTimelinePeriod,
  CompactTimelineData,
  CompactTimelineSummary,
  Granularity,
} from "@proto/types";

/**
 * Get the start of a time period based on granularity
 */
function getPeriodStart(date: Date, granularity: Granularity): Date {
  const result = new Date(date);

  switch (granularity) {
    case "day":
      result.setHours(0, 0, 0, 0);
      return result;

    case "week": {
      // Start of week (Sunday)
      const dayOfWeek = result.getDay();
      result.setDate(result.getDate() - dayOfWeek);
      result.setHours(0, 0, 0, 0);
      return result;
    }

    case "month":
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
      return result;

    default:
      return result;
  }
}

/**
 * Get the end of a time period based on granularity
 */
function getPeriodEnd(date: Date, granularity: Granularity): Date {
  const result = new Date(date);

  switch (granularity) {
    case "day":
      result.setHours(23, 59, 59, 999);
      return result;

    case "week": {
      // End of week (Saturday)
      const dayOfWeek = result.getDay();
      result.setDate(result.getDate() + (6 - dayOfWeek));
      result.setHours(23, 59, 59, 999);
      return result;
    }

    case "month":
      result.setMonth(result.getMonth() + 1, 0); // Last day of month
      result.setHours(23, 59, 59, 999);
      return result;

    default:
      return result;
  }
}

/**
 * Generate time periods for the given date range and granularity
 */
function generateTimePeriods(
  startDate: Date,
  endDate: Date,
  granularity: Granularity
): Array<{ start: Date; end: Date }> {
  const periods: Array<{ start: Date; end: Date }> = [];
  let current = getPeriodStart(startDate, granularity);

  while (current <= endDate) {
    const periodStart = new Date(current);
    const periodEnd = getPeriodEnd(current, granularity);

    periods.push({
      start: periodStart,
      end: periodEnd,
    });

    // Move to next period
    switch (granularity) {
      case "day":
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "week":
        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "month": {
        const nextMonth = new Date(current);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        current = nextMonth;
        break;
      }
    }
  }

  return periods;
}

/**
 * Aggregate timeline events into compact periods
 */
export function aggregateTimelineEvents(
  events: TimelineEvent[],
  granularity: Granularity = "week",
  dateRange?: { from: string; to: string }
): CompactTimelinePeriod[] {
  if (events.length === 0) {
    return [];
  }

  // Sort events by timestamp
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Determine actual date range
  const startDate = dateRange?.from
    ? new Date(dateRange.from)
    : new Date(sortedEvents[0].timestamp);

  const endDate = dateRange?.to
    ? new Date(dateRange.to)
    : new Date(sortedEvents[sortedEvents.length - 1].timestamp);

  // Generate time periods
  const timePeriods = generateTimePeriods(startDate, endDate, granularity);

  // Initialize period data
  const periods: CompactTimelinePeriod[] = timePeriods.map((period) => ({
    timestamp: period.start.toISOString(),
    endTimestamp: period.end.toISOString(),
    eventCount: 0,
    importanceCounts: { critical: 0, major: 0, minor: 0 },
    eventTypes: { relationship: 0, intrinsic: 0, milestone: 0, ongoing: 0 },
    peakImportance: "minor" as const,
  }));

  // Aggregate events into periods
  for (const event of sortedEvents) {
    const eventDate = new Date(event.timestamp);

    // Find the period this event belongs to
    const periodIndex = periods.findIndex((period) => {
      const periodStart = new Date(period.timestamp);
      const periodEnd = new Date(period.endTimestamp);
      return eventDate >= periodStart && eventDate <= periodEnd;
    });

    if (periodIndex !== -1) {
      const period = periods[periodIndex];
      period.eventCount++;
      period.importanceCounts[event.importance]++;
      period.eventTypes[event.eventType]++;

      // Update peak importance (critical > major > minor)
      if (
        event.importance === "critical" ||
        (event.importance === "major" && period.peakImportance === "minor")
      ) {
        period.peakImportance = event.importance;
      }
    }
  }

  return periods.filter((period) => period.eventCount > 0);
}

/**
 * Calculate timeline summary statistics
 */
export function calculateCompactTimelineSummary(
  periods: CompactTimelinePeriod[],
  allEvents: TimelineEvent[]
): CompactTimelineSummary {
  if (periods.length === 0 || allEvents.length === 0) {
    return {
      totalEvents: 0,
      peakActivity: { timestamp: "", count: 0 },
      activitySpan: { earliest: "", latest: "" },
      dominantImportance: "minor",
      dominantEventType: "intrinsic",
    };
  }

  // Find peak activity period
  const peakPeriod = periods.reduce((max, current) =>
    current.eventCount > max.eventCount ? current : max
  );

  // Calculate activity span
  const sortedPeriods = [...periods].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate dominant importance and event type
  const importanceCounts = { critical: 0, major: 0, minor: 0 };
  const eventTypeCounts = {
    relationship: 0,
    intrinsic: 0,
    milestone: 0,
    ongoing: 0,
  };

  for (const event of allEvents) {
    importanceCounts[event.importance]++;
    eventTypeCounts[event.eventType]++;
  }

  const dominantImportance = (
    Object.entries(importanceCounts) as Array<
      [keyof typeof importanceCounts, number]
    >
  ).reduce(
    (max, [importance, count]) =>
      count > importanceCounts[max] ? importance : max,
    "critical" as keyof typeof importanceCounts
  );

  const dominantEventType = (
    Object.entries(eventTypeCounts) as Array<
      [keyof typeof eventTypeCounts, number]
    >
  ).reduce(
    (max, [eventType, count]) =>
      count > eventTypeCounts[max] ? eventType : max,
    "relationship" as keyof typeof eventTypeCounts
  );

  return {
    totalEvents: allEvents.length,
    peakActivity: {
      timestamp: peakPeriod.timestamp,
      count: peakPeriod.eventCount,
    },
    activitySpan: {
      earliest: sortedPeriods[0].timestamp,
      latest: sortedPeriods[sortedPeriods.length - 1].timestamp,
    },
    dominantImportance,
    dominantEventType,
  };
}

/**
 * Create compact timeline data from raw timeline events
 */
export function createCompactTimelineData(
  entityUid: string,
  events: TimelineEvent[],
  granularity: Granularity = "week",
  dateRange?: { from: string; to: string }
): CompactTimelineData {
  const periods = aggregateTimelineEvents(events, granularity, dateRange);
  const summary = calculateCompactTimelineSummary(periods, events);

  // Determine final time range
  const finalTimeRange = dateRange || {
    from: summary.activitySpan.earliest,
    to: summary.activitySpan.latest,
  };

  return {
    entityUid,
    timeRange: finalTimeRange,
    granularity,
    periods,
    summary,
  };
}
