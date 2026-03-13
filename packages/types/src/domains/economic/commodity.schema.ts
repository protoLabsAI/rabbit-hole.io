/**
 * Commodity Entity Schema - Economic Domain
 *
 * Schema for commodity entities in the economic domain.
 * Covers raw materials, agricultural products, and tradeable goods.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Commodity Entity Schema ====================

export const CommodityEntitySchema = EntitySchema.extend({
  type: z.literal("Commodity"),
  properties: z
    .object({
      commodity_type: z
        .enum([
          "agricultural",
          "energy",
          "metals",
          "livestock",
          "soft",
          "other",
        ])
        .optional(),
      trading_unit: z.string().optional(), // barrels, tons, bushels, etc.
      exchanges: z.array(z.string()).optional(), // Market UIDs
      major_producers: z.array(z.string()).optional(), // Country/Organization UIDs
      major_consumers: z.array(z.string()).optional(), // Country/Organization UIDs
      seasonal_patterns: z.boolean().optional(),
      storage_requirements: z.string().optional(),
      quality_grades: z.array(z.string()).optional(),
      price_volatility: z
        .enum(["low", "moderate", "high", "extreme"])
        .optional(),
      strategic_importance: z
        .enum(["critical", "important", "moderate", "low"])
        .optional(),
      substitute_goods: z.array(z.string()).optional(), // Other commodity UIDs
      production_cost: z.number().min(0).optional(),
      transportation_method: z.array(z.string()).optional(),
      environmental_impact: z.enum(["low", "medium", "high"]).optional(),
      price_drivers: z.array(z.string()).optional(),
      global_reserves: z.number().min(0).optional(),
      annual_production: z.number().min(0).optional(),
      futures_contracts: z.boolean().optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const COMMODITY_UID_PREFIX = "commodity";

export const validateCommodityUID = (uid: string): boolean => {
  return uid.startsWith("commodity:");
};

// ==================== Type Exports ====================

export type CommodityEntity = z.infer<typeof CommodityEntitySchema>;
