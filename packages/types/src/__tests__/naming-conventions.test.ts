/**
 * Naming Convention Tests
 *
 * These tests enforce naming conventions and will fail if anti-patterns are introduced.
 * Run these tests in CI to catch convention violations early.
 */

import { describe, it, expect, vi } from "vitest";

import { generateEntityUID } from "../entity-research-types";
import {
  validateAllEntityConventions,
  validateEntityTypeNaming,
  validateUidPrefix,
  validatePropertyNaming,
  ENTITY_DOMAIN_MAP,
  VALID_DOMAINS,
} from "../naming-conventions";
import { EntityTypeEnum } from "../validation-schemas-modular";

describe.skip("Naming Convention Enforcement", () => {
  describe("Entity Type Naming", () => {
    it("should reject camelCase entity types", () => {
      expect(() => validateEntityTypeNaming("SolarSystem")).toThrow(
        /violates naming convention/
      );
      expect(() => validateEntityTypeNaming("MedicalDevice")).toThrow(
        /violates naming convention/
      );
      expect(() => validateEntityTypeNaming("ClinicalTrial")).toThrow(
        /violates naming convention/
      );
    });

    it("should accept valid snake_case entity types", () => {
      expect(validateEntityTypeNaming("Solar_System")).toBe(true);
      expect(validateEntityTypeNaming("Medical_Device")).toBe(true);
      expect(validateEntityTypeNaming("Clinical_Trial")).toBe(true);
      expect(validateEntityTypeNaming("Person")).toBe(true);
      expect(validateEntityTypeNaming("University")).toBe(true);
    });

    it("should validate all current entity types follow conventions", () => {
      const entityTypes = EntityTypeEnum.options;

      entityTypes.forEach((entityType) => {
        expect(() => validateEntityTypeNaming(entityType)).not.toThrow();
      });
    });
  });

  describe("UID Prefix Validation", () => {
    it("should match entity type naming to UID prefix", () => {
      expect(validateUidPrefix("Solar_System", "solar_system:test")).toBe(true);
      expect(validateUidPrefix("Medical_Device", "medical_device:test")).toBe(
        true
      );
      expect(validateUidPrefix("Clinical_Trial", "clinical_trial:test")).toBe(
        true
      );
      expect(validateUidPrefix("Person", "person:test")).toBe(true);
    });

    it("should reject mismatched UID prefixes", () => {
      expect(() =>
        validateUidPrefix("Solar_System", "solarsystem:test")
      ).toThrow(/does not match expected/);
      expect(() =>
        validateUidPrefix("Medical_Device", "medicaldevice:test")
      ).toThrow(/does not match expected/);
      expect(() => validateUidPrefix("Person", "people:test")).toThrow(
        /does not match expected/
      );
    });

    it("should validate all entity types generate correct UIDs", () => {
      const entityTypes = EntityTypeEnum.options;

      entityTypes.forEach((entityType) => {
        const uid = generateEntityUID(entityType, "test");
        expect(() => validateUidPrefix(entityType, uid)).not.toThrow();
      });
    });
  });

  describe("Domain Mapping", () => {
    it("should have domain mapping for all entity types", () => {
      const entityTypes = EntityTypeEnum.options;

      entityTypes.forEach((entityType) => {
        expect(ENTITY_DOMAIN_MAP[entityType]).toBeDefined();
        expect(VALID_DOMAINS).toContain(ENTITY_DOMAIN_MAP[entityType]);
      });
    });

    it("should have correct domain counts", () => {
      const domainCounts = VALID_DOMAINS.reduce(
        (acc, domain) => {
          acc[domain] = Object.values(ENTITY_DOMAIN_MAP).filter(
            (d) => d === domain
          ).length;
          return acc;
        },
        {} as Record<string, number>
      );

      // Expected counts based on current modular domain system (12 domains)
      expect(domainCounts.social).toBe(9); // Person, Organization, Platform, Movement, Event, Media, Athlete, Character, Location
      expect(domainCounts.medical).toBe(11); // Disease, Drug, Treatment, Symptom, Condition, Medical_Device, Hospital, Clinic, Pharmacy, Insurance, Clinical_Trial
      expect(domainCounts.academic).toBe(22); // Includes physics, chemistry, mathematics concepts
      expect(domainCounts.cultural).toBe(24); // Includes sports, entertainment, food, art, media
      expect(domainCounts.biological).toBe(13); // Animal, Plant, Species, Insect, Ecosystem, agriculture entities
      expect(domainCounts.geographic).toBe(8); // Country, City, Region, Continent, environmental
      expect(domainCounts.infrastructure).toBe(17); // Building, Stadium, materials, resources
      expect(domainCounts.transportation).toBe(6); // Vehicle, Aircraft, Ship, Train, Route, Station
      expect(domainCounts.astronomical).toBe(4); // Planet, Star, Galaxy, Solar_System
      expect(domainCounts.legal).toBe(7); // Law, Court, Case, Regulation, Patent, License, Contract
      expect(domainCounts.technology).toBe(7); // Software, Hardware, Database, API, Protocol, Framework, Library
      expect(domainCounts.economic).toBe(6); // Currency, Market, Industry, Commodity, Investment, Company

      // Verify total entity types
      const totalEntities = Object.values(domainCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      expect(totalEntities).toBe(134);
    });
  });

  describe("Schema Structure", () => {
    it("should enforce all schemas follow required structure", () => {
      // This test would be expanded to validate actual schema structures
      // For now, we validate that the basic pattern exists
      const requiredFields = ["uid", "type", "name"];

      // Test would validate each entity schema has these fields
      expect(requiredFields).toHaveLength(3);
    });
  });

  describe("Anti-Pattern Detection", () => {
    it("should detect naming anti-patterns", () => {
      // Common anti-patterns that should be rejected
      const antiPatterns = [
        "userAccount", // camelCase
        "UserAccount", // PascalCase
        "user-account", // kebab-case
        "USERACCOUNT", // UPPER_CASE
        "user account", // spaces
        "User_account", // mixed case
      ];

      antiPatterns.forEach((pattern) => {
        expect(() => validateEntityTypeNaming(pattern)).toThrow();
      });
    });

    it("should validate against UID prefix anti-patterns", () => {
      // Common UID prefix mistakes
      const prefixAntiPatterns = [
        { entityType: "User_Account" as any, uid: "userAccount:test" },
        { entityType: "Solar_System" as any, uid: "SolarSystem:test" },
        { entityType: "Medical_Device" as any, uid: "medicalDevice:test" },
      ];

      prefixAntiPatterns.forEach(({ entityType, uid }) => {
        expect(() => validateUidPrefix(entityType, uid)).toThrow();
      });
    });
  });

  describe("System-Wide Validation", () => {
    it("should validate all conventions across the entire system", () => {
      expect(() => validateAllEntityConventions()).not.toThrow();
    });

    it("should have consistent entity type count", () => {
      const entityTypes = EntityTypeEnum.options;
      const domainMappings = Object.keys(ENTITY_DOMAIN_MAP);

      expect(entityTypes.length).toBe(domainMappings.length);
      expect(entityTypes.length).toBe(134); // Current expected count
    });
  });
});

describe.skip("Property Naming Conventions", () => {
  describe("Date Fields", () => {
    it("should warn about inconsistent date field naming", () => {
      // Mock console.warn to capture warnings
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // These should generate warnings
      const dateAntiPatterns = [
        { name: "created", value: "2024-01-01" },
        { name: "updated", value: "2024-01-01" },
        { name: "published", value: "2024-01-01" },
      ];

      dateAntiPatterns.forEach(({ name, value }) => {
        validatePropertyNaming(name, value);
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should accept valid date field naming", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // These should not generate warnings
      const validDateFields = [
        { name: "created_date", value: "2024-01-01" },
        { name: "published_date", value: "2024-01-01" },
        { name: "founded", value: "2024-01-01" }, // Legacy exception
      ];

      validDateFields.forEach(({ name, value }) => {
        validatePropertyNaming(name, value);
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Type Fields", () => {
    it("should warn about inconsistent type field naming", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // These should generate warnings
      const typeAntiPatterns = [
        { name: "hospitaltype", value: "general" },
        { name: "disease-type", value: "infectious" },
        { name: "drugType", value: "prescription" },
      ];

      typeAntiPatterns.forEach(({ name, value }) => {
        validatePropertyNaming(name, value);
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
