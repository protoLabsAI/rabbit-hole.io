/**
 * Mock Data Generator
 *
 * Generates realistic test data for all entity types across 12 domains.
 * Provides different scenarios: minimal, complete, invalid, and edge cases.
 */

import { generateEntityUID } from "@protolabsai/types";

import { EntityType } from "../registry/DomainFormRegistry";

export type MockDataScenario = "minimal" | "complete" | "invalid" | "edge-case";

// Common mock data pools
const MOCK_DATA_POOLS = {
  names: {
    person: [
      "John Smith",
      "Jane Doe",
      "Robert Johnson",
      "Maria Garcia",
      "David Wilson",
    ],
    organization: [
      "Tech Corp",
      "Global Industries",
      "Innovation Labs",
      "Future Systems",
      "Alpha Group",
    ],
    location: ["New York", "London", "Tokyo", "Paris", "Berlin"],
    generic: ["Alpha", "Beta", "Gamma", "Delta", "Omega"],
  },
  dates: {
    recent: ["2024-01-15", "2024-03-22", "2024-06-10"],
    historical: ["1990-05-15", "2000-12-01", "2010-07-30"],
    future: ["2025-01-01", "2026-06-15", "2030-12-31"],
  },
  tags: ["important", "verified", "draft", "archived", "featured"],
  urls: ["https://example.com", "https://test.org", "https://demo.net"],
  emails: ["john@example.com", "jane@test.org", "admin@demo.net"],
} as const;

/**
 * Generate mock data for specific entity type and scenario
 */
export function generateMockData(
  entityType: EntityType,
  scenario: MockDataScenario = "complete"
): Record<string, any> {
  const baseData = generateBaseEntityData(entityType, scenario);
  const specificData = generateEntitySpecificData(entityType, scenario);

  return {
    ...baseData,
    ...specificData,
  };
}

/**
 * Generate base entity data (common to all entity types)
 */
function generateBaseEntityData(
  entityType: EntityType,
  scenario: MockDataScenario
): Record<string, any> {
  const name = getRandomFromPool(MOCK_DATA_POOLS.names.generic) as string;
  const uid = generateEntityUID(entityType, name);

  const base = {
    uid,
    type: entityType,
    name,
  };

  if (scenario === "minimal") {
    return base;
  }

  if (scenario === "invalid") {
    return {
      uid: "", // Invalid: empty UID
      type: "InvalidType",
      name: "", // Invalid: empty name
    };
  }

  // Complete scenario
  return {
    ...base,
    aliases: [name + " Alias", "Alternative Name"],
    tags: getRandomFromPool(MOCK_DATA_POOLS.tags, 2),
    created_date: getRandomFromPool(MOCK_DATA_POOLS.dates.recent),
    updated_date: getRandomFromPool(MOCK_DATA_POOLS.dates.recent),
    location_country: getRandomFromPool(MOCK_DATA_POOLS.names.location),
    location_city: getRandomFromPool(MOCK_DATA_POOLS.names.location),
    status: "active",
  };
}

/**
 * Generate entity-specific data based on type
 */
function generateEntitySpecificData(
  entityType: EntityType,
  scenario: MockDataScenario
): Record<string, any> {
  switch (entityType) {
    case "Person":
      return generatePersonData(scenario);
    case "Disease":
      return generateDiseaseData(scenario);
    case "Organization":
      return generateOrganizationData(scenario);
    case "Software":
      return generateSoftwareData(scenario);
    case "Planet":
      return generatePlanetData(scenario);
    case "Country":
      return generateCountryData(scenario);
    default:
      return generateGenericData(scenario);
  }
}

/**
 * Person-specific mock data
 */
function generatePersonData(scenario: MockDataScenario): Record<string, any> {
  if (scenario === "minimal") {
    return {};
  }

  if (scenario === "invalid") {
    return {
      age: -5, // Invalid: negative age
      gender: "invalid_gender",
      birthDate: "2024-13-45", // Invalid date format
    };
  }

  return {
    bio: "Experienced professional with expertise in their field. Known for innovative approaches and leadership skills.",
    birthDate: "1985-06-15",
    birthPlace: "San Francisco, CA",
    nationality: "American",
    occupation: "Software Engineer",
    age: 38,
    gender: "male",
    socialMedia: {
      twitter: "@johndoe",
      linkedin: "linkedin.com/in/johndoe",
      website: "https://johndoe.com",
    },
    contactInfo: {
      email: "john@example.com",
      phone: "+1-555-0123",
      website: "https://johndoe.com",
    },
    education: ["BS Computer Science - MIT", "MS Engineering - Stanford"],
    spouse: ["person:jane_doe"],
    children: ["person:junior_doe"],
    netWorth: 2500000,
    residence: "Palo Alto, CA",
  };
}

