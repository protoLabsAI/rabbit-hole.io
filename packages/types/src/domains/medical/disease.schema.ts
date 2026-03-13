/**
 * Disease Entity Schema - Medical Domain
 *
 * Schema for disease entities in the medical domain.
 * Covers medical conditions, illnesses, and pathological states.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Disease Entity Schema ====================

export const DiseaseEntitySchema = EntitySchema.extend({
  type: z.literal("Disease"),
  properties: z
    .object({
      disease_type: z
        .enum([
          "infectious",
          "genetic",
          "autoimmune",
          "metabolic",
          "degenerative",
          "cardiovascular",
          "neurological",
          "cancer",
          "mental_health",
          "rare_disease",
        ])
        .optional(),
      icd_code: z.string().optional(), // ICD-10 or ICD-11 classification
      prevalence: z.number().min(0).optional(), // Per 100,000 population
      mortality_rate: z.number().min(0).max(1).optional(),
      age_of_onset: z.string().optional(), // childhood, adult, elderly, etc.
      affected_organs: z.array(z.string()).optional(),
      symptoms: z.array(z.string()).optional(), // Symptom entity UIDs
      risk_factors: z.array(z.string()).optional(),
      prevention_methods: z.array(z.string()).optional(),
      prognosis: z
        .enum(["excellent", "good", "fair", "poor", "terminal"])
        .optional(),
      chronic: z.boolean().optional(),
      contagious: z.boolean().optional(),
      hereditary: z.boolean().optional(),
      treatments: z.array(z.string()).optional(), // Treatment entity UIDs
      complications: z.array(z.string()).optional(),
      diagnostic_methods: z.array(z.string()).optional(),
      specialist_required: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const DISEASE_UID_PREFIX = "disease";

export const validateDiseaseUID = (uid: string): boolean => {
  return uid.startsWith("disease:");
};

// ==================== Type Exports ====================

export type DiseaseEntity = z.infer<typeof DiseaseEntitySchema>;
