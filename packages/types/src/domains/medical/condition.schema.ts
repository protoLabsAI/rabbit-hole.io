/**
 * Condition Entity Schema - Medical Domain
 *
 * Schema for medical condition entities.
 * Covers medical states, disorders, and health conditions.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Condition Entity Schema ====================

export const ConditionEntitySchema = EntitySchema.extend({
  type: z.literal("Condition"),
  properties: z
    .object({
      condition_type: z
        .enum([
          "acute",
          "chronic",
          "congenital",
          "acquired",
          "syndrome",
          "disorder",
          "injury",
          "disability",
        ])
        .optional(),
      icd_code: z.string().optional(),
      onset_age: z.string().optional(),
      affected_population: z.string().optional(),
      prevalence: z.number().min(0).optional(),
      severity: z.enum(["mild", "moderate", "severe", "critical"]).optional(),
      progressive: z.boolean().optional(),
      reversible: z.boolean().optional(),
      hereditary: z.boolean().optional(),
      risk_factors: z.array(z.string()).optional(),
      complications: z.array(z.string()).optional(),
      related_conditions: z.array(z.string()).optional(), // Other condition UIDs
      symptoms: z.array(z.string()).optional(), // Symptom entity UIDs
      treatments: z.array(z.string()).optional(), // Treatment entity UIDs
      diagnostic_criteria: z.array(z.string()).optional(),
      prognosis: z
        .enum(["excellent", "good", "fair", "poor", "terminal"])
        .optional(),
      quality_of_life_impact: z
        .enum(["minimal", "mild", "moderate", "severe"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CONDITION_UID_PREFIX = "condition";

export const validateConditionUID = (uid: string): boolean => {
  return uid.startsWith("condition:");
};

// ==================== Type Exports ====================

export type ConditionEntity = z.infer<typeof ConditionEntitySchema>;
