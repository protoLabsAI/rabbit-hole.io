/**
 * Infrastructure Domain Complete - Test Suite
 *
 * Comprehensive tests for the complete infrastructure domain including
 * all 7 infrastructure entities.
 */

import { describe, it, expect } from "vitest";

import {
  INFRASTRUCTURE_ENTITY_SCHEMAS,
  INFRASTRUCTURE_UID_VALIDATORS,
  INFRASTRUCTURE_ENTITY_TYPES,
  validateInfrastructureUID,
  getInfrastructureEntityType,
  isInfrastructureUID,
  BuildingEntitySchema,
  AirportEntitySchema,
} from "../domains/infrastructure";
import { EntitySchemaRegistry } from "../entity-schema-registry";

describe("Infrastructure Domain - Complete Migration", () => {
  // ==================== Registry Tests ====================

  describe("Domain Registry", () => {
    it("includes all 7 infrastructure entity types", () => {
      expect(INFRASTRUCTURE_ENTITY_TYPES).toEqual([
        "Building",
        "Bridge",
        "Road",
        "Airport",
        "Port",
        "Utility",
        "Pipeline",
      ]);
      expect(INFRASTRUCTURE_ENTITY_TYPES).toHaveLength(7);
    });

    it("has schemas for all entity types", () => {
      expect(INFRASTRUCTURE_ENTITY_SCHEMAS.Building).toBeDefined();
      expect(INFRASTRUCTURE_ENTITY_SCHEMAS.Bridge).toBeDefined();
      expect(INFRASTRUCTURE_ENTITY_SCHEMAS.Road).toBeDefined();
      expect(INFRASTRUCTURE_ENTITY_SCHEMAS.Airport).toBeDefined();
      expect(INFRASTRUCTURE_ENTITY_SCHEMAS.Port).toBeDefined();
      expect(INFRASTRUCTURE_ENTITY_SCHEMAS.Utility).toBeDefined();
      expect(INFRASTRUCTURE_ENTITY_SCHEMAS.Pipeline).toBeDefined();
    });

    it("has UID validators for all entity types", () => {
      expect(INFRASTRUCTURE_UID_VALIDATORS.building).toBeDefined();
      expect(INFRASTRUCTURE_UID_VALIDATORS.bridge).toBeDefined();
      expect(INFRASTRUCTURE_UID_VALIDATORS.road).toBeDefined();
      expect(INFRASTRUCTURE_UID_VALIDATORS.airport).toBeDefined();
      expect(INFRASTRUCTURE_UID_VALIDATORS.port).toBeDefined();
      expect(INFRASTRUCTURE_UID_VALIDATORS.utility).toBeDefined();
      expect(INFRASTRUCTURE_UID_VALIDATORS.pipeline).toBeDefined();
    });
  });

  // ==================== Building Entity Tests ====================

  describe("Building Entity", () => {
    it("validates valid building entity", () => {
      const validBuilding = {
        uid: "building:empire_state",
        type: "Building",
        name: "Empire State Building",
        properties: {
          building_type: "commercial",
          construction_date: "1930",
          completion_date: "1931",
          height: 381,
          floors: 102,
          floor_area: 257000,
          capacity: 20000,
          energy_rating: "B",
          architect: "person:william_lamb",
          developer: "org:raskob_smith",
          owner: "org:empire_state_realty_trust",
          construction_cost: 40800000,
          property_value: 2000000000,
          accessibility_compliant: true,
          parking_spaces: 0,
          safety_rating: "A",
        },
      };

      const result = BuildingEntitySchema.safeParse(validBuilding);
      expect(result.success).toBe(true);
    });

    it("validates building UID format", () => {
      expect(validateInfrastructureUID("building:empire_state")).toBe(true);
      expect(
        INFRASTRUCTURE_UID_VALIDATORS.building("building:empire_state")
      ).toBe(true);
      expect(
        INFRASTRUCTURE_UID_VALIDATORS.building("bridge:empire_state")
      ).toBe(false);
    });

    it("gets correct entity type from building UID", () => {
      expect(getInfrastructureEntityType("building:test")).toBe("Building");
      expect(isInfrastructureUID("building:test")).toBe(true);
    });
  });

  // ==================== Airport Entity Tests ====================

  describe("Airport Entity", () => {
    it("validates valid airport entity", () => {
      const validAirport = {
        uid: "airport:jfk",
        type: "Airport",
        name: "John F. Kennedy International Airport",
        properties: {
          airport_code: "JFK",
          airport_type: "international",
          opened_date: "1948",
          elevation: 4,
          runway_count: 4,
          longest_runway: 4441,
          passenger_capacity: 75000000,
          cargo_capacity: 2000000,
          terminal_count: 6,
          gates: 128,
          parking_spaces: 17000,
          annual_passengers: 62000000,
          annual_operations: 446000,
          airlines: ["org:delta", "org:jetblue", "org:american"],
          destinations: ["airport:lhr", "airport:cdg"],
          customs_facility: true,
          immigration_facility: true,
          duty_free: true,
          wifi_available: true,
          hotel_onsite: false,
          security_level: "enhanced",
        },
      };

      const result = AirportEntitySchema.safeParse(validAirport);
      expect(result.success).toBe(true);
    });

    it("validates airport UID format", () => {
      expect(validateInfrastructureUID("airport:jfk")).toBe(true);
      expect(INFRASTRUCTURE_UID_VALIDATORS.airport("airport:jfk")).toBe(true);
      expect(INFRASTRUCTURE_UID_VALIDATORS.airport("building:jfk")).toBe(false);
    });

    it("gets correct entity type from airport UID", () => {
      expect(getInfrastructureEntityType("airport:test")).toBe("Airport");
      expect(isInfrastructureUID("airport:test")).toBe(true);
    });
  });

  // ==================== Registry Integration Tests ====================

  describe("Registry Integration", () => {
    const registry = EntitySchemaRegistry.getInstance();

    it("registry recognizes all infrastructure entities", () => {
      expect(registry.getSchema("Building")).toBeDefined();
      expect(registry.getSchema("Bridge")).toBeDefined();
      expect(registry.getSchema("Road")).toBeDefined();
      expect(registry.getSchema("Airport")).toBeDefined();
      expect(registry.getSchema("Port")).toBeDefined();
      expect(registry.getSchema("Utility")).toBeDefined();
      expect(registry.getSchema("Pipeline")).toBeDefined();
    });

    it("registry validates infrastructure UIDs correctly", () => {
      expect(registry.validateUID("building:test")).toBe(true);
      expect(registry.validateUID("bridge:test")).toBe(true);
      expect(registry.validateUID("road:test")).toBe(true);
      expect(registry.validateUID("airport:test")).toBe(true);
      expect(registry.validateUID("port:test")).toBe(true);
      expect(registry.validateUID("utility:test")).toBe(true);
      expect(registry.validateUID("pipeline:test")).toBe(true);
    });

    it("registry maps UIDs to correct domain", () => {
      expect(registry.getDomainFromUID("building:test")).toBe("infrastructure");
      expect(registry.getDomainFromUID("bridge:test")).toBe("infrastructure");
      expect(registry.getDomainFromUID("road:test")).toBe("infrastructure");
      expect(registry.getDomainFromUID("airport:test")).toBe("infrastructure");
      expect(registry.getDomainFromUID("port:test")).toBe("infrastructure");
      expect(registry.getDomainFromUID("utility:test")).toBe("infrastructure");
      expect(registry.getDomainFromUID("pipeline:test")).toBe("infrastructure");
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
      expect(registry.getSchema("Currency")).toBeDefined();
      expect(registry.getSchema("Disease")).toBeDefined();

      // Infrastructure domain should now work too
      expect(registry.getSchema("Building")).toBeDefined();
      expect(registry.getSchema("Airport")).toBeDefined();
    });

    it("supports cross-domain infrastructure relationships", () => {
      // Test that infrastructure entities can reference other domains
      const buildingWithArchitect = {
        uid: "building:test_building",
        type: "Building",
        name: "Test Building",
        properties: {
          building_type: "commercial",
          architect: "person:frank_lloyd_wright", // Social domain
          developer: "org:construction_company", // Social domain
          // Geographic coordinates inherited from base schema
        },
      };

      const result = BuildingEntitySchema.safeParse(buildingWithArchitect);
      expect(result.success).toBe(true);
    });

    it("all infrastructure entities inherit universal properties", () => {
      const testBuilding = {
        uid: "building:test",
        type: "Building",
        name: "Test Building",
        // Universal properties should be inherited
        coordinates: {
          latitude: 40.7484,
          longitude: -73.9857,
        },
        startDate: "2020-01-01",
        status: "active",
        relatedEvents: ["event:groundbreaking"],
      };

      const result = BuildingEntitySchema.safeParse(testBuilding);
      expect(result.success).toBe(true);
    });
  });

  // ==================== Infrastructure Network Tests ====================

  describe("Infrastructure Network Relationships", () => {
    it("supports infrastructure connectivity", () => {
      const infrastructureBundle = {
        entities: [
          {
            uid: "airport:jfk",
            type: "Airport",
            name: "JFK Airport",
            properties: { airport_code: "JFK" },
          },
          {
            uid: "road:van_wyck",
            type: "Road",
            name: "Van Wyck Expressway",
            properties: {
              road_type: "highway",
              connects: ["airport:jfk", "city:queens"],
            },
          },
          {
            uid: "bridge:queensboro",
            type: "Bridge",
            name: "Queensboro Bridge",
            properties: {
              bridge_type: "cantilever",
              crosses: "East River",
            },
          },
          {
            uid: "utility:con_edison",
            type: "Utility",
            name: "Con Edison",
            properties: {
              utility_type: "electric_power",
              service_areas: ["city:new_york"],
            },
          },
          {
            uid: "building:terminal_4",
            type: "Building",
            name: "Terminal 4",
            properties: {
              building_type: "institutional",
              utilities: ["utility:con_edison"],
            },
          },
        ],
        relationships: [],
        evidence: [],
        content: [],
        files: [],
      };

      // All entities should validate correctly
      infrastructureBundle.entities.forEach((entity) => {
        const schema =
          INFRASTRUCTURE_ENTITY_SCHEMAS[
            entity.type as keyof typeof INFRASTRUCTURE_ENTITY_SCHEMAS
          ];
        const result = schema.safeParse(entity);
        expect(result.success).toBe(true);
      });
    });
  });
});
