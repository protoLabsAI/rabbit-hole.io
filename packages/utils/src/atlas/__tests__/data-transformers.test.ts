import { describe, test, expect } from "vitest";

import {
  calculateConnectionCounts,
  generateLegendData,
  generateSentimentData,
  transformNodesToCytoscape,
  transformEdgesToCytoscape,
} from "../data-transformers";

// Mock data for testing
const mockNodes = [
  { id: "1", label: "Alice", entityType: "person", tags: [] },
  { id: "2", label: "Bob", entityType: "person", tags: [] },
  { id: "3", label: "TechCorp", entityType: "organization", tags: [] },
  { id: "4", label: "TestNode", entityType: "person", tags: ["TEST_DATA"] },
];

const mockEdges = [
  {
    id: "e1",
    source: "1",
    target: "2",
    label: "knows",
    type: "PERSONAL",
    confidence: 0.8,
  },
  {
    id: "e2",
    source: "1",
    target: "3",
    label: "works_at",
    type: "EMPLOYMENT",
    confidence: 0.9,
  },
  {
    id: "e3",
    source: "2",
    target: "3",
    label: "advises",
    type: "ADVISORY",
    confidence: 0.7,
  },
];

const mockEdgesWithSentiment = [
  { ...mockEdges[0], sentiment: "supportive" },
  { ...mockEdges[1], sentiment: "neutral" },
  { ...mockEdges[2], sentiment: "hostile" },
];

describe.skip("calculateConnectionCounts", () => {
  test("calculates correct connection counts for each node", () => {
    const counts = calculateConnectionCounts(mockNodes, mockEdges);

    expect(counts.get("1")).toBe(2); // Alice: connected to Bob and TechCorp
    expect(counts.get("2")).toBe(2); // Bob: connected to Alice and TechCorp
    expect(counts.get("3")).toBe(2); // TechCorp: connected to Alice and Bob
    expect(counts.get("4")).toBe(0); // TestNode: no connections
  });

  test("handles empty edges array", () => {
    const counts = calculateConnectionCounts(mockNodes, []);

    expect(counts.get("1")).toBe(0);
    expect(counts.get("2")).toBe(0);
    expect(counts.get("3")).toBe(0);
    expect(counts.get("4")).toBe(0);
  });

  test("handles edges with non-existent nodes", () => {
    const edgesWithInvalidNodes = [
      ...mockEdges,
      {
        id: "invalid",
        source: "999",
        target: "888",
        label: "invalid",
        type: "INVALID",
        confidence: 0.5,
      },
    ];

    const counts = calculateConnectionCounts(mockNodes, edgesWithInvalidNodes);

    // Should still count only valid connections
    expect(counts.get("1")).toBe(2);
    expect(counts.get("2")).toBe(2);
    expect(counts.get("3")).toBe(2);
  });

  test("returns Map with all node IDs initialized", () => {
    const counts = calculateConnectionCounts(mockNodes, []);

    mockNodes.forEach((node) => {
      expect(counts.has(node.id)).toBe(true);
    });
  });
});

