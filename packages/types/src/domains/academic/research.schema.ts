/**
 * Research Entity Schema - Academic Domain
 *
 * Schema for research entities in the academic domain.
 * Covers research projects, studies, and investigations.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Research Entity Schema ====================

export const ResearchEntitySchema = EntitySchema.extend({
  type: z.literal("Research"),
  properties: z
    .object({
      researchType: z
        .enum([
          "basic_research",
          "applied_research",
          "developmental_research",
          "clinical_trial",
          "longitudinal_study",
          "cross_sectional",
          "experimental",
          "observational",
        ])
        .optional(),
      field: z.string().optional(), // Primary research field
      subfields: z.array(z.string()).optional(),
      startDate: z.string().optional(), // ISO date
      endDate: z.string().optional(), // ISO date
      duration: z.string().optional(), // Research duration
      status: z
        .enum([
          "proposed",
          "ongoing",
          "completed",
          "suspended",
          "cancelled",
          "published",
        ])
        .optional(),
      funding: z
        .object({
          amount: z.number().min(0).optional(),
          currency: z.string().optional(),
          sources: z.array(z.string()).optional(), // Funding organization UIDs
          grants: z.array(z.string()).optional(), // Grant UIDs
        })
        .optional(),
      researchers: z.array(z.string()).optional(), // Researcher person UIDs
      principalInvestigator: z.string().optional(), // PI person UID
      institution: z.string().optional(), // Primary institution UID
      collaboratingInstitutions: z.array(z.string()).optional(),
      methodology: z.string().optional(), // Research methodology
      sampleSize: z.number().min(0).optional(),
      keywords: z.array(z.string()).optional(),
      ethics: z
        .object({
          approved: z.boolean().optional(),
          committee: z.string().optional(),
          approvalDate: z.string().optional(),
        })
        .optional(),
      publications: z.array(z.string()).optional(), // Related publication UIDs
      datasets: z.array(z.string()).optional(), // Generated datasets
      patents: z.array(z.string()).optional(), // Related patent UIDs
      impact: z
        .object({
          citations: z.number().min(0).optional(),
          hIndex: z.number().min(0).optional(),
          altmetric: z.number().min(0).optional(),
        })
        .optional(),
      openAccess: z.boolean().optional(),
      reproducible: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const RESEARCH_UID_PREFIX = "research";

export const validateResearchUID = (uid: string): boolean => {
  return uid.startsWith("research:");
};

// ==================== Type Exports ====================

export type ResearchEntity = z.infer<typeof ResearchEntitySchema>;
