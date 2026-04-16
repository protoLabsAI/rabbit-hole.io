/**
 * Timeline Error Handler Utilities
 *
 * Centralized error handling and validation for timeline components using Zod schemas
 */

import {
  TimelineEventSchema,
  CompactTimelineDataSchema,
  TimelineFiltersSchema,
  type TimelineEvent,
  type CompactTimelineData,
  type TimelineFilters,
} from "@protolabsai/types";

export interface TimelineErrorInfo {
  hasError: boolean;
  errorType: "validation" | "processing" | "rendering" | "network";
  errorMessage: string;
  canRecover: boolean;
  suggestions: string[];
}

/**
 * Validate timeline events array using Zod schema
 */
export function validateTimelineEvents(events: unknown): {
  success: boolean;
  data: TimelineEvent[] | null;
  errors: string[];
} {
  if (!Array.isArray(events)) {
    return {
      success: false,
      data: null,
      errors: ["Expected array of timeline events"],
    };
  }

  const validEvents: TimelineEvent[] = [];
  const errors: string[] = [];

  events.forEach((event, index) => {
    const result = TimelineEventSchema.safeParse(event);
    if (result.success) {
      validEvents.push(result.data);
    } else {
      errors.push(`Event ${index}: ${result.error.message}`);
    }
  });

  return {
    success: errors.length === 0,
    data: validEvents.length > 0 ? validEvents : null,
    errors,
  };
}

/**
 * Validate compact timeline data structure using Zod schema
 */
export function validateCompactTimelineData(data: unknown): {
  success: boolean;
  data: CompactTimelineData | null;
  errors: string[];
} {
  const result = CompactTimelineDataSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: [],
    };
  }

  return {
    success: false,
    data: null,
    errors: [result.error.message],
  };
}

/**
 * Validate timeline filters using Zod schema with runtime type safety
 */
export function validateTimelineFiltersWithSchema(filters: unknown): {
  success: boolean;
  data: TimelineFilters | null;
  errors: string[];
} {
  const result = TimelineFiltersSchema.safeParse(filters);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: [],
    };
  }

  return {
    success: false,
    data: null,
    errors: [result.error.message],
  };
}

/**
 * Create timeline error info with recovery suggestions
 */
export function createTimelineError(
  errorType: TimelineErrorInfo["errorType"],
  message: string,
  canRecover = true,
  suggestions: string[] = []
): TimelineErrorInfo {
  const defaultSuggestions: Record<string, string[]> = {
    validation: [
      "Check that timeline data follows expected format",
      "Verify entity ID is valid",
      "Ensure event dates are ISO strings",
    ],
    processing: [
      "Try refreshing the timeline",
      "Check if entity has timeline data",
      "Verify date ranges are valid",
    ],
    rendering: [
      "Reduce timeline complexity",
      "Check browser console for errors",
      "Try switching granularity levels",
    ],
    network: [
      "Check internet connection",
      "Try refreshing the page",
      "Contact support if issue persists",
    ],
  };

  return {
    hasError: true,
    errorType,
    errorMessage: message,
    canRecover,
    suggestions:
      suggestions.length > 0 ? suggestions : defaultSuggestions[errorType],
  };
}

/**
 * Safe timeline data processing with error handling
 */
export async function safeTimelineProcess<T>(
  operation: () => Promise<T> | T,
  errorContext: string
): Promise<{ result: T | null; error: TimelineErrorInfo | null }> {
  try {
    const result = await operation();
    return { result, error: null };
  } catch (error) {
    const errorInfo = createTimelineError(
      "processing",
      `${errorContext}: ${error instanceof Error ? error.message : "Unknown error"}`,
      true,
      ["Check timeline data validity", "Try reloading the component"]
    );

    console.error(`Timeline processing error in ${errorContext}:`, error);
    return { result: null, error: errorInfo };
  }
}

/**
 * Create user-friendly error message for timeline failures
 */
export function getTimelineErrorMessage(error: TimelineErrorInfo): {
  title: string;
  description: string;
  actionText?: string;
} {
  switch (error.errorType) {
    case "validation":
      return {
        title: "Invalid Timeline Data",
        description: "The timeline information is corrupted or incomplete",
        actionText: error.canRecover ? "Try refreshing" : undefined,
      };

    case "processing":
      return {
        title: "Timeline Processing Error",
        description: "Failed to process timeline events for display",
        actionText: "Retry",
      };

    case "rendering":
      return {
        title: "Timeline Display Error",
        description: "Unable to render timeline visualization",
        actionText: "Reload",
      };

    case "network":
      return {
        title: "Connection Error",
        description: "Failed to load timeline data from server",
        actionText: "Retry",
      };

    default:
      return {
        title: "Timeline Error",
        description: error.errorMessage || "An unknown error occurred",
        actionText: error.canRecover ? "Retry" : undefined,
      };
  }
}
