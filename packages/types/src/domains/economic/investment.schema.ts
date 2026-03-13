/**
 * Investment Entity Schema - Economic Domain
 *
 * Schema for investment entities in the economic domain.
 * Covers financial instruments, securities, and investment vehicles.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Investment Entity Schema ====================

export const InvestmentEntitySchema = EntitySchema.extend({
  type: z.literal("Investment"),
  properties: z
    .object({
      investment_type: z
        .enum([
          "stock",
          "bond",
          "fund",
          "etf",
          "derivative",
          "commodity",
          "real_estate",
          "crypto",
          "other",
        ])
        .optional(),
      ticker_symbol: z.string().optional(),
      asset_class: z
        .enum(["equity", "fixed_income", "alternative", "cash_equivalent"])
        .optional(),
      risk_level: z.enum(["low", "moderate", "high", "speculative"]).optional(),
      minimum_investment: z.number().min(0).optional(),
      expense_ratio: z.number().min(0).optional(),
      management_style: z
        .enum(["active", "passive", "quantitative", "hybrid"])
        .optional(),
      benchmark: z.string().optional(), // Benchmark index
      portfolio_holdings: z.array(z.string()).optional(), // Holding UIDs
      fund_manager: z.string().optional(), // Manager organization UID
      inception_date: z.string().optional(),
      currency: z.string().optional(), // Base currency UID
      market: z.string().optional(), // Primary market UID
      dividend_yield: z.number().min(0).optional(),
      pe_ratio: z.number().min(0).optional(),
      market_cap: z.number().min(0).optional(),
      liquidity: z.enum(["high", "medium", "low"]).optional(),
      geographic_focus: z.array(z.string()).optional(), // Geographic regions
      sector_allocation: z.record(z.string(), z.number()).optional(), // Sector percentages
      status: z.enum(["active", "closed", "merged", "liquidated"]).optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const INVESTMENT_UID_PREFIX = "investment";

export const validateInvestmentUID = (uid: string): boolean => {
  return uid.startsWith("investment:");
};

// ==================== Type Exports ====================

export type InvestmentEntity = z.infer<typeof InvestmentEntitySchema>;
