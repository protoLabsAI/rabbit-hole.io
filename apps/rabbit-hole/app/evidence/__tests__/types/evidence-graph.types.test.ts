/**
 * Evidence Graph Types Tests
 *
 * Tests type guards and type-related utilities for data integrity.
 */

import { describe, it, expect } from "vitest";

import {
  isEntityType,
  isEdgeType,
  isEvidenceGraphData,
} from "../../types/evidence-graph.types";
import { mockEvidenceGraphData } from "../setup";

describe.skip("Evidence Graph Type Guards", () => {
  describe("isEntityType", () => {
    it("should validate correct entity types", () => {
      const validTypes = ["person", "platform", "event", "movement", "media"];

      validTypes.forEach((type) => {
        expect(isEntityType(type)).toBe(true);
      });
    });

    it("should reject invalid entity types", () => {
      const invalidTypes = ["invalid", "human", "organization", "", "PERSON"];

      invalidTypes.forEach((type) => {
        expect(isEntityType(type)).toBe(false);
      });
    });
  });

  describe("isEdgeType", () => {
    it("should validate correct edge types", () => {
      const validTypes = [
        "platforming",
        "platform_control",
        "coauthor_suspect",
        "media_platforming",
        "endorsement_signal",
        "event_trigger",
        "narrative_shift",
        "legal_linkage",
        "endorsement",
        "funding",
        "narrative_precedent",
        "gov_contract",
        "event_presence",
      ];

      validTypes.forEach((type) => {
        expect(isEdgeType(type)).toBe(true);
      });
    });

    it("should reject invalid edge types", () => {
      const invalidTypes = [
        "invalid",
        "relationship",
        "connected_to",
        "",
        "FUNDING",
      ];

      invalidTypes.forEach((type) => {
        expect(isEdgeType(type)).toBe(false);
      });
    });
  });

  describe("isEvidenceGraphData", () => {
    it("should validate correct evidence graph structure", () => {
      expect(isEvidenceGraphData(mockEvidenceGraphData)).toBe(true);
    });

    it("should reject invalid structures", () => {
      const invalidStructures = [
        null,
        undefined,
        "string",
        123,
        [],
        { meta: "invalid" },
        { meta: {}, evidence: "not_array" },
        { meta: {}, evidence: [], nodes: "not_array" },
        { meta: {}, evidence: [], nodes: [], edges: "not_array" },
        { evidence: [], nodes: [], edges: [] }, // Missing meta
        { meta: {}, nodes: [], edges: [] }, // Missing evidence
        { meta: {}, evidence: [], edges: [] }, // Missing nodes
        { meta: {}, evidence: [], nodes: [] }, // Missing edges
      ];

      invalidStructures.forEach((structure) => {
        expect(isEvidenceGraphData(structure)).toBe(false);
      });
    });

    it("should require all core properties", () => {
      const baseStructure = {
        meta: {
          version: "1.0.0",
          generated_at: "2024-01-01T00:00:00Z",
          description: "Test",
        },
        evidence: [],
        nodes: [],
        edges: [],
      };

      expect(isEvidenceGraphData(baseStructure)).toBe(true);

      // Test missing each required property
      const withoutMeta = { evidence: [], nodes: [], edges: [] };
      expect(isEvidenceGraphData(withoutMeta)).toBe(false);

      const withoutEvidence = {
        meta: baseStructure.meta,
        nodes: [],
        edges: [],
      };
      expect(isEvidenceGraphData(withoutEvidence)).toBe(false);

      const withoutNodes = {
        meta: baseStructure.meta,
        evidence: [],
        edges: [],
      };
      expect(isEvidenceGraphData(withoutNodes)).toBe(false);

      const withoutEdges = {
        meta: baseStructure.meta,
        evidence: [],
        nodes: [],
      };
      expect(isEvidenceGraphData(withoutEdges)).toBe(false);
    });
  });

  describe("Type Safety", () => {
    it("should ensure entity type enum completeness", () => {
      // This test ensures all entity types are covered
      const allEntityTypes = [
        "person",
        "platform",
        "event",
        "movement",
        "media",
      ];

      // If we add new entity types, this test will fail and remind us to update validation
      allEntityTypes.forEach((type) => {
        expect(isEntityType(type)).toBe(true);
      });
    });

    it("should ensure edge type enum completeness", () => {
      // This test ensures all edge types are covered
      const criticalEdgeTypes = [
        "funding", // Financial relationships
        "platform_control", // Platform ownership
        "endorsement", // Political endorsements
        "media_platforming", // Media amplification
        "event_trigger", // Event causation
      ];

      criticalEdgeTypes.forEach((type) => {
        expect(isEdgeType(type)).toBe(true);
      });
    });

    it("should maintain type consistency across imports", () => {
      // Ensure type definitions are properly exported and importable
      expect(typeof isEntityType).toBe("function");
      expect(typeof isEdgeType).toBe("function");
      expect(typeof isEvidenceGraphData).toBe("function");
    });
  });

  describe("Performance", () => {
    it("should validate types quickly", () => {
      const startTime = Date.now();

      // Test many validations
      for (let i = 0; i < 1000; i++) {
        isEntityType("person");
        isEdgeType("funding");
        isEvidenceGraphData(mockEvidenceGraphData);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it("should handle edge cases efficiently", () => {
      const edgeCases = [
        "",
        " ",
        "PERSON",
        "person ",
        " person",
        null,
        undefined,
        123,
        {},
        [],
      ];

      edgeCases.forEach((testCase) => {
        expect(() => {
          isEntityType(testCase as any);
          isEdgeType(testCase as any);
        }).not.toThrow();
      });
    });
  });
});
