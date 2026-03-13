/**
 * Person Entity Schema - Social Domain
 *
 * Schema for person entities in the social domain.
 * Enhanced for person research with comprehensive biographical data.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Person Entity Schema ====================

export const PersonEntitySchema = EntitySchema.extend({
  type: z.literal("Person"),
  // Legacy compatibility fields
  id: z.string().optional(), // Legacy field for compatibility
  subtype: z.string().optional(),
  bio: z.string().optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be in YYYY-MM-DD format")
    .optional(),
  birthPlace: z.string().optional(),
  deathDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Death date must be in YYYY-MM-DD format")
    .optional(),
  deathPlace: z.string().optional(),
  deathCause: z.string().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  politicalParty: z.string().optional(),
  education: z.array(z.string()).optional(),
  netWorth: z.number().optional(),
  residence: z.string().optional(),
  age: z.number().min(0).max(150).optional(),
  gender: z
    .enum(["male", "female", "non-binary", "other", "unknown"])
    .optional(),
  spouse: z.array(z.string()).optional(),
  children: z.array(z.string()).optional(),
  parents: z.array(z.string()).optional(),
  socialMedia: z
    .object({
      twitter: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      linkedin: z.string().optional(),
      youtube: z.string().optional(),
      tiktok: z.string().optional(),
      truth_social: z.string().optional(),
    })
    .optional(),
  contactInfo: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PERSON_UID_PREFIX = "person";

export const validatePersonUID = (uid: string): boolean => {
  return uid.startsWith("person:");
};

// ==================== Type Exports ====================

export type PersonEntity = z.infer<typeof PersonEntitySchema>;
