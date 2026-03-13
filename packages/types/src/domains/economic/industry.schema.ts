/**
 * Industry Entity Schema - Economic Domain
 *
 * Schema for industry entities in the economic domain.
 * Covers economic sectors, business classifications, and industry analysis.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Industry Entity Schema ====================

export const IndustryEntitySchema = EntitySchema.extend({
  type: z.literal("Industry"),
  properties: z
    .object({
      industry_code: z.string().optional(), // NAICS, SIC codes
      sector: z.string().optional(), // Broader economic sector
      market_size: z.number().min(0).optional(),
      growth_rate: z.number().optional(),
      key_players: z.array(z.string()).optional(), // Company UIDs
      products_services: z.array(z.string()).optional(),
      supply_chain: z.array(z.string()).optional(), // Industry UIDs
      regulatory_bodies: z.array(z.string()).optional(), // Organization UIDs
      barriers_to_entry: z.array(z.string()).optional(),
      trends: z.array(z.string()).optional(),
      employment: z.number().min(0).optional(), // Total employment
      location_concentration: z.array(z.string()).optional(), // Geographic regions
      competitive_landscape: z
        .enum(["monopoly", "oligopoly", "competitive", "fragmented"])
        .optional(),
      cyclicality: z
        .enum(["cyclical", "defensive", "growth", "mixed"])
        .optional(),
      capital_intensity: z.enum(["low", "medium", "high"]).optional(),
      technology_adoption: z
        .enum(["laggard", "follower", "early_adopter", "innovator"])
        .optional(),
      environmental_impact: z.enum(["low", "medium", "high"]).optional(),
      globalization: z
        .enum(["local", "regional", "national", "global"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const INDUSTRY_UID_PREFIX = "industry";

export const validateIndustryUID = (uid: string): boolean => {
  return uid.startsWith("industry:");
};

// ==================== Type Exports ====================

export type IndustryEntity = z.infer<typeof IndustryEntitySchema>;
