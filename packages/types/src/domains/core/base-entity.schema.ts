/**
 * Core Entity Schema - Universal Properties
 *
 * Base schema that ALL entity types inherit from.
 * Provides universal geospatial, temporal, and status properties.
 */

import { z } from "zod";

// ==================== Universal Property Schemas ====================

/**
 * Universal geospatial properties - available on ALL entity types
 * Flattened for Neo4j compatibility (no nested objects)
 */
export const UniversalGeospatialSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(), // WGS84 latitude
  longitude: z.number().min(-180).max(180).optional(), // WGS84 longitude
  altitude: z.number().optional(), // meters above sea level
  coordinate_accuracy: z.number().min(0).optional(), // horizontal accuracy in meters
  altitude_accuracy: z.number().min(0).optional(), // vertical accuracy in meters
  geometry_type: z
    .enum(["point", "linestring", "polygon", "multipoint"])
    .optional(),
  coordinates_verified: z.boolean().optional(),
  address: z.string().optional(), // Formatted address string
  timezone: z.string().optional(),
});

/**
 * Universal temporal properties - available on ALL entity types
 * Covers creation, destruction, activity periods, and observation windows
 */
export const UniversalTemporalSchema = z.object({
  created_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // when entity was created/born/formed
  destroyed_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // when entity was destroyed/died/dissolved
  active_from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // when entity became active/operational
  active_to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // when entity became inactive
  first_observed_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // when first observed/discovered
  last_observed_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // when last observed
});

/**
 * Universal status that applies to any entity
 */
export const UniversalStatusSchema = z.object({
  status: z
    .enum([
      "active", // currently operational/alive/functioning
      "inactive", // not currently active but still exists
      "historical", // existed in the past
      "theoretical", // theoretical/hypothetical
      "fictional", // fictional/imaginary entities
      "planned", // planned for future
      "under_construction", // being built/developed
      "defunct", // no longer exists/operational
      "unknown", // status unknown
    ])
    .optional(),
});

/**
 * Universal event support - any entity can have related events
 */
export const UniversalEventSchema = z.object({
  relatedEvents: z.array(z.string()).optional(), // UIDs of related Event entities
});

// ==================== Base Entity Schema ====================

/**
 * Base Entity Schema that ALL entity types inherit from
 *
 * Provides core identification plus universal geospatial, temporal,
 * status, and event properties that any entity might need.
 */
export const EntitySchema = z.object({
  // Core identification (required for all entities)
  uid: z.string().min(1, "Entity UID is required"),
  type: z.string(), // Will be constrained by specific entity schemas
  name: z.string().min(1, "Entity name is required"),
  aliases: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),

  // Entity-specific properties (flexible for each domain)
  properties: z.record(z.string(), z.any()).optional(),

  // Universal properties (inherited by all entity types)
  ...UniversalGeospatialSchema.shape,
  ...UniversalTemporalSchema.shape,
  ...UniversalStatusSchema.shape,
  ...UniversalEventSchema.shape,

  // Canvas visualization properties (optional, Research mode only)
  // Used to preserve node positions when exporting/importing graphs
  // Note: These are canvas coordinates, not geographic (separate from latitude/longitude)
  canvas_x: z.number().finite().optional(),
  canvas_y: z.number().finite().optional(),
});

// ==================== Type Exports ====================

export type UniversalGeospatial = z.infer<typeof UniversalGeospatialSchema>;
export type UniversalTemporal = z.infer<typeof UniversalTemporalSchema>;
export type UniversalStatus = z.infer<typeof UniversalStatusSchema>;
export type UniversalEvent = z.infer<typeof UniversalEventSchema>;
export type BaseEntity = z.infer<typeof EntitySchema>;
