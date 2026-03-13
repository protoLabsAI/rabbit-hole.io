/**
 * Economic Domain - Index
 *
 * Exports all economic entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

export * from "./currency.schema";
export * from "./market.schema";
export * from "./industry.schema";
export * from "./commodity.schema";
export * from "./investment.schema";
export * from "./company.schema";

import type { DomainMetadata } from "../../domain-metadata";

import {
  CommodityEntitySchema,
  validateCommodityUID,
  COMMODITY_UID_PREFIX,
} from "./commodity.schema";
import {
  CompanyEntitySchema,
  validateCompanyUID,
  COMPANY_UID_PREFIX,
} from "./company.schema";
import {
  CurrencyEntitySchema,
  validateCurrencyUID,
  CURRENCY_UID_PREFIX,
} from "./currency.schema";
import {
  IndustryEntitySchema,
  validateIndustryUID,
  INDUSTRY_UID_PREFIX,
} from "./industry.schema";
import {
  InvestmentEntitySchema,
  validateInvestmentUID,
  INVESTMENT_UID_PREFIX,
} from "./investment.schema";
import {
  MarketEntitySchema,
  validateMarketUID,
  MARKET_UID_PREFIX,
} from "./market.schema";

// ==================== Domain Registry ====================

/**
 * All economic entity schemas mapped by type name
 */
export const ECONOMIC_ENTITY_SCHEMAS = {
  Currency: CurrencyEntitySchema,
  Market: MarketEntitySchema,
  Industry: IndustryEntitySchema,
  Commodity: CommodityEntitySchema,
  Investment: InvestmentEntitySchema,
  Company: CompanyEntitySchema,
} as const;

/**
 * All economic entity types
 */
export const ECONOMIC_ENTITY_TYPES = Object.keys(
  ECONOMIC_ENTITY_SCHEMAS
) as Array<keyof typeof ECONOMIC_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for economic entities
 */
export const ECONOMIC_UID_PREFIXES = {
  [CURRENCY_UID_PREFIX]: "Currency",
  [MARKET_UID_PREFIX]: "Market",
  [INDUSTRY_UID_PREFIX]: "Industry",
  [COMMODITY_UID_PREFIX]: "Commodity",
  [INVESTMENT_UID_PREFIX]: "Investment",
  [COMPANY_UID_PREFIX]: "Company",
} as const;

/**
 * UID validators for economic entities
 */
export const ECONOMIC_UID_VALIDATORS = {
  [CURRENCY_UID_PREFIX]: validateCurrencyUID,
  [MARKET_UID_PREFIX]: validateMarketUID,
  [INDUSTRY_UID_PREFIX]: validateIndustryUID,
  [COMMODITY_UID_PREFIX]: validateCommodityUID,
  [INVESTMENT_UID_PREFIX]: validateInvestmentUID,
  [COMPANY_UID_PREFIX]: validateCompanyUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the economic domain
 */
export function isEconomicUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in ECONOMIC_UID_VALIDATORS;
}

/**
 * Get entity type from economic UID
 */
export function getEconomicEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    ECONOMIC_UID_PREFIXES[prefix as keyof typeof ECONOMIC_UID_PREFIXES] || null
  );
}

/**
 * Validate economic UID format
 */
export function validateEconomicUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    ECONOMIC_UID_VALIDATORS[prefix as keyof typeof ECONOMIC_UID_VALIDATORS];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { economicDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use economicDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const ECONOMIC_DOMAIN_INFO: DomainMetadata = {
  name: "economic",
  description:
    "Economic entities - currencies, markets, industries, commodities, investments, companies",
  entityCount: Object.keys(ECONOMIC_ENTITY_SCHEMAS).length,
  relationships: [
    "TRADES_WITH",
    "INVESTS_IN",
    "COMPETES_WITH",
    "SUPPLIES",
    "DEPENDS_ON",
    "OWNS",
    "FUNDS",
    "REGULATES",
    "LISTED_ON",
    "DENOMINATED_IN",
  ],
  ui: {
    color: "#F59E0B", // Amber - money/value
    icon: "💰", // Money/economics
    entityIcons: {
      Currency: "💱",
      Market: "📈",
      Industry: "🏭",
      Commodity: "📦",
      Investment: "💸",
      Company: "🏢",
      Resource: "⛽",
      Renewable_Energy: "♻️",
    },
  },
} as const;
