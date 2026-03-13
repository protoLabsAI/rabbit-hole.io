/**
 * Graph Data Standardizer Tests
 *
 * Critical tests for data transformation logic
 */

import { describe, test, expect } from "vitest";

import type { CanonicalGraphData } from "../../types/canonical-graph";
import { GraphDataStandardizer } from "../graph-data-standardizer";

describe.skip("GraphDataStandardizer", () => {
  describe("toCytoscape", () => {
    test("transforms canonical data to Cytoscape format", () => {
      const canonicalData: CanonicalGraphData = {
        nodes: [
          {
            uid: "person:test",
            name: "Test Person",
            type: "person",
            display: { title: "Test Person" },
            metadata: {},
          },
        ],
        edges: [
          {
            uid: "rel:1",
            source: "person:test",
            target: "person:other",
            type: "KNOWS",
            sentiment: "neutral",
            intensity: "medium",
            display: { label: "knows", color: "#666666" },
            metadata: { confidence: 0.8 },
          },
        ],
        meta: {
          nodeCount: 1,
          edgeCount: 1,
          generatedAt: "2024-01-01T00:00:00Z",
          schemaVersion: "canonical-v1",
        },
      };

      const result = GraphDataStandardizer.toCytoscape(canonicalData);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].data.id).toBe("person:test");
      expect(result.nodes[0].data.label).toBe("Test Person");
      expect(result.nodes[0].data.type).toBe("person");
      expect(result.nodes[0].data.image).toBe("👤");
      // Connection count calculated internally based on edges in the data
      expect(result.nodes[0].data.originalNode).toEqual(canonicalData.nodes[0]);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].data.sentiment).toBe("neutral");
      expect(result.edges[0].data.originalEdge).toEqual(canonicalData.edges[0]);
    });

    test("calculates node sizes based on connections", () => {
      const testCases = [
        { edgeCount: 0, expectedSize: 30 },
        { edgeCount: 2, expectedSize: 50 },
        { edgeCount: 5, expectedSize: 70 },
        { edgeCount: 15, expectedSize: 90 },
      ];

      testCases.forEach(({ edgeCount, expectedSize }) => {
        // Create test data with varying edge counts
        const nodes = [
          {
            uid: "center",
            name: "Center Node",
            type: "person",
            display: { title: "Center Node" },
            metadata: {},
          },
          ...Array.from({ length: edgeCount }, (_, i) => ({
            uid: `node-${i}`,
            name: `Node ${i}`,
            type: "person",
            display: { title: `Node ${i}` },
            metadata: {},
          })),
        ];

        const edges = Array.from({ length: edgeCount }, (_, i) => ({
          uid: `edge-${i}`,
          source: "center",
          target: `node-${i}`,
          type: "CONNECTS",
          sentiment: "neutral" as any,
          intensity: "medium" as any,
          display: { label: "connects", color: "#666666" },
          metadata: { confidence: 0.8 },
        }));

        const data: CanonicalGraphData = {
          nodes,
          edges,
          meta: {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            generatedAt: "2024-01-01T00:00:00Z",
            schemaVersion: "canonical-v1",
          },
        };

        const result = GraphDataStandardizer.toCytoscape(data);

        // Center node should have correct size based on its connections
        const centerNode = result.nodes.find((n) => n.data.id === "center");
        expect(centerNode?.data.size).toBe(expectedSize);
      });
    });
  });

  describe("createResponse", () => {
    test("creates successful response", () => {
      const data = { test: "value" };
      const response = GraphDataStandardizer.createResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.error).toBeUndefined();
    });

    test("creates error response", () => {
      const error = "Something went wrong";
      const response = GraphDataStandardizer.createResponse(null, false, error);

      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.error).toBe(error);
    });
  });

  describe("Advanced Features", () => {
    test("supports community coloring", () => {
      const canonicalData: CanonicalGraphData = {
        nodes: [
          {
            uid: "person:test",
            name: "Test Person",
            type: "person",
            display: { title: "Test Person" },
            metadata: { communityId: 5 },
          },
        ],
        edges: [],
        meta: {
          nodeCount: 1,
          edgeCount: 0,
          generatedAt: "2024-01-01T00:00:00Z",
          schemaVersion: "canonical-v1",
        },
      };

      const result = GraphDataStandardizer.toCytoscape(canonicalData, {
        communityColoring: true,
      });

      expect(result.nodes[0].data.communityId).toBe(5);
      expect(result.nodes[0].data.color).toMatch(/hsl\(\d+, 65%, 50%\)/);
      expect(result.nodes[0].classes).toContain("community-5");
    });

    test("supports timeline mode", () => {
      const canonicalData: CanonicalGraphData = {
        nodes: [
          {
            uid: "person:active",
            name: "Active Person",
            type: "person",
            display: { title: "Active Person" },
            metrics: { activityInWindow: 25 },
            metadata: {},
          },
        ],
        edges: [],
        meta: {
          nodeCount: 1,
          edgeCount: 0,
          generatedAt: "2024-01-01T00:00:00Z",
          schemaVersion: "canonical-v1",
        },
      };

      const result = GraphDataStandardizer.toCytoscape(canonicalData, {
        timelineMode: true,
        nodeSizeRange: { min: 20, max: 80 },
      });

      // In timeline mode, size should be based on activity (25), not connections (0)
      expect(result.nodes[0].data.size).toBeGreaterThan(20);
      expect(result.nodes[0].classes).toContain("high-activity");
    });

    test("generates CSS classes correctly", () => {
      const canonicalData: CanonicalGraphData = {
        nodes: [
          {
            uid: "person:connected",
            name: "Connected Person",
            type: "person",
            display: { title: "Connected Person" },
            metrics: { activityInWindow: 10 },
            metadata: { communityId: 3 },
          },
        ],
        edges: Array.from({ length: 12 }, (_, i) => ({
          uid: `edge:${i}`,
          source: "person:connected",
          target: `person:other${i}`,
          type: "KNOWS",
          sentiment: "neutral" as any,
          intensity: "medium" as any,
          display: { label: "knows", color: "#666666" },
          metadata: { confidence: 0.8 },
        })),
        meta: {
          nodeCount: 1,
          edgeCount: 12,
          generatedAt: "2024-01-01T00:00:00Z",
          schemaVersion: "canonical-v1",
        },
      };

      const result = GraphDataStandardizer.toCytoscape(canonicalData);

      const classes = result.nodes[0].classes;
      expect(classes).toContain("entity-person");
      expect(classes).toContain("community-3");
      expect(classes).toContain("high-activity");
      expect(classes).toContain("highly-connected");
    });
  });

  describe("Error handling", () => {
    test("handles empty data gracefully", () => {
      const emptyData: CanonicalGraphData = {
        nodes: [],
        edges: [],
        meta: {
          nodeCount: 0,
          edgeCount: 0,
          generatedAt: "2024-01-01T00:00:00Z",
          schemaVersion: "canonical-v1",
        },
      };

      const result = GraphDataStandardizer.toCytoscape(emptyData);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });
});