/**
 * Disease-specific mock data
 */
function generateDiseaseData(scenario: MockDataScenario): Record<string, any> {
  if (scenario === "minimal") {
    return { properties: {} };
  }

  if (scenario === "invalid") {
    return {
      properties: {
        mortality_rate: 1.5, // Invalid: > 1.0
        prevalence: -100, // Invalid: negative
      },
    };
  }

  return {
    properties: {
      disease_type: "infectious",
      icd_code: "A00.0",
      prevalence: 15000,
      mortality_rate: 0.02,
      age_of_onset: "adult",
      affected_organs: ["respiratory", "cardiovascular"],
      symptoms: ["fever", "cough", "fatigue"],
      risk_factors: ["age_over_65", "smoking", "diabetes"],
      chronic: false,
      contagious: true,
      hereditary: false,
      prognosis: "good",
    },
  };
}

/**
 * Organization-specific mock data
 */
function generateOrganizationData(
  scenario: MockDataScenario
): Record<string, any> {
  if (scenario === "minimal") {
    return {};
  }

  return {
    founded: "2010-03-15",
    organizationType: "corporation",
    industry: "technology",
    size: "large",
    revenue: 5000000000,
    employees: 10000,
    headquarters: "San Francisco, CA",
    website: "https://example.com",
    parentOrganization: "parent_corp:big_holdings",
  };
}

/**
 * Software-specific mock data
 */
function generateSoftwareData(scenario: MockDataScenario): Record<string, any> {
  if (scenario === "minimal") {
    return { properties: {} };
  }

  return {
    properties: {
      version: "2.1.0",
      license: "MIT",
      language: "TypeScript",
      platform: "web",
      category: "productivity",
      open_source: true,
      repository: "https://github.com/example/software",
      documentation: "https://docs.example.com",
      dependencies: ["react", "next.js", "tailwindcss"],
    },
  };
}

/**
 * Planet-specific mock data
 */
function generatePlanetData(scenario: MockDataScenario): Record<string, any> {
  if (scenario === "minimal") {
    return { properties: {} };
  }

  return {
    properties: {
      planetType: "terrestrial",
      mass: 5.972, // Earth masses
      diameter: 12742, // kilometers
      orbital_period: 365.25, // days
      distance_from_star: 149.6, // million km
      habitabilityIndex: 1.0,
      moons: 1,
      atmosphere: ["nitrogen", "oxygen"],
    },
  };
}

/**
 * Country-specific mock data
 */
function generateCountryData(scenario: MockDataScenario): Record<string, any> {
  if (scenario === "minimal") {
    return {};
  }

  return {
    iso_code: "US",
    capital: "Washington D.C.",
    population: 331000000,
    area: 9833517, // km²
    currency: "USD",
    languages: ["English"],
    government_type: "federal_republic",
    gdp: 21430000000000, // USD
    time_zones: ["UTC-5", "UTC-8", "UTC-10"],
    independence_date: "1776-07-04",
  };
}

/**
 * Generic data for entity types without specific generators
 */
function generateGenericData(scenario: MockDataScenario): Record<string, any> {
  if (scenario === "minimal") {
    return { properties: {} };
  }

  return {
    properties: {
      category: "general",
      status: "active",
      priority: "medium",
      notes: "Generated mock data for testing purposes",
    },
  };
}

/**
 * Utility: Get random item(s) from pool
 */
function getRandomFromPool<T>(pool: readonly T[], count = 1): T | T[] {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return count === 1 ? shuffled[0] : shuffled.slice(0, count);
}

/**
 * Generate multiple mock entities for testing
 */
export function generateMockEntities(
  entityType: EntityType,
  count: number,
  scenario: MockDataScenario = "complete"
): Record<string, any>[] {
  return Array.from({ length: count }, (_, index) => {
    const name = `Mock ${entityType} ${index + 1}`;
    const uid = generateEntityUID(entityType, name);
    return {
      ...generateMockData(entityType, scenario),
      uid,
      name,
    };
  });
}

/**
 * Generate mock data for all scenarios (useful for Storybook)
 */
export function generateAllScenarios(entityType: EntityType) {
  return {
    minimal: generateMockData(entityType, "minimal"),
    complete: generateMockData(entityType, "complete"),
    invalid: generateMockData(entityType, "invalid"),
    edgeCase: generateMockData(entityType, "edge-case"),
  };
}
