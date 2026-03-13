/**
 * Gap Detection & Iterative Depth Tests
 */

import { describe, expect, it, vi } from "vitest";

import {
  computeMaxIterations,
  createGapDetectionNode,
  parseGapAnalysis,
  routeAfterGapDetection,
} from "./gap-detection";

describe("parseGapAnalysis", () => {
  it("parses valid JSON response", () => {
    const input = JSON.stringify({
      overallCompleteness: 0.75,
      gaps: ["Missing history", "No financials"],
      entitiesNeedingExpansion: ["Elon Musk"],
      shouldContinue: true,
    });

    const result = parseGapAnalysis(input);
    expect(result.overallCompleteness).toBe(0.75);
    expect(result.gaps).toEqual(["Missing history", "No financials"]);
    expect(result.entitiesNeedingExpansion).toEqual(["Elon Musk"]);
    expect(result.shouldContinue).toBe(true);
  });

  it("parses markdown-fenced JSON", () => {
    const input = `\`\`\`json
{"overallCompleteness": 0.9, "gaps": [], "entitiesNeedingExpansion": [], "shouldContinue": false}
\`\`\``;
    const result = parseGapAnalysis(input);
    expect(result.overallCompleteness).toBe(0.9);
    expect(result.shouldContinue).toBe(false);
  });

  it("clamps completeness to 0-1 range", () => {
    const over = JSON.stringify({
      overallCompleteness: 1.5,
      gaps: [],
      entitiesNeedingExpansion: [],
      shouldContinue: false,
    });
    expect(parseGapAnalysis(over).overallCompleteness).toBe(1);

    const under = JSON.stringify({
      overallCompleteness: -0.5,
      gaps: [],
      entitiesNeedingExpansion: [],
      shouldContinue: false,
    });
    expect(parseGapAnalysis(under).overallCompleteness).toBe(0);
  });

  it("handles missing arrays gracefully", () => {
    const input = JSON.stringify({
      overallCompleteness: 0.5,
      shouldContinue: true,
    });
    const result = parseGapAnalysis(input);
    expect(result.gaps).toEqual([]);
    expect(result.entitiesNeedingExpansion).toEqual([]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseGapAnalysis("not json")).toThrow();
  });
});

describe("computeMaxIterations", () => {
  it("returns 0 for basic depth", () => {
    expect(
      computeMaxIterations({
        depth: "basic",
        maxEntities: 50,
        maxDepth: 3,
        searchProviders: [],
      })
    ).toBe(0);
  });

  it("returns 2 for detailed depth", () => {
    expect(
      computeMaxIterations({
        depth: "detailed",
        maxEntities: 50,
        maxDepth: 3,
        searchProviders: [],
      })
    ).toBe(2);
  });

  it("returns maxDepth * 3 for comprehensive depth", () => {
    expect(
      computeMaxIterations({
        depth: "comprehensive",
        maxEntities: 50,
        maxDepth: 3,
        searchProviders: [],
      })
    ).toBe(9);

    expect(
      computeMaxIterations({
        depth: "comprehensive",
        maxEntities: 50,
        maxDepth: 5,
        searchProviders: [],
      })
    ).toBe(15);
  });
});

describe("routeAfterGapDetection", () => {
  const baseState = {
    messages: [],
    files: {},
    todos: [],
    entityName: "Tesla",
    entityType: "company",
    researchDepth: "detailed" as const,
    sessionConfig: {
      depth: "detailed" as const,
      maxEntities: 50,
      maxDepth: 3,
      searchProviders: ["tavily"],
    },
    researchBrief: "Research Tesla",
    subQuestions: ["New gap question"],
    iterationCount: 0,
    gaps: ["Some gap"],
    relationships: [],
    confidence: 0,
    completeness: 0.5,
    bundle: undefined,
  };

  it("routes to parallel-gather when gaps exist and under limit", () => {
    expect(routeAfterGapDetection(baseState)).toBe("parallel-gather");
  });

  it("routes to coordinator when completeness >= 0.85", () => {
    expect(routeAfterGapDetection({ ...baseState, completeness: 0.9 })).toBe(
      "coordinator"
    );
  });

  it("routes to coordinator when iteration limit reached", () => {
    expect(routeAfterGapDetection({ ...baseState, iterationCount: 2 })).toBe(
      "coordinator"
    );
  });

  it("routes to coordinator when no sub-questions", () => {
    expect(routeAfterGapDetection({ ...baseState, subQuestions: [] })).toBe(
      "coordinator"
    );
  });

  it("always routes to coordinator for basic depth", () => {
    expect(
      routeAfterGapDetection({
        ...baseState,
        sessionConfig: {
          depth: "basic",
          maxEntities: 50,
          maxDepth: 3,
          searchProviders: [],
        },
        completeness: 0.3,
        subQuestions: ["Q1"],
      })
    ).toBe("coordinator");
  });
});

