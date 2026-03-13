import { describe, it, expect } from "vitest";

import {
  getRelationshipTypesForDomains,
  getEntityTypesForDomains,
  generateDiscoveryExample,
  formatRelationshipTypesForPrompt,
} from "../domain-utils";

describe("Domain Utils", () => {
  describe("getRelationshipTypesForDomains", () => {
    it("should return relationship types for single domain", () => {
      const types = getRelationshipTypesForDomains(["social"]);

      expect(types).toContain("SPEECH_ACT");
      expect(types).toContain("FUNDS");
      expect(types).toContain("MARRIED_TO");
      expect(types).toContain("EVIDENCES"); // Core type
      expect(types.length).toBeGreaterThan(10);
    });

    it("should combine relationship types from multiple domains", () => {
      const types = getRelationshipTypesForDomains(["social", "academic"]);

      // Social types
      expect(types).toContain("MARRIED_TO");
      expect(types).toContain("HOLDS_ROLE");

      // Academic types
      expect(types).toContain("PUBLISHED_IN");
      expect(types).toContain("TEACHES");

      // Core types
      expect(types).toContain("EVIDENCES");
      expect(types).toContain("SUPPORTS");
    });

    it("should deduplicate relationship types across domains", () => {
      const types = getRelationshipTypesForDomains(["social", "geographic"]);

      // Count occurrences of a type
      const uniqueTypes = new Set(types);
      expect(types.length).toBe(uniqueTypes.size);
    });

    it("should return sorted relationship types", () => {
      const types = getRelationshipTypesForDomains(["social", "academic"]);

      const sorted = [...types].sort();
      expect(types).toEqual(sorted);
    });

    it("should handle empty domain array", () => {
      const types = getRelationshipTypesForDomains([]);

      // Should still have core types
      expect(types).toContain("EVIDENCES");
      expect(types).toContain("SUPPORTS");
      expect(types.length).toBeGreaterThan(0);
    });

    it("should handle invalid domain name", () => {
      const types = getRelationshipTypesForDomains(["invalid_domain"]);

      // Should return core types
      expect(types).toContain("EVIDENCES");
      expect(types.length).toBeGreaterThan(0);
    });

    it("should include medical domain relationship types", () => {
      const types = getRelationshipTypesForDomains(["medical"]);

      expect(types).toContain("TREATS");
      expect(types).toContain("CAUSES");
      expect(types).toContain("PRESCRIBED_FOR");
    });

    it("should include geographic domain relationship types", () => {
      const types = getRelationshipTypesForDomains(["geographic"]);

      expect(types).toContain("LOCATED_IN");
      expect(types).toContain("BORDERS");
      expect(types).toContain("CAPITAL_OF");
    });
  });

  describe("getEntityTypesForDomains", () => {
    it("should return entity types for single domain", () => {
      const types = getEntityTypesForDomains(["social"]);

      expect(types).toContain("Person");
      expect(types).toContain("Organization");
      expect(types).toContain("Platform");
      expect(types).toContain("Event");
      expect(types.length).toBeGreaterThan(3);
    });

    it("should combine entity types from multiple domains", () => {
      const types = getEntityTypesForDomains([
        "social",
        "academic",
        "geographic",
      ]);

      // Social types
      expect(types).toContain("Person");
      expect(types).toContain("Organization");

      // Academic types
      expect(types).toContain("University");
      expect(types).toContain("Publication");

      // Geographic types
      expect(types).toContain("Country");
      expect(types).toContain("City");
    });

    it("should deduplicate entity types", () => {
      const types = getEntityTypesForDomains(["social", "geographic"]);

      const uniqueTypes = new Set(types);
      expect(types.length).toBe(uniqueTypes.size);
    });

    it("should return sorted entity types", () => {
      const types = getEntityTypesForDomains(["social"]);

      const sorted = [...types].sort();
      expect(types).toEqual(sorted);
    });

    it("should handle empty domain array", () => {
      const types = getEntityTypesForDomains([]);

      expect(types).toEqual([]);
    });

    it("should handle invalid domain name", () => {
      const types = getEntityTypesForDomains(["invalid_domain"]);

      expect(types).toEqual([]);
    });

    it("should include all academic entity types", () => {
      const types = getEntityTypesForDomains(["academic"]);

      expect(types).toContain("University");
      expect(types).toContain("Research");
      expect(types).toContain("Publication");
      expect(types).toContain("Journal");
      expect(types.length).toBeGreaterThan(5);
    });
  });

  describe("generateDiscoveryExample", () => {
    it("should generate example with all entity types from domains", () => {
      const example = generateDiscoveryExample(["social", "academic"]);

      expect(example).toHaveProperty("input_text");
      expect(example).toHaveProperty("expected_output");
      expect(typeof example.input_text).toBe("string");
      expect(example.input_text.length).toBeGreaterThan(0);

      // Should have social entity types
      expect(example.expected_output).toHaveProperty("Person");
      expect(example.expected_output).toHaveProperty("Organization");

      // Should have academic entity types
      expect(example.expected_output).toHaveProperty("University");
    });

    it("should populate social domain entities", () => {
      const example = generateDiscoveryExample(["social"]);

      expect(example.expected_output.Person).toEqual(["Bernie Sanders"]);
      expect(example.expected_output.Organization).toEqual(["U.S. Senate"]);
    });

    it("should populate geographic domain entities", () => {
      const example = generateDiscoveryExample(["geographic"]);

      expect(example.expected_output.Location).toContain("Vermont");
    });

    it("should populate academic domain entities", () => {
      const example = generateDiscoveryExample(["academic"]);

      expect(example.expected_output.University).toEqual([
        "University of Chicago",
      ]);
    });

    it("should include empty arrays for unpopulated types", () => {
      const example = generateDiscoveryExample(["social"]);

      // Social has Platform, Movement, Event, Media types
      expect(example.expected_output).toHaveProperty("Platform");
      expect(example.expected_output).toHaveProperty("Event");

      if (Array.isArray(example.expected_output.Platform)) {
        expect(example.expected_output.Platform.length).toBeGreaterThanOrEqual(
          0
        );
      }
    });

    it("should handle multiple domains with different entity types", () => {
      const example = generateDiscoveryExample([
        "social",
        "academic",
        "geographic",
      ]);

      // Should have entity types from all three domains
      const output = example.expected_output;

      expect(output.Person).toBeDefined();
      expect(output.Organization).toBeDefined();
      expect(output.University).toBeDefined();
      expect(output.Location).toBeDefined();
    });

    it("should handle empty domain array", () => {
      const example = generateDiscoveryExample([]);

      expect(example).toHaveProperty("input_text");
      expect(example).toHaveProperty("expected_output");
      expect(Object.keys(example.expected_output).length).toBe(0);
    });

    it("should handle medical domain", () => {
      const example = generateDiscoveryExample(["medical"]);

      expect(example.expected_output).toHaveProperty("Hospital");
      expect(example.expected_output).toHaveProperty("Disease");
      expect(Array.isArray(example.expected_output.Hospital)).toBe(true);
    });

    it("should handle technology domain", () => {
      const example = generateDiscoveryExample(["technology"]);

      expect(example.expected_output).toHaveProperty("Software");
      expect(example.expected_output).toHaveProperty("Database");
      expect(Array.isArray(example.expected_output.Software)).toBe(true);
    });

    it("should produce valid JSON-serializable output", () => {
      const example = generateDiscoveryExample(["social", "academic"]);

      const serialized = JSON.stringify(example);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(example);
    });
  });

  describe("formatRelationshipTypesForPrompt", () => {
    it("should format short list completely", () => {
      const types = ["MARRIED_TO", "WORKED_AT", "BORN_IN"];
      const formatted = formatRelationshipTypesForPrompt(types);

      expect(formatted).toBe("MARRIED_TO, WORKED_AT, BORN_IN");
      expect(formatted).not.toContain("more");
    });

    it("should truncate long list and show count", () => {
      const types = Array.from({ length: 25 }, (_, i) => `TYPE_${i}`);
      const formatted = formatRelationshipTypesForPrompt(types);

      expect(formatted).toContain("TYPE_0");
      expect(formatted).toContain("TYPE_14");
      expect(formatted).not.toContain("TYPE_15");
      expect(formatted).toContain("and 10 more");
    });

    it("should handle exactly 15 types", () => {
      const types = Array.from({ length: 15 }, (_, i) => `TYPE_${i}`);
      const formatted = formatRelationshipTypesForPrompt(types);

      expect(formatted).not.toContain("more");
      expect(formatted.split(", ")).toHaveLength(15);
    });

    it("should handle empty array", () => {
      const formatted = formatRelationshipTypesForPrompt([]);

      expect(formatted).toBe("");
    });

    it("should handle single type", () => {
      const formatted = formatRelationshipTypesForPrompt(["ONLY_ONE"]);

      expect(formatted).toBe("ONLY_ONE");
    });

    it("should format exactly 16 types with overflow message", () => {
      const types = Array.from({ length: 16 }, (_, i) => `TYPE_${i}`);
      const formatted = formatRelationshipTypesForPrompt(types);

      expect(formatted).toContain("and 1 more");
    });
  });

  describe("Integration: Full Domain Coverage", () => {
    it("should handle all core domains", () => {
      const allDomains = [
        "social",
        "academic",
        "geographic",
        "medical",
        "technology",
        "economic",
        "cultural",
        "biological",
        "infrastructure",
        "legal",
        "astronomical",
      ];

      const relationships = getRelationshipTypesForDomains(allDomains);
      const entityTypes = getEntityTypesForDomains(allDomains);
      const example = generateDiscoveryExample(allDomains);

      expect(relationships.length).toBeGreaterThan(50);
      expect(entityTypes.length).toBeGreaterThan(30);
      expect(Object.keys(example.expected_output).length).toBeGreaterThan(30);
    });

    it("should ensure entity types match example output keys", () => {
      const domains = ["social", "academic"];
      const entityTypes = getEntityTypesForDomains(domains);
      const example = generateDiscoveryExample(domains);

      const exampleKeys = Object.keys(example.expected_output);

      // All entity types should have keys in example
      entityTypes.forEach((type) => {
        expect(exampleKeys).toContain(type);
      });

      // Example keys should only contain entity types
      exampleKeys.forEach((key) => {
        expect(entityTypes).toContain(key);
      });
    });
  });
});
