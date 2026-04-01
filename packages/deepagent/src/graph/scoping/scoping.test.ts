/**
 * Scoping Phase Tests
 *
 * Tests for the research scoping subgraph including:
 * - Response parsing (valid JSON, markdown-wrapped, malformed)
 * - Node behavior per depth level (basic/detailed/comprehensive)
 * - Fallback behavior on parse failure
 */

import { describe, expect, it, vi } from "vitest";

import { createAnalyzeQueryNode, parseScopingResponse } from "./nodes";

describe("parseScopingResponse", () => {
  it("parses valid JSON response", () => {
    const input = JSON.stringify({
      brief: "Research brief for Tesla",
      subQuestions: ["What is Tesla?", "Who founded Tesla?"],
      identifiedEntityTypes: ["company", "person"],
    });

    const result = parseScopingResponse(input);

    expect(result.brief).toBe("Research brief for Tesla");
    expect(result.subQuestions).toEqual([
      "What is Tesla?",
      "Who founded Tesla?",
    ]);
    expect(result.identifiedEntityTypes).toEqual(["company", "person"]);
    expect(result.gapHypotheses).toBeUndefined();
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const input = `\`\`\`json
{
  "brief": "Research brief",
  "subQuestions": ["Q1"],
  "identifiedEntityTypes": ["type1"]
}
\`\`\``;

    const result = parseScopingResponse(input);

    expect(result.brief).toBe("Research brief");
    expect(result.subQuestions).toEqual(["Q1"]);
  });

  it("parses JSON wrapped in plain code fences", () => {
    const input = `\`\`\`
{
  "brief": "Research brief",
  "subQuestions": ["Q1"],
  "identifiedEntityTypes": []
}
\`\`\``;

    const result = parseScopingResponse(input);
    expect(result.brief).toBe("Research brief");
  });

  it("includes gapHypotheses when present", () => {
    const input = JSON.stringify({
      brief: "Comprehensive research brief",
      subQuestions: ["Q1", "Q2", "Q3", "Q4", "Q5"],
      identifiedEntityTypes: ["company", "person", "technology"],
      gapHypotheses: ["Gap 1", "Gap 2"],
    });

    const result = parseScopingResponse(input);

    expect(result.gapHypotheses).toEqual(["Gap 1", "Gap 2"]);
  });

  it("throws on missing brief field", () => {
    const input = JSON.stringify({
      subQuestions: ["Q1"],
      identifiedEntityTypes: [],
    });

    expect(() => parseScopingResponse(input)).toThrow(
      "Missing or invalid 'brief'"
    );
  });

  it("throws on empty subQuestions", () => {
    const input = JSON.stringify({
      brief: "A brief",
      subQuestions: [],
      identifiedEntityTypes: [],
    });

    expect(() => parseScopingResponse(input)).toThrow(
      "Missing or empty 'subQuestions'"
    );
  });

  it("throws on invalid JSON", () => {
    expect(() => parseScopingResponse("not json")).toThrow();
  });

  it("handles missing identifiedEntityTypes gracefully", () => {
    const input = JSON.stringify({
      brief: "A brief",
      subQuestions: ["Q1"],
    });

    const result = parseScopingResponse(input);
    expect(result.identifiedEntityTypes).toEqual([]);
  });

  it("coerces non-string array elements to strings", () => {
    const input = JSON.stringify({
      brief: "A brief",
      subQuestions: [1, "Q2", true],
      identifiedEntityTypes: [42],
    });

    const result = parseScopingResponse(input);
    expect(result.subQuestions).toEqual(["1", "Q2", "true"]);
    expect(result.identifiedEntityTypes).toEqual(["42"]);
  });
});

