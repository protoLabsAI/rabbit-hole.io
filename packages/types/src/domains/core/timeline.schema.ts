/**
 * Timeline Schema - Core Domain
 *
 * Schemas for timeline events and compact timeline data structures.
 * Used for entity timeline visualizations and temporal analysis.
 */

import { z } from "zod";

// ==================== Timeline Event Schema ====================

export const TimelineEventTypeEnum = z.enum([
  "intrinsic", // Events inherent to an entity (birth, death, founding)
  "relationship", // Interactions between entities
  "milestone", // Significant achievements or markers
  "ongoing", // Events with duration (campaigns, investigations, processes)
]);

export const ImportanceEnum = z.enum([
  "critical", // Highly significant events (red)
  "major", // Important events (orange)
  "minor", // Standard events (blue)
]);

/**
 * Timeline Event Schema
 *
 * Represents a single event in an entity's timeline with temporal,
 * categorical, and evidence information.
 */
export const TimelineEventSchema = z.object({
  id: z.string().min(1, "Event ID is required"),
  timestamp: z.string().datetime("Timestamp must be ISO datetime string"),
  endDate: z
    .string()
    .datetime("End date must be ISO datetime string")
    .optional(),
  eventType: TimelineEventTypeEnum,
  category: z.string().min(1, "Category is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.string().optional(), // Human readable duration description
  relationshipType: z.string().optional(),
  targetEntity: z
    .object({
      uid: z.string().min(1, "Target entity UID is required"),
      name: z.string().min(1, "Target entity name is required"),
      type: z.string().min(1, "Target entity type is required"),
    })
    .optional(),
  evidence: z
    .array(
      z.object({
        uid: z.string().min(1, "Evidence UID is required"),
        title: z.string().min(1, "Evidence title is required"),
        publisher: z.string().min(1, "Publisher is required"),
        url: z.string().url("URL must be valid"),
        reliability: z
          .number()
          .min(0, "Reliability must be >= 0")
          .max(1, "Reliability must be <= 1"),
      })
    )
    .optional(),
  confidence: z
    .number()
    .min(0, "Confidence must be >= 0")
    .max(1, "Confidence must be <= 1"),
  importance: ImportanceEnum,

  // Additional properties for placeholder/missing events
  isPlaceholder: z.boolean().optional(),
  entityProperty: z.string().optional(), // Which entity property this represents
});

// ==================== Compact Timeline Schemas ====================

export const GranularityEnum = z.enum(["day", "week", "month"]);

/**
 * Compact Timeline Period Schema
 *
 * Represents aggregated event data for a specific time period.
 */
export const CompactTimelinePeriodSchema = z.object({
  timestamp: z.string().datetime("Period start timestamp must be ISO datetime"),
  endTimestamp: z
    .string()
    .datetime("Period end timestamp must be ISO datetime"),
  eventCount: z
    .number()
    .int("Event count must be integer")
    .min(0, "Event count must be >= 0"),
  importanceCounts: z.object({
    critical: z.number().int().min(0),
    major: z.number().int().min(0),
    minor: z.number().int().min(0),
  }),
  eventTypes: z.object({
    relationship: z.number().int().min(0),
    intrinsic: z.number().int().min(0),
    milestone: z.number().int().min(0),
    ongoing: z.number().int().min(0),
  }),
  peakImportance: ImportanceEnum,
});

/**
 * Compact Timeline Summary Schema
 *
 * Summary statistics for timeline data.
 */
export const CompactTimelineSummarySchema = z.object({
  totalEvents: z.number().int().min(0, "Total events must be >= 0"),
  peakActivity: z.object({
    timestamp: z
      .string()
      .datetime("Peak activity timestamp must be ISO datetime"),
    count: z.number().int().min(0, "Peak activity count must be >= 0"),
  }),
  activitySpan: z.object({
    earliest: z.string().datetime("Earliest timestamp must be ISO datetime"),
    latest: z.string().datetime("Latest timestamp must be ISO datetime"),
  }),
  dominantImportance: ImportanceEnum,
  dominantEventType: TimelineEventTypeEnum,
});

/**
 * Compact Timeline Data Schema
 *
 * Complete schema for compact timeline visualization data.
 */
export const CompactTimelineDataSchema = z.object({
  entityUid: z.string().min(1, "Entity UID is required"),
  timeRange: z.object({
    from: z.string().datetime("From date must be ISO datetime"),
    to: z.string().datetime("To date must be ISO datetime"),
  }),
  granularity: GranularityEnum,
  periods: z.array(CompactTimelinePeriodSchema),
  summary: CompactTimelineSummarySchema,
});

/**
 * Timeline Filters Schema
 *
 * Schema for filtering timeline events.
 */
export const TimelineFiltersSchema = z.object({
  dateRange: z
    .object({
      from: z.string().datetime("From date must be ISO datetime"),
      to: z.string().datetime("To date must be ISO datetime"),
    })
    .optional(),
  importance: z.array(ImportanceEnum).optional(),
  eventTypes: z.array(TimelineEventTypeEnum).optional(),
  categories: z.array(z.string()).optional(),
  limit: z
    .number()
    .int("Limit must be integer")
    .min(1, "Limit must be >= 1")
    .max(1000, "Limit must be <= 1000")
    .optional(),
  showPlaceholders: z.boolean().optional(),
});

/**
 * Entity Info Schema (for timeline context)
 */
export const EntityInfoSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  dates: z.record(z.string(), z.unknown()).optional(), // Flexible dates object
});

/**
 * Timeline Result Schema
 *
 * Complete result from timeline data fetch.
 */
export const TimelineResultSchema = z.object({
  entity: EntityInfoSchema,
  events: z.array(TimelineEventSchema),
  summary: CompactTimelineSummarySchema,
});

// ==================== Type Exports ====================

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type TimelineEventType = z.infer<typeof TimelineEventTypeEnum>;
export type Importance = z.infer<typeof ImportanceEnum>;
export type Granularity = z.infer<typeof GranularityEnum>;
export type CompactTimelinePeriod = z.infer<typeof CompactTimelinePeriodSchema>;
export type CompactTimelineSummary = z.infer<
  typeof CompactTimelineSummarySchema
>;
export type CompactTimelineData = z.infer<typeof CompactTimelineDataSchema>;
export type TimelineFilters = z.infer<typeof TimelineFiltersSchema>;
export type EntityInfo = z.infer<typeof EntityInfoSchema>;
export type TimelineResult = z.infer<typeof TimelineResultSchema>;

// ==================== Validation Helpers ====================

/**
 * Safe parse with detailed error information
 */
export function parseTimelineEvent(data: unknown) {
  return TimelineEventSchema.safeParse(data);
}

export function parseCompactTimelineData(data: unknown) {
  return CompactTimelineDataSchema.safeParse(data);
}

export function parseTimelineFilters(data: unknown) {
  return TimelineFiltersSchema.safeParse(data);
}

/**
 * Validation predicates
 */
export function isValidTimelineEvent(data: unknown): data is TimelineEvent {
  return TimelineEventSchema.safeParse(data).success;
}

export function isValidCompactTimelineData(
  data: unknown
): data is CompactTimelineData {
  return CompactTimelineDataSchema.safeParse(data).success;
}
