import { generateText } from "ai";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { createTracingContext } from "../tracing";
import type { MiddlewareContext } from "../types";

import { ResearchPlannerMiddleware } from "./research-planner";

// ---------------------------------------------------------------------------
// Mocks — vitest hoists vi.mock() calls above imports automatically
// ---------------------------------------------------------------------------

vi.mock("ai");
vi.mock("@protolabsai/llm-providers/server");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Null tracing context (LANGFUSE_PUBLIC_KEY is not set in tests). */
const nullTracing = createTracingContext({ agentId: "test" });

function makeCtx(query?: string): MiddlewareContext {
  return {
    agentId: "test",
    state: query !== undefined ? { query } : {},
    tracing: nullTracing,
  };
}

const MOCK_PLAN =
  "1. Search for primary sources\n2. Look for contradictions\n3. Stop when coverage is complete";

/** A complex query long enough (>= 10 words) to trigger planning. */
const COMPLEX_QUERY =
  "Analyze the competitive landscape of the electric vehicle market globally";

// ---------------------------------------------------------------------------
// ResearchPlannerMiddleware
// ---------------------------------------------------------------------------

describe("ResearchPlannerMiddleware", () => {
  let mw: ResearchPlannerMiddleware;

  beforeEach(() => {
    mw = new ResearchPlannerMiddleware();
    vi.clearAllMocks();

    // Default mock: successful plan generation
    vi.mocked(generateText).mockResolvedValue({
      text: MOCK_PLAN,
      usage: {
        inputTokens: 50,
        outputTokens: 100,
        inputTokenDetails: {
          noCacheTokens: 50,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
        outputTokenDetails: { textTokens: 100 },
      },
      // Other GenerateTextResult fields not used by the middleware
    } as any);
  });

  it("has the expected id", () => {
    expect(mw.id).toBe("research-planner");
  });

  // -------------------------------------------------------------------------
  // Simple query bypass
  // -------------------------------------------------------------------------

  it("skips planning when no query is set in state", async () => {
    const ctx = makeCtx();
    await mw.beforeAgent(ctx);
    expect(generateText).not.toHaveBeenCalled();
    expect(ctx.state["researchPlan"]).toBeUndefined();
  });

  it("skips planning for a short factual query starting with 'who'", async () => {
    const ctx = makeCtx("Who is the president?");
    await mw.beforeAgent(ctx);
    expect(generateText).not.toHaveBeenCalled();
    expect(ctx.state["researchPlan"]).toBeUndefined();
  });

  it("skips planning for a short factual query starting with 'what'", async () => {
    const ctx = makeCtx("What is the capital of France?");
    await mw.beforeAgent(ctx);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("skips planning for a short factual query starting with 'when'", async () => {
    const ctx = makeCtx("When did World War II end?");
    await mw.beforeAgent(ctx);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("skips planning for a short factual query starting with 'where'", async () => {
    const ctx = makeCtx("Where is the Eiffel Tower?");
    await mw.beforeAgent(ctx);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("skips planning for a short factual query starting with 'how'", async () => {
    const ctx = makeCtx("How does photosynthesis work?");
    await mw.beforeAgent(ctx);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("does NOT skip planning for a long query (>= 10 words) starting with 'what'", async () => {
    const ctx = makeCtx(
      "What are the long-term economic consequences of artificial intelligence on developing nations?"
    );
    await mw.beforeAgent(ctx);
    expect(generateText).toHaveBeenCalledOnce();
  });

  it("does NOT skip planning for a complex query that does not start with a factual word", async () => {
    const ctx = makeCtx(COMPLEX_QUERY);
    await mw.beforeAgent(ctx);
    expect(generateText).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // Plan generation
  // -------------------------------------------------------------------------

  it("stores the generated plan in ctx.state.researchPlan", async () => {
    const ctx = makeCtx(COMPLEX_QUERY);
    await mw.beforeAgent(ctx);
    expect(ctx.state["researchPlan"]).toBe(MOCK_PLAN);
  });

  it("calls generateText with a prompt containing the user query", async () => {
    const ctx = makeCtx(COMPLEX_QUERY);
    await mw.beforeAgent(ctx);
    const callArg = vi.mocked(generateText).mock.calls[0]![0] as {
      prompt: string;
    };
    expect(callArg.prompt).toContain(COMPLEX_QUERY);
  });

  // -------------------------------------------------------------------------
  // Plan format validation
  // -------------------------------------------------------------------------

  it("prompt instructs the LLM to include search order, gaps, and stop criteria", async () => {
    const ctx = makeCtx(COMPLEX_QUERY);
    await mw.beforeAgent(ctx);
    const callArg = vi.mocked(generateText).mock.calls[0]![0] as {
      prompt: string;
    };
    expect(callArg.prompt).toMatch(/search/i);
    expect(callArg.prompt).toMatch(/gaps/i);
    expect(callArg.prompt).toMatch(/stop/i);
  });

  // -------------------------------------------------------------------------
  // Langfuse generation tracking
  // -------------------------------------------------------------------------

  it("tracks the planning call as a Langfuse generation named 'research-plan'", async () => {
    const ctx = makeCtx(COMPLEX_QUERY);
    const createGenerationSpy = vi.spyOn(ctx.tracing, "createGeneration");
    await mw.beforeAgent(ctx);
    expect(createGenerationSpy).toHaveBeenCalledOnce();
    expect(createGenerationSpy).toHaveBeenCalledWith(
      "research-plan",
      "fast",
      expect.any(String)
    );
  });

  it("ends the generation with the plan output and token usage", async () => {
    const ctx = makeCtx(COMPLEX_QUERY);
    const mockGenerationHandle = { end: vi.fn() };
    vi.spyOn(ctx.tracing, "createGeneration").mockReturnValue(
      mockGenerationHandle
    );
    await mw.beforeAgent(ctx);
    expect(mockGenerationHandle.end).toHaveBeenCalledOnce();
    expect(mockGenerationHandle.end).toHaveBeenCalledWith(
      MOCK_PLAN,
      expect.objectContaining({
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
      })
    );
  });

  it("does not emit a generation span for simple queries", async () => {
    const ctx = makeCtx("Who is the CEO of Apple?");
    const createGenerationSpy = vi.spyOn(ctx.tracing, "createGeneration");
    await mw.beforeAgent(ctx);
    expect(createGenerationSpy).not.toHaveBeenCalled();
  });
});
