/**
 * Language Entity Schema - Cultural Domain
 *
 * Schema for language entities in the cultural domain.
 * Covers human languages, dialects, and linguistic systems.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Language Entity Schema ====================

export const LanguageEntitySchema = EntitySchema.extend({
  type: z.literal("Language"),
  properties: z
    .object({
      iso639: z.string().optional(), // ISO 639 language code
      iso6391: z.string().optional(), // Two-letter code
      iso6392: z.string().optional(), // Three-letter code
      family: z.string().optional(), // Language family
      branch: z.string().optional(), // Language branch
      nativeName: z.string().optional(), // Name in the language itself
      speakers: z
        .object({
          native: z.number().min(0).optional(), // Native speakers
          total: z.number().min(0).optional(), // Total speakers
          l2: z.number().min(0).optional(), // Second language speakers
        })
        .optional(),
      countries: z.array(z.string()).optional(), // Countries where spoken
      regions: z.array(z.string()).optional(), // Geographic regions
      officialStatus: z.array(z.string()).optional(), // Countries where official
      writingSystem: z.array(z.string()).optional(), // Scripts used
      dialects: z.array(z.string()).optional(), // Major dialects
      relatedLanguages: z.array(z.string()).optional(), // Related language UIDs
      status: z
        .enum([
          "living",
          "extinct",
          "endangered",
          "critically_endangered",
          "severely_endangered",
          "definitely_endangered",
          "vulnerable",
          "safe",
        ])
        .optional(),
      endangerment: z
        .object({
          level: z.string().optional(),
          lastSpeaker: z.string().optional(), // Date or person UID
          revitalization: z.boolean().optional(),
        })
        .optional(),
      typology: z
        .object({
          wordOrder: z.string().optional(), // SOV, SVO, etc.
          morphology: z
            .enum(["isolating", "agglutinative", "fusional", "polysynthetic"])
            .optional(),
          phonemes: z.number().min(0).optional(), // Number of phonemes
        })
        .optional(),
      standardization: z
        .object({
          standardized: z.boolean().optional(),
          authority: z.string().optional(), // Language authority UID
          standardForm: z.string().optional(),
        })
        .optional(),
      literature: z.array(z.string()).optional(), // Literary works UIDs
      education: z
        .object({
          medium: z.boolean().optional(), // Used as medium of instruction
          taught: z.boolean().optional(), // Taught as subject
          universities: z.array(z.string()).optional(), // Teaching institutions
        })
        .optional(),
      digital: z
        .object({
          internetPresence: z.boolean().optional(),
          wikipedia: z.boolean().optional(),
          localization: z.array(z.string()).optional(), // Software/platforms
        })
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const LANGUAGE_UID_PREFIX = "language";

export const validateLanguageUID = (uid: string): boolean => {
  return uid.startsWith("language:");
};

// ==================== Type Exports ====================

export type LanguageEntity = z.infer<typeof LanguageEntitySchema>;
