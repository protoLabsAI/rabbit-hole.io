/**
 * Unit tests for ParallelDecompositionMiddleware.
 *
 * Covers:
 *  - Simple / non-deep queries: middleware is a no-op
 *  - Decomposition: calls decompose() and stores results in ctx.state
 *  - Sub-query cap: enforces maxSubQueries (default 3)
 *  - Parallel execution stub: sub-queries stored for agent to use
 *  - System message injection: beforeModel prepends plan on first call only
 *  - Failure handling: decompose() errors degrade gracefully
 *  - Tracing: Langfuse generation and span emitted on decomposition
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { createTracingContext } from "../tracing";
import type { MiddlewareContext, ModelMessage } from "../types";

import {
  ParallelDecompositionMiddleware,
  SUBQUERY_PLAN_TYPE,
  type SubQueryPlanResult,
} from "./parallel-decomposition";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a fresh tracing context per call — prevents spy bleed-across between tests. */
function makeCtx(
  stateOverrides?: Record<string, unknown>
): MiddlewareContext {
  return {
    agentId: "test-agent",
    state: { ...stateOverrides },
    tracing: createTracingContext({ agentId: "test-agent" }),
  };
}

function makeMessages(count = 2): ModelMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    role: "user" as const,
    content: `message ${i}`,
  }));
}

/** Returns a deep research plan state. */
function deepPlan(query: string): Record<string, unknown> {
  return { researchPlan: { queryType: "deep", query } };
}

