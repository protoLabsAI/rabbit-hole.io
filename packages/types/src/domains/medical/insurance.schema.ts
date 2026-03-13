/**
 * Insurance Entity Schema - Medical Domain
 *
 * Schema for health insurance entities in the medical domain.
 * Covers health insurance plans, providers, and coverage options.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Insurance Entity Schema ====================

export const InsuranceEntitySchema = EntitySchema.extend({
  type: z.literal("Insurance"),
  properties: z
    .object({
      insurance_type: z
        .enum([
          "health",
          "medicare",
          "medicaid",
          "private",
          "employer_sponsored",
          "individual",
          "short_term",
          "catastrophic",
        ])
        .optional(),
      coverage_type: z
        .enum(["HMO", "PPO", "EPO", "POS", "HDHP", "indemnity"])
        .optional(),
      market_share: z.number().min(0).max(1).optional(),
      enrolled_members: z.number().min(0).optional(),
      premium_range: z.string().optional(),
      deductible_range: z.string().optional(),
      out_of_pocket_max: z.number().min(0).optional(),
      network_size: z.number().min(0).optional(),
      prescription_coverage: z.boolean().optional(),
      mental_health_coverage: z.boolean().optional(),
      dental_coverage: z.boolean().optional(),
      vision_coverage: z.boolean().optional(),
      preventive_care_coverage: z.boolean().optional(),
      provider_network: z.array(z.string()).optional(), // Hospital/Clinic UIDs
      formulary: z.array(z.string()).optional(), // Drug UIDs
      geographic_coverage: z.array(z.string()).optional(), // Region UIDs
      customer_satisfaction: z.number().min(0).max(100).optional(),
      claim_processing_time: z.string().optional(),
      prior_authorization_required: z.array(z.string()).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const INSURANCE_UID_PREFIX = "insurance";

export const validateInsuranceUID = (uid: string): boolean => {
  return uid.startsWith("insurance:");
};

// ==================== Type Exports ====================

export type InsuranceEntity = z.infer<typeof InsuranceEntitySchema>;
