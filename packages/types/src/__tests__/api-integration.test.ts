import { describe, test, expect } from "vitest";

import {
  validateRabbitHoleBundle,
  formatValidationErrors,
} from "../validation-schemas-modular";

describe.skip("API Integration Tests", () => {
  describe("Bundle Validation for All Domains", () => {
    test("should validate comprehensive multi-domain bundle", () => {
      const testData = {
        entities: [
          {
            uid: "person:test_scientist",
            type: "Person",
            name: "Test Scientist",
            created_date: "1985-06-15",
            status: "active",
            properties: { bio: "Research scientist", occupation: "Scientist" },
          },
          {
            uid: "building:test_lab",
            type: "Building",
            name: "Research Lab",
            latitude: 40.748817,
            longitude: -73.985428,
            altitude: 100,
            geometry_type: "point",
            created_date: "2020-01-01",
            status: "active",
            properties: { building_type: "institutional", height: 50 },
          },
          {
            uid: "disease:test_condition",
            type: "Disease",
            name: "Test Medical Condition",
            created_date: "2019-01-01",
            status: "active",
            properties: { disease_type: "infectious", severity: "moderate" },
          },
        ],
        relationships: [
          {
            uid: "rel:scientist_works_at_lab",
            type: "LOCATED_IN",
            source: "person:test_scientist",
            target: "building:test_lab",
            confidence: 0.9,
            properties: { work_relationship: "researcher" },
          },
        ],
        evidence: [],
        content: [],
      };

      const result = validateRabbitHoleBundle(testData);

      if (!result.isValid) {
        console.error(
          "Validation errors:",
          formatValidationErrors(result.errors)
        );
      }

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should validate infrastructure domain with geospatial data", () => {
      const testData = {
        entities: [
          {
            uid: "building:burj_khalifa",
            type: "Building",
            name: "Burj Khalifa",
            latitude: 25.1972,
            longitude: 55.2744,
            altitude: 828,
            geometry_type: "point",
            coordinates_verified: true,
            address: "Dubai, UAE",
            created_date: "2004-01-06",
            active_from_date: "2010-01-04",
            status: "active",
            properties: {
              building_type: "commercial",
              height: 828,
              floors: 163,
              energy_rating: "B",
            },
          },
          {
            uid: "airport:dxb",
            type: "Airport",
            name: "Dubai International Airport",
            latitude: 25.2532,
            longitude: 55.3657,
            geometry_type: "polygon",
            coordinates_verified: true,
            created_date: "1960-09-30",
            status: "active",
            properties: {
              airport_code: "DXB",
              airport_type: "international",
              runway_count: 2,
              passenger_capacity: 90000000,
            },
          },
        ],
        relationships: [
          {
            uid: "rel:burj_near_airport",
            type: "NEAR",
            source: "building:burj_khalifa",
            target: "airport:dxb",
            confidence: 0.8,
            properties: { proximity: "same_city" },
          },
        ],
        evidence: [],
        content: [],
      };

      const result = validateRabbitHoleBundle(testData);
      expect(result.isValid).toBe(true);
    });

    test("should validate biological domain with event relationships", () => {
      const testData = {
        entities: [
          {
            uid: "person:darwin",
            type: "Person",
            name: "Charles Darwin",
            created_date: "1809-02-12",
            destroyed_date: "1882-04-19",
            status: "historical",
            properties: { occupation: "Naturalist", nationality: "British" },
          },
          {
            uid: "animal:finch",
            type: "Animal",
            name: "Galápagos Finch",
            first_observed_date: "1835-09-15",
            status: "active",
            relatedEvents: ["event:darwin_observation"],
            properties: {
              scientificName: "Geospiza fortis",
              habitat: "Galápagos Islands",
            },
          },
          {
            uid: "event:darwin_observation",
            type: "Event",
            name: "Darwin Observes Finches",
            latitude: -0.7893,
            longitude: -91.0542,
            created_date: "1835-09-15",
            status: "historical",
            properties: {
              eventType: "discovery",
              date: "1835-09-15",
              significance: "Evidence for evolution theory",
              verified: true,
            },
          },
        ],
        relationships: [
          {
            uid: "rel:darwin_observes_finch",
            type: "STUDIES",
            source: "person:darwin",
            target: "animal:finch",
            at: "1835-09-15T00:00:00.000Z",
            confidence: 0.95,
            properties: { study_context: "natural_observation" },
          },
          {
            uid: "rel:finch_experiences_observation",
            type: "EXPERIENCES_EVENT",
            source: "animal:finch",
            target: "event:darwin_observation",
            confidence: 1.0,
            properties: { event_role: "subject" },
          },
        ],
        evidence: [],
        content: [],
      };

      const result = validateRabbitHoleBundle(testData);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Neo4j Compatibility Validation", () => {
    test("should ensure all properties are primitive types", () => {
      const testCases = [
        {
          name: "Building with geospatial data",
          entity: {
            uid: "building:test_neo4j",
            type: "Building",
            name: "Test Building",
            latitude: 40.7128,
            longitude: -74.006,
            altitude: 100,
            created_date: "2020-01-01",
            status: "active",
            properties: {
              building_type: "office",
              height: 200,
              floors: 50,
            },
          },
        },
        {
          name: "Event with location",
          entity: {
            uid: "event:test_neo4j",
            type: "Event",
            name: "Test Event",
            latitude: 40.7128,
            longitude: -74.006,
            created_date: "2024-01-01",
            status: "historical",
            properties: {
              eventType: "conference",
              date: "2024-01-01",
              attendance: 500,
            },
          },
        },
        {
          name: "Relationship with properties",
          relationship: {
            uid: "rel:test_neo4j",
            type: "CONNECTS",
            source: "building:test_neo4j",
            target: "event:test_neo4j",
            confidence: 0.8,
            properties: {
              connection_type: "venue",
              relationship_strength: "strong",
            },
          },
        },
      ];

      testCases.forEach(({ name, entity, relationship }) => {
        if (entity) {
          // Check that all entity properties are primitives or arrays
          const checkPrimitive = (obj: any, path = "") => {
            Object.entries(obj).forEach(([key, value]) => {
              const currentPath = path ? `${path}.${key}` : key;

              if (value !== null && value !== undefined) {
                if (Array.isArray(value)) {
                  // Arrays are allowed - check elements are primitives
                  value.forEach((item, index) => {
                    expect(
                      typeof item === "string" ||
                        typeof item === "number" ||
                        typeof item === "boolean"
                    ).toBe(true);
                  });
                } else if (typeof value === "object") {
                  // Only allow objects in 'properties' field
                  if (key === "properties") {
                    checkPrimitive(value, currentPath);
                  } else {
                    throw new Error(
                      `Complex object found at ${currentPath} - not Neo4j compatible`
                    );
                  }
                } else {
                  // Primitive types are allowed
                  expect(
                    typeof value === "string" ||
                      typeof value === "number" ||
                      typeof value === "boolean"
                  ).toBe(true);
                }
              }
            });
          };

          expect(() => checkPrimitive(entity)).not.toThrow();
        }

        if (relationship) {
          // Check relationship properties are primitives
          const checkRelPrimitive = (obj: any, path = "") => {
            Object.entries(obj).forEach(([key, value]) => {
              const currentPath = path ? `${path}.${key}` : key;

              if (value !== null && value !== undefined) {
                if (Array.isArray(value)) {
                  value.forEach((item) => {
                    expect(
                      typeof item === "string" ||
                        typeof item === "number" ||
                        typeof item === "boolean"
                    ).toBe(true);
                  });
                } else if (typeof value === "object") {
                  if (key === "properties") {
                    checkRelPrimitive(value, currentPath);
                  } else {
                    throw new Error(
                      `Complex object found in relationship at ${currentPath}`
                    );
                  }
                } else {
                  expect(
                    typeof value === "string" ||
                      typeof value === "number" ||
                      typeof value === "boolean"
                  ).toBe(true);
                }
              }
            });
          };

          expect(() => checkRelPrimitive(relationship)).not.toThrow();
        }
      });
    });

    test("should validate coordinate precision and Neo4j integer compatibility", () => {
      const coordinates = [
        { lat: 40.748817123456, lng: -73.985428987654 }, // High precision
        { lat: 0, lng: 0 }, // Edge case
        { lat: 90, lng: 180 }, // Boundary case
        { lat: -90, lng: -180 }, // Boundary case
      ];

      coordinates.forEach(({ lat, lng }) => {
        // Simulate the Math.floor precision handling from ingest-bundle API
        const processedLat = Math.floor(lat * 1000000) / 1000000;
        const processedLng = Math.floor(lng * 1000000) / 1000000;

        expect(processedLat).toBeGreaterThanOrEqual(-90);
        expect(processedLat).toBeLessThanOrEqual(90);
        expect(processedLng).toBeGreaterThanOrEqual(-180);
        expect(processedLng).toBeLessThanOrEqual(180);

        // Verify precision is maintained (6 decimal places)
        expect(
          processedLat.toString().split(".")[1]?.length || 0
        ).toBeLessThanOrEqual(6);
        expect(
          processedLng.toString().split(".")[1]?.length || 0
        ).toBeLessThanOrEqual(6);
      });
    });
  });

  describe("Universal Property Support", () => {
    test("should support geospatial properties across all domains", () => {
      const domainEntities = [
        { domain: "biological", type: "Person", uid: "person:geo_test" },
        {
          domain: "infrastructure",
          type: "Building",
          uid: "building:geo_test",
        },
        { domain: "healthcare", type: "Hospital", uid: "hospital:geo_test" },
        { domain: "academic", type: "University", uid: "university:geo_test" },
        { domain: "transportation", type: "Station", uid: "station:geo_test" },
        { domain: "media", type: "Event", uid: "event:geo_test" },
      ];

      domainEntities.forEach(({ domain, type, uid }) => {
        const entity = {
          uid,
          type,
          name: `${domain} Geo Test`,
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          geometry_type: "point" as const,
          coordinates_verified: true,
          address: "Test Address",
          timezone: "America/New_York",
          properties: {},
        };

        const bundle = {
          entities: [entity],
          relationships: [],
          evidence: [],
          content: [],
        };
        const result = validateRabbitHoleBundle(bundle);

        expect(result.isValid).toBe(true);
      });
    });

    test("should support temporal properties across all domains", () => {
      const domainEntities = [
        { domain: "biological", type: "Animal", uid: "animal:temporal_test" },
        {
          domain: "infrastructure",
          type: "Bridge",
          uid: "bridge:temporal_test",
        },
        {
          domain: "technology",
          type: "Software",
          uid: "software:temporal_test",
        },
        { domain: "economic", type: "Currency", uid: "currency:temporal_test" },
        { domain: "cultural", type: "Film", uid: "film:temporal_test" },
      ];

      domainEntities.forEach(({ domain, type, uid }) => {
        const entity = {
          uid,
          type,
          name: `${domain} Temporal Test`,
          created_date: "2020-01-01",
          active_from_date: "2020-06-01",
          active_to_date: "2024-12-31",
          first_observed_date: "2020-01-01",
          status: "active" as const,
          properties: {},
        };

        const bundle = {
          entities: [entity],
          relationships: [],
          evidence: [],
          content: [],
        };
        const result = validateRabbitHoleBundle(bundle);

        expect(result.isValid).toBe(true);
      });
    });

    test("should support event relationships across all domains", () => {
      const baseEvent = {
        uid: "event:universal_test",
        type: "Event",
        name: "Universal Test Event",
        created_date: "2024-01-01",
        properties: {
          eventType: "milestone",
          date: "2024-01-01",
        },
      };

      const domainEntities = [
        {
          type: "Building",
          uid: "building:event_test",
          eventType: "construction_complete",
        },
        { type: "Animal", uid: "animal:event_test", eventType: "birth" },
        { type: "Software", uid: "software:event_test", eventType: "launch" },
        { type: "Disease", uid: "disease:event_test", eventType: "discovery" },
        {
          type: "University",
          uid: "university:event_test",
          eventType: "milestone",
        },
      ];

      domainEntities.forEach(({ type, uid, eventType }) => {
        const entity = {
          uid,
          type,
          name: `${type} Event Test`,
          relatedEvents: ["event:universal_test"],
          properties: {},
        };

        const relationship = {
          uid: `rel:${uid.replace(":", "_")}_experiences_event`,
          type: "EXPERIENCES_EVENT",
          source: uid,
          target: "event:universal_test",
          properties: {
            event_context: eventType,
          },
        };

        const bundle = {
          entities: [entity, baseEvent],
          relationships: [relationship],
          evidence: [],
          content: [],
        };

        const result = validateRabbitHoleBundle(bundle);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle entities without optional properties", () => {
      const minimalEntity = {
        uid: "person:minimal_test",
        type: "Person",
        name: "Minimal Test",
        properties: {},
      };

      const bundle = {
        entities: [minimalEntity],
        relationships: [],
        evidence: [],
        content: [],
      };
      const result = validateRabbitHoleBundle(bundle);

      expect(result.isValid).toBe(true);
    });

    test("should handle entities with maximum properties", () => {
      const maximalEntity = {
        uid: "building:maximal_test",
        type: "Building",
        name: "Maximal Test Building",
        latitude: 40.748817,
        longitude: -73.985428,
        altitude: 443,
        coordinate_accuracy: 1.0,
        altitude_accuracy: 0.5,
        geometry_type: "point" as const,
        coordinates_verified: true,
        address: "Full address string",
        timezone: "America/New_York",
        created_date: "2020-01-01",
        destroyed_date: "2024-12-31",
        active_from_date: "2020-06-01",
        active_to_date: "2024-11-30",
        first_observed_date: "2019-12-01",
        last_observed_date: "2024-12-31",
        status: "defunct" as const,
        relatedEvents: ["event:construction", "event:demolition"],
        properties: {
          building_type: "commercial",
          height: 443,
          floors: 100,
          floor_area: 200000,
          capacity: 50000,
          energy_rating: "A",
          accessibility_features: true,
          parking_spaces: 2000,
          construction_material: ["steel", "glass", "concrete"],
          architectural_style: "Modern",
          seismic_rating: "VIII",
          fire_safety_rating: "A",
          green_certification: ["LEED Platinum", "Energy Star"],
          maintenance_status: "excellent",
        },
      };

      const bundle = {
        entities: [maximalEntity],
        relationships: [],
        evidence: [],
        content: [],
      };
      const result = validateRabbitHoleBundle(bundle);

      expect(result.isValid).toBe(true);
    });

    test("should reject invalid coordinate ranges", () => {
      const invalidEntities = [
        {
          uid: "building:invalid_lat",
          type: "Building",
          name: "Invalid Latitude",
          latitude: 91, // Invalid
          longitude: 0,
          properties: {},
        },
        {
          uid: "building:invalid_lng",
          type: "Building",
          name: "Invalid Longitude",
          latitude: 0,
          longitude: 181, // Invalid
          properties: {},
        },
      ];

      invalidEntities.forEach((entity) => {
        const bundle = {
          entities: [entity],
          relationships: [],
          evidence: [],
          content: [],
        };
        const result = validateRabbitHoleBundle(bundle);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test("should reject invalid UID formats", () => {
      const invalidUIDs = [
        { uid: "invalid-uid-format", shouldFail: true },
        { uid: "building_without_colon", shouldFail: true },
        { uid: "building:", shouldFail: true },
        { uid: ":empty_prefix", shouldFail: true },
        { uid: "wrongprefix:building_name", shouldFail: true },
        { uid: "building:valid_name", shouldFail: false }, // This should pass
      ];

      invalidUIDs.forEach(({ uid, shouldFail }) => {
        const entity = {
          uid,
          type: "Building",
          name: "Test Building",
          properties: {},
        };

        const bundle = {
          entities: [entity],
          relationships: [],
          evidence: [],
          content: [],
        };
        const result = validateRabbitHoleBundle(bundle);

        if (shouldFail) {
          expect(result.isValid).toBe(false);
        } else {
          expect(result.isValid).toBe(true);
        }
      });
    });

    test("should reject missing relationship targets", () => {
      const entity = {
        uid: "person:test_orphan",
        type: "Person",
        name: "Test Person",
        properties: {},
      };

      const orphanRelationship = {
        uid: "rel:orphan_relationship",
        type: "KNOWS",
        source: "person:test_orphan",
        target: "person:nonexistent", // This entity doesn't exist in bundle
        properties: {},
      };

      const bundle = {
        entities: [entity],
        relationships: [orphanRelationship],
        evidence: [],
        content: [],
      };

      const result = validateRabbitHoleBundle(bundle);

      // Should fail because target entity doesn't exist
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Check for missing reference error specifically
      const hasMissingRefError = result.errors.some(
        (error) =>
          error.message.includes("Missing") &&
          error.message.includes("person:nonexistent")
      );
      expect(hasMissingRefError).toBe(true);
    });
  });

  describe("Universal Relationship Support", () => {
    test("should support geospatial relationships", () => {
      const building1 = {
        uid: "building:tower_a",
        type: "Building",
        name: "Tower A",
        latitude: 40.7128,
        longitude: -74.006,
        properties: { building_type: "office" },
      };

      const building2 = {
        uid: "building:tower_b",
        type: "Building",
        name: "Tower B",
        latitude: 40.713,
        longitude: -74.0062,
        properties: { building_type: "office" },
      };

      const spatialRelationship = {
        uid: "rel:towers_adjacent",
        type: "ADJACENT_TO",
        source: "building:tower_a",
        target: "building:tower_b",
        properties: {
          distance_meters: 150,
          spatial_relationship: "adjacent",
        },
      };

      const bundle = {
        entities: [building1, building2],
        relationships: [spatialRelationship],
        evidence: [],
        content: [],
      };

      const result = validateRabbitHoleBundle(bundle);
      expect(result.isValid).toBe(true);
    });

    test("should support event relationships across domains", () => {
      const constructionEvent = {
        uid: "event:building_construction",
        type: "Event",
        name: "Building Construction Complete",
        created_date: "2021-06-01",
        properties: {
          eventType: "construction_complete",
          date: "2021-06-01",
          impact: "local",
        },
      };

      const building = {
        uid: "building:new_tower",
        type: "Building",
        name: "New Tower",
        latitude: 40.7128,
        longitude: -74.006,
        relatedEvents: ["event:building_construction"],
        properties: { building_type: "office" },
      };

      const eventRelationship = {
        uid: "rel:building_experiences_construction",
        type: "EXPERIENCES_EVENT",
        source: "building:new_tower",
        target: "event:building_construction",
        properties: {
          event_outcome: "successful_completion",
        },
      };

      const bundle = {
        entities: [building, constructionEvent],
        relationships: [eventRelationship],
        evidence: [],
        content: [],
      };

      const result = validateRabbitHoleBundle(bundle);
      expect(result.isValid).toBe(true);
    });
  });
});
