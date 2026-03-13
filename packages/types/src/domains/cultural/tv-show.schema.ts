/**
 * TV Show Entity Schema - Cultural Domain
 *
 * Schema for television show entities in the cultural domain.
 * Covers series, miniseries, specials, and other televised content.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== TV Show Entity Schema ====================

export const TVShowEntitySchema = EntitySchema.extend({
  type: z.literal("TV_Show"),
  properties: z
    .object({
      show_type: z
        .enum([
          "comedy",
          "drama",
          "reality",
          "documentary",
          "news",
          "talk_show",
          "game_show",
          "variety",
          "children",
          "animated",
          "thriller",
          "horror",
          "sci-fi",
          "fantasy",
          "crime",
          "medical",
          "legal",
        ])
        .optional(),
      episodes: z.number().int().positive().optional(),
      seasons: z.number().int().positive().optional(),
      runtime: z.number().int().positive().optional(), // minutes per episode
      first_aired: z.string().optional(), // YYYY-MM-DD format
      last_aired: z.string().optional(), // YYYY-MM-DD format
      network: z.string().optional(),
      streaming_services: z.array(z.string()).optional(),
      creator: z.array(z.string()).optional(),
      executive_producers: z.array(z.string()).optional(),
      main_cast: z.array(z.string()).optional(),
      setting: z.string().optional(), // time period and location
      target_audience: z.string().optional(),
      language: z.string().optional(),
      country_of_origin: z.string().optional(),
      awards: z.array(z.string()).optional(),
      spin_offs: z.array(z.string()).optional(),
      remake_of: z.string().optional(),
      imdb_rating: z.number().min(0).max(10).optional(),
      viewership_peak: z.number().int().nonnegative().optional(),
      syndication: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const TV_SHOW_UID_PREFIX = "tv_show";

/**
 * Validate TV Show UID format
 */
export function validateTVShowUID(uid: string): boolean {
  return uid.startsWith(`${TV_SHOW_UID_PREFIX}:`);
}
