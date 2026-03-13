/**
 * Athlete Entity Schema - Cultural Domain
 *
 * Schema for athlete entities in the cultural domain.
 * Covers professional and amateur athletes across all sports.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Athlete Entity Schema ====================

export const AthleteEntitySchema = EntitySchema.extend({
  type: z.literal("Athlete"),
  properties: z
    .object({
      sports: z.array(z.string()).optional(), // UIDs of sport entities
      position: z.string().optional(),
      jersey_number: z.number().int().positive().optional(),
      career_start: z.string().optional(), // year career started
      career_end: z.string().optional(), // year career ended (if retired)
      height: z.string().optional(), // height in cm or feet/inches
      weight: z.string().optional(), // weight in kg or pounds
      nationality: z.string().optional(),
      handedness: z.enum(["left", "right", "ambidextrous"]).optional(),
      current_team: z.string().optional(), // current team UID
      previous_teams: z.array(z.string()).optional(), // previous team UIDs
      achievements: z.array(z.string()).optional(),
      records_held: z.array(z.string()).optional(),
      awards: z.array(z.string()).optional(),
      salary: z.number().positive().optional(),
      endorsements: z.array(z.string()).optional(),
      retirement_status: z.boolean().optional(),
      hall_of_fame: z.boolean().optional(),
      playing_style: z.string().optional(),
      college: z.string().optional(), // college/university attended
      draft_year: z.string().optional(),
      draft_position: z.number().int().positive().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const ATHLETE_UID_PREFIX = "athlete";

/**
 * Validate Athlete UID format
 */
export function validateAthleteUID(uid: string): boolean {
  return uid.startsWith(`${ATHLETE_UID_PREFIX}:`);
}
