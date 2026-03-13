/**
 * Data Validation Tests
 *
 * Tests the core validation logic that ensures evidence graph integrity.
 * Critical for maintaining investigation data quality.
 */

import { describe, it, expect, beforeEach } from "vitest";

import type { EvidenceGraphData } from "../../types/evidence-graph.types";
import {
  validateEvidenceGraph,
  getEntityTypeColor,
} from "../../utils/validation";
import { mockEvidenceGraphData, mockGraphNode, mockGraphEdge } from "../setup";

describe.skip("Evidence Graph Validation", () => {
  describe("validateEvidenceGraph", () => {
    let validData: EvidenceGraphData;

    beforeEach(() => {
      validData = { ...mockEvidenceGraphData };
    });

    it("should pass validation for valid data", () => {
      const result = validateEvidenceGraph(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.evidenceCount).toBe(1);
      expect(result.stats.nodeCount).toBe(2);
      expect(result.stats.edgeCount).toBe(1);
    });

    it("should fail validation when meta is missing", () => {
      delete validData.meta.version;

      const result = validateEvidenceGraph(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Meta version is required");
    });

    it("should fail validation when evidence has invalid fields", () => {
      validData.evidence[0].title = "";
      validData.evidence[0].url = "invalid-url";

      const result = validateEvidenceGraph(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("title is required"))).toBe(
        true
      );
      expect(result.warnings.some((w) => w.includes("may not be valid"))).toBe(
        true
      );
    });

    it("should detect invalid evidence references in nodes", () => {
      validData.nodes[0].sources = ["ev_nonexistent"];

      const result = validateEvidenceGraph(validData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("references non-existent evidence")
        )
      ).toBe(true);
    });

    it("should detect invalid node references in edges", () => {
      validData.edges[0].source = "n_nonexistent";

      const result = validateEvidenceGraph(validData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("references non-existent source node")
        )
      ).toBe(true);
    });

    it("should validate confidence score ranges", () => {
      validData.edges[0].confidence = 1.5; // Invalid - over 1.0

      const result = validateEvidenceGraph(validData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("confidence must be a number between 0 and 1")
        )
      ).toBe(true);
    });

    it("should warn about very low confidence scores", () => {
      validData.edges[0].confidence = 0.2; // Valid but very low

      const result = validateEvidenceGraph(validData);

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.includes("very low confidence"))
      ).toBe(true);
    });

    it("should validate ID format conventions", () => {
      validData.evidence[0].id = "invalid_id_format";
      validData.nodes[0].id = "invalid_node_id";
      validData.edges[0].id = "invalid_edge_id";

      const result = validateEvidenceGraph(validData);

      expect(
        result.warnings.some((w) =>
          w.includes("should start with 'ev_' prefix")
        )
      ).toBe(true);
      expect(
        result.warnings.some((w) => w.includes("should start with 'n_' prefix"))
      ).toBe(true);
      expect(
        result.warnings.some((w) => w.includes("should start with 'e_' prefix"))
      ).toBe(true);
    });

    it("should detect duplicate IDs", () => {
      const duplicateNode = { ...mockGraphNode, id: validData.nodes[0].id };
      validData.nodes.push(duplicateNode);

      const result = validateEvidenceGraph(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate node ID"))).toBe(
        true
      );
    });

    it("should generate accurate statistics", () => {
      const result = validateEvidenceGraph(validData);

      expect(result.stats.evidenceCount).toBe(1);
      expect(result.stats.nodeCount).toBe(2);
      expect(result.stats.edgeCount).toBe(1);
      expect(result.stats.entityTypeBreakdown.person).toBe(2);
      expect(result.stats.edgeTypeBreakdown.funding).toBe(1);
    });

    it("should validate date formats", () => {
      validData.evidence[0].date = "invalid-date";
      validData.nodes[0].dates = { start: "2024-13-45" }; // Invalid date

      const result = validateEvidenceGraph(validData);

      expect(
        result.warnings.some((w) => w.includes("may not be in ISO format"))
      ).toBe(true);
    });

    it("should detect self-referencing edges", () => {
      validData.edges[0].source = validData.edges[0].target;

      const result = validateEvidenceGraph(validData);

      expect(
        result.warnings.some((w) => w.includes("edge connects node to itself"))
      ).toBe(true);
    });
  });

  describe("getEntityTypeColor", () => {
    it("should return correct colors for each entity type", () => {
      expect(getEntityTypeColor("person")).toBe("#3B82F6");
      expect(getEntityTypeColor("platform")).toBe("#10B981");
      expect(getEntityTypeColor("event")).toBe("#F59E0B");
      expect(getEntityTypeColor("movement")).toBe("#8B5CF6");
      expect(getEntityTypeColor("media")).toBe("#EF4444");
    });

    it("should return fallback color for invalid entity type", () => {
      const result = getEntityTypeColor("invalid" as any);
      expect(result).toBe("#6B7280"); // Gray fallback
    });
  });

  describe("Edge Cases and Performance", () => {
    it("should handle empty data gracefully", () => {
      const emptyData = {
        meta: {
          version: "1.0.0",
          generated_at: "2024-01-01T00:00:00Z",
          description: "Empty",
        },
        evidence: [],
        nodes: [],
        edges: [],
      };

      const result = validateEvidenceGraph(emptyData);

      expect(result.isValid).toBe(true);
      expect(result.stats.evidenceCount).toBe(0);
      expect(result.stats.nodeCount).toBe(0);
      expect(result.stats.edgeCount).toBe(0);
    });

    it("should handle large datasets efficiently", () => {
      // Create a larger dataset
      const largeData = { ...mockEvidenceGraphData };
      largeData.nodes = Array.from({ length: 1000 }, (_, i) => ({
        ...mockGraphNode,
        id: `n_test_${i}`,
        label: `Test Node ${i}`,
      }));

      const startTime = Date.now();
      const result = validateEvidenceGraph(largeData);
      const duration = Date.now() - startTime;

      expect(result.isValid).toBe(true);
      expect(result.stats.nodeCount).toBe(1000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it("should validate complex relationship networks", () => {
      // Create a network with multiple entity types and relationship types
      const networkData = { ...mockEvidenceGraphData };

      // Add diverse nodes
      networkData.nodes = [
        { ...mockGraphNode, id: "n_person_1", entityType: "person" },
        { ...mockGraphNode, id: "n_platform_1", entityType: "platform" },
        { ...mockGraphNode, id: "n_event_1", entityType: "event" },
        { ...mockGraphNode, id: "n_movement_1", entityType: "movement" },
        { ...mockGraphNode, id: "n_media_1", entityType: "media" },
      ];

      // Add diverse relationships
      networkData.edges = [
        {
          ...mockGraphEdge,
          id: "e_funding",
          source: "n_person_1",
          target: "n_platform_1",
          type: "funding",
        },
        {
          ...mockGraphEdge,
          id: "e_control",
          source: "n_person_1",
          target: "n_media_1",
          type: "platform_control",
        },
        {
          ...mockGraphEdge,
          id: "e_event",
          source: "n_event_1",
          target: "n_movement_1",
          type: "event_trigger",
        },
      ];

      const result = validateEvidenceGraph(networkData);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.stats.entityTypeBreakdown)).toHaveLength(5);
      expect(Object.keys(result.stats.edgeTypeBreakdown)).toHaveLength(3);
    });
  });
});
