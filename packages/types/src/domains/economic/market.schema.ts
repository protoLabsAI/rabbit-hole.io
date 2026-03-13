/**
 * Market Entity Schema - Economic Domain
 *
 * Schema for market entities in the economic domain.
 * Covers stock exchanges, trading markets, and financial marketplaces.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Market Entity Schema ====================

export const MarketEntitySchema = EntitySchema.extend({
  type: z.literal("Market"),
  properties: z
    .object({
      market_type: z
        .enum([
          "stock",
          "bond",
          "commodity",
          "forex",
          "crypto",
          "derivatives",
          "real_estate",
          "other",
        ])
        .optional(),
      exchange_name: z.string().optional(),
      trading_hours: z.string().optional(),
      time_zone: z.string().optional(),
      currency: z.string().optional(), // Base currency UID
      market_cap: z.number().min(0).optional(),
      daily_volume: z.number().min(0).optional(),
      established: z.string().optional(),
      regulator: z.string().optional(), // Regulatory organization UID
      location: z.string().optional(), // Geographic location
      participants: z.array(z.string()).optional(), // Participant organization UIDs
      trading_system: z
        .enum(["open_outcry", "electronic", "hybrid"])
        .optional(),
      settlement_period: z.string().optional(), // T+0, T+1, T+2, etc.
      listing_requirements: z.array(z.string()).optional(),
      fee_structure: z.string().optional(),
      market_indices: z.array(z.string()).optional(),
      status: z.enum(["active", "closed", "suspended", "merged"]).optional(),
      liquidity: z.enum(["high", "medium", "low"]).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const MARKET_UID_PREFIX = "market";

export const validateMarketUID = (uid: string): boolean => {
  return uid.startsWith("market:");
};

// ==================== Type Exports ====================

export type MarketEntity = z.infer<typeof MarketEntitySchema>;
