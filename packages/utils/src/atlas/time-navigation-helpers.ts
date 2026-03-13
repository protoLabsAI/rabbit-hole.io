/**
 * Time Navigation Helpers - Atlas Utilities
 *
 * Utilities for handling time-based navigation, pagination, and aggregation
 * in time slice views. Supports large-scale event datasets with performance optimization.
 */

export interface TimeWindow {
  from: string; // ISO date string (YYYY-MM-DD)
  to: string; // ISO date string (YYYY-MM-DD)
}

export interface PaginationCursor {
  timestamp: string;
  eventId: string;
}

export interface TimeSlicePage {
  cursor?: string;
  pageSize: number;
  hasMore: boolean;
  totalCount?: number;
}

export interface TimeAggregationBin {
  timestamp: string;
  count: number;
  hostileCount: number;
  supportiveCount: number;
  neutralCount: number;
}

export interface TimeAggregation {
  granularity: "hour" | "day" | "week" | "month";
  bins: TimeAggregationBin[];
  totalEvents: number;
}

export type TimeGranularity = "hour" | "day" | "week" | "month";

/**
 * Create optimized time windows for different zoom levels
 */
export function createTimeWindow(
  centerDate: Date,
  zoomLevel: "day" | "week" | "month" | "quarter" | "year"
): TimeWindow {
  const center = new Date(centerDate);

  switch (zoomLevel) {
    case "day": {
      const dayStart = new Date(center);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(center);
      dayEnd.setUTCHours(23, 59, 59, 999); // End of same day for inclusive range
      return {
        from: dayStart.toISOString().split("T")[0],
        to: dayEnd.toISOString().split("T")[0],
      };
    }

    case "week": {
      const weekCenter = new Date(center);
      const startOfWeek = new Date(weekCenter);
      startOfWeek.setDate(weekCenter.getDate() - weekCenter.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return {
        from: startOfWeek.toISOString().split("T")[0],
        to: endOfWeek.toISOString().split("T")[0],
      };
    }

    case "month": {
      const startOfMonth = new Date(center.getFullYear(), center.getMonth(), 1);
      const endOfMonth = new Date(
        center.getFullYear(),
        center.getMonth() + 1,
        0
      );

      return {
        from: startOfMonth.toISOString().split("T")[0],
        to: endOfMonth.toISOString().split("T")[0],
      };
    }

    case "quarter": {
      const quarter = Math.floor(center.getMonth() / 3);
      const startOfQuarter = new Date(center.getFullYear(), quarter * 3, 1);
      const endOfQuarter = new Date(center.getFullYear(), quarter * 3 + 3, 0);

      return {
        from: startOfQuarter.toISOString().split("T")[0],
        to: endOfQuarter.toISOString().split("T")[0],
      };
    }

    case "year": {
      const startOfYear = new Date(center.getFullYear(), 0, 1);
      const endOfYear = new Date(center.getFullYear(), 11, 31);

      return {
        from: startOfYear.toISOString().split("T")[0],
        to: endOfYear.toISOString().split("T")[0],
      };
    }

    default: {
      // Exhaustive checking - ensures all zoomLevel values are handled
      const _exhaustiveCheck: never = zoomLevel;
      return {
        from: center.toISOString().split("T")[0],
        to: center.toISOString().split("T")[0],
      };
    }
  }
}

/**
 * Calculate optimal page size based on time window duration
 */
export function calculateOptimalPageSize(timeWindow: TimeWindow): number {
  const fromDate = new Date(timeWindow.from);
  const toDate = new Date(timeWindow.to);
  const durationDays = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Scale page size based on duration - ensure integers
  if (durationDays <= 1) return Math.floor(500); // Single day
  if (durationDays <= 7) return Math.floor(1000); // Week
  if (durationDays <= 30) return Math.floor(2000); // Month
  if (durationDays <= 90) return Math.floor(3000); // Quarter
  return Math.floor(5000); // Year or larger
}

/**
 * Determine optimal aggregation granularity based on time window
 */
export function getOptimalGranularity(timeWindow: TimeWindow): TimeGranularity {
  const fromDate = new Date(timeWindow.from);
  const toDate = new Date(timeWindow.to);
  const durationDays = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (durationDays <= 2) return "hour"; // 1-2 days: hourly bins
  if (durationDays <= 60) return "day"; // 2 months: daily bins
  if (durationDays <= 365) return "week"; // 1 year: weekly bins
  return "month"; // > 1 year: monthly bins
}

/**
 * Build API URL for enhanced time slice requests
 */
export function buildTimeSliceUrl(
  baseUrl: string,
  params: {
    timeWindow: TimeWindow;
    entityUid?: string;
    cursor?: string;
    pageSize?: number;
    aggregate?: boolean;
    granularity?: TimeGranularity;
    sentiments?: string[];
    entityTypes?: string[];
    minActivity?: number;
  }
): string {
  const url = new URL(`${baseUrl}/api/graph-tiles/timeslice-enhanced`);

  // Time window
  url.searchParams.set("from", params.timeWindow.from);
  url.searchParams.set("to", params.timeWindow.to);

  // Pagination
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (params.pageSize)
    url.searchParams.set("pageSize", params.pageSize.toString());

  // Aggregation
  if (params.aggregate) url.searchParams.set("aggregate", "true");
  if (params.granularity)
    url.searchParams.set("granularity", params.granularity);

  // Entity focus
  if (params.entityUid) url.searchParams.set("entityUid", params.entityUid);

  // Filtering
  if (params.sentiments?.length)
    url.searchParams.set("sentiments", params.sentiments.join(","));
  if (params.entityTypes?.length)
    url.searchParams.set("types", params.entityTypes.join(","));
  if (params.minActivity)
    url.searchParams.set("minActivity", params.minActivity.toString());

  return url.toString();
}

/**
 * Parse pagination cursor into components
 */
export function parseCursor(cursor: string): PaginationCursor | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("ascii");
    const [timestamp, eventId] = decoded.split("_");
    if (!timestamp || !eventId) return null;
    return { timestamp, eventId };
  } catch {
    return null;
  }
}

