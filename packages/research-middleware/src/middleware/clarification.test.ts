/**
 * Unit tests for ClarificationMiddleware.
 *
 * Covers:
 *  - intercept: ask_clarification returns a clarification_requested result
 *  - resume: non-clarification tools pass through to execute unchanged
 *  - limit: second ask_clarification call in the same turn is blocked
 */

import { describe, it, expect, vi } from "vitest";

import { createTracingContext } from "../tracing";
import type { MiddlewareContext, ToolExecutor } from "../types";

import {
  ClarificationMiddleware,
  CLARIFICATION_RESULT_TYPE,
  CLARIFICATION_BLOCKED_TYPE,
  type ClarificationResult,
  type ClarificationBlockedResult,
} from "./clarification";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nullTracing = createTracingContext({ agentId: "test-agent" });

function makeCtx(stateOverrides?: Record<string, unknown>): MiddlewareContext {
  return {
    agentId: "test-agent",
    state: { ...stateOverrides },
    tracing: nullTracing,
  };
}

/** A no-op executor that records its calls and returns a sentinel value. */
function makeExecutor(returnValue: unknown = { ok: true }): ToolExecutor {
  return vi.fn().mockResolvedValue(returnValue);
}

// ---------------------------------------------------------------------------
// Intercept: ask_clarification is handled by the middleware
// ---------------------------------------------------------------------------

describe("ClarificationMiddleware — intercept", () => {
  it("has the expected id", () => {
    const mw = new ClarificationMiddleware();
    expect(mw.id).toBe("clarification");
  });

  it("returns a clarification_requested result for ask_clarification", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx();
    const execute = makeExecutor();

    const result = await mw.wrapToolCall(
      ctx,
      "ask_clarification",
      { question: "Did you mean the planet or the element?" },
      execute
    );

    expect(result).toEqual({
      __type: CLARIFICATION_RESULT_TYPE,
      question: "Did you mean the planet or the element?",
    } satisfies ClarificationResult);
  });

  it("does NOT call execute when intercepting ask_clarification", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx();
    const execute = makeExecutor();

    await mw.wrapToolCall(
      ctx,
      "ask_clarification",
      { question: "Which Mercury?" },
      execute
    );

    expect(execute).not.toHaveBeenCalled();
  });

  it("increments ctx.state.clarificationCount to 1 after first intercept", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx();
    const execute = makeExecutor();

    await mw.wrapToolCall(
      ctx,
      "ask_clarification",
      { question: "Which Mercury?" },
      execute
    );

    expect(ctx.state.clarificationCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Resume: non-clarification tools are passed through unchanged
// ---------------------------------------------------------------------------

describe("ClarificationMiddleware — resume (non-clarification tools)", () => {
  it("calls execute for searchGraph and returns its result", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx();
    const expected = [{ uid: "entity:1", name: "Mercury" }];
    const execute = makeExecutor(expected);

    const result = await mw.wrapToolCall(
      ctx,
      "searchGraph",
      { query: "Mercury" },
      execute
    );

    expect(execute).toHaveBeenCalledWith({ query: "Mercury" });
    expect(result).toEqual(expected);
  });

  it("calls execute for searchWeb and returns its result", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx();
    const expected = { results: [] };
    const execute = makeExecutor(expected);

    const result = await mw.wrapToolCall(
      ctx,
      "searchWeb",
      { query: "Mercury planet" },
      execute
    );

    expect(execute).toHaveBeenCalledWith({ query: "Mercury planet" });
    expect(result).toEqual(expected);
  });

  it("does not modify ctx.state.clarificationCount for non-clarification tools", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx();
    const execute = makeExecutor();

    await mw.wrapToolCall(ctx, "searchGraph", { query: "foo" }, execute);

    expect(ctx.state.clarificationCount).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Limit: only 1 clarification per turn is allowed
// ---------------------------------------------------------------------------

describe("ClarificationMiddleware — limit enforcement", () => {
  it("returns clarification_blocked on the second ask_clarification call", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx();
    const execute = makeExecutor();

    // First call — should succeed
    await mw.wrapToolCall(
      ctx,
      "ask_clarification",
      { question: "First question?" },
      execute
    );

    // Second call — should be blocked
    const result = await mw.wrapToolCall(
      ctx,
      "ask_clarification",
      { question: "Second question?" },
      execute
    );

    expect((result as ClarificationBlockedResult).__type).toBe(
      CLARIFICATION_BLOCKED_TYPE
    );
    expect(typeof (result as ClarificationBlockedResult).reason).toBe("string");
  });

  it("does not call execute on a blocked clarification", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx({ clarificationCount: 1 }); // already at limit
    const execute = makeExecutor();

    await mw.wrapToolCall(
      ctx,
      "ask_clarification",
      { question: "Blocked?" },
      execute
    );

    expect(execute).not.toHaveBeenCalled();
  });

  it("does not increment count further when blocked", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx({ clarificationCount: 1 });
    const execute = makeExecutor();

    await mw.wrapToolCall(
      ctx,
      "ask_clarification",
      { question: "Blocked?" },
      execute
    );

    // Should remain at 1, not increment to 2
    expect(ctx.state.clarificationCount).toBe(1);
  });

  it("allows other tools even after clarification count is at limit", async () => {
    const mw = new ClarificationMiddleware();
    const ctx = makeCtx({ clarificationCount: 1 });
    const expected = { results: [] };
    const execute = makeExecutor(expected);

    const result = await mw.wrapToolCall(
      ctx,
      "searchWeb",
      { query: "Mercury" },
      execute
    );

    expect(result).toEqual(expected);
  });
});
