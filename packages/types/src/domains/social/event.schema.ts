/**
 * Event Entity Schema - Social Domain
 *
 * Schema for social event entities - gatherings, meetings, incidents, etc.
 * Part of the universal event system covering all domains.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Event Constants ====================

/**
 * Universal event types covering all domains
 */
export const EVENT_TYPES = [
  // Social/Political events
  "conference",
  "rally",
  "protest",
  "meeting",
  "incident",
  "ceremony",
  "election",
  "legal_proceeding",
  // Infrastructure/Construction events
  "construction_start",
  "construction_complete",
  "infrastructure_failure",
  "maintenance_event",
  "demolition",
  "renovation",
  // Biological/Life events
  "birth",
  "death",
  "migration",
  "reproduction",
  "evolution_event",
  "extinction",
  "discovery",
  // Astronomical events
  "formation",
  "collision",
  "explosion",
  "observation",
  // Technology events
  "launch",
  "update",
  "security_breach",
  "outage",
  "acquisition",
  "shutdown",
  // Economic events
  "ipo",
  "merger",
  "bankruptcy",
  "market_crash",
  "policy_change",
  // Generic/Other
  "announcement",
  "milestone",
  "crisis",
  "celebration",
  "investigation",
] as const;

/**
 * Event significance levels
 */
export const SIGNIFICANCE_LEVELS = [
  "minor",
  "moderate",
  "major",
  "historic",
  "catastrophic",
] as const;

/**
 * Media coverage levels
 */
export const MEDIA_COVERAGE_LEVELS = [
  "none",
  "minimal",
  "moderate",
  "extensive",
  "global",
] as const;

// ==================== Event Entity Schema ====================

export const EventEntitySchema = EntitySchema.extend({
  type: z.literal("Event"),
  properties: z
    .object({
      // Temporal properties
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional(),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
        .optional(),
      duration: z.string().optional(), // event duration description

      // Universal event categorization - covers all domains
      eventType: z.enum(EVENT_TYPES).optional(),

      // Event details
      description: z.string().optional(),
      significance: z.enum(SIGNIFICANCE_LEVELS).optional(),
      participants: z.array(z.string()).optional(), // participant entity UIDs
      organizers: z.array(z.string()).optional(), // organizer entity UIDs
      location: z.string().optional(), // event location description
      outcome: z.string().optional(), // event result/consequence
      media_coverage: z.enum(MEDIA_COVERAGE_LEVELS).optional(),
      casualties: z.number().min(0).optional(), // if applicable
      economic_impact: z.number().optional(), // economic impact in USD
      related_events: z.array(z.string()).optional(), // related event UIDs
    })
    .optional(),
});

// ==================== UID Validation ====================

export const EVENT_UID_PREFIX = "event";

export const validateEventUID = (uid: string): boolean => {
  return uid.startsWith("event:");
};

// ==================== Type Exports ====================

export type EventEntity = z.infer<typeof EventEntitySchema>;
