/**
 * Location Entity Schema - Geographic Domain
 *
 * Schema for general location entities in the geographic domain.
 * Covers fictional places, landmarks, and general geographic locations.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Location Entity Schema ====================

export const LocationEntitySchema = EntitySchema.extend({
  type: z.literal("Location"),
  properties: z
    .object({
      location_type: z
        .enum([
          "fictional_place",
          "fantasy_realm",
          "landmark",
          "geographic_feature",
          "natural_area",
          "historical_site",
          "point_of_interest",
          "settlement",
          "region",
          "district",
          "neighborhood",
          "virtual_location",
        ])
        .optional(),
      access: z.string().optional(), // how to access the location
      characteristics: z.array(z.string()).optional(), // defining features
      notable_locations: z.array(z.string()).optional(), // sub-locations
      climate: z.string().optional(),
      terrain: z.string().optional(),
      size: z.string().optional(), // area description
      population: z.number().min(0).optional(),
      established: z.string().optional(), // founding/establishment date
      governing_body: z.string().optional(), // organization UID that governs
      cultural_significance: z.string().optional(),
      tourism: z.boolean().optional(),
      accessibility: z.string().optional(),
      safety_level: z
        .enum(["very_safe", "safe", "moderate", "dangerous", "very_dangerous"])
        .optional(),
      fictional_universe: z.string().optional(), // if part of fictional universe
      creator: z.string().optional(), // person/org that created it (for fictional)
      media_appearances: z.array(z.string()).optional(), // media UIDs
    })
    .optional(),
});

// ==================== UID Validation ====================

export const LOCATION_UID_PREFIX = "location";

/**
 * Validate Location UID format
 */
export function validateLocationUID(uid: string): boolean {
  return uid.startsWith(`${LOCATION_UID_PREFIX}:`);
}
