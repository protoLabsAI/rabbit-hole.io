/**
 * Data Transformer Tests
 *
 * Tests the logic that converts evidence graph data to React Flow format.
 * Critical for UI visualization and performance.
 */

import { describe, it, expect, beforeEach } from "vitest";

import type { EvidenceGraphData } from "../../types/evidence-graph.types";
import { transformDataToReactFlow } from "../../utils/data-transformer";
import { mockEvidenceGraphData, mockGraphNode } from "../setup";

describe.skip("Data Transformer", () => {
  let testData: EvidenceGraphData;

  beforeEach(() => {
    testData = {
      ...mockEvidenceGraphData,
      nodes: [
        {
          ...mockGraphNode,
          id: "n_center",
          label: "Center Node",
          position: { x: 0, y: 0 },
        },
        {
          ...mockGraphNode,
          id: "n_connected",
          label: "Connected Node",
          position: { x: 200, y: 0 },
        },
        {
          ...mockGraphNode,
          id: "n_distant",
          label: "Distant Node",
          position: { x: 400, y: 0 },
        },
      ],
      edges: [
        {
          id: "e_center_connected",
          source: "n_center",
          target: "n_connected",
          label: "connects to",
          type: "funding",
          confidence: 0.9,
          sources: ["ev_test_001"],
        },
      ],
    };
  });

  describe("transformDataToReactFlow", () => {
    it("should transform nodes with preset positions", () => {
      const result = transformDataToReactFlow(testData, "n_center");

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(1);

      // Check center node styling
      const centerNode = result.nodes.find((n) => n.id === "n_center");
      expect(centerNode).toBeDefined();
      expect(centerNode!.style?.border).toBe("3px solid #000");
      expect(centerNode!.style?.width).toBe(140);
      expect(centerNode!.style?.fontWeight).toBe("bold");
    });

    it("should use preset positions when available", () => {
      const result = transformDataToReactFlow(testData, "n_center");

      const centerNode = result.nodes.find((n) => n.id === "n_center");
      expect(centerNode!.position).toEqual({ x: 0, y: 0 });

      const connectedNode = result.nodes.find((n) => n.id === "n_connected");
      expect(connectedNode!.position).toEqual({ x: 200, y: 0 });
    });

    it("should apply entity type colors correctly", () => {
      const personNode = {
        ...mockGraphNode,
        id: "n_person",
        entityType: "person" as const,
      };
      const platformNode = {
        ...mockGraphNode,
        id: "n_platform",
        entityType: "platform" as const,
      };

      const testDataWithTypes = {
        ...testData,
        nodes: [personNode, platformNode],
      };

      const result = transformDataToReactFlow(testDataWithTypes);

      const person = result.nodes.find((n) => n.id === "n_person");
      const platform = result.nodes.find((n) => n.id === "n_platform");

      expect(person!.style?.background).toBe("#3B82F6"); // Blue for person
      expect(platform!.style?.background).toBe("#10B981"); // Green for platform
    });

    it("should handle confidence scoring in edge styles", () => {
      testData.edges = [
        { ...testData.edges[0], confidence: 0.9 }, // High confidence
        { ...testData.edges[0], id: "e_low_conf", confidence: 0.3 }, // Low confidence
      ];

      const result = transformDataToReactFlow(testData);

      const highConfEdge = result.edges.find(
        (e) => e.id === "e_center_connected"
      );
      const lowConfEdge = result.edges.find((e) => e.id === "e_low_conf");

      expect(highConfEdge!.style?.strokeWidth).toBe(2);
      expect(highConfEdge!.style?.strokeDasharray).toBeUndefined();

      expect(lowConfEdge!.style?.strokeWidth).toBe(1);
      expect(lowConfEdge!.style?.strokeDasharray).toBe("5,5");
    });

    it("should include edge metadata in data property", () => {
      const result = transformDataToReactFlow(testData);

      const edge = result.edges[0];
      expect(edge.data).toEqual({
        confidence: 0.9,
        sources: ["ev_test_001"],
        since: undefined,
        until: undefined,
        type: "funding",
        notes: undefined,
      });
    });

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

      const result = transformDataToReactFlow(emptyData);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it("should handle missing center node gracefully", () => {
      const result = transformDataToReactFlow(testData, "n_nonexistent");

      // Should still return data, just without special center styling
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges.length).toBeGreaterThan(0);
    });

    it("should fallback to radial layout when no positions", () => {
      // Remove position data
      testData.nodes.forEach((node) => delete node.position);

      const result = transformDataToReactFlow(testData, "n_center");

      // Should still generate positions (radial fallback)
      expect(
        result.nodes.every(
          (n) => n.position.x !== undefined && n.position.y !== undefined
        )
      ).toBe(true);
    });
  });

  describe("Performance Tests", () => {
    it("should handle large datasets efficiently", () => {
      // Create large dataset
      const largeData = {
        ...testData,
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          ...mockGraphNode,
          id: `n_node_${i}`,
          label: `Node ${i}`,
          position: { x: i * 10, y: i * 10 },
        })),
        edges: Array.from({ length: 500 }, (_, i) => ({
          ...testData.edges[0],
          id: `e_edge_${i}`,
          source: `n_node_${i}`,
          target: `n_node_${i + 1}`,
        })),
      };

      const startTime = Date.now();
      const result = transformDataToReactFlow(largeData);
      const duration = Date.now() - startTime;

      expect(result.nodes).toHaveLength(1000);
      expect(result.edges).toHaveLength(500);
      expect(duration).toBeLessThan(500); // Should be fast
    });
  });

  describe("Edge Cases", () => {
    it("should handle nodes without sources", () => {
      testData.nodes[0].sources = [];

      const result = transformDataToReactFlow(testData);

      expect(result.nodes).toHaveLength(3);
      // Should not crash
    });

    it("should handle edges without confidence scores", () => {
      delete testData.edges[0].confidence;

      const result = transformDataToReactFlow(testData);

      const edge = result.edges[0];
      expect(edge.data.confidence).toBeUndefined();
      expect(edge.style?.strokeWidth).toBe(2); // Default styling
    });

    it("should handle missing edge types", () => {
      delete testData.edges[0].type;

      const result = transformDataToReactFlow(testData);

      const edge = result.edges[0];
      expect(edge.data.type).toBeUndefined();
      // Should not crash
    });

    it("should handle nodes with aka arrays", () => {
      testData.nodes[0].aka = ["Alias 1", "Alias 2"];

      const result = transformDataToReactFlow(testData);

      const node = result.nodes.find((n) => n.id === testData.nodes[0].id);
      expect(node!.data.aka).toEqual(["Alias 1", "Alias 2"]);
    });
  });
});