/** Returns a simple research plan state. */
function simplePlan(query: string): Record<string, unknown> {
  return { researchPlan: { queryType: "simple", query } };
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("ParallelDecompositionMiddleware — construction", () => {
  it("has the expected id", () => {
    const mw = new ParallelDecompositionMiddleware();
    expect(mw.id).toBe("parallel-decomposition");
  });

  it("accepts no options", () => {
    expect(() => new ParallelDecompositionMiddleware()).not.toThrow();
  });

  it("accepts a decompose function and maxSubQueries", () => {
    const decompose = vi.fn().mockResolvedValue([]);
    const mw = new ParallelDecompositionMiddleware({ decompose, maxSubQueries: 2 });
    expect(mw.id).toBe("parallel-decomposition");
  });
});

// ---------------------------------------------------------------------------
// beforeAgent — simple queries are skipped
// ---------------------------------------------------------------------------

describe("ParallelDecompositionMiddleware — beforeAgent (simple / no plan)", () => {
  let mw: ParallelDecompositionMiddleware;
  let decompose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    decompose = vi.fn().mockResolvedValue(["sub-q 1", "sub-q 2"]);
    mw = new ParallelDecompositionMiddleware({ decompose });
  });

  it("does NOT call decompose when researchPlan is absent", async () => {
    const ctx = makeCtx(); // no researchPlan
    await mw.beforeAgent(ctx);
    expect(decompose).not.toHaveBeenCalled();
    expect(ctx.state["subQueries"]).toBeUndefined();
  });

  it("does NOT call decompose when queryType is 'simple'", async () => {
    const ctx = makeCtx(simplePlan("What is water?"));
    await mw.beforeAgent(ctx);
    expect(decompose).not.toHaveBeenCalled();
    expect(ctx.state["subQueries"]).toBeUndefined();
  });

  it("does NOT call decompose when no decompose function is provided", async () => {
    const ctx = makeCtx(deepPlan("How does the global economy work?"));
    const mwNoDecompose = new ParallelDecompositionMiddleware();
    await mwNoDecompose.beforeAgent(ctx);
    expect(ctx.state["subQueries"]).toBeUndefined();
  });

  it("does NOT call decompose when plan.query is empty", async () => {
    const ctx = makeCtx({ researchPlan: { queryType: "deep", query: "" } });
    await mw.beforeAgent(ctx);
    expect(decompose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// beforeAgent — decomposition path
// ---------------------------------------------------------------------------

describe("ParallelDecompositionMiddleware — beforeAgent (deep query)", () => {
  let mw: ParallelDecompositionMiddleware;
  let decompose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    decompose = vi
      .fn()
      .mockResolvedValue([
        "economic inequality causes",
        "automation impact on jobs",
        "global trade policies",
      ]);
    mw = new ParallelDecompositionMiddleware({ decompose });
  });

  it("calls decompose with the original query", async () => {
    const query = "How does globalisation affect inequality?";
    const ctx = makeCtx(deepPlan(query));
    await mw.beforeAgent(ctx);
    expect(decompose).toHaveBeenCalledOnce();
    expect(decompose).toHaveBeenCalledWith(query);
  });

  it("stores sub-queries in ctx.state.subQueries", async () => {
    const ctx = makeCtx(deepPlan("globalisation query"));
    await mw.beforeAgent(ctx);
    expect(ctx.state["subQueries"]).toEqual([
      "economic inequality causes",
      "automation impact on jobs",
      "global trade policies",
    ]);
  });

  it("stores the original query in ctx.state.originalQuery", async () => {
    const query = "How does globalisation affect inequality?";
    const ctx = makeCtx(deepPlan(query));
    await mw.beforeAgent(ctx);
    expect(ctx.state["originalQuery"]).toBe(query);
  });
});

// ---------------------------------------------------------------------------
// beforeAgent — max sub-query cap
// ---------------------------------------------------------------------------

describe("ParallelDecompositionMiddleware — sub-query cap", () => {
  it("caps at 3 sub-queries by default", async () => {
    const decompose = vi
      .fn()
      .mockResolvedValue(["q1", "q2", "q3", "q4", "q5"]);
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(deepPlan("complex query"));
    await mw.beforeAgent(ctx);
    expect(ctx.state["subQueries"]).toHaveLength(3);
  });

  it("respects a custom maxSubQueries of 2", async () => {
    const decompose = vi.fn().mockResolvedValue(["q1", "q2", "q3"]);
    const mw = new ParallelDecompositionMiddleware({
      decompose,
      maxSubQueries: 2,
    });
    const ctx = makeCtx(deepPlan("complex query"));
    await mw.beforeAgent(ctx);
    expect(ctx.state["subQueries"]).toHaveLength(2);
    expect(ctx.state["subQueries"]).toEqual(["q1", "q2"]);
  });

  it("handles fewer sub-queries than the cap", async () => {
    const decompose = vi.fn().mockResolvedValue(["q1"]);
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(deepPlan("simple-ish query"));
    await mw.beforeAgent(ctx);
    expect(ctx.state["subQueries"]).toEqual(["q1"]);
  });

  it("filters out empty strings from decomposition output", async () => {
    const decompose = vi.fn().mockResolvedValue(["q1", "", "  ", "q2"]);
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(deepPlan("query"));
    await mw.beforeAgent(ctx);
    expect(ctx.state["subQueries"]).toEqual(["q1", "q2"]);
  });

  it("does NOT set subQueries when decompose returns an empty array", async () => {
    const decompose = vi.fn().mockResolvedValue([]);
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(deepPlan("query"));
    await mw.beforeAgent(ctx);
    expect(ctx.state["subQueries"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// beforeAgent — failure handling (graceful degradation)
// ---------------------------------------------------------------------------

describe("ParallelDecompositionMiddleware — failure handling", () => {
  it("does NOT throw when decompose() rejects", async () => {
    const decompose = vi.fn().mockRejectedValue(new Error("LLM timeout"));
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(deepPlan("query"));
    await expect(mw.beforeAgent(ctx)).resolves.toBeUndefined();
  });

  it("leaves ctx.state.subQueries unset when decompose() rejects", async () => {
    const decompose = vi.fn().mockRejectedValue(new Error("network error"));
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(deepPlan("query"));
    await mw.beforeAgent(ctx);
    expect(ctx.state["subQueries"]).toBeUndefined();
  });

  it("completes without error when no decompose function is provided (non-deep path)", async () => {
    const mwNoDecompose = new ParallelDecompositionMiddleware();
    const ctx = makeCtx(deepPlan("query"));
    await expect(mwNoDecompose.beforeAgent(ctx)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// beforeAgent — tracing
// ---------------------------------------------------------------------------

describe("ParallelDecompositionMiddleware — tracing", () => {
  it("emits a generation span for the decomposition call", async () => {
    const decompose = vi.fn().mockResolvedValue(["q1", "q2"]);
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(deepPlan("complex question"));
    const createGenerationSpy = vi.spyOn(ctx.tracing, "createGeneration");

    await mw.beforeAgent(ctx);

    expect(createGenerationSpy).toHaveBeenCalledOnce();
    expect(createGenerationSpy).toHaveBeenCalledWith(
      "parallel-decomposition:decompose",
      "decomposer",
      expect.objectContaining({ query: "complex question" }),
      expect.objectContaining({ queryType: "deep" })
    );
  });

  it("emits a plan span after successful decomposition", async () => {
    const decompose = vi.fn().mockResolvedValue(["q1", "q2"]);
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(deepPlan("complex question"));
    const createSpanSpy = vi.spyOn(ctx.tracing, "createSpan");

    await mw.beforeAgent(ctx);

    expect(createSpanSpy).toHaveBeenCalledWith(
      "parallel-decomposition:plan",
      expect.objectContaining({ subQueryCount: 2 })
    );
  });

  it("does NOT emit a plan span when decompose fails", async () => {
    const decompose = vi.fn().mockRejectedValue(new Error("fail"));
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(deepPlan("complex question"));
    const createSpanSpy = vi.spyOn(ctx.tracing, "createSpan");

    await mw.beforeAgent(ctx);

    // No plan span; generation span ends with error
    const planSpanCalls = createSpanSpy.mock.calls.filter(
      ([name]) => name === "parallel-decomposition:plan"
    );
    expect(planSpanCalls).toHaveLength(0);
  });

  it("does NOT emit any spans for non-deep queries", async () => {
    const decompose = vi.fn().mockResolvedValue(["q1"]);
    const mw = new ParallelDecompositionMiddleware({ decompose });
    const ctx = makeCtx(simplePlan("simple query"));
    const createGenerationSpy = vi.spyOn(ctx.tracing, "createGeneration");
    const createSpanSpy = vi.spyOn(ctx.tracing, "createSpan");

    await mw.beforeAgent(ctx);

    expect(createGenerationSpy).not.toHaveBeenCalled();
    expect(createSpanSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// beforeModel — no-op cases
// ---------------------------------------------------------------------------

describe("ParallelDecompositionMiddleware — beforeModel (no-op cases)", () => {
  let mw: ParallelDecompositionMiddleware;

  beforeEach(() => {
    mw = new ParallelDecompositionMiddleware();
  });

  it("returns undefined when no subQueries in state", () => {
    const ctx = makeCtx();
    const messages = makeMessages();
    const result = mw.beforeModel(ctx, messages);
    expect(result).toBeUndefined();
  });

  it("returns undefined when subQueries is an empty array", () => {
    const ctx = makeCtx({ subQueries: [] });
    const messages = makeMessages();
    const result = mw.beforeModel(ctx, messages);
    expect(result).toBeUndefined();
  });

  it("returns undefined after subQueryPlanInjected is set", () => {
    const ctx = makeCtx({
      subQueries: ["q1", "q2"],
      subQueryPlanInjected: true,
    });
    const messages = makeMessages();
    const result = mw.beforeModel(ctx, messages);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// beforeModel — injection
// ---------------------------------------------------------------------------

describe("ParallelDecompositionMiddleware — beforeModel (injection)", () => {
  let mw: ParallelDecompositionMiddleware;

  beforeEach(() => {
    mw = new ParallelDecompositionMiddleware();
  });

  it("returns a new messages array with a plan system message prepended", () => {
    const ctx = makeCtx({ subQueries: ["sub-q 1", "sub-q 2"] });
    const messages = makeMessages(2);
    const result = mw.beforeModel(ctx, messages);

    expect(result).not.toBeUndefined();
    expect(result).toHaveLength(3);
    expect(result![0]!.role).toBe("system");
  });

  it("plan message content includes each sub-query", () => {
    const subQueries = ["economic history", "trade routes", "modern impact"];
    const ctx = makeCtx({ subQueries });
    const messages = makeMessages(1);
    const result = mw.beforeModel(ctx, messages);

    const planContent = result![0]!.content as string;
    expect(planContent).toContain("economic history");
    expect(planContent).toContain("trade routes");
    expect(planContent).toContain("modern impact");
  });

  it("plan message mentions the number of sub-topics", () => {
    const ctx = makeCtx({ subQueries: ["q1", "q2"] });
    const messages = makeMessages(1);
    const result = mw.beforeModel(ctx, messages);

    const planContent = result![0]!.content as string;
    expect(planContent).toContain("2");
  });

  it("preserves original messages after the injected plan", () => {
    const ctx = makeCtx({ subQueries: ["q1", "q2"] });
    const messages = makeMessages(2);
    const result = mw.beforeModel(ctx, messages);

    // Original messages appear after the plan (indices 1 and 2)
    expect(result![1]).toStrictEqual(messages[0]);
    expect(result![2]).toStrictEqual(messages[1]);
  });

  it("sets ctx.state.subQueryPlanInjected to true after first injection", () => {
    const ctx = makeCtx({ subQueries: ["q1"] });
    mw.beforeModel(ctx, makeMessages());
    expect(ctx.state["subQueryPlanInjected"]).toBe(true);
  });

  it("returns undefined on the second call (no duplicate injection)", () => {
    const ctx = makeCtx({ subQueries: ["q1", "q2"] });
    const messages = makeMessages();

    // First call — injects
    const first = mw.beforeModel(ctx, messages);
    expect(first).not.toBeUndefined();

    // Second call — no-op
    const second = mw.beforeModel(ctx, messages);
    expect(second).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SUBQUERY_PLAN_TYPE constant
// ---------------------------------------------------------------------------

describe("SUBQUERY_PLAN_TYPE", () => {
  it("is the string 'subquery_plan'", () => {
    expect(SUBQUERY_PLAN_TYPE).toBe("subquery_plan");
  });

  it("can be used as a discriminant on SubQueryPlanResult", () => {
    const result: SubQueryPlanResult = {
      __type: SUBQUERY_PLAN_TYPE,
      originalQuery: "original",
      subQueries: ["a", "b"],
    };
    expect(result.__type).toBe("subquery_plan");
  });
});
