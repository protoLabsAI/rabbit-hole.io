import type { DomainConfig } from "../../domain-system";

import { economicCardConfig } from "./card.config";
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

export const economicDomainConfig: DomainConfig = {
  name: "economic",
  displayName: "Economic",
  description: "Economic domain entities",
  category: "core",

  entities: {
    Currency: CurrencyEntitySchema,
    Market: MarketEntitySchema,
    Industry: IndustryEntitySchema,
    Commodity: CommodityEntitySchema,
    Investment: InvestmentEntitySchema,
    Company: CompanyEntitySchema,
  },

  enrichmentExamples: {
    Company: {
      input_text:
        "Apple Inc is a technology company founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne. The company is headquartered in Cupertino, California and employs over 160,000 people worldwide.",
      expected_output: {
        founded: "1976",
        headquarters: "Cupertino, California",
        industry: "technology",
        employees: 160000,
        founders: ["Steve Jobs", "Steve Wozniak", "Ronald Wayne"],
      },
    },
    Currency: {
      input_text:
        "The United States dollar is the official currency of the United States. It is issued by the Federal Reserve and is widely used as a reserve currency in international trade.",
      expected_output: {
        country: "United States",
        currencyCode: "USD",
        symbol: "$",
        issuer: "Federal Reserve",
      },
    },
    Market: {
      input_text:
        "The New York Stock Exchange (NYSE) is located in New York City and was founded in 1792. It is the world's largest stock exchange by market capitalization, with over 2,400 listed companies.",
      expected_output: {
        location: "New York City",
        founded: "1792",
        marketType: "stock exchange",
        listedCompanies: 2400,
      },
    },
    Industry: {
      input_text:
        "The automotive industry designs, develops, manufactures, and sells motor vehicles. Major companies include Toyota, Volkswagen, and General Motors. The industry employs millions worldwide.",
      expected_output: {
        sector: "manufacturing",
        products: ["motor vehicles"],
        majorCompanies: ["Toyota", "Volkswagen", "General Motors"],
        employment: "millions",
      },
    },
    Commodity: {
      input_text:
        "Crude oil is a naturally occurring petroleum product primarily used for energy production and transportation fuel. It is traded globally with prices quoted in US dollars per barrel.",
      expected_output: {
        commodityType: "energy",
        uses: ["energy production", "transportation fuel"],
        tradingUnit: "barrel",
        pricingCurrency: "USD",
      },
    },
    Investment: {
      input_text:
        "A certificate of deposit (CD) is a savings product offered by banks with a fixed interest rate and maturity date. CDs typically offer higher interest than savings accounts but require funds to remain deposited for a specified term.",
      expected_output: {
        investmentType: "savings product",
        issuer: "banks",
        features: ["fixed interest rate", "maturity date"],
        riskLevel: "low",
      },
    },
  },

  relationshipExample: {
    input_text:
      "Apple Inc trades on the NASDAQ market and competes with Samsung. Tesla produces electric vehicles in the automotive industry. Berkshire Hathaway invests in Apple, Bank of America, and American Express stock. Tesla acquires cutting-edge battery technology from Panasonic. The automotive industry trades with raw material suppliers including steel producers. Microsoft trades with enterprises for cloud computing services. Google and Meta compete for digital advertising market share. Elon Musk's ventures trade resources and personnel across Tesla and SpaceX.",
    expected_output: {
      relationships: [
        {
          source_entity: "Apple Inc",
          target_entity: "NASDAQ",
          relationship_type: "TRADED_IN",
          confidence: 0.99,
        },
        {
          source_entity: "Apple",
          target_entity: "Samsung",
          relationship_type: "COMPETES_WITH",
          confidence: 0.94,
        },
        {
          source_entity: "Tesla",
          target_entity: "electric vehicles",
          relationship_type: "PRODUCES",
          confidence: 0.98,
        },
        {
          source_entity: "Berkshire Hathaway",
          target_entity: "Apple",
          relationship_type: "INVESTS_IN",
          confidence: 0.97,
        },
        {
          source_entity: "Berkshire Hathaway",
          target_entity: "Bank of America",
          relationship_type: "INVESTS_IN",
          confidence: 0.96,
        },
        {
          source_entity: "Tesla",
          target_entity: "Panasonic",
          relationship_type: "ACQUIRES",
          confidence: 0.91,
        },
        {
          source_entity: "Automotive Industry",
          target_entity: "Steel suppliers",
          relationship_type: "TRADES_WITH",
          confidence: 0.88,
        },
        {
          source_entity: "Microsoft",
          target_entity: "Enterprise customers",
          relationship_type: "TRADES_WITH",
          confidence: 0.93,
        },
        {
          source_entity: "Google",
          target_entity: "Meta",
          relationship_type: "COMPETES_WITH",
          confidence: 0.95,
        },
        {
          source_entity: "Tesla",
          target_entity: "SpaceX",
          relationship_type: "TRADES_WITH",
          confidence: 0.87,
        },
      ],
    },
  },

  uidPrefixes: {
    Currency: CURRENCY_UID_PREFIX,
    Market: MARKET_UID_PREFIX,
    Industry: INDUSTRY_UID_PREFIX,
    Commodity: COMMODITY_UID_PREFIX,
    Investment: INVESTMENT_UID_PREFIX,
    Company: COMPANY_UID_PREFIX,
  },

  validators: {
    [CURRENCY_UID_PREFIX]: validateCurrencyUID,
    [MARKET_UID_PREFIX]: validateMarketUID,
    [INDUSTRY_UID_PREFIX]: validateIndustryUID,
    [COMMODITY_UID_PREFIX]: validateCommodityUID,
    [INVESTMENT_UID_PREFIX]: validateInvestmentUID,
    [COMPANY_UID_PREFIX]: validateCompanyUID,
  },

  relationships: [
    "TRADED_IN",
    "PRODUCES",
    "INVESTS_IN",
    "COMPETES_WITH",
    "ACQUIRES",
    "TRADES_WITH",
  ],

  ui: {
    color: "#F59E0B",
    icon: "💰",
    entityIcons: {
      Company: "🏢",
      Market: "📈",
      Currency: "💱",
      Industry: "🏭",
      Commodity: "📦",
      Investment: "💼",
    },
    card: economicCardConfig,
  },
};