/**
 * Create pagination cursor from timestamp and event ID
 */
export function createCursor(timestamp: string, eventId: string): string {
  const cursorData = `${timestamp}_${eventId}`;
  return Buffer.from(cursorData).toString("base64");
}

/**
 * Calculate time navigation statistics
 */
export function calculateTimeStats(aggregation: TimeAggregation): {
  peakActivity: { timestamp: string; count: number };
  averageActivity: number;
  hostilePercentage: number;
  supportivePercentage: number;
  activityTrend: "increasing" | "decreasing" | "stable";
} {
  const { bins } = aggregation;

  if (bins.length === 0) {
    return {
      peakActivity: { timestamp: "", count: 0 },
      averageActivity: 0,
      hostilePercentage: 0,
      supportivePercentage: 0,
      activityTrend: "stable",
    };
  }

  // Find peak activity
  const peakBin = bins.reduce((max, bin) =>
    bin.count > max.count ? bin : max
  );

  // Calculate averages
  const totalEvents = bins.reduce((sum, bin) => sum + bin.count, 0);
  const averageActivity = totalEvents / bins.length;

  const totalHostile = bins.reduce((sum, bin) => sum + bin.hostileCount, 0);
  const totalSupportive = bins.reduce(
    (sum, bin) => sum + bin.supportiveCount,
    0
  );

  const hostilePercentage =
    totalEvents > 0 ? (totalHostile / totalEvents) * 100 : 0;
  const supportivePercentage =
    totalEvents > 0 ? (totalSupportive / totalEvents) * 100 : 0;

  // Calculate trend (compare first and last quarters)
  const quarterSize = Math.floor(bins.length / 4);
  const firstQuarter = bins.slice(0, quarterSize);
  const lastQuarter = bins.slice(-quarterSize);

  const firstQuarterAvg =
    firstQuarter.reduce((sum, bin) => sum + bin.count, 0) / firstQuarter.length;
  const lastQuarterAvg =
    lastQuarter.reduce((sum, bin) => sum + bin.count, 0) / lastQuarter.length;

  const trendThreshold = averageActivity * 0.1; // 10% threshold
  let activityTrend: "increasing" | "decreasing" | "stable";

  if (lastQuarterAvg - firstQuarterAvg > trendThreshold) {
    activityTrend = "increasing";
  } else if (firstQuarterAvg - lastQuarterAvg > trendThreshold) {
    activityTrend = "decreasing";
  } else {
    activityTrend = "stable";
  }

  return {
    peakActivity: { timestamp: peakBin.timestamp, count: peakBin.count },
    averageActivity,
    hostilePercentage,
    supportivePercentage,
    activityTrend,
  };
}

/**
 * Create time navigation presets for common use cases
 */
