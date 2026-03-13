/**
 * Biological Domain Complete - Test Suite
 *
 * Comprehensive tests for the complete biological domain including
 * the newly migrated Species, Insect, and Ecosystem entities.
 */

import { describe, it, expect } from "vitest";

import {
  BIOLOGICAL_ENTITY_SCHEMAS,
  BIOLOGICAL_UID_VALIDATORS,
  BIOLOGICAL_ENTITY_TYPES,
  validateBiologicalUID,
  getBiologicalEntityType,
  isBiologicalUID,
  SpeciesEntitySchema,
  InsectEntitySchema,
  EcosystemEntitySchema,
} from "../domains/biological";
import { EntitySchemaRegistry } from "../entity-schema-registry";

describe.skip("Biological Domain - Complete Migration", () => {
  // ==================== Registry Tests ====================

  describe("Domain Registry", () => {
    it("includes all 6 biological entity types", () => {
      expect(BIOLOGICAL_ENTITY_TYPES).toEqual([
        "Animal",
        "Plant",
        "Fungi",
        "Species",
        "Insect",
        "Ecosystem",
      ]);
      expect(BIOLOGICAL_ENTITY_TYPES).toHaveLength(6);
    });

    it("has schemas for all entity types", () => {
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Animal).toBeDefined();
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Plant).toBeDefined();
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Fungi).toBeDefined();
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Species).toBeDefined();
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Insect).toBeDefined();
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Ecosystem).toBeDefined();
    });

    it("has UID validators for all entity types", () => {
      expect(BIOLOGICAL_UID_VALIDATORS.animal).toBeDefined();
      expect(BIOLOGICAL_UID_VALIDATORS.plant).toBeDefined();
      expect(BIOLOGICAL_UID_VALIDATORS.fungi).toBeDefined();
      expect(BIOLOGICAL_UID_VALIDATORS.species).toBeDefined();
      expect(BIOLOGICAL_UID_VALIDATORS.insect).toBeDefined();
      expect(BIOLOGICAL_UID_VALIDATORS.ecosystem).toBeDefined();
    });
  });

  // ==================== Species Entity Tests ====================

  describe("Species Entity", () => {
    it("validates valid species entity", () => {
      const validSpecies = {
        uid: "species:homo_sapiens",
        type: "Species",
        name: "Homo sapiens",
        properties: {
          scientificName: "Homo sapiens",
          authority: "Linnaeus, 1758",
          yearDescribed: "1758",
          commonNames: ["Human", "Modern human"],
          taxonomicStatus: "accepted",
          conservationStatus: "least_concern",
          class: "Mammalia",
          order: "Primates",
          family: "Hominidae",
          genus: "Homo",
        },
      };

      const result = SpeciesEntitySchema.safeParse(validSpecies);
      expect(result.success).toBe(true);
    });

    it("validates species UID format", () => {
      expect(validateBiologicalUID("species:homo_sapiens")).toBe(true);
      expect(validateBiologicalUID("species:canis_lupus")).toBe(true);
      expect(validateBiologicalUID("animal:homo_sapiens")).toBe(true); // Valid biological UID, different entity type
      expect(validateBiologicalUID("invalid:species")).toBe(false);

      // Test specific species UID validation
      expect(BIOLOGICAL_UID_VALIDATORS.species("species:homo_sapiens")).toBe(
        true
      );
      expect(BIOLOGICAL_UID_VALIDATORS.species("animal:homo_sapiens")).toBe(
        false
      );
    });

    it("gets correct entity type from species UID", () => {
      expect(getBiologicalEntityType("species:test")).toBe("Species");
      expect(isBiologicalUID("species:test")).toBe(true);
    });
  });

  // ==================== Insect Entity Tests ====================

  describe("Insect Entity", () => {
    it("validates valid insect entity", () => {
      const validInsect = {
        uid: "insect:apis_mellifera",
        type: "Insect",
        name: "European Honey Bee",
        properties: {
          scientificName: "Apis mellifera",
          commonNames: ["European Honey Bee", "Western Honey Bee"],
          taxonomicRank: "species",
          conservationStatus: "least_concern",
          habitat: "Various habitats, beehives",
          diet: "nectar_feeder",
          lifecycle: "complete_metamorphosis",
          socialStructure: "eusocial",
          wingType: "four_wings",
          bodyLength: 15, // mm
          economicImpact: "beneficial",
          pollinatorOf: ["plant:apple_tree", "plant:sunflower"],
          class: "Insecta",
          order: "Hymenoptera",
          family: "Apidae",
          genus: "Apis",
          species: "mellifera",
        },
      };

      const result = InsectEntitySchema.safeParse(validInsect);
      expect(result.success).toBe(true);
    });

    it("validates insect UID format", () => {
      expect(validateBiologicalUID("insect:apis_mellifera")).toBe(true);
      expect(validateBiologicalUID("insect:monarch_butterfly")).toBe(true);
      expect(validateBiologicalUID("animal:apis_mellifera")).toBe(true); // Valid biological UID, different entity type

      // Test specific insect UID validation
      expect(BIOLOGICAL_UID_VALIDATORS.insect("insect:apis_mellifera")).toBe(
        true
      );
      expect(BIOLOGICAL_UID_VALIDATORS.insect("animal:apis_mellifera")).toBe(
        false
      );
    });

    it("gets correct entity type from insect UID", () => {
      expect(getBiologicalEntityType("insect:test")).toBe("Insect");
      expect(isBiologicalUID("insect:test")).toBe(true);
    });
  });

  // ==================== Ecosystem Entity Tests ====================

  describe("Ecosystem Entity", () => {
    it("validates valid ecosystem entity", () => {
      const validEcosystem = {
        uid: "ecosystem:amazon_rainforest",
        type: "Ecosystem",
        name: "Amazon Rainforest",
        properties: {
          ecosystemType: "forest",
          biome: "Tropical rainforest",
          location: "South America",
          area: 5500000, // sq km
          climate: "Tropical humid",
          keySpecies: ["animal:jaguar", "plant:cecropia", "fungi:mycorrhiza"],
          threats: ["deforestation", "climate_change", "mining"],
          conservationStatus: "moderately_degraded",
          protectedStatus: true,
          services: [
            "carbon_sequestration",
            "oxygen_production",
            "biodiversity_habitat",
            "climate_regulation",
          ],
          humanImpact: "high",
          biodiversityIndex: 0.95,
          primaryProducers: ["plant:brazil_nut", "plant:rubber_tree"],
          dominantVegetation: "Broadleaf evergreen trees",
          soilType: "Oxisol",
          waterSources: ["Amazon River", "tributaries"],
          seasonality: "Wet and dry seasons",
        },
      };

      const result = EcosystemEntitySchema.safeParse(validEcosystem);
      expect(result.success).toBe(true);
    });

    it("validates ecosystem UID format", () => {
      expect(validateBiologicalUID("ecosystem:amazon_rainforest")).toBe(true);
      expect(validateBiologicalUID("ecosystem:sahara_desert")).toBe(true);
      expect(validateBiologicalUID("animal:amazon_rainforest")).toBe(true); // Valid biological UID, different entity type

      // Test specific ecosystem UID validation
      expect(
        BIOLOGICAL_UID_VALIDATORS.ecosystem("ecosystem:amazon_rainforest")
      ).toBe(true);
      expect(
        BIOLOGICAL_UID_VALIDATORS.ecosystem("animal:amazon_rainforest")
      ).toBe(false);
    });

    it("gets correct entity type from ecosystem UID", () => {
      expect(getBiologicalEntityType("ecosystem:test")).toBe("Ecosystem");
      expect(isBiologicalUID("ecosystem:test")).toBe(true);
    });
  });

  // ==================== Registry Integration Tests ====================

  describe("Registry Integration", () => {
    const registry = EntitySchemaRegistry.getInstance();

    it("registry recognizes all biological entities", () => {
      expect(registry.getSchema("Species")).toBeDefined();
      expect(registry.getSchema("Insect")).toBeDefined();
      expect(registry.getSchema("Ecosystem")).toBeDefined();
    });

    it("registry validates biological UIDs correctly", () => {
      expect(registry.validateUID("species:test")).toBe(true);
      expect(registry.validateUID("insect:test")).toBe(true);
      expect(registry.validateUID("ecosystem:test")).toBe(true);
    });

    it("registry maps UIDs to correct domain", () => {
      expect(registry.getDomainFromUID("species:test")).toBe("biological");
      expect(registry.getDomainFromUID("insect:test")).toBe("biological");
      expect(registry.getDomainFromUID("ecosystem:test")).toBe("biological");
    });
  });

  // ==================== Migration Validation Tests ====================

  describe("Migration Validation", () => {
    it("maintains backward compatibility with existing biological entities", () => {
      // Test that existing Animal, Plant, Fungi entities still work
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Animal).toBeDefined();
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Plant).toBeDefined();
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Fungi).toBeDefined();

      expect(validateBiologicalUID("animal:test")).toBe(true);
      expect(validateBiologicalUID("plant:test")).toBe(true);
      expect(validateBiologicalUID("fungi:test")).toBe(true);
    });

    it("biological domain now complete with 6 entities", () => {
      const expectedEntities = [
        "Animal",
        "Plant",
        "Fungi",
        "Species",
        "Insect",
        "Ecosystem",
      ];

      expectedEntities.forEach((entityType) => {
        expect(BIOLOGICAL_ENTITY_TYPES).toContain(entityType);
        expect(
          BIOLOGICAL_ENTITY_SCHEMAS[
            entityType as keyof typeof BIOLOGICAL_ENTITY_SCHEMAS
          ]
        ).toBeDefined();
      });
    });

    it("all biological entities inherit universal properties", () => {
      const testEntity = {
        uid: "species:test",
        type: "Species",
        name: "Test Species",
        // Universal properties should be inherited
        coordinates: {
          latitude: 40.7128,
          longitude: -74.006,
        },
        startDate: "2024-01-01",
        status: "active",
        relatedEvents: ["event:discovery"],
      };

      const result = SpeciesEntitySchema.safeParse(testEntity);
      expect(result.success).toBe(true);
    });
  });
});