describe("createAnalyzeQueryNode", () => {
  function createMockModel(response: string) {
    return {
      invoke: vi.fn().mockResolvedValue({
        content: response,
      }),
    };
  }

  const baseState = {
    messages: [],
    files: {},
    todos: [],
    entityName: "Tesla",
    entityType: "company",
    researchDepth: "detailed" as const,
    sessionConfig: undefined,
    researchBrief: undefined,
    subQuestions: [],
    iterationCount: 0,
    gaps: [],
    relationships: [],
    confidence: 0,
    completeness: 0,
    bundle: undefined,
  };

  const mockConfig = {
    configurable: { thread_id: "test-thread" },
  };

  it("produces researchBrief and subQuestions for basic depth", async () => {
    const mockResponse = JSON.stringify({
      brief: "Basic research on Tesla",
      subQuestions: ["What is Tesla?"],
      identifiedEntityTypes: ["company"],
    });

    const model = createMockModel(mockResponse);
    const node = createAnalyzeQueryNode(model);

    const result = await node(
      {
        ...baseState,
        researchDepth: "basic",
        sessionConfig: {
          depth: "basic",
          maxEntities: 50,
          maxDepth: 3,
          searchProviders: ["tavily"],
        },
      },
      mockConfig
    );

    expect(result.researchBrief).toBe("Basic research on Tesla");
    expect(result.subQuestions).toEqual(["What is Tesla?"]);
    expect(result.gaps).toEqual([]);
  });

  it("produces more sub-questions for detailed depth", async () => {
    const mockResponse = JSON.stringify({
      brief:
        "Detailed research on Tesla covering products, leadership, and market position",
      subQuestions: [
        "What products does Tesla produce?",
        "Who leads Tesla?",
        "What is Tesla's market position?",
        "What are Tesla's key partnerships?",
      ],
      identifiedEntityTypes: ["company", "person", "product"],
    });

    const model = createMockModel(mockResponse);
    const node = createAnalyzeQueryNode(model);

    const result = await node(
      {
        ...baseState,
        sessionConfig: {
          depth: "detailed",
          maxEntities: 50,
          maxDepth: 3,
          searchProviders: ["tavily"],
        },
      },
      mockConfig
    );

    expect(result.researchBrief).toContain("Detailed research");
    expect(result.subQuestions!.length).toBeGreaterThanOrEqual(3);
  });

  it("includes gap hypotheses for comprehensive depth", async () => {
    const mockResponse = JSON.stringify({
      brief: "Comprehensive research on Tesla",
      subQuestions: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"],
      identifiedEntityTypes: ["company", "person", "product", "technology"],
      gapHypotheses: [
        "Internal R&D details may be proprietary",
        "Supplier relationships may not be publicly documented",
      ],
    });

    const model = createMockModel(mockResponse);
    const node = createAnalyzeQueryNode(model);

    const result = await node(
      {
        ...baseState,
        sessionConfig: {
          depth: "comprehensive",
          maxEntities: 100,
          maxDepth: 5,
          searchProviders: ["searxng"],
        },
      },
      mockConfig
    );

    expect(result.gaps).toEqual([
      "Internal R&D details may be proprietary",
      "Supplier relationships may not be publicly documented",
    ]);
  });

  it("falls back gracefully on malformed LLM response", async () => {
    const model = createMockModel("This is not JSON at all.");
    const node = createAnalyzeQueryNode(model);

    const result = await node(baseState, mockConfig);

    expect(result.researchBrief).toContain("Tesla");
    expect(result.subQuestions!.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to DEFAULT_RESEARCH_SESSION_CONFIG when sessionConfig is absent", async () => {
    const mockResponse = JSON.stringify({
      brief: "Detailed brief",
      subQuestions: ["Q1", "Q2", "Q3"],
      identifiedEntityTypes: ["company"],
    });

    const model = createMockModel(mockResponse);
    const node = createAnalyzeQueryNode(model);

    await node(
      { ...baseState, researchDepth: "basic", sessionConfig: undefined },
      mockConfig
    );

    // Without sessionConfig, falls back to DEFAULT_RESEARCH_SESSION_CONFIG (depth: "detailed")
    expect(model.invoke).toHaveBeenCalledTimes(1);
    const callArgs = model.invoke.mock.calls[0][0];
    const userMsg = callArgs[1];
    expect(userMsg.content).toContain("DETAILED");
  });

  it("does not include gaps for non-comprehensive depth", async () => {
    const mockResponse = JSON.stringify({
      brief: "Detailed brief",
      subQuestions: ["Q1", "Q2", "Q3"],
      identifiedEntityTypes: ["company"],
      gapHypotheses: ["Some gap"], // should be ignored
    });

    const model = createMockModel(mockResponse);
    const node = createAnalyzeQueryNode(model);

    const result = await node(
      {
        ...baseState,
        sessionConfig: {
          depth: "detailed",
          maxEntities: 50,
          maxDepth: 3,
          searchProviders: ["tavily"],
        },
      },
      mockConfig
    );

    expect(result.gaps).toEqual([]);
  });
});
