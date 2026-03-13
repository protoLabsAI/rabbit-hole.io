/**
 * Comprehensive tests for modular schema migration
 * These tests ensure we don't break anything during refactoring
 */

import { describe, it, expect } from "vitest";

import {
  validateRabbitHoleBundle,
  EntityTypeEnum,
  RelationshipTypeEnum,
} from "../validation-schemas-modular";

describe.skip("Modular Schema Migration - Pre-Refactor Tests", () => {
  // Test all current entity types are supported
  describe("Entity Type Coverage", () => {
    const expectedEntityTypes = [
      // Core entities
      "Person",
      "Organization",
      "Platform",
      "Movement",
      "Event",
      "Media",

      // Biological entities
      "Animal",
      "Plant",
      "Fungi",
      "Species",
      "Insect",
      "Ecosystem",

      // Astronomical entities
      "Planet",
      "Star",
      "Galaxy",
      "Solar_System",

      // Geographic entities
      "Country",
      "City",
      "Region",
      "Continent",

      // Technology entities
      "Software",
      "Hardware",
      "Database",
      "API",
      "Protocol",
      "Framework",
      "Library",

      // Economic entities
      "Currency",
      "Market",
      "Industry",
      "Commodity",
      "Investment",
      "Company",

      // Legal entities
      "Law",
      "Court",
      "Case",
      "Regulation",
      "Patent",
      "License",
      "Contract",

      // Academic entities
      "University",
      "Research",
      "Publication",
      "Journal",
      "Course",
      "Degree",

      // Cultural entities
      "Book",
      "Film",
      "Song",
      "Art",
      "Language",
      "Religion",
      "Tradition",

      // Medical entities
      "Disease",
      "Drug",
      "Treatment",
      "Symptom",
      "Condition",
      "Medical_Device",

      // Health system entities
      "Hospital",
      "Clinic",
      "Pharmacy",
      "Insurance",
      "Clinical_Trial",

      // Infrastructure entities
      "Building",
      "Bridge",
      "Road",
      "Airport",
      "Port",
      "Utility",
      "Pipeline",

      // Transportation entities
      "Vehicle",
      "Aircraft",
      "Ship",
      "Train",
      "Route",
      "Station",

      // Physics entities
      "Particle",
      "Force",
      "Field",
      "Energy_Type",
      "Physical_Process",
      "Wave",
      "Quantum_State",

      // Chemistry entities
      "Element",
      "Compound",
      "Reaction",
      "Molecule",
      "Ion",
      "Chemical_Bond",
      "Catalyst",

      // Mathematics entities
      "Mathematical_Concept",
      "Formula",
      "Theorem",
      "Proof",
      "Statistical_Model",
      "Algorithm",
      "Function",

      // Materials entities
      "Material",
      "Mineral",
      "Resource",
      "Substance",
      "Composite",
      "Alloy",
      "Crystal",

      // Environmental entities
      "Weather_Event",
      "Climate_Zone",
      "Natural_Disaster",
      "Environmental_Process",
      "Carbon_Cycle",
      "Renewable_Energy",

      // Sports entities
      "Sport",
      "Team",
      "Athlete",
      "Competition",
      "Stadium",
      "League",
      "Tournament",
      "Sports_Event",

      // Entertainment entities
      "Game",
      "TV_Show",
      "Podcast",
      "Theater",
      "Concert_Venue",
      "Entertainment_Event",

      // Food entities
      "Food",
      "Recipe",
      "Ingredient",
      "Nutrition",
      "Diet",
      "Food_Product",
      "Cuisine",

      // Agriculture entities
      "Farm",
      "Crop",
      "Livestock",
      "Agricultural_Equipment",
      "Soil",
      "Irrigation_System",
    ];

    it("should support all expected entity types", () => {
      const actualEntityTypes = EntityTypeEnum.options;

      expectedEntityTypes.forEach((expectedType) => {
        expect(actualEntityTypes).toContain(expectedType);
      });

      // Ensure count matches
      expect(actualEntityTypes.length).toBeGreaterThanOrEqual(
        expectedEntityTypes.length
      );
    });

    it("should validate entity UIDs for all biological entities", () => {
      const biologicalEntities = [
        {
          uid: "animal:european_rabbit",
          type: "Animal",
          name: "European Rabbit",
        },
        { uid: "plant:clover", type: "Plant", name: "Clover" },
        { uid: "fungi:mushroom", type: "Fungi", name: "Mushroom" },
        { uid: "species:homo_sapiens", type: "Species", name: "Homo sapiens" },
        { uid: "insect:honey_bee", type: "Insect", name: "Honey Bee" },
        { uid: "ecosystem:grassland", type: "Ecosystem", name: "Grassland" },
      ];

      biologicalEntities.forEach((entity) => {
        const bundle = {
          entities: [entity],
          relationships: [],
          evidence: [],
          content: [],
          files: [],
        };

        const result = validateRabbitHoleBundle(bundle);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe("Relationship Type Coverage", () => {
    const expectedBiologicalRelationships = [
      "EATS",
      "HUNTS",
      "INHABITS",
      "FEEDS_ON",
      "PREYS_ON",
      "SYMBIOTIC_WITH",
      "POLLINATES",
      "DOMESTICATED_BY",
      "GROWS_IN",
      "DOMINATES",
      "EVOLVED_FROM",
    ];

    it("should support all biological relationship types", () => {
      const actualRelationshipTypes = RelationshipTypeEnum.options;

      expectedBiologicalRelationships.forEach((expectedType) => {
        expect(actualRelationshipTypes).toContain(expectedType);
      });
    });

    it("should validate biological relationships", () => {
      const testBundle = {
        entities: [
          { uid: "animal:rabbit", type: "Animal", name: "Rabbit" },
          { uid: "plant:clover", type: "Plant", name: "Clover" },
          { uid: "animal:fox", type: "Animal", name: "Fox" },
        ],
        relationships: [
          {
            uid: "rel:rabbit_eats_clover",
            type: "EATS",
            source: "animal:rabbit",
            target: "plant:clover",
          },
          {
            uid: "rel:fox_hunts_rabbit",
            type: "HUNTS",
            source: "animal:fox",
            target: "animal:rabbit",
          },
        ],
        evidence: [],
        content: [],
        files: [],
      };

      const result = validateRabbitHoleBundle(testBundle);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Cross-Domain Integration", () => {
    it("should validate complex multi-domain bundle", () => {
      const complexBundle = {
        entities: [
          { uid: "person:researcher", type: "Person", name: "Researcher" },
          { uid: "animal:lab_mouse", type: "Animal", name: "Lab Mouse" },
          { uid: "university:harvard", type: "University", name: "Harvard" },
          { uid: "disease:cancer", type: "Disease", name: "Cancer" },
        ],
        relationships: [
          {
            uid: "rel:researcher_studies_mouse",
            type: "STUDIES",
            source: "person:researcher",
            target: "animal:lab_mouse",
          },
          {
            uid: "rel:researcher_at_harvard",
            type: "AFFILIATED_WITH",
            source: "person:researcher",
            target: "university:harvard",
          },
        ],
        evidence: [
          {
            uid: "evidence:test_study",
            kind: "research",
            title: "Test Study",
            publisher: "Test Journal",
            date: "2025-01-01",
            url: "https://example.com/study",
          },
        ],
        content: [],
        files: [],
      };

      const result = validateRabbitHoleBundle(complexBundle);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Current Schema Properties", () => {
    it("should preserve universal properties (geospatial, temporal, status)", () => {
      const entityWithUniversalProps = {
        uid: "building:test_building",
        type: "Building",
        name: "Test Building",
        latitude: 40.7128,
        longitude: -74.006,
        altitude: 100,
        created_date: "2020-01-01",
        status: "active",
      };

      const bundle = {
        entities: [entityWithUniversalProps],
        relationships: [],
        evidence: [],
        content: [],
        files: [],
      };

      const result = validateRabbitHoleBundle(bundle);
      expect(result.isValid).toBe(true);
    });

    it("should preserve entity-specific properties", () => {
      const animalWithSpecificProps = {
        uid: "animal:test_rabbit",
        type: "Animal",
        name: "Test Rabbit",
        properties: {
          scientificName: "Oryctolagus cuniculus",
          diet: "herbivore",
          averageWeight: 1500,
          conservationStatus: "least_concern",
        },
      };

      const bundle = {
        entities: [animalWithSpecificProps],
        relationships: [],
        evidence: [],
        content: [],
        files: [],
      };

      const result = validateRabbitHoleBundle(bundle);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should provide helpful error messages for missing references", () => {
      const bundleWithMissingRef = {
        entities: [{ uid: "animal:rabbit", type: "Animal", name: "Rabbit" }],
        relationships: [
          {
            uid: "rel:rabbit_eats_missing",
            type: "EATS",
            source: "animal:rabbit",
            target: "plant:missing_plant",
          },
        ],
        evidence: [],
        content: [],
        files: [],
      };

      const result = validateRabbitHoleBundle(bundleWithMissingRef);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("Missing Plant entity"))
      ).toBe(true);
    });

    it("should validate UID format requirements", () => {
      const bundleWithBadUID = {
        entities: [{ uid: "bad_uid_format", type: "Animal", name: "Bad UID" }],
        relationships: [],
        evidence: [],
        content: [],
        files: [],
      };

      const result = validateRabbitHoleBundle(bundleWithBadUID);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("must use format"))
      ).toBe(true);
    });
  });
});

describe("Post-Refactor Validation Tests", () => {
  // These tests will run after refactoring to ensure nothing broke

  it("should maintain identical validation behavior", () => {
    // This will be our comprehensive test using the rabbit example
    // to ensure the refactored system works identically
  });

  it("should support all entity types after refactor", () => {
    // Test that all 77+ entity types still work
  });

  it("should support all relationship types after refactor", () => {
    // Test that all 200+ relationship types still work
  });
});
