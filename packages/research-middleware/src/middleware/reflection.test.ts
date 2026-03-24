/**
 * Unit tests for ReflectionMiddleware.
 *
 * Coverage:
 *  - Evidence accumulation via wrapToolCall (source type detection, result counting)
 *  - Metric computation (sourceCount, sourceDiversity, topicCoverage)
 *  - Gap detection and gap-filling guidance injection
 *  - Sufficient evidence detection and synthesis guidance injection
 *  - Step limit enforcement (no reflection at step >= 4)
 *  - beforeModel guidance injection and single-fire semantics
 *  - Langfuse generation created with quality metrics as metadata
 *  - Reflection errors are swallowed (agent flow unaffected)
 */

import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAIModel } from "@proto/llm-providers/server";

import type { MiddlewareContext, ModelResponse } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks — hoisted by vitest regardless of position in file
// ---------------------------------------------------------------------------

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@proto/llm-providers/server", () => ({
  getAIModel: vi.fn(() => "mock-model"),
}));
import {
  ReflectionMiddleware,
  buildGapFillingGuidance,
  buildReflectionPrompt,
  buildSynthesisGuidance,
  computeMetrics,
  detectGaps,
  detectSourceType,
  detectSufficiency,
  type EvidenceSource,
} from "./reflection.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateTextMock = generateText as ReturnType<typeof vi.fn>;
const getAIModelMock = getAIModel as ReturnType<typeof vi.fn>;

/** Creates a minimal MiddlewareContext with spy-based tracing. */
function makeCtx(state: Record<string, unknown> = {}): MiddlewareContext {
  const generationEnd = vi.fn();
  const spanEnd = vi.fn();

  return {
    agentId: "test-agent",
    state,
    tracing: {
      createSpan: vi.fn(() => ({ end: spanEnd })),
      createGeneration: vi.fn(() => ({ end: generationEnd })),
      flush: vi.fn(),
    },
  };
}

/** Builds a ModelResponse with the given tool calls. */
function makeResponseWithToolCalls(
  toolCalls: ModelResponse["toolCalls"] = []
): ModelResponse {
  return { toolCalls };
}

/** Minimal execute stub that returns a fixed result. */
function makeExecute(result: unknown = "tool-result") {
  return vi.fn().mockResolvedValue(result);
}

// ---------------------------------------------------------------------------
// detectSourceType
// ---------------------------------------------------------------------------

describe("detectSourceType", () => {
  it("returns 'wikipedia' for tool names containing 'wikipedia'", () => {
    expect(detectSourceType("search_wikipedia")).toBe("wikipedia");
    expect(detectSourceType("WIKIPEDIA_lookup")).toBe("wikipedia");
  });

  it("returns 'graph' for tool names containing 'graph'", () => {
    expect(detectSourceType("search_graph")).toBe("graph");
    expect(detectSourceType("neo4j_query")).toBe("graph");
  });

  it("returns 'web' for all other tool names", () => {
    expect(detectSourceType("search_web")).toBe("web");
    expect(detectSourceType("duckduckgo_search")).toBe("web");
    expect(detectSourceType("fetch_url")).toBe("web");
  });
});

// ---------------------------------------------------------------------------
// computeMetrics
// ---------------------------------------------------------------------------

