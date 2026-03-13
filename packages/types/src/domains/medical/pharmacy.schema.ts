/**
 * Pharmacy Entity Schema - Medical Domain
 *
 * Schema for pharmacy entities in the medical domain.
 * Covers pharmacies, dispensaries, and pharmaceutical services.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Pharmacy Entity Schema ====================

export const PharmacyEntitySchema = EntitySchema.extend({
  type: z.literal("Pharmacy"),
  properties: z
    .object({
      pharmacy_type: z
        .enum([
          "retail",
          "hospital",
          "clinical",
          "compounding",
          "specialty",
          "mail_order",
          "long_term_care",
          "nuclear",
        ])
        .optional(),
      ownership: z
        .enum(["independent", "chain", "hospital", "government"])
        .optional(),
      services_offered: z.array(z.string()).optional(),
      specializations: z.array(z.string()).optional(),
      insurance_accepted: z.array(z.string()).optional(), // Insurance UIDs
      delivery_available: z.boolean().optional(),
      compounding_services: z.boolean().optional(),
      immunizations_offered: z.boolean().optional(),
      medication_therapy_management: z.boolean().optional(),
      hours_of_operation: z.string().optional(),
      drive_through: z.boolean().optional(),
      online_refills: z.boolean().optional(),
      automated_dispensing: z.boolean().optional(),
      pharmacists: z.array(z.string()).optional(), // Person UIDs
      affiliated_hospital: z.string().optional(), // Hospital UID
      drug_inventory: z.array(z.string()).optional(), // Drug UIDs
      licensing: z.array(z.string()).optional(),
      inspection_rating: z.enum(["A", "B", "C", "D", "F"]).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const PHARMACY_UID_PREFIX = "pharmacy";

export const validatePharmacyUID = (uid: string): boolean => {
  return uid.startsWith("pharmacy:");
};

// ==================== Type Exports ====================

export type PharmacyEntity = z.infer<typeof PharmacyEntitySchema>;
