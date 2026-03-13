/**
 * License Entity Schema - Legal Domain
 *
 * Schema for license entities in the legal domain.
 * Covers professional licenses, permits, and authorizations.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== License Entity Schema ====================

export const LicenseEntitySchema = EntitySchema.extend({
  type: z.literal("License"),
  properties: z
    .object({
      licenseType: z
        .enum([
          "professional",
          "business",
          "occupational",
          "driving",
          "medical",
          "legal",
          "software",
          "intellectual_property",
          "broadcasting",
          "environmental",
          "construction",
          "food_service",
        ])
        .optional(),
      licenseNumber: z.string().optional(), // Official license number
      issueDate: z.string().optional(), // ISO date
      expirationDate: z.string().optional(), // ISO date
      renewalDate: z.string().optional(), // ISO date
      status: z
        .enum([
          "active",
          "expired",
          "suspended",
          "revoked",
          "pending",
          "provisional",
        ])
        .optional(),
      issuer: z.string().optional(), // Issuing authority/organization UID
      licensee: z.string().optional(), // License holder entity UID
      jurisdiction: z.string().optional(), // Geographic scope
      scope: z.string().optional(), // License scope/limitations
      conditions: z.array(z.string()).optional(), // License conditions
      restrictions: z.array(z.string()).optional(), // License restrictions
      endorsements: z.array(z.string()).optional(), // Additional endorsements
      reciprocity: z.array(z.string()).optional(), // States with reciprocity
      ceu: z
        .object({
          required: z.boolean().optional(), // Continuing education required
          hours: z.number().min(0).optional(), // Required hours
          deadline: z.string().optional(), // CEU deadline
        })
        .optional(),
      fees: z
        .object({
          initial: z.number().min(0).optional(),
          renewal: z.number().min(0).optional(),
          late_fee: z.number().min(0).optional(),
        })
        .optional(),
      disciplinary: z.array(z.string()).optional(), // Disciplinary actions
      bond: z
        .object({
          required: z.boolean().optional(),
          amount: z.number().min(0).optional(),
        })
        .optional(),
      insurance: z
        .object({
          required: z.boolean().optional(),
          type: z.string().optional(),
          amount: z.number().min(0).optional(),
        })
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const LICENSE_UID_PREFIX = "license";

export const validateLicenseUID = (uid: string): boolean => {
  return uid.startsWith("license:");
};

// ==================== Type Exports ====================

export type LicenseEntity = z.infer<typeof LicenseEntitySchema>;
