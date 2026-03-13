/**
 * Symptom Entity Schema - Medical Domain
 *
 * Schema for symptom entities in the medical domain.
 * Covers medical signs, symptoms, and clinical manifestations.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Symptom Entity Schema ====================

export const SymptomEntitySchema = EntitySchema.extend({
  type: z.literal("Symptom"),
  properties: z
    .object({
      symptom_type: z
        .enum([
          "physical",
          "mental",
          "behavioral",
          "sensory",
          "cognitive",
          "emotional",
          "constitutional",
        ])
        .optional(),
      body_system: z.array(z.string()).optional(), // cardiovascular, respiratory, etc.
      severity_scale: z.string().optional(), // 1-10, mild/moderate/severe
      onset: z.enum(["acute", "chronic", "intermittent"]).optional(),
      duration: z.string().optional(),
      triggers: z.array(z.string()).optional(),
      alleviating_factors: z.array(z.string()).optional(),
      aggravating_factors: z.array(z.string()).optional(),
      associated_symptoms: z.array(z.string()).optional(), // Other symptom UIDs
      diagnostic_significance: z
        .enum(["pathognomonic", "characteristic", "nonspecific"])
        .optional(),
      measurable: z.boolean().optional(),
      subjective: z.boolean().optional(),
      emergency_symptom: z.boolean().optional(),
      age_specific: z.string().optional(),
      gender_specific: z.enum(["male", "female", "both"]).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const SYMPTOM_UID_PREFIX = "symptom";

export const validateSymptomUID = (uid: string): boolean => {
  return uid.startsWith("symptom:");
};

// ==================== Type Exports ====================

export type SymptomEntity = z.infer<typeof SymptomEntitySchema>;