describe("createGapDetectionNode", () => {
  function createMockModel(response: string) {
    return { invoke: vi.fn().mockResolvedValue({ content: response }) };
  }

  const baseState = {
    messages: [],
    files: { evidence1: "some evidence data" },
    todos: [],
    entityName: "Tesla",
    entityType: "company",
    researchDepth: "detailed" as const,
    sessionConfig: {
      depth: "detailed" as const,
      maxEntities: 50,
      maxDepth: 3,
      searchProviders: ["tavily"],
    },
    researchBrief: "Research Tesla",
    subQuestions: [],
    iterationCount: 0,
    gaps: [],
    relationships: [],
    confidence: 0,
    completeness: 0,
    bundle: undefined,
  };

  const mockConfig = { configurable: { thread_id: "test" } };

  it("skips LLM call for basic depth", async () => {
    const model = createMockModel("should not be called");
    const node = createGapDetectionNode(model);

    const result = await node(
      {
        ...baseState,
        sessionConfig: {
          depth: "basic",
          maxEntities: 50,
          maxDepth: 3,
          searchProviders: [],
        },
      },
      mockConfig
    );

    expect(model.invoke).not.toHaveBeenCalled();
    expect(result.completeness).toBe(1.0);
  });

  it("returns gaps from LLM analysis for detailed depth", async () => {
    const mockResponse = JSON.stringify({
      overallCompleteness: 0.6,
      gaps: ["Missing history"],
      entitiesNeedingExpansion: [],
      shouldContinue: true,
    });
    const model = createMockModel(mockResponse);
    const node = createGapDetectionNode(model);

    const result = await node(baseState, mockConfig);

    expect(result.completeness).toBe(0.6);
    expect(result.gaps).toEqual(["Missing history"]);
    expect(result.iterationCount).toBe(1);
  });

  it("adds expansion sub-questions for comprehensive depth", async () => {
    const mockResponse = JSON.stringify({
      overallCompleteness: 0.5,
      gaps: ["Incomplete"],
      entitiesNeedingExpansion: ["Elon Musk", "SpaceX"],
      shouldContinue: true,
    });
    const model = createMockModel(mockResponse);
    const node = createGapDetectionNode(model);

    const result = await node(
      {
        ...baseState,
        sessionConfig: {
          depth: "comprehensive",
          maxEntities: 50,
          maxDepth: 3,
          searchProviders: [],
        },
      },
      mockConfig
    );

    expect(result.subQuestions!.length).toBe(2);
    expect(result.subQuestions![0]).toContain("Elon Musk");
    expect(result.subQuestions![1]).toContain("SpaceX");
  });

  it("respects max iterations cap", async () => {
    const model = createMockModel("should not be called");
    const node = createGapDetectionNode(model);

    const result = await node({ ...baseState, iterationCount: 2 }, mockConfig);

    expect(model.invoke).not.toHaveBeenCalled();
    expect(result.iterationCount).toBe(3);
  });

  it("handles LLM failure gracefully", async () => {
    const model = {
      invoke: vi.fn().mockRejectedValue(new Error("LLM error")),
    };
    const node = createGapDetectionNode(model);

    const result = await node(baseState, mockConfig);

    expect(result.completeness).toBe(0.8);
    expect(result.gaps).toEqual([]);
  });
});
