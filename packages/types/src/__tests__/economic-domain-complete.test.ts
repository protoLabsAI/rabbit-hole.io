/**
 * Economic Domain Complete - Test Suite
 *
 * Comprehensive tests for the complete economic domain including
 * all 6 economic entities: Currency, Market, Industry, Commodity, Investment, Company.
 */

import { describe, it, expect } from "vitest";

import {
  ECONOMIC_ENTITY_SCHEMAS,
  ECONOMIC_UID_VALIDATORS,
  ECONOMIC_ENTITY_TYPES,
  validateEconomicUID,
  getEconomicEntityType,
  isEconomicUID,
  CurrencyEntitySchema,
  MarketEntitySchema,
  IndustryEntitySchema,
  CommodityEntitySchema,
  InvestmentEntitySchema,
  CompanyEntitySchema,
} from "../domains/economic";
import { EntitySchemaRegistry } from "../entity-schema-registry";

describe("Economic Domain - Complete Migration", () => {
  // ==================== Registry Tests ====================

  describe("Domain Registry", () => {
    it("includes all 6 economic entity types", () => {
      expect(ECONOMIC_ENTITY_TYPES).toEqual([
        "Currency",
        "Market",
        "Industry",
        "Commodity",
        "Investment",
        "Company",
      ]);
      expect(ECONOMIC_ENTITY_TYPES).toHaveLength(6);
    });

    it("has schemas for all entity types", () => {
      expect(ECONOMIC_ENTITY_SCHEMAS.Currency).toBeDefined();
      expect(ECONOMIC_ENTITY_SCHEMAS.Market).toBeDefined();
      expect(ECONOMIC_ENTITY_SCHEMAS.Industry).toBeDefined();
      expect(ECONOMIC_ENTITY_SCHEMAS.Commodity).toBeDefined();
      expect(ECONOMIC_ENTITY_SCHEMAS.Investment).toBeDefined();
      expect(ECONOMIC_ENTITY_SCHEMAS.Company).toBeDefined();
    });

    it("has UID validators for all entity types", () => {
      expect(ECONOMIC_UID_VALIDATORS.currency).toBeDefined();
      expect(ECONOMIC_UID_VALIDATORS.market).toBeDefined();
      expect(ECONOMIC_UID_VALIDATORS.industry).toBeDefined();
      expect(ECONOMIC_UID_VALIDATORS.commodity).toBeDefined();
      expect(ECONOMIC_UID_VALIDATORS.investment).toBeDefined();
      expect(ECONOMIC_UID_VALIDATORS.company).toBeDefined();
    });
  });

  // ==================== Currency Entity Tests ====================

  describe("Currency Entity", () => {
    it("validates valid currency entity", () => {
      const validCurrency = {
        uid: "currency:usd",
        type: "Currency",
        name: "United States Dollar",
        properties: {
          currency_code: "USD",
          currency_type: "fiat",
          country_of_origin: "country:united_states",
          central_bank: "org:federal_reserve",
          symbol: "$",
          decimals: 2,
          market_cap: 2100000000000,
          trading_pairs: ["currency:eur", "currency:jpy", "currency:gbp"],
          exchanges: ["market:forex"],
          status: "active",
          backing: "reserve_currency",
          inflation_rate: 3.2,
          exchange_rate_usd: 1.0,
          volatility: "low",
          adoption: "widespread",
        },
      };

      const result = CurrencyEntitySchema.safeParse(validCurrency);
      expect(result.success).toBe(true);
    });

    it("validates currency UID format", () => {
      expect(validateEconomicUID("currency:usd")).toBe(true);
      expect(ECONOMIC_UID_VALIDATORS.currency("currency:usd")).toBe(true);
      expect(ECONOMIC_UID_VALIDATORS.currency("market:usd")).toBe(false);
    });

    it("gets correct entity type from currency UID", () => {
      expect(getEconomicEntityType("currency:test")).toBe("Currency");
      expect(isEconomicUID("currency:test")).toBe(true);
    });
  });

  // ==================== Market Entity Tests ====================

  describe("Market Entity", () => {
    it("validates valid market entity", () => {
      const validMarket = {
        uid: "market:nyse",
        type: "Market",
        name: "New York Stock Exchange",
        properties: {
          market_type: "stock",
          exchange_name: "NYSE",
          trading_hours: "9:30 AM - 4:00 PM EST",
          time_zone: "America/New_York",
          currency: "currency:usd",
          market_cap: 26000000000000,
          daily_volume: 50000000000,
          established: "1792",
          regulator: "org:sec",
          location: "city:new_york",
          participants: ["org:goldman_sachs", "org:morgan_stanley"],
          trading_system: "electronic",
          settlement_period: "T+2",
          listing_requirements: ["minimum market cap", "financial reporting"],
          fee_structure: "Variable",
          market_indices: ["investment:dow_jones", "investment:sp500"],
          status: "active",
          liquidity: "high",
        },
      };

      const result = MarketEntitySchema.safeParse(validMarket);
      expect(result.success).toBe(true);
    });

    it("validates market UID format", () => {
      expect(validateEconomicUID("market:nyse")).toBe(true);
      expect(ECONOMIC_UID_VALIDATORS.market("market:nyse")).toBe(true);
      expect(ECONOMIC_UID_VALIDATORS.market("currency:nyse")).toBe(false);
    });

    it("gets correct entity type from market UID", () => {
      expect(getEconomicEntityType("market:test")).toBe("Market");
      expect(isEconomicUID("market:test")).toBe(true);
    });
  });

  // ==================== Industry Entity Tests ====================

  describe("Industry Entity", () => {
    it("validates valid industry entity", () => {
      const validIndustry = {
        uid: "industry:technology",
        type: "Industry",
        name: "Technology Industry",
        properties: {
          industry_code: "NAICS 54",
          sector: "Information",
          market_size: 5000000000000,
          growth_rate: 8.5,
          key_players: ["company:apple", "company:microsoft", "company:google"],
          products_services: ["Software", "Hardware", "Cloud Services"],
          supply_chain: [
            "industry:semiconductors",
            "industry:telecommunications",
          ],
          regulatory_bodies: ["org:fcc", "org:ftc"],
          barriers_to_entry: [
            "High capital requirements",
            "Technical expertise",
          ],
          trends: ["AI adoption", "Cloud migration", "Remote work"],
          employment: 4500000,
          location_concentration: ["region:silicon_valley", "region:seattle"],
          competitive_landscape: "competitive",
          cyclicality: "growth",
          capital_intensity: "medium",
          technology_adoption: "innovator",
          environmental_impact: "medium",
          globalization: "global",
        },
      };

      const result = IndustryEntitySchema.safeParse(validIndustry);
      expect(result.success).toBe(true);
    });

    it("validates industry UID format", () => {
      expect(validateEconomicUID("industry:technology")).toBe(true);
      expect(ECONOMIC_UID_VALIDATORS.industry("industry:technology")).toBe(
        true
      );
      expect(ECONOMIC_UID_VALIDATORS.industry("company:technology")).toBe(
        false
      );
    });

    it("gets correct entity type from industry UID", () => {
      expect(getEconomicEntityType("industry:test")).toBe("Industry");
      expect(isEconomicUID("industry:test")).toBe(true);
    });
  });

  // ==================== Commodity Entity Tests ====================

  describe("Commodity Entity", () => {
    it("validates valid commodity entity", () => {
      const validCommodity = {
        uid: "commodity:crude_oil",
        type: "Commodity",
        name: "Crude Oil",
        properties: {
          commodity_type: "energy",
          trading_unit: "barrels",
          exchanges: ["market:nymex", "market:ice"],
          major_producers: ["country:saudi_arabia", "country:united_states"],
          major_consumers: ["country:china", "country:united_states"],
          seasonal_patterns: false,
          storage_requirements: "Tank farms, strategic reserves",
          quality_grades: ["WTI", "Brent", "Dubai"],
          price_volatility: "high",
          strategic_importance: "critical",
          substitute_goods: [
            "commodity:natural_gas",
            "commodity:renewable_energy",
          ],
          production_cost: 45,
          transportation_method: ["Pipeline", "Tanker", "Rail"],
          environmental_impact: "high",
          price_drivers: [
            "OPEC decisions",
            "Geopolitical events",
            "Economic growth",
          ],
          global_reserves: 1700000000000,
          annual_production: 36000000000,
          futures_contracts: true,
        },
      };

      const result = CommodityEntitySchema.safeParse(validCommodity);
      expect(result.success).toBe(true);
    });

    it("validates commodity UID format", () => {
      expect(validateEconomicUID("commodity:crude_oil")).toBe(true);
      expect(ECONOMIC_UID_VALIDATORS.commodity("commodity:crude_oil")).toBe(
        true
      );
      expect(ECONOMIC_UID_VALIDATORS.commodity("currency:crude_oil")).toBe(
        false
      );
    });

    it("gets correct entity type from commodity UID", () => {
      expect(getEconomicEntityType("commodity:test")).toBe("Commodity");
      expect(isEconomicUID("commodity:test")).toBe(true);
    });
  });

  // ==================== Investment Entity Tests ====================

  describe("Investment Entity", () => {
    it("validates valid investment entity", () => {
      const validInvestment = {
        uid: "investment:sp500_etf",
        type: "Investment",
        name: "S&P 500 ETF",
        properties: {
          investment_type: "etf",
          ticker_symbol: "SPY",
          asset_class: "equity",
          risk_level: "moderate",
          minimum_investment: 1,
          expense_ratio: 0.09,
          management_style: "passive",
          benchmark: "S&P 500 Index",
          portfolio_holdings: ["company:apple", "company:microsoft"],
          fund_manager: "org:state_street",
          inception_date: "1993-01-22",
          currency: "currency:usd",
          market: "market:nyse",
          dividend_yield: 1.8,
          market_cap: 400000000000,
          liquidity: "high",
          geographic_focus: ["country:united_states"],
          sector_allocation: {
            technology: 28,
            healthcare: 13,
            financials: 11,
          },
          status: "active",
        },
      };

      const result = InvestmentEntitySchema.safeParse(validInvestment);
      expect(result.success).toBe(true);
    });

    it("validates investment UID format", () => {
      expect(validateEconomicUID("investment:sp500_etf")).toBe(true);
      expect(ECONOMIC_UID_VALIDATORS.investment("investment:sp500_etf")).toBe(
        true
      );
      expect(ECONOMIC_UID_VALIDATORS.investment("company:sp500_etf")).toBe(
        false
      );
    });

    it("gets correct entity type from investment UID", () => {
      expect(getEconomicEntityType("investment:test")).toBe("Investment");
      expect(isEconomicUID("investment:test")).toBe(true);
    });
  });

  // ==================== Company Entity Tests ====================

  describe("Company Entity", () => {
    it("validates valid company entity", () => {
      const validCompany = {
        uid: "company:apple",
        type: "Company",
        name: "Apple Inc.",
        properties: {
          legal_name: "Apple Inc.",
          ticker_symbol: "AAPL",
          exchange: "market:nasdaq",
          industry: "industry:technology",
          sector: "Technology",
          incorporated: "1976-04-01",
          headquarters: "city:cupertino",
          employees: 164000,
          market_cap: 3000000000000,
          revenue: 394000000000,
          business_model: "Hardware and software products",
          subsidiaries: ["company:beats_electronics"],
          leadership: {
            ceo: "person:tim_cook",
            cfo: "person:luca_maestri",
          },
          public_private: "public",
          fiscal_year_end: "September",
          ipo_date: "1980-12-12",
          dividend_yield: 0.5,
          pe_ratio: 29,
          debt_to_equity: 1.8,
          profit_margin: 27,
          competitors: ["company:samsung", "company:microsoft"],
          products: ["iPhone", "Mac", "iPad", "Apple Watch"],
          services: ["App Store", "iCloud", "Apple Music"],
          geographic_presence: ["country:united_states", "country:china"],
          environmental_rating: "A",
          governance_rating: "A",
          credit_rating: "AAA",
        },
      };

      const result = CompanyEntitySchema.safeParse(validCompany);
      expect(result.success).toBe(true);
    });

    it("validates company UID format", () => {
      expect(validateEconomicUID("company:apple")).toBe(true);
      expect(ECONOMIC_UID_VALIDATORS.company("company:apple")).toBe(true);
      expect(ECONOMIC_UID_VALIDATORS.company("org:apple")).toBe(false);
    });

    it("gets correct entity type from company UID", () => {
      expect(getEconomicEntityType("company:test")).toBe("Company");
      expect(isEconomicUID("company:test")).toBe(true);
    });
  });

  // ==================== Registry Integration Tests ====================

  describe("Registry Integration", () => {
    const registry = EntitySchemaRegistry.getInstance();

    it("registry recognizes all economic entities", () => {
      expect(registry.getSchema("Currency")).toBeDefined();
      expect(registry.getSchema("Market")).toBeDefined();
      expect(registry.getSchema("Industry")).toBeDefined();
      expect(registry.getSchema("Commodity")).toBeDefined();
      expect(registry.getSchema("Investment")).toBeDefined();
      expect(registry.getSchema("Company")).toBeDefined();
    });

    it("registry validates economic UIDs correctly", () => {
      expect(registry.validateUID("currency:test")).toBe(true);
      expect(registry.validateUID("market:test")).toBe(true);
      expect(registry.validateUID("industry:test")).toBe(true);
      expect(registry.validateUID("commodity:test")).toBe(true);
      expect(registry.validateUID("investment:test")).toBe(true);
      expect(registry.validateUID("company:test")).toBe(true);
    });

    it("registry maps UIDs to correct domain", () => {
      expect(registry.getDomainFromUID("currency:test")).toBe("economic");
      expect(registry.getDomainFromUID("market:test")).toBe("economic");
      expect(registry.getDomainFromUID("industry:test")).toBe("economic");
      expect(registry.getDomainFromUID("commodity:test")).toBe("economic");
      expect(registry.getDomainFromUID("investment:test")).toBe("economic");
      expect(registry.getDomainFromUID("company:test")).toBe("economic");
    });
  });

  // ==================== Cross-Domain Integration Tests ====================

  describe("Cross-Domain Integration", () => {
    it("maintains all previously migrated domains", () => {
      const registry = EntitySchemaRegistry.getInstance();

      // All previous domains should still work
      expect(registry.getSchema("Animal")).toBeDefined();
      expect(registry.getSchema("Person")).toBeDefined();
      expect(registry.getSchema("Country")).toBeDefined();
      expect(registry.getSchema("Software")).toBeDefined();

      // Economic domain should now work too
      expect(registry.getSchema("Currency")).toBeDefined();
      expect(registry.getSchema("Market")).toBeDefined();
      expect(registry.getSchema("Company")).toBeDefined();
    });

    it("supports cross-domain economic relationships", () => {
      // Test that economic entities can reference other domains
      const companyWithHeadquarters = {
        uid: "company:tech_corp",
        type: "Company",
        name: "Tech Corp",
        properties: {
          headquarters: "city:san_francisco", // Geographic domain
          industry: "industry:technology", // Economic domain
          leadership: { ceo: "person:john_doe" }, // Social domain
        },
      };

      const result = CompanyEntitySchema.safeParse(companyWithHeadquarters);
      expect(result.success).toBe(true);
    });

    it("all economic entities inherit universal properties", () => {
      const testCompany = {
        uid: "company:test",
        type: "Company",
        name: "Test Company",
        // Universal properties should be inherited
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        startDate: "2020-01-01",
        status: "active",
        relatedEvents: ["event:company_founding"],
      };

      const result = CompanyEntitySchema.safeParse(testCompany);
      expect(result.success).toBe(true);
    });
  });

  // ==================== Economic Ecosystem Tests ====================

  describe("Economic Ecosystem Relationships", () => {
    it("supports complete economic ecosystem", () => {
      const economicBundle = {
        entities: [
          {
            uid: "currency:usd",
            type: "Currency",
            name: "US Dollar",
            properties: { currency_code: "USD" },
          },
          {
            uid: "market:nasdaq",
            type: "Market",
            name: "NASDAQ",
            properties: {
              market_type: "stock",
              currency: "currency:usd",
            },
          },
          {
            uid: "company:apple",
            type: "Company",
            name: "Apple Inc.",
            properties: {
              ticker_symbol: "AAPL",
              exchange: "market:nasdaq",
            },
          },
          {
            uid: "investment:aapl_stock",
            type: "Investment",
            name: "Apple Stock",
            properties: {
              investment_type: "stock",
              ticker_symbol: "AAPL",
              market: "market:nasdaq",
            },
          },
          {
            uid: "industry:technology",
            type: "Industry",
            name: "Technology",
            properties: { key_players: ["company:apple"] },
          },
          {
            uid: "commodity:rare_earth",
            type: "Commodity",
            name: "Rare Earth Metals",
            properties: { commodity_type: "metals" },
          },
        ],
        relationships: [],
        evidence: [],
        content: [],
        files: [],
      };

      // All entities should validate correctly
      economicBundle.entities.forEach((entity) => {
        const schema =
          ECONOMIC_ENTITY_SCHEMAS[
            entity.type as keyof typeof ECONOMIC_ENTITY_SCHEMAS
          ];
        const result = schema.safeParse(entity);
        expect(result.success).toBe(true);
      });
    });
  });
});
