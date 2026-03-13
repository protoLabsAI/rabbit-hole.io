/**
 * Clinical Trial Entity Schema - Medical Domain
 *
 * Schema for clinical trial entities in the medical domain.
 * Covers medical research studies and drug trials.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Clinical Trial Entity Schema ====================

export const ClinicalTrialEntitySchema = EntitySchema.extend({
  type: z.literal("Clinical_Trial"),
  properties: z
    .object({
      trial_phase: z.enum(["preclinical", "I", "II", "III", "IV"]).optional(),
      study_type: z
        .enum([
          "interventional",
          "observational",
          "expanded_access",
          "device_feasibility",
        ])
        .optional(),
      trial_status: z
        .enum([
          "recruiting",
          "active",
          "completed",
          "suspended",
          "terminated",
          "withdrawn",
        ])
        .optional(),
      primary_purpose: z
        .enum([
          "treatment",
          "prevention",
          "diagnostic",
          "supportive_care",
          "screening",
          "health_services_research",
          "basic_science",
        ])
        .optional(),
      nct_number: z.string().optional(), // ClinicalTrials.gov identifier
      sponsor: z.string().optional(), // Organization UID
      principal_investigator: z.string().optional(), // Person UID
      study_population: z.string().optional(),
      enrollment_target: z.number().min(0).optional(),
      current_enrollment: z.number().min(0).optional(),
      start_date: z.string().optional(),
      completion_date: z.string().optional(),
      primary_endpoint: z.string().optional(),
      secondary_endpoints: z.array(z.string()).optional(),
      inclusion_criteria: z.array(z.string()).optional(),
      exclusion_criteria: z.array(z.string()).optional(),
      study_locations: z.array(z.string()).optional(), // Hospital/Clinic UIDs
      funding_source: z.array(z.string()).optional(), // Organization UIDs
      studied_drug: z.string().optional(), // Drug UID
      studied_device: z.string().optional(), // Medical_Device UID
      target_condition: z.string().optional(), // Disease/Condition UID
      adverse_events: z.array(z.string()).optional(),
      efficacy_results: z.string().optional(),
      publication_results: z.array(z.string()).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CLINICAL_TRIAL_UID_PREFIX = "clinical_trial";

export const validateClinicalTrialUID = (uid: string): boolean => {
  return uid.startsWith("clinical_trial:");
};

// ==================== Type Exports ====================

export type ClinicalTrialEntity = z.infer<typeof ClinicalTrialEntitySchema>;
