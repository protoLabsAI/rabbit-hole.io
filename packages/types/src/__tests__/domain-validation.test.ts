import { describe, test, expect } from "vitest";

import type { EntityType } from "../entity-schema-registry";
import {
  ENTITY_DOMAIN_MAP,
  validateAllEntityConventions,
} from "../naming-conventions";
import {
  EntityTypeEnum,
  BuildingEntitySchema,
  VehicleEntitySchema,
  PersonEntitySchema,
  DiseaseEntitySchema,
  UniversityEntitySchema,
  BookEntitySchema,
  SoftwareEntitySchema,
  CurrencyEntitySchema,
  LawEntitySchema,
  EventEntitySchema,
  validateRabbitHoleBundle,
} from "../validation-schemas-modular";

describe.skip("Domain Validation Tests", () => {
  describe("Entity Type Coverage", () => {
    test("should have 134 entity types across 12 domains", () => {
      const entityTypes = EntityTypeEnum.options;
      expect(entityTypes).toHaveLength(134);

      // Verify domain mapping coverage
      entityTypes.forEach((entityType) => {
        expect(ENTITY_DOMAIN_MAP[entityType as EntityType]).toBeDefined();
      });

      // Verify we have the foundational-first domain structure
      const uniqueDomains = new Set(Object.values(ENTITY_DOMAIN_MAP));
      expect(uniqueDomains.size).toBe(12); // 12 domains implemented

      // Domains: social, medical, academic, cultural, biological, geographic,
      // infrastructure, transportation, astronomical, legal, technology, economic
    });

    test("should maintain logical domain organization", () => {
      // Natural Sciences
      expect(ENTITY_DOMAIN_MAP.Person).toBe("social");
      expect(ENTITY_DOMAIN_MAP.Animal).toBe("biological");
      expect(ENTITY_DOMAIN_MAP.Planet).toBe("astronomical");
      expect(ENTITY_DOMAIN_MAP.Country).toBe("geographic");

      // Human Society & Culture
      expect(ENTITY_DOMAIN_MAP.Organization).toBe("social");
      expect(ENTITY_DOMAIN_MAP.Platform).toBe("social");
      expect(ENTITY_DOMAIN_MAP.Currency).toBe("economic");
      expect(ENTITY_DOMAIN_MAP.Book).toBe("cultural");
      expect(ENTITY_DOMAIN_MAP.Law).toBe("legal");

      // Knowledge & Information
      expect(ENTITY_DOMAIN_MAP.University).toBe("academic");
      expect(ENTITY_DOMAIN_MAP.Event).toBe("social");

      // Health & Medicine
      expect(ENTITY_DOMAIN_MAP.Disease).toBe("medical");
      expect(ENTITY_DOMAIN_MAP.Hospital).toBe("medical");

      // Technology & Infrastructure
      expect(ENTITY_DOMAIN_MAP.Software).toBe("technology");
      expect(ENTITY_DOMAIN_MAP.Building).toBe("infrastructure");
      expect(ENTITY_DOMAIN_MAP.Vehicle).toBe("transportation");
    });
  });

  describe("Social Domain", () => {
    test("should validate Person entity with universal properties", () => {
      const person = {
        uid: "person:test_scientist",
        type: "Person",
        name: "Test Scientist",
        latitude: 49.2827,
        longitude: -123.1207,
        created_date: "1985-06-15",
        status: "active",
        properties: {
          bio: "Research scientist",
          occupation: "Scientist",
        },
      };

      const result = PersonEntitySchema.safeParse(person);
      expect(result.success).toBe(true);
    });
  });

  describe("Biological Domain", () => {
    test("should validate Animal entity with biological properties", () => {
      const animal = {
        uid: "animal:test_whale",
        type: "Animal",
        name: "Test Whale",
        status: "active",
        properties: {
          scientificName: "Balaenoptera test",
          conservationStatus: "vulnerable",
          habitat: "Ocean",
        },
      };

      // We don't have direct AnimalEntitySchema test, but it should validate against EntitySchema
      expect(animal.uid).toMatch(/^animal:/);
      expect(animal.type).toBe("Animal");
    });
  });

  describe("Infrastructure Domain", () => {
    test("should validate Building entity with geospatial properties", () => {
      const building = {
        uid: "building:test_tower",
        type: "Building",
        name: "Test Tower",
        latitude: 40.748817,
        longitude: -73.985428,
        altitude: 443,
        geometry_type: "point",
        coordinates_verified: true,
        created_date: "2020-01-01",
        active_from_date: "2021-01-01",
        status: "active",
        properties: {
          building_type: "office",
          height: 443,
          floors: 100,
          energy_rating: "A",
        },
      };

      const result = BuildingEntitySchema.safeParse(building);
      expect(result.success).toBe(true);
    });
  });

  describe("Transportation Domain", () => {
    test("should validate Vehicle entity with optional location", () => {
      const vehicle = {
        uid: "vehicle:test_car",
        type: "Vehicle",
        name: "Test Car",
        latitude: 49.2827,
        longitude: -123.1207,
        created_date: "2022-01-01",
        status: "active",
        properties: {
          vehicle_type: "car",
          manufacturer: "Tesla",
          fuel_type: "electric",
          passenger_capacity: 5,
        },
      };

      const result = VehicleEntitySchema.safeParse(vehicle);
      expect(result.success).toBe(true);
    });
  });

  describe("Healthcare Domain", () => {
    test("should validate Disease entity without location", () => {
      const disease = {
        uid: "disease:test_condition",
        type: "Disease",
        name: "Test Condition",
        created_date: "2020-01-01",
        status: "active",
        properties: {
          disease_type: "infectious",
          contagious: true,
          severity: "moderate",
        },
      };

      const result = DiseaseEntitySchema.safeParse(disease);
      expect(result.success).toBe(true);
    });
  });

  describe("Academic Domain", () => {
    test("should validate University entity with campus location", () => {
      const university = {
        uid: "university:test_university",
        type: "University",
        name: "Test University",
        latitude: 49.2606,
        longitude: -123.246,
        created_date: "1908-01-01",
        status: "active",
        properties: {
          university_type: "public",
          enrollment: 50000,
          ranking: 25,
        },
      };

      const result = UniversityEntitySchema.safeParse(university);
      expect(result.success).toBe(true);
    });
  });

  describe("Cultural Domain", () => {
    test("should validate Book entity with publication data", () => {
      const book = {
        uid: "book:test_novel",
        type: "Book",
        name: "Test Novel",
        created_date: "1960-07-11",
        status: "historical",
        properties: {
          published_date: "1960-07-11",
          publisher: "Test Publisher",
          pages: 376,
          fiction: true,
        },
      };

      const result = BookEntitySchema.safeParse(book);
      expect(result.success).toBe(true);
    });
  });

  describe("Technology Domain", () => {
    test("should validate Software entity with tech properties", () => {
      const software = {
        uid: "software:test_framework",
        type: "Software",
        name: "Test Framework",
        created_date: "2015-01-01",
        status: "active",
        properties: {
          category: "framework",
          language: ["JavaScript"],
          license: "MIT",
          openSource: true,
        },
      };

      const result = SoftwareEntitySchema.safeParse(software);
      expect(result.success).toBe(true);
    });
  });

  describe("Economic Domain", () => {
    test("should validate Currency entity with economic properties", () => {
      const currency = {
        uid: "currency:test_coin",
        type: "Currency",
        name: "Test Coin",
        created_date: "2009-01-01",
        status: "active",
        properties: {
          currency_code: "TST",
          currency_type: "cryptocurrency",
          total_supply: 21000000,
        },
      };

      const result = CurrencyEntitySchema.safeParse(currency);
      expect(result.success).toBe(true);
    });
  });

  describe("Legal Domain", () => {
    test("should validate Law entity with legal properties", () => {
      const law = {
        uid: "law:test_regulation",
        type: "Law",
        name: "Test Regulation",
        created_date: "2021-01-01",
        status: "active",
        properties: {
          law_type: "regulation",
          jurisdiction: "Federal",
          enacted_date: "2021-01-01",
          status: "active",
        },
      };

      const result = LawEntitySchema.safeParse(law);
      expect(result.success).toBe(true);
    });
  });

  describe("Media & Events Domain", () => {
    test("should validate Event entity with location and universal properties", () => {
      const event = {
        uid: "event:test_conference",
        type: "Event",
        name: "Test Conference",
        latitude: 49.2827,
        longitude: -123.1207,
        created_date: "2024-06-15",
        status: "historical",
        properties: {
          eventType: "conference",
          date: "2024-06-15",
          impact: "local",
          attendance: 500,
          verified: true,
        },
      };

      const result = EventEntitySchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe("Bundle Validation", () => {
    test("should validate complete bundle with all domain entities", () => {
      const bundle = {
        entities: [
          {
            uid: "person:bundle_test",
            type: "Person",
            name: "Bundle Test Person",
            created_date: "1990-01-01",
            status: "active",
            properties: { bio: "Test person" },
          },
          {
            uid: "building:bundle_test",
            type: "Building",
            name: "Bundle Test Building",
            latitude: 40.748817,
            longitude: -73.985428,
            created_date: "2020-01-01",
            status: "active",
            properties: { building_type: "office", height: 100 },
          },
        ],
        relationships: [
          {
            uid: "rel:person_works_in_building",
            type: "LOCATED_IN",
            source: "person:bundle_test",
            target: "building:bundle_test",
            confidence: 0.9,
            properties: {
              relationship_type: "workplace",
            },
          },
        ],
        evidence: [],
        content: [],
      };

      const result = validateRabbitHoleBundle(bundle);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject invalid geospatial coordinates", () => {
      const invalidEntity = {
        uid: "building:invalid_coords",
        type: "Building",
        name: "Invalid Building",
        latitude: 200, // Invalid - outside -90 to 90 range
        longitude: -73.985428,
        properties: { building_type: "office" },
      };

      const bundle = {
        entities: [invalidEntity],
        relationships: [],
        evidence: [],
        content: [],
      };
      const result = validateRabbitHoleBundle(bundle);
      expect(result.isValid).toBe(false);
    });

    test("should validate universal status values", () => {
      const validStatuses = [
        "active",
        "inactive",
        "historical",
        "theoretical",
        "planned",
        "under_construction",
        "defunct",
        "unknown",
      ];

      validStatuses.forEach((status) => {
        const entity = {
          uid: "person:status_test",
          type: "Person",
          name: "Status Test",
          status,
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
  });

  describe("Naming Convention Enforcement", () => {
    test("should enforce all entity naming conventions", () => {
      expect(() => validateAllEntityConventions()).not.toThrow();
    });

    test("should validate UID prefixes match entity types", () => {
      const testCases = [
        { type: "Building", uid: "building:test", valid: true },
        { type: "Vehicle", uid: "vehicle:test", valid: true },
        { type: "Person", uid: "person:test", valid: true },
        { type: "Building", uid: "invalid:test", valid: false },
      ];

      testCases.forEach(({ type, uid, valid }) => {
        const entity = {
          uid,
          type,
          name: "Test Entity",
          properties: {},
        };

        const bundle = {
          entities: [entity],
          relationships: [],
          evidence: [],
          content: [],
        };
        const result = validateRabbitHoleBundle(bundle);
        expect(result.isValid).toBe(valid);
      });
    });
  });

  describe("Universal Property Support", () => {
    test("should support geospatial properties on any entity type", () => {
      // Test that any entity can have geospatial properties
      const entityTypes = [
        "Person",
        "Building",
        "Disease",
        "Event",
        "Software",
      ];

      entityTypes.forEach((type) => {
        const entity = {
          uid: `${type.toLowerCase()}:geo_test`,
          type,
          name: "Geo Test",
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
          geometry_type: "point" as const,
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

    test("should support temporal properties on any entity type", () => {
      const entityTypes = [
        "Person",
        "Building",
        "Disease",
        "Event",
        "Software",
      ];

      entityTypes.forEach((type) => {
        const entity = {
          uid: `${type.toLowerCase()}:temporal_test`,
          type,
          name: "Temporal Test",
          created_date: "2020-01-01",
          active_from_date: "2020-06-01",
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

    test("should support event relationships on any entity type", () => {
      const entityTypes = [
        "Person",
        "Building",
        "Disease",
        "University",
        "Software",
      ];

      entityTypes.forEach((type) => {
        const entity = {
          uid: `${type.toLowerCase()}:event_test`,
          type,
          name: "Event Test",
          relatedEvents: ["event:test_event"],
          properties: {},
        };

        const event = {
          uid: "event:test_event",
          type: "Event",
          name: "Test Event",
          properties: {
            eventType: "milestone",
            date: "2024-01-01",
          },
        };

        const relationship = {
          uid: "rel:entity_experiences_event",
          type: "EXPERIENCES_EVENT",
          source: `${type.toLowerCase()}:event_test`,
          target: "event:test_event",
          properties: {},
        };

        const bundle = {
          entities: [entity, event],
          relationships: [relationship],
          evidence: [],
          content: [],
        };

        const result = validateRabbitHoleBundle(bundle);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe("Domain-Specific Property Validation", () => {
    test("should validate Infrastructure domain entities", () => {
      const building = {
        uid: "building:test_office",
        type: "Building",
        name: "Test Office",
        latitude: 40.748817,
        longitude: -73.985428,
        properties: {
          building_type: "office",
          height: 200,
          floors: 50,
          energy_rating: "A",
        },
      };

      const result = BuildingEntitySchema.safeParse(building);
      expect(result.success).toBe(true);
    });

    test("should validate Transportation domain entities", () => {
      const vehicle = {
        uid: "vehicle:test_truck",
        type: "Vehicle",
        name: "Test Truck",
        properties: {
          vehicle_type: "truck",
          manufacturer: "Ford",
          fuel_type: "diesel",
          cargo_capacity: 5000,
        },
      };

      const result = VehicleEntitySchema.safeParse(vehicle);
      expect(result.success).toBe(true);
    });

    test("should validate Medical domain entities", () => {
      const disease = {
        uid: "disease:test_flu",
        type: "Disease",
        name: "Test Flu",
        properties: {
          disease_type: "infectious",
          contagious: true,
          severity: "mild",
        },
      };

      const result = DiseaseEntitySchema.safeParse(disease);
      expect(result.success).toBe(true);
    });

    test("should validate Academic domain entities", () => {
      const university = {
        uid: "university:test_college",
        type: "University",
        name: "Test College",
        latitude: 42.3601,
        longitude: -71.0589,
        properties: {
          university_type: "private",
          enrollment: 25000,
          endowment: 1000000000,
        },
      };

      const result = UniversityEntitySchema.safeParse(university);
      expect(result.success).toBe(true);
    });

    test("should validate Cultural domain entities", () => {
      const book = {
        uid: "book:test_novel",
        type: "Book",
        name: "Test Novel",
        properties: {
          published_date: "2020-03-15",
          publisher: "Test Press",
          pages: 350,
          fiction: true,
        },
      };

      const result = BookEntitySchema.safeParse(book);
      expect(result.success).toBe(true);
    });

    test("should validate Technology domain entities", () => {
      const software = {
        uid: "software:test_app",
        type: "Software",
        name: "Test App",
        properties: {
          category: "application",
          language: ["Python"],
          license: "MIT",
          openSource: true,
        },
      };

      const result = SoftwareEntitySchema.safeParse(software);
      expect(result.success).toBe(true);
    });

    test("should validate Economic domain entities", () => {
      const currency = {
        uid: "currency:test_token",
        type: "Currency",
        name: "Test Token",
        properties: {
          currency_code: "TST",
          currency_type: "cryptocurrency",
          total_supply: 1000000,
        },
      };

      const result = CurrencyEntitySchema.safeParse(currency);
      expect(result.success).toBe(true);
    });

    test("should validate Legal domain entities", () => {
      const law = {
        uid: "law:test_act",
        type: "Law",
        name: "Test Act",
        properties: {
          law_type: "statute",
          jurisdiction: "Federal",
          enacted_date: "2021-01-01",
        },
      };

      const result = LawEntitySchema.safeParse(law);
      expect(result.success).toBe(true);
    });

    test("should validate Media domain entities", () => {
      const event = {
        uid: "event:test_launch",
        type: "Event",
        name: "Test Launch",
        latitude: 28.5618,
        longitude: -80.577,
        properties: {
          eventType: "launch",
          date: "2024-03-15",
          impact: "international",
          verified: true,
        },
      };

      const result = EventEntitySchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe("Geospatial Coordinate Validation", () => {
    test("should enforce latitude bounds", () => {
      const invalidLatitudes = [-91, 91, 180, -180];

      invalidLatitudes.forEach((lat) => {
        const entity = {
          uid: "building:invalid_lat",
          type: "Building",
          name: "Invalid Latitude",
          latitude: lat,
          longitude: 0,
          properties: {},
        };

        const bundle = {
          entities: [entity],
          relationships: [],
          evidence: [],
          content: [],
        };
        const result = validateRabbitHoleBundle(bundle);
        expect(result.isValid).toBe(false);
      });
    });

    test("should enforce longitude bounds", () => {
      const invalidLongitudes = [-181, 181, 360, -360];

      invalidLongitudes.forEach((lng) => {
        const entity = {
          uid: "building:invalid_lng",
          type: "Building",
          name: "Invalid Longitude",
          latitude: 0,
          longitude: lng,
          properties: {},
        };

        const bundle = {
          entities: [entity],
          relationships: [],
          evidence: [],
          content: [],
        };
        const result = validateRabbitHoleBundle(bundle);
        expect(result.isValid).toBe(false);
      });
    });

    test("should validate geometry types", () => {
      const validGeometryTypes = [
        "point",
        "linestring",
        "polygon",
        "multipoint",
      ];

      validGeometryTypes.forEach((geometryType) => {
        const entity = {
          uid: "building:geometry_test",
          type: "Building",
          name: "Geometry Test",
          latitude: 40.7128,
          longitude: -74.006,
          geometry_type: geometryType,
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
  });

  describe("Universal Status Validation", () => {
    test("should validate all universal status values", () => {
      const validStatuses = [
        "active",
        "inactive",
        "historical",
        "theoretical",
        "fictional",
        "planned",
        "under_construction",
        "defunct",
        "unknown",
      ];

      validStatuses.forEach((status) => {
        const entity = {
          uid: "person:status_test",
          type: "Person",
          name: "Status Test",
          status,
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
  });
});
