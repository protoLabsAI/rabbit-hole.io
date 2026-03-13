/**
 * Tradition Entity Schema - Cultural Domain
 *
 * Schema for tradition entities in the cultural domain.
 * Covers cultural traditions, customs, and practices.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Tradition Entity Schema ====================

export const TraditionEntitySchema = EntitySchema.extend({
  type: z.literal("Tradition"),
  properties: z
    .object({
      type: z
        .enum([
          "religious",
          "cultural",
          "family",
          "seasonal",
          "ceremonial",
          "folk",
          "oral",
          "craft",
          "culinary",
          "dance",
          "music",
          "storytelling",
        ])
        .optional(),
      origin: z.string().optional(), // Geographic or cultural origin
      period: z.string().optional(), // Historical period of origin
      culture: z.array(z.string()).optional(), // Associated cultures
      region: z.array(z.string()).optional(), // Geographic regions
      practitioners: z.number().min(0).optional(), // Estimated practitioners
      frequency: z
        .enum(["daily", "weekly", "monthly", "seasonal", "annual", "lifecycle"])
        .optional(),
      occasion: z.array(z.string()).optional(), // When practiced
      participants: z
        .object({
          ageGroups: z.array(z.string()).optional(), // Age groups involved
          gender: z.enum(["mixed", "male_only", "female_only"]).optional(),
          roles: z.array(z.string()).optional(), // Participant roles
        })
        .optional(),
      materials: z.array(z.string()).optional(), // Materials used
      instruments: z.array(z.string()).optional(), // Musical instruments
      foods: z.array(z.string()).optional(), // Traditional foods
      clothing: z.array(z.string()).optional(), // Traditional attire
      symbols: z.array(z.string()).optional(), // Associated symbols
      language: z.string().optional(), // Traditional language
      transmission: z
        .enum(["oral", "written", "demonstration", "formal_education"])
        .optional(),
      purposes: z.array(z.string()).optional(), // Cultural purposes
      variations: z.array(z.string()).optional(), // Regional variations
      modernAdaptations: z.array(z.string()).optional(), // Modern forms
      preservation: z
        .object({
          status: z
            .enum(["thriving", "stable", "declining", "endangered", "extinct"])
            .optional(),
          efforts: z.array(z.string()).optional(), // Preservation efforts
          documentation: z.array(z.string()).optional(), // Documentation UIDs
        })
        .optional(),
      recognition: z
        .object({
          unesco: z.boolean().optional(), // UNESCO recognition
          national: z.boolean().optional(), // National heritage status
          awards: z.array(z.string()).optional(),
        })
        .optional(),
      relatedTraditions: z.array(z.string()).optional(), // Related tradition UIDs
      influencedBy: z.array(z.string()).optional(), // Influenced by UIDs
      influenced: z.array(z.string()).optional(), // Influenced UIDs
    })
    .optional(),
});

// ==================== UID Validation ====================

export const TRADITION_UID_PREFIX = "tradition";

export const validateTraditionUID = (uid: string): boolean => {
  return uid.startsWith("tradition:");
};

// ==================== Type Exports ====================

export type TraditionEntity = z.infer<typeof TraditionEntitySchema>;
