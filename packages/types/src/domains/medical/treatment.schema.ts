/**
 * Treatment Entity Schema - Medical Domain
 *
 * Schema for treatment entities in the medical domain.
 * Covers medical procedures, therapies, and treatment protocols.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Treatment Entity Schema ====================

export const TreatmentEntitySchema = EntitySchema.extend({
  type: z.literal("Treatment"),
  properties: z
    .object({
      treatment_type: z
        .enum([
          "medication",
          "surgery",
          "therapy",
          "radiation",
          "chemotherapy",
          "immunotherapy",
          "lifestyle",
          "preventive",
          "palliative",
          "rehabilitation",
        ])
        .optional(),
      procedure_code: z.string().optional(), // CPT or ICD procedure code
      invasiveness: z
        .enum(["non_invasive", "minimally_invasive", "invasive"])
        .optional(),
      duration: z.string().optional(), // Treatment length
      efficacy_rate: z.number().min(0).max(1).optional(),
      success_rate: z.number().min(0).max(1).optional(),
      recovery_time: z.string().optional(),
      cost_range: z.string().optional(),
      side_effects: z.array(z.string()).optional(),
      contraindications: z.array(z.string()).optional(),
      prerequisites: z.array(z.string()).optional(),
      follow_up_required: z.boolean().optional(),
      anesthesia_required: z.boolean().optional(),
      hospitalization_required: z.boolean().optional(),
      specialist_required: z.boolean().optional(),
      equipment_needed: z.array(z.string()).optional(), // Medical_Device UIDs
      drugs_used: z.array(z.string()).optional(), // Drug UIDs
      target_conditions: z.array(z.string()).optional(), // Disease/Condition UIDs
    })
    .optional(),
});

// ==================== UID Validation ====================

export const TREATMENT_UID_PREFIX = "treatment";

export const validateTreatmentUID = (uid: string): boolean => {
  return uid.startsWith("treatment:");
};

// ==================== Type Exports ====================

export type TreatmentEntity = z.infer<typeof TreatmentEntitySchema>;