describe("computeMetrics", () => {
  it("returns zeros for empty sources", () => {
    const m = computeMetrics([]);
    expect(m.sourceCount).toBe(0);
    expect(m.sourceDiversity).toBe(0);
    expect(m.topicCoverage).toBe(0);
  });

  it("counts total sources", () => {
    const sources: EvidenceSource[] = [
      { source: "web", resultCount: 3 },
      { source: "web", resultCount: 2 },
      { source: "graph", resultCount: 1 },
    ];
    expect(computeMetrics(sources).sourceCount).toBe(3);
  });

  it("counts unique source types as diversity", () => {
    const sources: EvidenceSource[] = [
      { source: "web", resultCount: 1 },
      { source: "graph", resultCount: 1 },
      { source: "wikipedia", resultCount: 1 },
    ];
    expect(computeMetrics(sources).sourceDiversity).toBe(3);
  });

  it("caps topicCoverage at 1", () => {
    const sources: EvidenceSource[] = Array.from({ length: 10 }, () => ({
      source: "web" as const,
      resultCount: 5,
    }));
    expect(computeMetrics(sources).topicCoverage).toBeLessThanOrEqual(1);
  });

  it("topicCoverage grows with diversity and count", () => {
    const low = computeMetrics([{ source: "web", resultCount: 1 }]);
    const high = computeMetrics([
      { source: "web", resultCount: 3 },
      { source: "graph", resultCount: 3 },
      { source: "wikipedia", resultCount: 3 },
    ]);
    expect(high.topicCoverage).toBeGreaterThan(low.topicCoverage);
  });
});

// ---------------------------------------------------------------------------
// detectGaps / detectSufficiency
// ---------------------------------------------------------------------------

describe("detectGaps", () => {
  it("returns true when reflection text contains 'GAPS:'", () => {
    expect(detectGaps("GAPS: missing web sources and recent data")).toBe(true);
  });

  it("returns true case-insensitively", () => {
    expect(detectGaps("gaps: need more graph data")).toBe(true);
  });

  it("returns false when no GAPS marker present", () => {
    expect(detectGaps("SUFFICIENT evidence found.")).toBe(false);
  });
});

