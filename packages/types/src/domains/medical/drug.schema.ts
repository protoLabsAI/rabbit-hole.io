/**
 * Drug Entity Schema - Medical Domain
 *
 * Schema for drug entities in the medical domain.
 * Covers medications, pharmaceuticals, and therapeutic substances.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Drug Entity Schema ====================

export const DrugEntitySchema = EntitySchema.extend({
  type: z.literal("Drug"),
  properties: z
    .object({
      drug_type: z
        .enum([
          "prescription",
          "over_the_counter",
          "controlled_substance",
          "biological",
          "vaccine",
          "generic",
          "brand_name",
          "experimental",
        ])
        .optional(),
      atc_code: z.string().optional(), // Anatomical Therapeutic Chemical code
      ndc_number: z.string().optional(), // National Drug Code
      active_ingredients: z.array(z.string()).optional(),
      mechanism_of_action: z.string().optional(),
      therapeutic_class: z.array(z.string()).optional(),
      indications: z.array(z.string()).optional(), // Approved uses
      contraindications: z.array(z.string()).optional(),
      side_effects: z.array(z.string()).optional(),
      drug_interactions: z.array(z.string()).optional(),
      dosage_forms: z.array(z.string()).optional(), // tablet, injection, etc.
      approved_date: z.string().optional(),
      patent_expiry: z.string().optional(),
      controlled_substance_schedule: z
        .enum(["I", "II", "III", "IV", "V"])
        .optional(),
      manufacturer: z.string().optional(), // Company UID
      clinical_trials: z.array(z.string()).optional(), // Clinical_Trial UIDs
      black_box_warning: z.boolean().optional(),
      generic_available: z.boolean().optional(),
      cost_range: z.string().optional(),
      storage_requirements: z.string().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const DRUG_UID_PREFIX = "drug";

export const validateDrugUID = (uid: string): boolean => {
  return uid.startsWith("drug:");
};

// ==================== Type Exports ====================

export type DrugEntity = z.infer<typeof DrugEntitySchema>;
