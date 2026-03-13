/**
 * Medical Device Entity Schema - Medical Domain
 *
 * Schema for medical device entities in the medical domain.
 * Covers medical equipment, instruments, and healthcare technology.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Medical Device Entity Schema ====================

export const MedicalDeviceEntitySchema = EntitySchema.extend({
  type: z.literal("Medical_Device"),
  properties: z
    .object({
      device_class: z.enum(["I", "II", "III"]).optional(), // FDA classification
      fda_clearance: z.string().optional(), // 510(k), PMA number
      device_type: z
        .enum([
          "diagnostic",
          "therapeutic",
          "monitoring",
          "surgical",
          "implantable",
          "wearable",
          "disposable",
          "durable",
        ])
        .optional(),
      intended_use: z.string().optional(),
      contraindications: z.array(z.string()).optional(),
      risks: z.array(z.string()).optional(),
      benefits: z.array(z.string()).optional(),
      clinical_studies: z.array(z.string()).optional(), // Clinical_Trial UIDs
      recall_history: z.array(z.string()).optional(),
      maintenance_required: z.boolean().optional(),
      prescription_required: z.boolean().optional(),
      manufacturer: z.string().optional(), // Company UID
      model_number: z.string().optional(),
      software_version: z.string().optional(),
      battery_life: z.string().optional(),
      sterilization_method: z.array(z.string()).optional(),
      single_use: z.boolean().optional(),
      connectivity: z.array(z.string()).optional(), // WiFi, Bluetooth, etc.
      data_storage: z.boolean().optional(),
      user_training_required: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const MEDICAL_DEVICE_UID_PREFIX = "medical_device";

export const validateMedicalDeviceUID = (uid: string): boolean => {
  return uid.startsWith("medical_device:");
};

// ==================== Type Exports ====================

export type MedicalDeviceEntity = z.infer<typeof MedicalDeviceEntitySchema>;
