/**
 * Stadium Entity Schema - Cultural Domain
 *
 * Schema for stadium and sports venue entities in the cultural domain.
 * Covers stadiums, arenas, and other sporting facilities.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Stadium Entity Schema ====================

export const StadiumEntitySchema = EntitySchema.extend({
  type: z.literal("Stadium"),
  properties: z
    .object({
      capacity: z.number().int().positive().optional(),
      surface_type: z
        .enum([
          "natural_grass",
          "artificial_turf",
          "hybrid",
          "hardwood",
          "concrete",
          "clay",
          "synthetic",
        ])
        .optional(),
      roof_type: z.enum(["open", "retractable", "dome", "partial"]).optional(),
      opened_year: z.number().int().positive().optional(),
      construction_cost: z.number().positive().optional(),
      architect: z.string().optional(),
      home_teams: z.array(z.string()).optional(), // UIDs of teams that play here
      sports_hosted: z.array(z.string()).optional(), // UIDs of sports
      notable_events: z.array(z.string()).optional(),
      seating_sections: z.array(z.string()).optional(),
      field_dimensions: z.string().optional(),
      parking_capacity: z.number().int().nonnegative().optional(),
      concessions: z.array(z.string()).optional(),
      luxury_boxes: z.number().int().nonnegative().optional(),
      accessibility_features: z.array(z.string()).optional(),
      renovation_years: z.array(z.string()).optional(),
      naming_rights: z.string().optional(), // company with naming rights
    })
    .optional(),
});

// ==================== UID Validation ====================

export const STADIUM_UID_PREFIX = "stadium";

/**
 * Validate Stadium UID format
 */
export function validateStadiumUID(uid: string): boolean {
  return uid.startsWith(`${STADIUM_UID_PREFIX}:`);
}
