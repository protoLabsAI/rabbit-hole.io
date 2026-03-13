/**
 * Team Entity Schema - Cultural Domain
 *
 * Schema for sports team entities in the cultural domain.
 * Covers professional, amateur, and collegiate teams.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Team Entity Schema ====================

export const TeamEntitySchema = EntitySchema.extend({
  type: z.literal("Team"),
  properties: z
    .object({
      sport: z.string().optional(), // UID of sport entity
      founded: z.string().optional(), // founding year
      championships: z.number().int().nonnegative().optional(),
      team_colors: z.array(z.string()).optional(),
      home_venue: z.string().optional(), // UID of stadium/venue
      league: z.string().optional(),
      division: z.string().optional(),
      mascot: z.string().optional(),
      owner: z.string().optional(),
      head_coach: z.string().optional(),
      captain: z.string().optional(), // team captain UID
      roster_size: z.number().int().positive().optional(),
      team_value: z.number().positive().optional(), // market value
      winning_percentage: z.number().min(0).max(1).optional(),
      rivalries: z.array(z.string()).optional(), // rival team UIDs
      retired_numbers: z.array(z.number().int()).optional(),
      home_city: z.string().optional(),
      logo_colors: z.array(z.string()).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const TEAM_UID_PREFIX = "team";

/**
 * Validate Team UID format
 */
export function validateTeamUID(uid: string): boolean {
  return uid.startsWith(`${TEAM_UID_PREFIX}:`);
}
