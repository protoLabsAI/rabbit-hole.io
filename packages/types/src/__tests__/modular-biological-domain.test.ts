/**
 * Modular Biological Domain Test
 *
 * Tests the new modular biological domain structure as proof of concept.
 */

import { describe, it, expect } from "vitest";

import {
  AnimalEntitySchema,
  PlantEntitySchema,
  FungiEntitySchema,
  BIOLOGICAL_ENTITY_SCHEMAS,
  BIOLOGICAL_UID_VALIDATORS,
  isBiologicalUID,
  getBiologicalEntityType,
  validateBiologicalUID,
  BIOLOGICAL_DOMAIN_INFO,
} from "../domains/biological";

describe("Modular Biological Domain", () => {
  describe("Entity Schemas", () => {
    it("should validate animal entities", () => {
      const rabbit = {
        uid: "animal:european_rabbit",
        type: "Animal",
        name: "European Rabbit",
        properties: {
          scientificName: "Oryctolagus cuniculus",
          diet: "herbivore",
          averageWeight: 1500,
          conservationStatus: "least_concern",
        },
      };

      const result = AnimalEntitySchema.safeParse(rabbit);
      expect(result.success).toBe(true);
    });

    it("should validate plant entities", () => {
      const clover = {
        uid: "plant:clover",
        type: "Plant",
        name: "Clover",
        properties: {
          scientificName: "Trifolium species",
          plant_type: "legume",
          edible: true,
          sunlightRequirement: "full_sun",
        },
      };

      const result = PlantEntitySchema.safeParse(clover);
      expect(result.success).toBe(true);
    });

    it("should validate fungi entities", () => {
      const mushroom = {
        uid: "fungi:button_mushroom",
        type: "Fungi",
        name: "Button Mushroom",
        properties: {
          scientificName: "Agaricus bisporus",
          fungi_type: "mushroom",
          edible: true,
          cultivation_method: "cultivated",
        },
      };

      const result = FungiEntitySchema.safeParse(mushroom);
      expect(result.success).toBe(true);
    });
  });

  describe("UID Validation", () => {
    it("should identify biological UIDs correctly", () => {
      expect(isBiologicalUID("animal:rabbit")).toBe(true);
      expect(isBiologicalUID("plant:clover")).toBe(true);
      expect(isBiologicalUID("fungi:mushroom")).toBe(true);
      expect(isBiologicalUID("person:scientist")).toBe(false);
      expect(isBiologicalUID("org:university")).toBe(false);
    });

    it("should get entity types from UIDs", () => {
      expect(getBiologicalEntityType("animal:rabbit")).toBe("Animal");
      expect(getBiologicalEntityType("plant:clover")).toBe("Plant");
      expect(getBiologicalEntityType("fungi:mushroom")).toBe("Fungi");
      expect(getBiologicalEntityType("person:scientist")).toBeNull();
    });

    it("should validate biological UID formats", () => {
      expect(validateBiologicalUID("animal:rabbit")).toBe(true);
      expect(validateBiologicalUID("plant:clover")).toBe(true);
      expect(validateBiologicalUID("fungi:mushroom")).toBe(true);
      expect(validateBiologicalUID("invalid_format")).toBe(false);
      expect(validateBiologicalUID("animal:")).toBe(true); // Valid prefix
    });
  });

  describe("Domain Registry", () => {
    it("should export all biological schemas", () => {
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Animal).toBe(AnimalEntitySchema);
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Plant).toBe(PlantEntitySchema);
      expect(BIOLOGICAL_ENTITY_SCHEMAS.Fungi).toBe(FungiEntitySchema);
    });

    it("should have correct UID validators", () => {
      expect(typeof BIOLOGICAL_UID_VALIDATORS.animal).toBe("function");
      expect(typeof BIOLOGICAL_UID_VALIDATORS.plant).toBe("function");
      expect(typeof BIOLOGICAL_UID_VALIDATORS.fungi).toBe("function");
    });

    it("should provide domain metadata", () => {
      expect(BIOLOGICAL_DOMAIN_INFO.name).toBe("biological");
      expect(BIOLOGICAL_DOMAIN_INFO.entityCount).toBeGreaterThan(0);
      expect(BIOLOGICAL_DOMAIN_INFO.relationships).toContain("EATS");
      expect(BIOLOGICAL_DOMAIN_INFO.relationships).toContain("HUNTS");
    });
  });

  describe("Universal Properties", () => {
    it("should support geospatial properties on biological entities", () => {
      const locationBasedAnimal = {
        uid: "animal:zoo_elephant",
        type: "Animal",
        name: "Zoo Elephant",
        latitude: 40.7128,
        longitude: -74.006,
        coordinates_verified: true,
        properties: {
          scientificName: "Elephas maximus",
        },
      };

      const result = AnimalEntitySchema.safeParse(locationBasedAnimal);
      expect(result.success).toBe(true);
    });

    it("should support temporal properties on biological entities", () => {
      const historicalSpecies = {
        uid: "animal:dodo",
        type: "Animal",
        name: "Dodo",
        created_date: "1600-01-01",
        destroyed_date: "1681-12-31",
        status: "historical",
        properties: {
          scientificName: "Raphus cucullatus",
          conservationStatus: "extinct",
        },
      };

      const result = AnimalEntitySchema.safeParse(historicalSpecies);
      expect(result.success).toBe(true);
    });
  });
});