export function getTimePresets(): Array<{
  label: string;
  timeWindow: TimeWindow;
  description: string;
}> {
  const now = new Date();

  return [
    {
      label: "Today",
      timeWindow: createTimeWindow(now, "day"),
      description: "Activity from today",
    },
    {
      label: "This Week",
      timeWindow: createTimeWindow(now, "week"),
      description: "Activity from this week",
    },
    {
      label: "This Month",
      timeWindow: createTimeWindow(now, "month"),
      description: "Activity from this month",
    },
    {
      label: "This Quarter",
      timeWindow: createTimeWindow(now, "quarter"),
      description: "Activity from this quarter",
    },
    {
      label: "This Year",
      timeWindow: createTimeWindow(now, "year"),
      description: "Activity from this year",
    },
    {
      label: "Last 7 Days",
      timeWindow: {
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        to: now.toISOString().split("T")[0],
      },
      description: "Rolling 7-day window",
    },
    {
      label: "Last 30 Days",
      timeWindow: {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        to: now.toISOString().split("T")[0],
      },
      description: "Rolling 30-day window",
    },
    {
      label: "Last 90 Days",
      timeWindow: {
        from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        to: now.toISOString().split("T")[0],
      },
      description: "Rolling 90-day window",
    },
  ];
}

/**
 * Validate time window parameters
 */
export function validateTimeWindow(timeWindow: TimeWindow): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(timeWindow.from)) {
    errors.push("Invalid 'from' date format. Expected YYYY-MM-DD");
  }
  if (!dateRegex.test(timeWindow.to)) {
    errors.push("Invalid 'to' date format. Expected YYYY-MM-DD");
  }

  // Check date validity
  const fromDate = new Date(timeWindow.from);
  const toDate = new Date(timeWindow.to);

  if (isNaN(fromDate.getTime())) {
    errors.push("Invalid 'from' date value");
  }
  if (isNaN(toDate.getTime())) {
    errors.push("Invalid 'to' date value");
  }

  // Check logical constraints (allow same-day ranges for inclusive single-day windows)
  if (fromDate > toDate) {
    errors.push("'from' date must be before or equal to 'to' date");
  }

  // Check reasonable limits
  const durationDays =
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  if (durationDays > 2 * 365) {
    // 2 years max
    errors.push("Time window too large. Maximum 2 years supported");
  }

  // Allow same-day ranges (durationDays === 0) for inclusive single-day windows
  if (durationDays < 0) {
    errors.push("Invalid time window duration");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format time duration for display
 */
export function formatDuration(timeWindow: TimeWindow): string {
  const fromDate = new Date(timeWindow.from);
  const toDate = new Date(timeWindow.to);
  const durationMs = toDate.getTime() - fromDate.getTime();

  const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  // Handle same-day inclusive ranges (from == to)
  if (days === 0) {
    if (hours === 0 && timeWindow.from === timeWindow.to) {
      return "1 day"; // Same-day inclusive range
    }
    return hours <= 1 ? "1 hour" : `${hours} hours`;
  } else if (days === 1) {
    return "1 day";
  } else if (days < 7) {
    return `${days} days`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  } else {
    const years = Math.floor(days / 365);
    return years === 1 ? "1 year" : `${years} years`;
  }
}

/**
 * Get suggested page size based on performance characteristics
 */
export function getSuggestedPageSize(
  timeWindow: TimeWindow,
  entityCount?: number
): {
  pageSize: number;
  reasoning: string;
} {
  const durationDays = Math.ceil(
    (new Date(timeWindow.to).getTime() - new Date(timeWindow.from).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  let pageSize: number;
  let reasoning: string;

  if (durationDays <= 1) {
    pageSize = 1000;
    reasoning = "Single day - moderate page size for responsive UI";
  } else if (durationDays <= 7) {
    pageSize = 2000;
    reasoning = "Week view - larger pages for efficient loading";
  } else if (durationDays <= 30) {
    pageSize = 3000;
    reasoning = "Month view - larger pages to reduce API calls";
  } else {
    pageSize = 5000;
    reasoning = "Extended period - maximum page size for throughput";
  }

  // Adjust for entity count if provided
  if (entityCount && entityCount > 10000) {
    pageSize = Math.max(1000, Math.floor(pageSize / 2));
    reasoning += " (reduced for large entity count)";
  }

  return { pageSize: Math.floor(pageSize), reasoning };
}
