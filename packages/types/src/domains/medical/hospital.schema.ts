/**
 * Hospital Entity Schema - Medical Domain
 *
 * Schema for hospital entities in the medical domain.
 * Covers healthcare facilities and medical institutions.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Hospital Entity Schema ====================

export const HospitalEntitySchema = EntitySchema.extend({
  type: z.literal("Hospital"),
  properties: z
    .object({
      hospital_type: z
        .enum([
          "general",
          "specialty",
          "teaching",
          "research",
          "community",
          "academic",
          "children",
          "psychiatric",
          "rehabilitation",
          "critical_access",
        ])
        .optional(),
      ownership: z
        .enum(["public", "private", "nonprofit", "government", "military"])
        .optional(),
      bed_count: z.number().min(0).optional(),
      accreditation: z.array(z.string()).optional(), // Joint Commission, etc.
      specialties: z.array(z.string()).optional(),
      trauma_level: z.enum(["I", "II", "III", "IV"]).optional(),
      teaching_hospital: z.boolean().optional(),
      research_hospital: z.boolean().optional(),
      magnet_status: z.boolean().optional(),
      emergency_services: z.boolean().optional(),
      patient_satisfaction_score: z.number().min(0).max(100).optional(),
      safety_rating: z.enum(["A", "B", "C", "D", "F"]).optional(),
      network_affiliations: z.array(z.string()).optional(), // Organization UIDs
      medical_staff: z.array(z.string()).optional(), // Person UIDs
      services_offered: z.array(z.string()).optional(),
      insurance_accepted: z.array(z.string()).optional(), // Insurance UIDs
      annual_admissions: z.number().min(0).optional(),
      average_length_of_stay: z.number().min(0).optional(),
      mortality_rate: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const HOSPITAL_UID_PREFIX = "hospital";

export const validateHospitalUID = (uid: string): boolean => {
  return uid.startsWith("hospital:");
};

// ==================== Type Exports ====================

export type HospitalEntity = z.infer<typeof HospitalEntitySchema>;
