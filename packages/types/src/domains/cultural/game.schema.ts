/**
 * Game Entity Schema - Cultural Domain
 *
 * Schema for game entities in the cultural domain.
 * Covers video games, board games, card games, and other entertainment games.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Game Entity Schema ====================

export const GameEntitySchema = EntitySchema.extend({
  type: z.literal("Game"),
  properties: z
    .object({
      game_type: z
        .enum([
          "video_game",
          "board_game",
          "card_game",
          "role_playing",
          "strategy",
          "action",
          "adventure",
          "simulation",
          "puzzle",
          "sports",
          "racing",
          "fighting",
          "shooter",
          "platform",
        ])
        .optional(),
      platform: z.array(z.string()).optional(), // PC, Mobile, Console, PlayStation, etc.
      genre: z.array(z.string()).optional(),
      multiplayer: z.boolean().optional(),
      max_players: z.number().int().positive().optional(),
      min_players: z.number().int().positive().optional(),
      sales_figures: z.number().int().nonnegative().optional(),
      developer: z.string().optional(),
      publisher: z.string().optional(),
      release_date: z.string().optional(),
      rating: z.string().optional(), // ESRB rating or equivalent
      metacritic_score: z.number().int().min(0).max(100).optional(),
      game_engine: z.string().optional(),
      art_style: z.string().optional(),
      difficulty_level: z
        .enum(["easy", "medium", "hard", "variable"])
        .optional(),
      play_time: z.string().optional(), // average play time
      expansion_packs: z.array(z.string()).optional(),
      sequels: z.array(z.string()).optional(),
      awards: z.array(z.string()).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const GAME_UID_PREFIX = "game";

/**
 * Validate Game UID format
 */
export function validateGameUID(uid: string): boolean {
  return uid.startsWith(`${GAME_UID_PREFIX}:`);
}
