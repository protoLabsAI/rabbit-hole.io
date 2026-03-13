/**
 * Currency Entity Schema - Economic Domain
 *
 * Schema for currency entities in the economic domain.
 * Covers fiat currencies, cryptocurrencies, and commodity currencies.
 */

import { z } from "zod";

import { EntitySchema } from "../core/base-entity.schema";

// ==================== Currency Entity Schema ====================

export const CurrencyEntitySchema = EntitySchema.extend({
  type: z.literal("Currency"),
  properties: z
    .object({
      currency_code: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .optional(), // ISO 4217 code
      currency_type: z
        .enum(["fiat", "cryptocurrency", "commodity", "digital", "other"])
        .optional(),
      country_of_origin: z.string().optional(), // Country UID
      central_bank: z.string().optional(), // Central bank organization UID
      symbol: z.string().optional(),
      decimals: z.number().min(0).optional(),
      total_supply: z.number().min(0).optional(), // For cryptocurrencies
      market_cap: z.number().min(0).optional(),
      trading_pairs: z.array(z.string()).optional(), // Other currency UIDs
      exchanges: z.array(z.string()).optional(), // Market UIDs
      status: z.enum(["active", "discontinued", "deprecated"]).optional(),
      backing: z
        .enum(["gold_standard", "reserve_currency", "algorithmic", "none"])
        .optional(),
      inflation_rate: z.number().optional(),
      exchange_rate_usd: z.number().min(0).optional(),
      volatility: z.enum(["low", "moderate", "high", "extreme"]).optional(),
      adoption: z
        .enum(["widespread", "regional", "limited", "experimental"])
        .optional(),
    })
    .optional(),
});

// ==================== UID Validation ====================

export const CURRENCY_UID_PREFIX = "currency";

export const validateCurrencyUID = (uid: string): boolean => {
  return uid.startsWith("currency:");
};

// ==================== Type Exports ====================

export type CurrencyEntity = z.infer<typeof CurrencyEntitySchema>;
