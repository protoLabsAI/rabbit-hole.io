/**
 * Canonical Graph Types Tests
 */

import { describe, test, expect } from "vitest";

import type {
  CanonicalNode,
  CanonicalEdge,
  CanonicalGraphData,
  CanonicalMetadata,
} from "../canonical-graph";
import {
  isCanonicalNode,
  isCanonicalEdge,
  isCanonicalGraphData,
} from "../canonical-graph";

describe("Canonical Graph Types", () => {
  describe("CanonicalNode", () => {
    test("minimal valid node", () => {
      const node: CanonicalNode = {
        uid: "person:test",
        name: "Test Person",
        type: "person",
        display: {
          title: "Test Person",
        },
        metadata: {},
      };

      expect(isCanonicalNode(node)).toBe(true);
      expect(node.uid).toBe("person:test");
      expect(node.type).toBe("person");
    });

    test("full node with all fields", () => {
      const node: CanonicalNode = {
        uid: "person:full_example",
        name: "Full Example",
        type: "person",
        display: {
          title: "Full Example",
          subtitle: "Person",
          avatar: "https://example.com/avatar.jpg",
          badges: ["alias1", "tag1"],
        },
        metrics: {
          speechActs: {
            hostile: 5,
            supportive: 10,
            neutral: 15,
            total: 30,
          },
          degree: {
            in: 8,
            out: 12,
            total: 20,
          },
          lastActiveAt: "2024-01-01T00:00:00Z",
          activityInWindow: 5,
        },
        metadata: {
          aliases: ["Alias One"],
          tags: ["tag1", "tag2"],
          dates: {
            start: "1980-01-01",
            end: "2024-01-01",
          },
          sources: ["source1", "source2"],
          communityId: 1,
          position: { x: 100, y: 200 },
          confidence: 0.95,
        },
      };

      expect(isCanonicalNode(node)).toBe(true);
      expect(node.metrics?.speechActs?.total).toBe(30);
      expect(node.metadata.confidence).toBe(0.95);
    });
  });

  describe("CanonicalEdge", () => {
    test("minimal valid edge", () => {
      const edge: CanonicalEdge = {
        uid: "rel:test",
        source: "person:a",
        target: "person:b",
        type: "KNOWS",
        sentiment: "neutral",
        intensity: "medium",
        display: {
          label: "knows",
          color: "#666666",
        },
        metadata: {
          confidence: 0.8,
        },
      };

      expect(isCanonicalEdge(edge)).toBe(true);
      expect(edge.sentiment).toBe("neutral");
      expect(edge.metadata.confidence).toBe(0.8);
    });

    test("full edge with all fields", () => {
      const edge: CanonicalEdge = {
        uid: "rel:full_example",
        source: "person:source",
        target: "person:target",
        type: "SPEECH_ACT",
        sentiment: "hostile",
        intensity: "high",
        display: {
          label: "attacks",
          excerpt: "Example speech excerpt...",
          color: "#ff4444",
          timestamp: "2024-01-01",
        },
        metadata: {
          confidence: 0.95,
          at: "2024-01-01T12:00:00Z",
          notes: "Additional context",
          sources: ["evidence1", "evidence2"],
          category: "political_attack",
        },
      };

      expect(isCanonicalEdge(edge)).toBe(true);
      expect(edge.sentiment).toBe("hostile");
      expect(edge.intensity).toBe("high");
      expect(edge.display.excerpt).toBe("Example speech excerpt...");
    });
  });

  describe("CanonicalGraphData", () => {
    test("complete graph data structure", () => {
      const metadata: CanonicalMetadata = {
        nodeCount: 2,
        edgeCount: 1,
        generatedAt: "2024-01-01T00:00:00Z",
        schemaVersion: "canonical-v1",
        viewMode: "full-atlas",
        bounded: false,
        filters: {
          entityTypes: ["person"],
          sentiments: ["neutral"],
        },
      };

      const graphData: CanonicalGraphData = {
        nodes: [
          {
            uid: "person:a",
            name: "Person A",
            type: "person",
            display: { title: "Person A" },
            metadata: {},
          },
          {
            uid: "person:b",
            name: "Person B",
            type: "person",
            display: { title: "Person B" },
            metadata: {},
          },
        ],
        edges: [
          {
            uid: "rel:1",
            source: "person:a",
            target: "person:b",
            type: "KNOWS",
            sentiment: "neutral",
            intensity: "medium",
            display: { label: "knows", color: "#666666" },
            metadata: { confidence: 0.8 },
          },
        ],
        meta: metadata,
      };

      expect(isCanonicalGraphData(graphData)).toBe(true);
      expect(graphData.nodes).toHaveLength(2);
      expect(graphData.edges).toHaveLength(1);
      expect(graphData.meta.schemaVersion).toBe("canonical-v1");
    });
  });

  describe("Type Guards", () => {
    test("isCanonicalNode rejects invalid objects", () => {
      expect(isCanonicalNode(null)).toBe(false);
      expect(isCanonicalNode({})).toBe(false);
      expect(isCanonicalNode({ uid: "test" })).toBe(false);
      expect(isCanonicalNode({ uid: "test", name: "test" })).toBe(false);
      expect(
        isCanonicalNode({
          uid: "test",
          name: "test",
          type: "person",
        })
      ).toBe(false); // Missing display
    });

    test("isCanonicalEdge rejects invalid objects", () => {
      expect(isCanonicalEdge(null)).toBe(false);
      expect(isCanonicalEdge({})).toBe(false);
      expect(isCanonicalEdge({ uid: "test" })).toBe(false);
      expect(
        isCanonicalEdge({
          uid: "test",
          source: "a",
          target: "b",
        })
      ).toBe(false); // Missing sentiment
    });

    test("isCanonicalGraphData rejects invalid objects", () => {
      expect(isCanonicalGraphData(null)).toBe(false);
      expect(isCanonicalGraphData({})).toBe(false);
      expect(isCanonicalGraphData({ nodes: [] })).toBe(false);
      expect(
        isCanonicalGraphData({
          nodes: [],
          edges: [],
        })
      ).toBe(false); // Missing meta
    });
  });

  describe("EntityType validation", () => {
    test("all entity types are valid", () => {
      const validTypes = [
        "person",
        "organization",
        "platform",
        "movement",
        "event",
        "media",
        "country",
      ];

      validTypes.forEach((type) => {
        const node: CanonicalNode = {
          uid: `${type}:test`,
          name: "Test",
          type: type as any,
          display: { title: "Test" },
          metadata: {},
        };
        expect(isCanonicalNode(node)).toBe(true);
      });
    });
  });

  describe("SentimentType validation", () => {
    test("all sentiment types are valid", () => {
      const validSentiments = ["hostile", "supportive", "neutral", "ambiguous"];

      validSentiments.forEach((sentiment) => {
        const edge: CanonicalEdge = {
          uid: "rel:test",
          source: "a",
          target: "b",
          type: "TEST",
          sentiment: sentiment as any,
          intensity: "medium",
          display: { label: "test", color: "#000000" },
          metadata: { confidence: 0.8 },
        };
        expect(isCanonicalEdge(edge)).toBe(true);
      });
    });
  });
});
