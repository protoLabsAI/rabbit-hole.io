/**
 * Law Entity Schema - Legal Domain
 *
 * Schema for law entities in the legal domain.
 * Covers statutes, acts, ordinances, and legal codes.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Law Entity Schema ====================

export const LawEntitySchema = EntitySchema.extend({
  type: z.literal("Law"),
  properties: z
    .object({
      lawType: z
        .enum([
          "statute",
          "act",
          "ordinance",
          "regulation",
          "code",
          "constitutional_law",
          "case_law",
          "administrative_law",
          "treaty",
          "directive",
        ])
        .optional(),
      jurisdiction: z.string().optional(), // Federal, State, Local, International
      legalSystem: z
        .enum([
          "common_law",
          "civil_law",
          "religious_law",
          "customary_law",
          "mixed_system",
        ])
        .optional(),
      enactedDate: z.string().optional(), // ISO date
      effectiveDate: z.string().optional(), // ISO date
      expirationDate: z.string().optional(), // ISO date if applicable
      status: z
        .enum([
          "active",
          "repealed",
          "amended",
          "suspended",
          "pending",
          "draft",
        ])
        .optional(),
      citation: z.string().optional(), // Official legal citation
      publicationNumber: z.string().optional(),
      sponsor: z.string().optional(), // Primary sponsor/author
      legalSubject: z.array(z.string()).optional(), // Legal topics covered
      penalties: z.array(z.string()).optional(), // Associated penalties
      amendments: z.array(z.string()).optional(), // Amendment history
      relatedLaws: z.array(z.string()).optional(), // Related legislation UIDs
      enforcement: z.string().optional(), // Enforcement mechanism
      precedent: z.boolean().optional(), // Sets legal precedent
      constitutional: z.boolean().optional(), // Constitutional law
      international: z.boolean().optional(), // International law/treaty
    })
    .optional(),
});

// ==================== UID Validation ====================

export const LAW_UID_PREFIX = "law";

export const validateLawUID = (uid: string): boolean => {
  return uid.startsWith("law:");
};

// ==================== Type Exports ====================

export type LawEntity = z.infer<typeof LawEntitySchema>;
