/**
 * Organization Entity Schema - Social Domain
 *
 * Schema for organization entities in the social domain.
 * Covers businesses, nonprofits, government entities, etc.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Organization Entity Schema ====================

export const OrganizationEntitySchema = EntitySchema.extend({
  type: z.literal("Organization"),
  properties: z
    .object({
      orgType: z.string().optional(), // corporation, nonprofit, government, etc.
      founded: z.string().optional(), // founding year or date
      dissolved: z.string().optional(), // dissolution date
      acquired: z.string().optional(), // acquisition date
      bankruptcyDate: z.string().optional(), // bankruptcy filing
      rebranded: z.string().optional(), // rebranding date
      headquarters: z.string().optional(), // primary location
      industry: z.string().optional(), // industry classification
      revenue: z.number().min(0).optional(), // annual revenue
      employees: z.number().min(0).optional(), // employee count
      ceo: z.string().optional(), // current CEO/leader
      parentCompany: z.string().optional(), // parent organization UID
      subsidiaries: z.array(z.string()).optional(), // subsidiary UIDs
      stockTicker: z.string().optional(), // if publicly traded
      website: z.string().url().optional(),
      legalStatus: z
        .enum(["active", "defunct", "merged", "acquired"])
        .optional(),
      jurisdiction: z.string().optional(), // incorporation jurisdiction
      description: z.string().optional(), // organization description
      mission: z.string().optional(), // mission statement
      products: z.array(z.string()).optional(), // products/services
      partnerships: z.array(z.string()).optional(), // partner organization UIDs
    })
    .optional(),
});

// ==================== UID Validation ====================

export const ORGANIZATION_UID_PREFIX = "org";

export const validateOrganizationUID = (uid: string): boolean => {
  return uid.startsWith("org:");
};

// ==================== Type Exports ====================

export type OrganizationEntity = z.infer<typeof OrganizationEntitySchema>;
