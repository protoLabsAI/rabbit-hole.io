/**
 * Character Entity Schema - Cultural Domain
 *
 * Schema for fictional character entities in the cultural domain.
 * Covers characters from literature, film, television, games, etc.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Character Entity Schema ====================

export const CharacterEntitySchema = EntitySchema.extend({
  type: z.literal("Character"),
  properties: z
    .object({
      characterType: z
        .enum([
          "protagonist",
          "antagonist",
          "supporting",
          "secondary",
          "minor",
          "narrator",
          "ensemble",
        ])
        .optional(),
      species: z.string().optional(), // human, animal, alien, etc.
      traits: z.array(z.string()).optional(), // personality traits
      description: z.string().optional(),
      age: z.string().optional(), // character age in story
      occupation: z.string().optional(),
      title: z.string().optional(), // royal titles, etc.
      inspiration_source: z.string().optional(), // real person UID if inspired by someone
      signature_ability: z.string().optional(),
      famous_quote: z.string().optional(),
      accessories: z.array(z.string()).optional(),
      appearance: z.string().optional(),
      backstory: z.string().optional(),
      character_arc: z.string().optional(),
      relationships: z.array(z.string()).optional(), // to other characters
      first_appearance: z.string().optional(), // chapter, episode, etc.
      media_appearances: z.array(z.string()).optional(), // media UIDs
      cultural_impact: z.string().optional(),
      merchandise: z.array(z.string()).optional(),
      adaptations: z.array(z.string()).optional(), // different media adaptations
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CHARACTER_UID_PREFIX = "character";

/**
 * Validate Character UID format
 */
export function validateCharacterUID(uid: string): boolean {
  return uid.startsWith(`${CHARACTER_UID_PREFIX}:`);
}
