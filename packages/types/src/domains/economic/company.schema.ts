/**
 * Company Entity Schema - Economic Domain
 *
 * Schema for company entities in the economic domain.
 * Covers publicly traded companies and business entities.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Company Entity Schema ====================

export const CompanyEntitySchema = EntitySchema.extend({
  type: z.literal("Company"),
  properties: z
    .object({
      legal_name: z.string().optional(),
      ticker_symbol: z.string().optional(),
      exchange: z.string().optional(), // Market UID
      industry: z.string().optional(), // Industry UID
      sector: z.string().optional(),
      incorporated: z.string().optional(),
      headquarters: z.string().optional(), // City UID
      employees: z.number().min(0).optional(),
      market_cap: z.number().min(0).optional(),
      revenue: z.number().min(0).optional(),
      business_model: z.string().optional(),
      subsidiaries: z.array(z.string()).optional(), // Company UIDs
      leadership: z.record(z.string(), z.string()).optional(), // role -> person UID
      public_private: z.enum(["public", "private", "subsidiary"]).optional(),
      fiscal_year_end: z.string().optional(),
      ipo_date: z.string().optional(),
      dividend_yield: z.number().min(0).optional(),
      pe_ratio: z.number().min(0).optional(),
      debt_to_equity: z.number().min(0).optional(),
      profit_margin: z.number().optional(),
      competitors: z.array(z.string()).optional(), // Company UIDs
      products: z.array(z.string()).optional(),
      services: z.array(z.string()).optional(),
      geographic_presence: z.array(z.string()).optional(), // Country UIDs
      environmental_rating: z.enum(["A", "B", "C", "D", "F"]).optional(),
      governance_rating: z.enum(["A", "B", "C", "D", "F"]).optional(),
      credit_rating: z.string().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const COMPANY_UID_PREFIX = "company";

export const validateCompanyUID = (uid: string): boolean => {
  return uid.startsWith("company:");
};

// ==================== Type Exports ====================

export type CompanyEntity = z.infer<typeof CompanyEntitySchema>;