describe.skip("generateLegendData", () => {
  test("generates legend data from nodes with correct counts", () => {
    const hiddenTypes = new Set<string>();
    const legend = generateLegendData(mockNodes, hiddenTypes);

    // Should group by entity type and count
    const personItem = legend.find((item) => item.type === "person");
    const orgItem = legend.find((item) => item.type === "organization");

    expect(personItem?.count).toBe(3); // Alice, Bob, TestNode
    expect(personItem?.visibleCount).toBe(3);
    expect(personItem?.visible).toBe(true);

    expect(orgItem?.count).toBe(1); // TechCorp
    expect(orgItem?.visibleCount).toBe(1);
    expect(orgItem?.visible).toBe(true);
  });

  test("handles hidden entity types correctly", () => {
    const hiddenTypes = new Set(["person"]);
    const legend = generateLegendData(mockNodes, hiddenTypes);

    const personItem = legend.find((item) => item.type === "person");
    const orgItem = legend.find((item) => item.type === "organization");

    expect(personItem?.count).toBe(3); // Total count unchanged
    expect(personItem?.visibleCount).toBe(0); // Hidden, so 0 visible
    expect(personItem?.visible).toBe(false);

    expect(orgItem?.visible).toBe(true); // Organization still visible
  });

  test("sorts legend items by count descending", () => {
    const legend = generateLegendData(mockNodes, new Set());

    // Person (3) should come before organization (1)
    expect(legend[0].type).toBe("person");
    expect(legend[0].count).toBe(3);
    expect(legend[1].type).toBe("organization");
    expect(legend[1].count).toBe(1);
  });

  test("includes correct styling properties", () => {
    const legend = generateLegendData(mockNodes, new Set());

    legend.forEach((item) => {
      expect(item.color).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
      expect(item.icon).toMatch(
        /[\u{1F000}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|⚪/u
      ); // Emoji or circle
      expect(typeof item.type).toBe("string");
      expect(typeof item.count).toBe("number");
      expect(typeof item.visible).toBe("boolean");
    });
  });

  test("returns empty array for no nodes", () => {
    const legend = generateLegendData([], new Set());
    expect(legend).toEqual([]);
  });
});

describe.skip("generateSentimentData", () => {
  test("generates sentiment data with correct counts", () => {
    const sentiments = generateSentimentData(mockEdgesWithSentiment);

    expect(sentiments).toHaveLength(3); // supportive, neutral, hostile

    const supportiveItem = sentiments.find((s) => s.sentiment === "supportive");
    const neutralItem = sentiments.find((s) => s.sentiment === "neutral");
    const hostileItem = sentiments.find((s) => s.sentiment === "hostile");

    expect(supportiveItem?.count).toBe(1);
    expect(neutralItem?.count).toBe(1);
    expect(hostileItem?.count).toBe(1);
  });

  test("only includes sentiments that exist in data", () => {
    const edgesWithLimitedSentiment = [
      { ...mockEdges[0], sentiment: "supportive" },
      { ...mockEdges[1], sentiment: "supportive" },
    ];

    const sentiments = generateSentimentData(edgesWithLimitedSentiment);

    expect(sentiments).toHaveLength(1);
    expect(sentiments[0].sentiment).toBe("supportive");
    expect(sentiments[0].count).toBe(2);
  });

  test("handles edges without sentiment (defaults to neutral)", () => {
    const sentiments = generateSentimentData(mockEdges);

    const neutralItem = sentiments.find((s) => s.sentiment === "neutral");
    expect(neutralItem?.count).toBe(3); // All edges default to neutral
  });

  test("sentiment data has correct structure", () => {
    const sentiments = generateSentimentData(mockEdgesWithSentiment);

    sentiments.forEach((item) => {
      expect(item.sentiment).toMatch(
        /^(hostile|supportive|neutral|ambiguous)$/
      );
      expect(item.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(typeof item.label).toBe("string");
      expect(typeof item.count).toBe("number");
      expect(item.count).toBeGreaterThan(0);
    });
  });

  test("maintains sentiment order preference", () => {
    const sentiments = generateSentimentData(mockEdgesWithSentiment);
    const order = sentiments.map((s) => s.sentiment);

    // Should follow the order: hostile, supportive, neutral, ambiguous
    const expectedOrder = ["hostile", "supportive", "neutral"];
    expect(order).toEqual(expectedOrder);
  });
});

describe.skip("transformNodesToCytoscape", () => {
  test("transforms nodes to cytoscape format with connection-based sizing", () => {
    const connectionCounts = new Map([
      ["1", 5],
      ["2", 1],
      ["3", 0],
    ]);

    const cytoscapeNodes = transformNodesToCytoscape(
      mockNodes.slice(0, 3),
      connectionCounts
    );

    expect(cytoscapeNodes).toHaveLength(3);

    // Check node with many connections gets larger size
    const highlyConnectedNode = cytoscapeNodes.find((n) => n.data.id === "1");
    const lowConnectedNode = cytoscapeNodes.find((n) => n.data.id === "2");
    const isolatedNode = cytoscapeNodes.find((n) => n.data.id === "3");

    expect(highlyConnectedNode?.data.size).toBeGreaterThan(
      lowConnectedNode?.data.size || 0
    );
    expect(lowConnectedNode?.data.size).toBeGreaterThan(
      isolatedNode?.data.size || 0
    );
  });

  test("filters out nodes with missing required properties", () => {
    const invalidNodes = [
      { id: "", label: "Invalid", entityType: "person", tags: [] },
      { id: "valid", label: "", entityType: "person", tags: [] },
      { id: "valid2", label: "Valid", entityType: "", tags: [] },
    ];

    const cytoscapeNodes = transformNodesToCytoscape(invalidNodes, new Map());

    expect(cytoscapeNodes).toHaveLength(0); // All should be filtered out
  });

  test("includes all required cytoscape properties", () => {
    const connectionCounts = new Map([["1", 2]]);
    const cytoscapeNodes = transformNodesToCytoscape(
      [mockNodes[0]],
      connectionCounts
    );

    const node = cytoscapeNodes[0];
    expect(node.data.id).toBe("1");
    expect(node.data.label).toBe("Alice");
    expect(node.data.type).toBe("person");
    expect(node.data.image).toBe("👤");
    expect(node.data.color).toBe("#3B82F6");
    expect(typeof node.data.size).toBe("number");
    expect(node.data.connections).toBe(2);
    expect(node.data.originalNode).toEqual(mockNodes[0]);
  });
});

describe.skip("transformEdgesToCytoscape", () => {
  test("transforms edges to cytoscape format", () => {
    const cytoscapeEdges = transformEdgesToCytoscape(mockEdges);

    expect(cytoscapeEdges).toHaveLength(3);

    const edge = cytoscapeEdges[0];
    expect(edge.data.id).toBe("e1");
    expect(edge.data.source).toBe("1");
    expect(edge.data.target).toBe("2");
    expect(edge.data.label).toBe("knows");
    expect(edge.data.sentiment).toBe("neutral"); // Default
    expect(edge.data.confidence).toBe(0.8);
    expect(edge.data.color).toBe("#6B7280"); // Neutral color
    expect(edge.data.originalEdge).toEqual(mockEdges[0]);
  });

  test("filters out edges with missing required properties", () => {
    const invalidEdges = [
      {
        id: "",
        source: "1",
        target: "2",
        label: "invalid",
        type: "TEST",
        confidence: 0.5,
      },
      {
        id: "valid",
        source: "",
        target: "2",
        label: "invalid",
        type: "TEST",
        confidence: 0.5,
      },
      {
        id: "valid2",
        source: "1",
        target: "",
        label: "invalid",
        type: "TEST",
        confidence: 0.5,
      },
    ];

    const cytoscapeEdges = transformEdgesToCytoscape(invalidEdges);

    expect(cytoscapeEdges).toHaveLength(0); // All should be filtered out
  });

  test("handles sentiment correctly", () => {
    const cytoscapeEdges = transformEdgesToCytoscape(mockEdgesWithSentiment);

    const supportiveEdge = cytoscapeEdges.find((e) => e.data.id === "e1");
    const neutralEdge = cytoscapeEdges.find((e) => e.data.id === "e2");
    const hostileEdge = cytoscapeEdges.find((e) => e.data.id === "e3");

    expect(supportiveEdge?.data.sentiment).toBe("supportive");
    expect(supportiveEdge?.data.color).toBe("#059669");

    expect(neutralEdge?.data.sentiment).toBe("neutral");
    expect(neutralEdge?.data.color).toBe("#6B7280");

    expect(hostileEdge?.data.sentiment).toBe("hostile");
    expect(hostileEdge?.data.color).toBe("#DC2626");
  });

  test("provides default values for missing optional properties", () => {
    const minimalEdge = {
      id: "minimal",
      source: "1",
      target: "2",
      type: "TEST",
    };

    const cytoscapeEdges = transformEdgesToCytoscape([minimalEdge]);
    const edge = cytoscapeEdges[0];

    expect(edge.data.label).toBe("connection"); // Default label
    expect(edge.data.confidence).toBe(0.5); // Default confidence
    expect(edge.data.sentiment).toBe("neutral"); // Default sentiment
  });
});
