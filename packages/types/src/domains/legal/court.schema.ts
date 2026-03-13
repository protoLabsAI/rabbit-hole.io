/**
 * Court Entity Schema - Legal Domain
 *
 * Schema for court entities in the legal domain.
 * Covers all types of courts and judicial bodies.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Court Entity Schema ====================

export const CourtEntitySchema = EntitySchema.extend({
  type: z.literal("Court"),
  properties: z
    .object({
      courtType: z
        .enum([
          "supreme_court",
          "appellate_court",
          "trial_court",
          "family_court",
          "probate_court",
          "criminal_court",
          "civil_court",
          "bankruptcy_court",
          "tax_court",
          "administrative_court",
          "military_court",
          "international_court",
        ])
        .optional(),
      jurisdiction: z.string().optional(), // Geographic or subject matter
      level: z
        .enum(["federal", "state", "county", "local", "international"])
        .optional(),
      establishedDate: z.string().optional(), // ISO date
      address: z.string().optional(), // Physical location
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      chiefJudge: z.string().optional(), // Current chief judge
      judgeCount: z.number().min(0).optional(), // Number of judges
      caseTypes: z.array(z.string()).optional(), // Types of cases heard
      appeals: z.boolean().optional(), // Hears appeals
      originalJurisdiction: z.boolean().optional(), // Has original jurisdiction
      appellatejurisdiction: z.boolean().optional(), // Has appellate jurisdiction
      circuit: z.string().optional(), // Circuit designation
      parentCourt: z.string().optional(), // Superior court UID
      subordinateCourts: z.array(z.string()).optional(), // Lower court UIDs
      specialty: z.string().optional(), // Court specialization
      language: z.array(z.string()).optional(), // Languages used
      website: z.string().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const COURT_UID_PREFIX = "court";

export const validateCourtUID = (uid: string): boolean => {
  return uid.startsWith("court:");
};

// ==================== Type Exports ====================

export type CourtEntity = z.infer<typeof CourtEntitySchema>;
