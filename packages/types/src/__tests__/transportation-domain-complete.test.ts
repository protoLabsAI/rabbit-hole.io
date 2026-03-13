/**
 * Transportation Domain Complete - Test Suite
 *
 * Comprehensive tests for the complete transportation domain including
 * all 6 transportation entities.
 */

import { describe, it, expect } from "vitest";

import {
  TRANSPORTATION_ENTITY_SCHEMAS,
  TRANSPORTATION_UID_VALIDATORS,
  TRANSPORTATION_ENTITY_TYPES,
  validateTransportationUID,
  getTransportationEntityType,
  isTransportationUID,
  VehicleEntitySchema,
  AircraftEntitySchema,
  RouteEntitySchema,
} from "../domains/transportation";
import { EntitySchemaRegistry } from "../entity-schema-registry";

describe("Transportation Domain - Complete Migration", () => {
  // ==================== Registry Tests ====================

  describe("Domain Registry", () => {
    it("includes all 6 transportation entity types", () => {
      expect(TRANSPORTATION_ENTITY_TYPES).toEqual([
        "Vehicle",
        "Aircraft",
        "Ship",
        "Train",
        "Route",
        "Station",
      ]);
      expect(TRANSPORTATION_ENTITY_TYPES).toHaveLength(6);
    });

    it("has schemas for all entity types", () => {
      expect(TRANSPORTATION_ENTITY_SCHEMAS.Vehicle).toBeDefined();
      expect(TRANSPORTATION_ENTITY_SCHEMAS.Aircraft).toBeDefined();
      expect(TRANSPORTATION_ENTITY_SCHEMAS.Ship).toBeDefined();
      expect(TRANSPORTATION_ENTITY_SCHEMAS.Train).toBeDefined();
      expect(TRANSPORTATION_ENTITY_SCHEMAS.Route).toBeDefined();
      expect(TRANSPORTATION_ENTITY_SCHEMAS.Station).toBeDefined();
    });

    it("has UID validators for all entity types", () => {
      expect(TRANSPORTATION_UID_VALIDATORS.vehicle).toBeDefined();
      expect(TRANSPORTATION_UID_VALIDATORS.aircraft).toBeDefined();
      expect(TRANSPORTATION_UID_VALIDATORS.ship).toBeDefined();
      expect(TRANSPORTATION_UID_VALIDATORS.train).toBeDefined();
      expect(TRANSPORTATION_UID_VALIDATORS.route).toBeDefined();
      expect(TRANSPORTATION_UID_VALIDATORS.station).toBeDefined();
    });
  });

  // ==================== Vehicle Entity Tests ====================

  describe("Vehicle Entity", () => {
    it("validates valid vehicle entity", () => {
      const validVehicle = {
        uid: "vehicle:tesla_model_s",
        type: "Vehicle",
        name: "Tesla Model S",
        properties: {
          vehicle_type: "car",
          manufacturer: "company:tesla",
          model: "Model S",
          year: 2023,
          fuel_type: "electric",
          horsepower: 670,
          seating_capacity: 5,
          top_speed: 200,
          safety_rating: "5_star",
          emissions_class: "Zero Emission",
          owner: "person:john_doe",
        },
      };

      const result = VehicleEntitySchema.safeParse(validVehicle);
      expect(result.success).toBe(true);
    });

    it("validates vehicle UID format", () => {
      expect(validateTransportationUID("vehicle:tesla_model_s")).toBe(true);
      expect(
        TRANSPORTATION_UID_VALIDATORS.vehicle("vehicle:tesla_model_s")
      ).toBe(true);
      expect(
        TRANSPORTATION_UID_VALIDATORS.vehicle("aircraft:tesla_model_s")
      ).toBe(false);
    });

    it("gets correct entity type from vehicle UID", () => {
      expect(getTransportationEntityType("vehicle:test")).toBe("Vehicle");
      expect(isTransportationUID("vehicle:test")).toBe(true);
    });
  });

  // ==================== Aircraft Entity Tests ====================

  describe("Aircraft Entity", () => {
    it("validates valid aircraft entity", () => {
      const validAircraft = {
        uid: "aircraft:boeing_737",
        type: "Aircraft",
        name: "Boeing 737-800",
        properties: {
          aircraft_type: "airliner",
          manufacturer: "company:boeing",
          model: "737-800",
          first_flight: "1997",
          passenger_capacity: 189,
          cargo_capacity: 1555,
          range: 2935,
          cruising_speed: 453,
          service_ceiling: 41000,
          engines: 2,
          engine_type: "turbofan",
          wingspan: 35.8,
          length: 39.5,
          height: 12.5,
          max_takeoff_weight: 79000,
          fuel_capacity: 26020,
          registration: "N737BA",
          owner: "org:airline_company",
          operator: "org:airline_company",
          home_airport: "airport:sea",
        },
      };

      const result = AircraftEntitySchema.safeParse(validAircraft);
      expect(result.success).toBe(true);
    });

    it("validates aircraft UID format", () => {
      expect(validateTransportationUID("aircraft:boeing_737")).toBe(true);
      expect(
        TRANSPORTATION_UID_VALIDATORS.aircraft("aircraft:boeing_737")
      ).toBe(true);
      expect(TRANSPORTATION_UID_VALIDATORS.aircraft("vehicle:boeing_737")).toBe(
        false
      );
    });

    it("gets correct entity type from aircraft UID", () => {
      expect(getTransportationEntityType("aircraft:test")).toBe("Aircraft");
      expect(isTransportationUID("aircraft:test")).toBe(true);
    });
  });

  // ==================== Route Entity Tests ====================

  describe("Route Entity", () => {
    it("validates valid route entity", () => {
      const validRoute = {
        uid: "route:subway_line_1",
        type: "Route",
        name: "Subway Line 1",
        properties: {
          route_type: "subway",
          route_number: "1",
          established_date: "1904",
          origin: "station:south_ferry",
          destination: "station:van_cortlandt_park",
          stops: ["station:times_square", "station:union_square"],
          distance: 38.1,
          duration: 52,
          frequency: "4-6 minutes",
          operating_hours: "24/7",
          fare: 2.9,
          operator: "org:mta",
          vehicles_used: ["train:r142"],
          accessibility: true,
          express_service: false,
          capacity: 2000,
          average_ridership: 180000,
          on_time_performance: 88,
          real_time_tracking: true,
        },
      };

      const result = RouteEntitySchema.safeParse(validRoute);
      expect(result.success).toBe(true);
    });

    it("validates route UID format", () => {
      expect(validateTransportationUID("route:subway_line_1")).toBe(true);
      expect(TRANSPORTATION_UID_VALIDATORS.route("route:subway_line_1")).toBe(
        true
      );
      expect(TRANSPORTATION_UID_VALIDATORS.route("station:subway_line_1")).toBe(
        false
      );
    });

    it("gets correct entity type from route UID", () => {
      expect(getTransportationEntityType("route:test")).toBe("Route");
      expect(isTransportationUID("route:test")).toBe(true);
    });
  });

  // ==================== Registry Integration Tests ====================

  describe("Registry Integration", () => {
    const registry = EntitySchemaRegistry.getInstance();

    it("registry recognizes all transportation entities", () => {
      expect(registry.getSchema("Vehicle")).toBeDefined();
      expect(registry.getSchema("Aircraft")).toBeDefined();
      expect(registry.getSchema("Ship")).toBeDefined();
      expect(registry.getSchema("Train")).toBeDefined();
      expect(registry.getSchema("Route")).toBeDefined();
      expect(registry.getSchema("Station")).toBeDefined();
    });

    it("registry validates transportation UIDs correctly", () => {
      expect(registry.validateUID("vehicle:test")).toBe(true);
      expect(registry.validateUID("aircraft:test")).toBe(true);
      expect(registry.validateUID("ship:test")).toBe(true);
      expect(registry.validateUID("train:test")).toBe(true);
      expect(registry.validateUID("route:test")).toBe(true);
      expect(registry.validateUID("station:test")).toBe(true);
    });

    it("registry maps UIDs to correct domain", () => {
      expect(registry.getDomainFromUID("vehicle:test")).toBe("transportation");
      expect(registry.getDomainFromUID("aircraft:test")).toBe("transportation");
      expect(registry.getDomainFromUID("ship:test")).toBe("transportation");
      expect(registry.getDomainFromUID("train:test")).toBe("transportation");
      expect(registry.getDomainFromUID("route:test")).toBe("transportation");
      expect(registry.getDomainFromUID("station:test")).toBe("transportation");
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
      expect(registry.getSchema("Building")).toBeDefined();

      // Transportation domain should now work too
      expect(registry.getSchema("Vehicle")).toBeDefined();
      expect(registry.getSchema("Aircraft")).toBeDefined();
    });

    it("supports cross-domain transportation relationships", () => {
      // Test that transportation entities can reference other domains
      const vehicleWithManufacturer = {
        uid: "vehicle:ford_f150",
        type: "Vehicle",
        name: "Ford F-150",
        properties: {
          vehicle_type: "truck",
          manufacturer: "company:ford", // Economic domain
          owner: "person:john_smith", // Social domain
        },
      };

      const result = VehicleEntitySchema.safeParse(vehicleWithManufacturer);
      expect(result.success).toBe(true);
    });

    it("all transportation entities inherit universal properties", () => {
      const testVehicle = {
        uid: "vehicle:test",
        type: "Vehicle",
        name: "Test Vehicle",
        // Universal properties should be inherited
        coordinates: {
          latitude: 40.7128,
          longitude: -74.006,
        },
        startDate: "2020-01-01",
        status: "active",
        relatedEvents: ["event:vehicle_registration"],
      };

      const result = VehicleEntitySchema.safeParse(testVehicle);
      expect(result.success).toBe(true);
    });
  });

  // ==================== Transportation Network Tests ====================

  describe("Transportation Network Relationships", () => {
    it("supports complete transportation network", () => {
      const transportationBundle = {
        entities: [
          {
            uid: "station:grand_central",
            type: "Station",
            name: "Grand Central",
            properties: { station_type: "train" },
          },
          {
            uid: "route:metro_north",
            type: "Route",
            name: "Metro North",
            properties: {
              route_type: "train",
              origin: "station:grand_central",
            },
          },
          {
            uid: "train:metro_north_express",
            type: "Train",
            name: "Metro North Express",
            properties: {
              train_type: "commuter",
              routes_served: ["route:metro_north"],
            },
          },
          {
            uid: "aircraft:delta_flight",
            type: "Aircraft",
            name: "Delta Flight 123",
            properties: {
              aircraft_type: "airliner",
              home_airport: "airport:jfk",
            },
          },
          {
            uid: "vehicle:shuttle_bus",
            type: "Vehicle",
            name: "Airport Shuttle",
            properties: { vehicle_type: "bus" },
          },
          {
            uid: "ship:cargo_vessel",
            type: "Ship",
            name: "Cargo Vessel",
            properties: {
              ship_type: "container",
              home_port: "port:ny_nj",
            },
          },
        ],
        relationships: [],
        evidence: [],
        content: [],
        files: [],
      };

      // All entities should validate correctly
      transportationBundle.entities.forEach((entity) => {
        const schema =
          TRANSPORTATION_ENTITY_SCHEMAS[
            entity.type as keyof typeof TRANSPORTATION_ENTITY_SCHEMAS
          ];
        const result = schema.safeParse(entity);
        expect(result.success).toBe(true);
      });
    });
  });
});