describe("detectSufficiency", () => {
  it("returns true when reflection text contains 'SUFFICIENT'", () => {
    const metrics = computeMetrics([]);
    expect(detectSufficiency("SUFFICIENT evidence gathered.", metrics)).toBe(
      true
    );
  });

  it("returns true when diversity >= 2 and count >= 3 (heuristic)", () => {
    const sources: EvidenceSource[] = [
      { source: "web", resultCount: 2 },
      { source: "graph", resultCount: 2 },
      { source: "web", resultCount: 1 },
    ];
    const metrics = computeMetrics(sources);
    expect(detectSufficiency("some neutral text", metrics)).toBe(true);
  });

  it("returns false when text is neutral and metrics are low", () => {
    const metrics = computeMetrics([{ source: "web", resultCount: 1 }]);
    expect(detectSufficiency("needs more data", metrics)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// wrapToolCall — evidence accumulation
// ---------------------------------------------------------------------------

describe("ReflectionMiddleware.wrapToolCall", () => {
  let mw: ReflectionMiddleware;
  let ctx: MiddlewareContext;

  beforeEach(() => {
    mw = new ReflectionMiddleware();
    ctx = makeCtx();
  });

  it("delegates to execute and returns its result", async () => {
    const execute = makeExecute("hello");
    const result = await mw.wrapToolCall(ctx, "search_web", {}, execute);
    expect(result).toBe("hello");
    expect(execute).toHaveBeenCalledWith({});
  });

  it("records evidence source with result count 1 for non-array result", async () => {
    await mw.wrapToolCall(ctx, "search_graph", {}, makeExecute("node data"));
    const sources = ctx.state["evidenceSources"] as EvidenceSource[];
    expect(sources).toHaveLength(1);
    expect(sources[0]).toEqual({ source: "graph", resultCount: 1 });
  });

  it("records result count from array result", async () => {
    await mw.wrapToolCall(ctx, "search_web", {}, makeExecute(["a", "b", "c"]));
    const sources = ctx.state["evidenceSources"] as EvidenceSource[];
    expect(sources[0]?.resultCount).toBe(3);
  });

  it("records result count from { results: [] } shape", async () => {
    await mw.wrapToolCall(
      ctx,
      "search_wikipedia",
      {},
      makeExecute({ results: ["x", "y"] })
    );
    const sources = ctx.state["evidenceSources"] as EvidenceSource[];
    expect(sources[0]?.resultCount).toBe(2);
    expect(sources[0]?.source).toBe("wikipedia");
  });

  it("accumulates multiple tool calls", async () => {
    await mw.wrapToolCall(ctx, "search_web", {}, makeExecute("r1"));
    await mw.wrapToolCall(ctx, "search_graph", {}, makeExecute(["r2"]));
    const sources = ctx.state["evidenceSources"] as EvidenceSource[];
    expect(sources).toHaveLength(2);
    expect(sources[0]?.source).toBe("web");
    expect(sources[1]?.source).toBe("graph");
  });
});

// ---------------------------------------------------------------------------
// afterModel — gap detection
// ---------------------------------------------------------------------------

describe("ReflectionMiddleware.afterModel — gap detection", () => {
  let mw: ReflectionMiddleware;
  let ctx: MiddlewareContext;

  beforeEach(() => {
    mw = new ReflectionMiddleware();
    ctx = makeCtx({
      evidenceSources: [{ source: "web", resultCount: 2 }] as EvidenceSource[],
    });
    getAIModelMock.mockReturnValue("mock-model");
    generateTextMock.mockResolvedValue({
      text: "GAPS: missing graph data and recent publications",
      usage: { inputTokens: 50, outputTokens: 30 },
    });
  });

  it("stores gap-filling guidance in ctx.state.reflectionGuidance", async () => {
    const response = makeResponseWithToolCalls([
      { toolCallId: "1", toolName: "search_web", args: {} },
    ]);
    await mw.afterModel(ctx, response);

    expect(ctx.state["reflectionGuidance"]).toBeDefined();
    expect(ctx.state["reflectionGuidance"] as string).toContain(
      "[Research Reflection]"
    );
    expect(ctx.state["reflectionGuidance"] as string).toContain(
      "Gaps identified"
    );
  });

  it("creates a Langfuse generation with quality metrics as metadata", async () => {
    const response = makeResponseWithToolCalls([
      { toolCallId: "1", toolName: "search_web", args: {} },
    ]);
    await mw.afterModel(ctx, response);

    expect(ctx.tracing.createGeneration).toHaveBeenCalledWith(
      "reflection",
      "fast",
      expect.any(String),
      expect.objectContaining({
        sourceCount: expect.any(Number),
        sourceDiversity: expect.any(Number),
        topicCoverage: expect.any(Number),
        step: expect.any(Number),
      })
    );
  });

  it("calls generateText with fast model", async () => {
    const response = makeResponseWithToolCalls([
      { toolCallId: "1", toolName: "search_web", args: {} },
    ]);
    await mw.afterModel(ctx, response);

    expect(getAIModelMock).toHaveBeenCalledWith("fast");
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: "mock-model" })
    );
  });
});

// ---------------------------------------------------------------------------
// afterModel — sufficient evidence
// ---------------------------------------------------------------------------

describe("ReflectionMiddleware.afterModel — sufficient evidence", () => {
  let mw: ReflectionMiddleware;
  let ctx: MiddlewareContext;

  beforeEach(() => {
    mw = new ReflectionMiddleware();
    ctx = makeCtx({
      evidenceSources: [
        { source: "web", resultCount: 3 },
        { source: "graph", resultCount: 2 },
        { source: "wikipedia", resultCount: 1 },
      ] as EvidenceSource[],
    });
    getAIModelMock.mockReturnValue("mock-model");
    generateTextMock.mockResolvedValue({
      text: "SUFFICIENT — the evidence covers all major angles.",
      usage: { inputTokens: 60, outputTokens: 20 },
    });
  });

  it("stores synthesis guidance when evidence is sufficient", async () => {
    const response = makeResponseWithToolCalls([
      { toolCallId: "1", toolName: "search_web", args: {} },
    ]);
    await mw.afterModel(ctx, response);

    const guidance = ctx.state["reflectionGuidance"] as string;
    expect(guidance).toContain("[Research Reflection]");
    expect(guidance).toContain("sufficient evidence");
  });
});

// ---------------------------------------------------------------------------
// afterModel — step limit enforcement
// ---------------------------------------------------------------------------

describe("ReflectionMiddleware.afterModel — step limit", () => {
  let mw: ReflectionMiddleware;

  beforeEach(() => {
    mw = new ReflectionMiddleware();
    vi.clearAllMocks();
  });

  it("does not call the LLM on step >= 4", async () => {
    const ctx = makeCtx({ stepCount: 3 }); // will be incremented to 4
    const response = makeResponseWithToolCalls([
      { toolCallId: "1", toolName: "search_web", args: {} },
    ]);

    await mw.afterModel(ctx, response);

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(ctx.state["reflectionGuidance"]).toBeUndefined();
  });

  it("does not call the LLM when stepCount is already beyond MAX_STEPS", async () => {
    const ctx = makeCtx({ stepCount: 10 });
    await mw.afterModel(
      ctx,
      makeResponseWithToolCalls([{ toolCallId: "1", toolName: "t", args: {} }])
    );
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("DOES call the LLM on step < 4", async () => {
    generateTextMock.mockResolvedValue({
      text: "GAPS: missing wikipedia sources",
      usage: { inputTokens: 10, outputTokens: 10 },
    });
    getAIModelMock.mockReturnValue("mock-model");

    const ctx = makeCtx({ stepCount: 0 }); // will become 1
    const response = makeResponseWithToolCalls([
      { toolCallId: "1", toolName: "search_web", args: {} },
    ]);

    await mw.afterModel(ctx, response);

    expect(generateTextMock).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// afterModel — no tool calls (skip reflection)
// ---------------------------------------------------------------------------

describe("ReflectionMiddleware.afterModel — no tool calls", () => {
  it("skips reflection when the response has no tool calls", async () => {
    const mw = new ReflectionMiddleware();
    const ctx = makeCtx();
    vi.clearAllMocks();

    // Response with empty toolCalls array
    await mw.afterModel(ctx, { toolCalls: [] });
    expect(generateTextMock).not.toHaveBeenCalled();

    // Response with undefined toolCalls
    ctx.state["stepCount"] = 0;
    await mw.afterModel(ctx, {});
    expect(generateTextMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// afterModel — reflection error handling
// ---------------------------------------------------------------------------

describe("ReflectionMiddleware.afterModel — error resilience", () => {
  it("swallows generateText errors and does not throw", async () => {
    generateTextMock.mockRejectedValue(new Error("LLM unavailable"));
    getAIModelMock.mockReturnValue("mock-model");

    const mw = new ReflectionMiddleware();
    const ctx = makeCtx();

    const response = makeResponseWithToolCalls([
      { toolCallId: "1", toolName: "search_web", args: {} },
    ]);

    await expect(mw.afterModel(ctx, response)).resolves.toBeUndefined();
    expect(ctx.state["reflectionGuidance"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// beforeModel — guidance injection
// ---------------------------------------------------------------------------

describe("ReflectionMiddleware.beforeModel", () => {
  let mw: ReflectionMiddleware;

  beforeEach(() => {
    mw = new ReflectionMiddleware();
  });

  it("returns undefined when no guidance is stored", async () => {
    const ctx = makeCtx();
    const messages = [{ role: "user" as const, content: "hello" }];
    const result = await mw.beforeModel(ctx, messages);
    expect(result).toBeUndefined();
  });

  it("prepends a system message when guidance is stored", async () => {
    const ctx = makeCtx({
      reflectionGuidance: "[Research Reflection] Please fill the gap.",
    });
    const messages = [{ role: "user" as const, content: "hello" }];
    const result = await mw.beforeModel(ctx, messages);

    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({
      role: "system",
      content: "[Research Reflection] Please fill the gap.",
    });
    expect(result![1]).toEqual(messages[0]);
  });

  it("clears guidance after injection (fires only once)", async () => {
    const ctx = makeCtx({
      reflectionGuidance: "some guidance",
    });
    const messages = [{ role: "user" as const, content: "q" }];

    await mw.beforeModel(ctx, messages);
    // Second call — guidance should be gone
    const result2 = await mw.beforeModel(ctx, messages);

    expect(ctx.state["reflectionGuidance"]).toBeUndefined();
    expect(result2).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Metric tracking — integration
// ---------------------------------------------------------------------------

describe("ReflectionMiddleware — metric tracking integration", () => {
  it("tracks sourceCount, sourceDiversity in Langfuse metadata", async () => {
    generateTextMock.mockResolvedValue({
      text: "SUFFICIENT",
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    getAIModelMock.mockReturnValue("mock-model");

    const mw = new ReflectionMiddleware();
    const ctx = makeCtx();

    // Simulate 3 tool calls
    await mw.wrapToolCall(ctx, "search_web", {}, makeExecute(["r1", "r2"]));
    await mw.wrapToolCall(
      ctx,
      "search_graph",
      {},
      makeExecute({ results: ["n1"] })
    );
    await mw.wrapToolCall(ctx, "search_wikipedia", {}, makeExecute("article"));

    await mw.afterModel(
      ctx,
      makeResponseWithToolCalls([
        { toolCallId: "1", toolName: "search_web", args: {} },
      ])
    );

    expect(ctx.tracing.createGeneration).toHaveBeenCalledWith(
      "reflection",
      "fast",
      expect.any(String),
      expect.objectContaining({
        sourceCount: 3,
        sourceDiversity: 3,
        topicCoverage: expect.any(Number),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// buildReflectionPrompt
// ---------------------------------------------------------------------------

describe("buildReflectionPrompt", () => {
  it("includes source summary in prompt", () => {
    const sources: EvidenceSource[] = [
      { source: "web", resultCount: 3 },
      { source: "graph", resultCount: 1 },
    ];
    const metrics = computeMetrics(sources);
    const prompt = buildReflectionPrompt(sources, metrics);

    expect(prompt).toContain("web: 3 result(s)");
    expect(prompt).toContain("graph: 1 result(s)");
  });

  it("includes research plan when provided", () => {
    const prompt = buildReflectionPrompt(
      [],
      computeMetrics([]),
      "Step 1: Search"
    );
    expect(prompt).toContain("Step 1: Search");
  });

  it("shows 'none' when sources is empty", () => {
    const prompt = buildReflectionPrompt([], computeMetrics([]));
    expect(prompt).toContain("none");
  });
});

// ---------------------------------------------------------------------------
// Guidance builder helpers
// ---------------------------------------------------------------------------

describe("buildGapFillingGuidance", () => {
  it("extracts gap description from reflection text", () => {
    const metrics = computeMetrics([{ source: "web", resultCount: 2 }]);
    const guidance = buildGapFillingGuidance(
      "GAPS: no graph or wikipedia sources",
      metrics
    );
    expect(guidance).toContain("no graph or wikipedia sources");
    expect(guidance).toContain("[Research Reflection]");
  });

  it("falls back gracefully when GAPS pattern not parseable", () => {
    const metrics = computeMetrics([{ source: "web", resultCount: 1 }]);
    const guidance = buildGapFillingGuidance("GAPS:", metrics);
    expect(guidance).toContain("additional sources and perspectives");
  });
});

describe("buildSynthesisGuidance", () => {
  it("includes sourceCount and sourceDiversity", () => {
    const metrics = computeMetrics([
      { source: "web", resultCount: 2 },
      { source: "graph", resultCount: 1 },
    ]);
    const guidance = buildSynthesisGuidance(metrics);
    expect(guidance).toContain("2 source(s)");
    expect(guidance).toContain("2 source type(s)");
  });
});
