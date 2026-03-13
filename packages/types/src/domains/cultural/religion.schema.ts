/**
 * Religion Entity Schema - Cultural Domain
 *
 * Schema for religion entities in the cultural domain.
 * Covers religions, belief systems, and spiritual traditions.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Religion Entity Schema ====================

export const ReligionEntitySchema = EntitySchema.extend({
  type: z.literal("Religion"),
  properties: z
    .object({
      type: z
        .enum([
          "monotheistic",
          "polytheistic",
          "pantheistic",
          "atheistic",
          "agnostic",
          "animistic",
          "shamanistic",
          "syncretic",
        ])
        .optional(),
      category: z
        .enum([
          "world_religion",
          "indigenous",
          "folk_religion",
          "new_religious_movement",
          "denomination",
          "sect",
          "spiritual_tradition",
        ])
        .optional(),
      founded: z.string().optional(), // Founding date or period
      founder: z.array(z.string()).optional(), // Founder person UIDs
      holyBooks: z.array(z.string()).optional(), // Sacred text UIDs
      followers: z.number().min(0).optional(), // Estimated followers
      branches: z.array(z.string()).optional(), // Major branches/denominations
      parentReligion: z.string().optional(), // Parent religion UID
      relatedReligions: z.array(z.string()).optional(), // Related religion UIDs
      beliefs: z
        .object({
          afterlife: z.boolean().optional(),
          reincarnation: z.boolean().optional(),
          karma: z.boolean().optional(),
          salvation: z.boolean().optional(),
          prophecy: z.boolean().optional(),
        })
        .optional(),
      practices: z
        .object({
          prayer: z.boolean().optional(),
          meditation: z.boolean().optional(),
          pilgrimage: z.boolean().optional(),
          fasting: z.boolean().optional(),
          tithing: z.boolean().optional(),
          ceremonies: z.array(z.string()).optional(),
          holidays: z.array(z.string()).optional(),
        })
        .optional(),
      clergy: z
        .object({
          hasClergy: z.boolean().optional(),
          hierarchy: z.array(z.string()).optional(), // Clerical ranks
          celibacy: z.boolean().optional(),
          ordination: z.boolean().optional(),
        })
        .optional(),
      geography: z
        .object({
          regions: z.array(z.string()).optional(), // Predominant regions
          countries: z.array(z.string()).optional(), // Countries with followers
          holyPlaces: z.array(z.string()).optional(), // Sacred location UIDs
        })
        .optional(),
      symbols: z.array(z.string()).optional(), // Religious symbols
      languages: z.array(z.string()).optional(), // Liturgical languages
      calendar: z.string().optional(), // Religious calendar system
      dietary: z.array(z.string()).optional(), // Dietary restrictions
      ethics: z.array(z.string()).optional(), // Ethical principles
      eschatology: z.string().optional(), // End times beliefs
    })
    .optional(),
});

// ==================== UID Validation ====================

export const RELIGION_UID_PREFIX = "religion";

export const validateReligionUID = (uid: string): boolean => {
  return uid.startsWith("religion:");
};

// ==================== Type Exports ====================

export type ReligionEntity = z.infer<typeof ReligionEntitySchema>;
