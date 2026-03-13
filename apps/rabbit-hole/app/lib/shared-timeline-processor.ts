/**
 * Shared Timeline Processing Logic
 *
 * Centralized timeline processing that both individual and batch APIs use.
 * Ensures consistent parameter handling, validation, and data transformation.
 */

import { getGlobalNeo4jClient } from "@proto/database";
import { createNeo4jClientWithIntegerConversion } from "@proto/utils";
import {
  fetchEntityTimeline,
  validateTimelineFilters,
  type TimelineFilters,
} from "@proto/utils/atlas";

// ==================== Types ====================

export interface TimelineRequest {
  entityUid: string;
  timeWindow?: { from: string; to: string };
  importance?: string[];
  limit?: number;
}

export interface TimelineResponse {
  entityUid: string;
  events: any[];
  summary: any;
  error: string | null;
}

export interface ProcessTimelineOptions {
  maxLimit?: number;
  defaultLimit?: number;
  validateDates?: boolean;
}

// ==================== Validation Functions ====================

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(dateString: string): boolean {
  if (!ISO_DATE_REGEX.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function validateTimeWindow(timeWindow?: {
  from: string;
  to: string;
}): string[] {
  const errors: string[] = [];

  if (!timeWindow) {
    return errors; // Optional parameter
  }

  if (!timeWindow.from || !validateDate(timeWindow.from)) {
    errors.push("Invalid 'from' date - must be YYYY-MM-DD format");
  }

  if (!timeWindow.to || !validateDate(timeWindow.to)) {
    errors.push("Invalid 'to' date - must be YYYY-MM-DD format");
  }

  if (errors.length === 0) {
    const fromDate = new Date(timeWindow.from);
    const toDate = new Date(timeWindow.to);

    if (fromDate > toDate) {
      errors.push("'from' date must be before or equal to 'to' date");
    }
  }

  return errors;
}

function validateEntityUid(entityUid: string): boolean {
  return /^[a-z_]+:[a-zA-Z0-9_\-]+$/.test(entityUid);
}

// ==================== Core Processing Function ====================

export async function processTimelineRequest(
  request: TimelineRequest,
  options: ProcessTimelineOptions = {}
): Promise<TimelineResponse> {
  const { maxLimit = 1000, defaultLimit = 100, validateDates = true } = options;

  // Validate entity UID
  if (!validateEntityUid(request.entityUid)) {
    return {
      entityUid: request.entityUid,
      events: [],
      summary: null,
      error: `Invalid entity UID format: ${request.entityUid}`,
    };
  }

  // Validate time window if provided
  if (validateDates) {
    const dateErrors = validateTimeWindow(request.timeWindow);
    if (dateErrors.length > 0) {
      return {
        entityUid: request.entityUid,
        events: [],
        summary: null,
        error: `Date validation failed: ${dateErrors.join(", ")}`,
      };
    }
  }

  // Validate and normalize limit
  const limit = Math.min(
    Math.max(Math.floor(request.limit || defaultLimit), 1),
    maxLimit
  );

  // Build timeline filters
  const filters: TimelineFilters = {
    dateRange: request.timeWindow
      ? {
          from: request.timeWindow.from,
          to: request.timeWindow.to,
        }
      : undefined,
    importance: (request.importance || ["critical", "major", "minor"]) as (
      | "critical"
      | "major"
      | "minor"
    )[],
    limit,
  };

  // Validate filters using existing utility
  const validation = validateTimelineFilters(filters);
  if (!validation.isValid) {
    return {
      entityUid: request.entityUid,
      events: [],
      summary: null,
      error: `Filter validation failed: ${validation.errors.join(", ")}`,
    };
  }

  try {
    // Use centralized Neo4j client with integer conversion
    const baseClient = getGlobalNeo4jClient();
    const clientWithIntegerConversion =
      createNeo4jClientWithIntegerConversion(baseClient);

    console.log(
      `🔍 Processing timeline for ${request.entityUid} with filters:`,
      {
        dateRange: filters.dateRange,
        importance: filters.importance,
        limit: filters.limit,
      }
    );

    const timeline = await fetchEntityTimeline(
      clientWithIntegerConversion,
      request.entityUid,
      filters
    );

    console.log(
      `✅ Timeline processed for ${request.entityUid}: ${timeline.events.length} events`
    );

    return {
      entityUid: request.entityUid,
      events: timeline.events,
      summary: {
        ...timeline.summary,
        entity: timeline.entity, // Include entity info in summary
      },
      error: null,
    };
  } catch (error) {
    console.error(
      `❌ Timeline processing failed for ${request.entityUid}:`,
      error
    );

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isNotFound = errorMessage.includes("not found");

    return {
      entityUid: request.entityUid,
      events: [],
      summary: null,
      error: errorMessage,
    };
  }
}

// ==================== Batch Processing Function ====================

export async function processBatchTimelineRequests(
  requests: TimelineRequest[],
  options: ProcessTimelineOptions = {}
): Promise<{
  results: TimelineResponse[];
  metadata: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
  };
}> {
  // Validate batch size
  if (requests.length > 20) {
    throw new Error("Too many requests - maximum 20 entities per batch");
  }

  if (requests.length === 0) {
    return {
      results: [],
      metadata: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
      },
    };
  }

  console.log(
    `📊 Processing batch timeline request for ${requests.length} entities`
  );

  // Process all requests in parallel using the same logic as individual API
  const results = await Promise.all(
    requests.map((request) => processTimelineRequest(request, options))
  );

  // Calculate metadata
  const successfulRequests = results.filter((r) => !r.error).length;
  const failedRequests = results.filter((r) => r.error).length;

  console.log(
    `✅ Batch processing complete: ${successfulRequests} success, ${failedRequests} failed`
  );

  return {
    results,
    metadata: {
      totalRequests: requests.length,
      successfulRequests,
      failedRequests,
    },
  };
}
