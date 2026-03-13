/**
 * Sport Entity Schema - Cultural Domain
 *
 * Schema for sport entities in the cultural domain.
 * Covers organized sports activities and competitions.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Sport Entity Schema ====================

export const SportEntitySchema = EntitySchema.extend({
  type: z.literal("Sport"),
  properties: z
    .object({
      sport_type: z
        .enum([
          "team",
          "individual",
          "combat",
          "racing",
          "winter",
          "water",
          "extreme",
          "traditional",
        ])
        .optional(),
      season: z
        .enum(["spring", "summer", "fall", "winter", "year_round"])
        .optional(),
      team_size: z.number().int().positive().optional(),
      olympic_sport: z.boolean().optional(),
      popularity_ranking: z.number().int().positive().optional(),
      equipment_required: z.array(z.string()).optional(),
      playing_surface: z.string().optional(), // field, court, track, etc.
      governing_body: z.string().optional(),
      professional_leagues: z.array(z.string()).optional(),
      rules_established: z.string().optional(), // date rules were formalized
      origin_country: z.string().optional(),
      physical_demands: z.array(z.string()).optional(),
      scoring_system: z.string().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const SPORT_UID_PREFIX = "sport";

/**
 * Validate Sport UID format
 */
export function validateSportUID(uid: string): boolean {
  return uid.startsWith(`${SPORT_UID_PREFIX}:`);
}
