/**
 * Clinic Entity Schema - Medical Domain
 *
 * Schema for clinic entities in the medical domain.
 * Covers outpatient facilities and specialized medical clinics.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Clinic Entity Schema ====================

export const ClinicEntitySchema = EntitySchema.extend({
  type: z.literal("Clinic"),
  properties: z
    .object({
      clinic_type: z
        .enum([
          "primary_care",
          "specialty",
          "urgent_care",
          "walk_in",
          "outpatient",
          "community_health",
          "retail",
          "academic",
        ])
        .optional(),
      ownership: z
        .enum(["private", "hospital_owned", "community", "government"])
        .optional(),
      services_offered: z.array(z.string()).optional(),
      specialties: z.array(z.string()).optional(),
      patient_capacity: z.number().min(0).optional(),
      hours_of_operation: z.string().optional(),
      appointment_required: z.boolean().optional(),
      walk_ins_accepted: z.boolean().optional(),
      insurance_accepted: z.array(z.string()).optional(), // Insurance UIDs
      languages_spoken: z.array(z.string()).optional(),
      telemedicine_available: z.boolean().optional(),
      patient_satisfaction_score: z.number().min(0).max(100).optional(),
      medical_staff: z.array(z.string()).optional(), // Person UIDs
      affiliated_hospital: z.string().optional(), // Hospital UID
      accreditation: z.array(z.string()).optional(),
      quality_rating: z.enum(["A", "B", "C", "D", "F"]).optional(),
      average_wait_time: z.number().min(0).optional(), // minutes
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CLINIC_UID_PREFIX = "clinic";

export const validateClinicUID = (uid: string): boolean => {
  return uid.startsWith("clinic:");
};

// ==================== Type Exports ====================

export type ClinicEntity = z.infer<typeof ClinicEntitySchema>;
