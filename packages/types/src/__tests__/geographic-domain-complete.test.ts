/**
 * Geographic Domain Complete - Test Suite
 *
 * Comprehensive tests for the complete geographic domain including
 * all 4 geographic entities: Country, City, Region, Continent.
 */

import { describe, it, expect } from "vitest";

import {
  GEOGRAPHIC_ENTITY_SCHEMAS,
  GEOGRAPHIC_UID_VALIDATORS,
  GEOGRAPHIC_ENTITY_TYPES,
  validateGeographicUID,
  getGeographicEntityType,
  isGeographicUID,
  CountryEntitySchema,
  CityEntitySchema,
  RegionEntitySchema,
  ContinentEntitySchema,
} from "../domains/geographic";
import { EntitySchemaRegistry } from "../entity-schema-registry";

describe.skip("Geographic Domain - Complete Migration", () => {
  // ==================== Registry Tests ====================

  describe("Domain Registry", () => {
    it("includes all 4 geographic entity types", () => {
      expect(GEOGRAPHIC_ENTITY_TYPES).toEqual([
        "Country",
        "City",
        "Region",
        "Continent",
      ]);
      expect(GEOGRAPHIC_ENTITY_TYPES).toHaveLength(4);
    });

    it("has schemas for all entity types", () => {
      expect(GEOGRAPHIC_ENTITY_SCHEMAS.Country).toBeDefined();
      expect(GEOGRAPHIC_ENTITY_SCHEMAS.City).toBeDefined();
      expect(GEOGRAPHIC_ENTITY_SCHEMAS.Region).toBeDefined();
      expect(GEOGRAPHIC_ENTITY_SCHEMAS.Continent).toBeDefined();
    });

    it("has UID validators for all entity types", () => {
      expect(GEOGRAPHIC_UID_VALIDATORS.country).toBeDefined();
      expect(GEOGRAPHIC_UID_VALIDATORS.city).toBeDefined();
      expect(GEOGRAPHIC_UID_VALIDATORS.region).toBeDefined();
      expect(GEOGRAPHIC_UID_VALIDATORS.continent).toBeDefined();
    });
  });

  // ==================== Country Entity Tests ====================

  describe("Country Entity", () => {
    it("validates valid country entity", () => {
      const validCountry = {
        uid: "country:united_states",
        type: "Country",
        name: "United States of America",
        properties: {
          independence: "1776-07-04",
          capital: "city:washington_dc",
          government: "Federal presidential constitutional republic",
          currency: "USD",
          region: "North America",
          population: 331900000,
          area: 9833517,
          gdp: 25462700000000,
          languages: ["English"],
          borders: ["country:canada", "country:mexico"],
          continent: "continent:north_america",
          iso_code: "US",
          calling_code: "+1",
          tld: ".us",
          un_member: true,
          sovereignty: "sovereign",
          development_status: "developed",
        },
      };

      const result = CountryEntitySchema.safeParse(validCountry);
      expect(result.success).toBe(true);
    });

    it("validates country UID format", () => {
      expect(validateGeographicUID("country:united_states")).toBe(true);
      expect(validateGeographicUID("country:japan")).toBe(true);
      expect(GEOGRAPHIC_UID_VALIDATORS.country("country:united_states")).toBe(
        true
      );
      expect(GEOGRAPHIC_UID_VALIDATORS.country("city:united_states")).toBe(
        false
      );
    });

    it("gets correct entity type from country UID", () => {
      expect(getGeographicEntityType("country:test")).toBe("Country");
      expect(isGeographicUID("country:test")).toBe(true);
    });
  });

  // ==================== City Entity Tests ====================

  describe("City Entity", () => {
    it("validates valid city entity", () => {
      const validCity = {
        uid: "city:new_york",
        type: "City",
        name: "New York City",
        properties: {
          founded: "1624",
          country: "country:united_states",
          region: "region:new_york_state",
          population: 8336817,
          area: 778.2,
          elevation: 10,
          timeZone: "America/New_York",
          mayor: "person:eric_adams",
          government: "Mayor-council",
          economy: ["finance", "technology", "media", "real_estate"],
          landmarks: ["landmark:statue_of_liberty", "landmark:empire_state"],
          sisterCities: ["city:london", "city:tokyo"],
          cityType: "metropolis",
          climate: "Humid subtropical",
          transportation: ["subway", "bus", "taxi", "ferry"],
          universities: ["org:columbia_university", "org:nyu"],
          gdp: 664000000000,
        },
      };

      const result = CityEntitySchema.safeParse(validCity);
      expect(result.success).toBe(true);
    });

    it("validates city UID format", () => {
      expect(validateGeographicUID("city:new_york")).toBe(true);
      expect(validateGeographicUID("city:london")).toBe(true);
      expect(GEOGRAPHIC_UID_VALIDATORS.city("city:new_york")).toBe(true);
      expect(GEOGRAPHIC_UID_VALIDATORS.city("country:new_york")).toBe(false);
    });

    it("gets correct entity type from city UID", () => {
      expect(getGeographicEntityType("city:test")).toBe("City");
      expect(isGeographicUID("city:test")).toBe(true);
    });
  });

  // ==================== Region Entity Tests ====================

  describe("Region Entity", () => {
    it("validates valid region entity", () => {
      const validRegion = {
        uid: "region:california",
        type: "Region",
        name: "California",
        properties: {
          regionType: "state",
          country: "country:united_states",
          capital: "city:sacramento",
          established: "1850-09-09",
          population: 39538223,
          area: 423970,
          governor: "person:gavin_newsom",
          legislature: "California State Legislature",
          majorCities: [
            "city:los_angeles",
            "city:san_francisco",
            "city:san_diego",
          ],
          economy: ["technology", "entertainment", "agriculture", "tourism"],
          naturalResources: ["oil", "natural_gas", "timber"],
          climate: "Mediterranean and desert",
          geography: "Mountains, valleys, coast, desert",
          borders: [
            "region:nevada",
            "region:oregon",
            "region:arizona",
            "country:mexico",
          ],
          languages: ["English", "Spanish"],
          autonomy_level: "limited",
          gdp: 3550000000000,
          timezone: "America/Los_Angeles",
        },
      };

      const result = RegionEntitySchema.safeParse(validRegion);
      expect(result.success).toBe(true);
    });

    it("validates region UID format", () => {
      expect(validateGeographicUID("region:california")).toBe(true);
      expect(validateGeographicUID("region:texas")).toBe(true);
      expect(GEOGRAPHIC_UID_VALIDATORS.region("region:california")).toBe(true);
      expect(GEOGRAPHIC_UID_VALIDATORS.region("city:california")).toBe(false);
    });

    it("gets correct entity type from region UID", () => {
      expect(getGeographicEntityType("region:test")).toBe("Region");
      expect(isGeographicUID("region:test")).toBe(true);
    });
  });

  // ==================== Continent Entity Tests ====================

  describe("Continent Entity", () => {
    it("validates valid continent entity", () => {
      const validContinent = {
        uid: "continent:north_america",
        type: "Continent",
        name: "North America",
        properties: {
          area: 24709000,
          population: 579000000,
          countries: [
            "country:united_states",
            "country:canada",
            "country:mexico",
          ],
          highestPoint: "Mount Denali (6,190 m)",
          lowestPoint: "Death Valley (-86 m)",
          majorRivers: ["Mississippi River", "Colorado River", "Yukon River"],
          majorMountainRanges: ["Rocky Mountains", "Appalachian Mountains"],
          climateZones: ["Arctic", "Temperate", "Subtropical", "Desert"],
          languages: ["English", "Spanish", "French"],
          timeZones: [
            "America/New_York",
            "America/Chicago",
            "America/Denver",
            "America/Los_Angeles",
          ],
          geology: "North American Plate",
          biodiversity: "Diverse ecosystems from Arctic to tropical",
          economicRegions: ["USMCA", "NAFTA successor"],
          culturalRegions: ["Anglo America", "Latin America"],
          majorCities: [
            "city:new_york",
            "city:los_angeles",
            "city:toronto",
            "city:mexico_city",
          ],
          coastlineLength: 202080,
          deserts: ["Sonoran Desert", "Chihuahuan Desert"],
          forests: ["Boreal Forest", "Temperate Rainforest"],
        },
      };

      const result = ContinentEntitySchema.safeParse(validContinent);
      expect(result.success).toBe(true);
    });

    it("validates continent UID format", () => {
      expect(validateGeographicUID("continent:north_america")).toBe(true);
      expect(validateGeographicUID("continent:europe")).toBe(true);
      expect(
        GEOGRAPHIC_UID_VALIDATORS.continent("continent:north_america")
      ).toBe(true);
      expect(GEOGRAPHIC_UID_VALIDATORS.continent("country:north_america")).toBe(
        false
      );
    });

    it("gets correct entity type from continent UID", () => {
      expect(getGeographicEntityType("continent:test")).toBe("Continent");
      expect(isGeographicUID("continent:test")).toBe(true);
    });
  });

  // ==================== Registry Integration Tests ====================

  describe("Registry Integration", () => {
    const registry = EntitySchemaRegistry.getInstance();

    it("registry recognizes all geographic entities", () => {
      expect(registry.getSchema("Country")).toBeDefined();
      expect(registry.getSchema("City")).toBeDefined();
      expect(registry.getSchema("Region")).toBeDefined();
      expect(registry.getSchema("Continent")).toBeDefined();
    });

    it("registry validates geographic UIDs correctly", () => {
      expect(registry.validateUID("country:test")).toBe(true);
      expect(registry.validateUID("city:test")).toBe(true);
      expect(registry.validateUID("region:test")).toBe(true);
      expect(registry.validateUID("continent:test")).toBe(true);
    });

    it("registry maps UIDs to correct domain", () => {
      expect(registry.getDomainFromUID("country:test")).toBe("geographic");
      expect(registry.getDomainFromUID("city:test")).toBe("geographic");
      expect(registry.getDomainFromUID("region:test")).toBe("geographic");
      expect(registry.getDomainFromUID("continent:test")).toBe("geographic");
    });
  });

  // ==================== Cross-Domain Integration Tests ====================

  describe("Cross-Domain Integration", () => {
    it("maintains all previously migrated domains", () => {
      const registry = EntitySchemaRegistry.getInstance();

      // Biological domain should still work
      expect(registry.getSchema("Animal")).toBeDefined();
      expect(registry.getSchema("Plant")).toBeDefined();

      // Social domain should still work
      expect(registry.getSchema("Person")).toBeDefined();
      expect(registry.getSchema("Organization")).toBeDefined();

      // Geographic domain should now work too
      expect(registry.getSchema("Country")).toBeDefined();
      expect(registry.getSchema("City")).toBeDefined();
      expect(registry.getSchema("Region")).toBeDefined();
      expect(registry.getSchema("Continent")).toBeDefined();
    });

    it("supports cross-domain relationships", () => {
      // Test that geographic entities can reference other domains
      const countryWithLeader = {
        uid: "country:test_country",
        type: "Country",
        name: "Test Country",
        properties: {
          capital: "city:test_capital",
          // Could reference person entities as leaders
        },
      };

      const result = CountryEntitySchema.safeParse(countryWithLeader);
      expect(result.success).toBe(true);
    });

    it("all geographic entities inherit universal properties", () => {
      const testCountry = {
        uid: "country:test",
        type: "Country",
        name: "Test Country",
        // Universal properties should be inherited
        coordinates: {
          latitude: 39.8283,
          longitude: -98.5795,
        },
        startDate: "1776-07-04",
        status: "active",
        relatedEvents: ["event:independence_day"],
      };

      const result = CountryEntitySchema.safeParse(testCountry);
      expect(result.success).toBe(true);
    });
  });

  // ==================== Domain Hierarchical Relationships ====================

  describe("Geographic Hierarchical Relationships", () => {
    it("supports hierarchical geographic structure", () => {
      const hierarchicalBundle = {
        entities: [
          {
            uid: "continent:north_america",
            type: "Continent",
            name: "North America",
          },
          {
            uid: "country:united_states",
            type: "Country",
            name: "United States",
            properties: { continent: "continent:north_america" },
          },
          {
            uid: "region:california",
            type: "Region",
            name: "California",
            properties: { country: "country:united_states" },
          },
          {
            uid: "city:san_francisco",
            type: "City",
            name: "San Francisco",
            properties: {
              country: "country:united_states",
              region: "region:california",
            },
          },
        ],
        relationships: [],
        evidence: [],
        content: [],
        files: [],
      };

      // All entities should validate correctly
      hierarchicalBundle.entities.forEach((entity) => {
        const schema =
          GEOGRAPHIC_ENTITY_SCHEMAS[
            entity.type as keyof typeof GEOGRAPHIC_ENTITY_SCHEMAS
          ];
        const result = schema.safeParse(entity);
        expect(result.success).toBe(true);
      });
    });
  });
});
