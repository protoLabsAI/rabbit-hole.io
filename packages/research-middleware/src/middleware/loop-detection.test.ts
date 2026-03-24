import { describe, it, expect, vi, beforeEach } from "vitest";

import { createTracingContext } from "../tracing.js";
import type { MiddlewareContext, ToolExecutor } from "../types.js";

import { LoopDetectionMiddleware } from "./loop-detection.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Null tracing context (LANGFUSE_PUBLIC_KEY is not set in tests). */
const nullTracing = createTracingContext({ agentId: "test" });

function makeCtx(): MiddlewareContext {
  return { agentId: "test", state: {}, tracing: nullTracing };
}

// ---------------------------------------------------------------------------
// LoopDetectionMiddleware
// ---------------------------------------------------------------------------

describe("LoopDetectionMiddleware", () => {
  let mw: LoopDetectionMiddleware;

  beforeEach(() => {
    mw = new LoopDetectionMiddleware();
  });

  it("has the expected id", () => {
    expect(mw.id).toBe("loop-detection");
  });

  // -------------------------------------------------------------------------
  // No repeat (count 1) — pass through
  // -------------------------------------------------------------------------

  it("passes through and calls execute on the first (non-repeated) call", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("tool-result");

    const result = await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ q: "hello" });
    expect(result).toBe("tool-result");
  });

  it("does not emit a tracing span on the first call", async () => {
    const ctx = makeCtx();
    const createSpanSpy = vi.spyOn(ctx.tracing, "createSpan");
    const execute: ToolExecutor = vi.fn().mockResolvedValue("ok");

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);

    expect(createSpanSpy).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Warning threshold (count 2)
  // -------------------------------------------------------------------------

  it("still calls execute at warning threshold (count 2)", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("appends a warning to a string result at count 2", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("original result");

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    const result = await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);

    expect(typeof result).toBe("string");
    expect(result as string).toContain("original result");
    expect(result as string).toMatch(/loop detection warning/i);
  });

  it("wraps a non-string result in an object with a warning at count 2", async () => {
    const ctx = makeCtx();
    const toolResult = { data: [1, 2, 3] };
    const execute: ToolExecutor = vi.fn().mockResolvedValue(toolResult);

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    const result = await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);

    expect(result).toEqual(expect.objectContaining({ result: toolResult }));
    expect((result as { warning: string }).warning).toMatch(/loop detection warning/i);
  });

  it("emits a loop-detection:warning span at count 2 with hash and count metadata", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("ok");
    const createSpanSpy = vi.spyOn(ctx.tracing, "createSpan");

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);

    expect(createSpanSpy).toHaveBeenCalledOnce();
    expect(createSpanSpy).toHaveBeenCalledWith(
      "loop-detection:warning",
      expect.objectContaining({ count: 2, toolName: "search" })
    );
    const spanArg = createSpanSpy.mock.calls[0]![1];
    expect(typeof spanArg!["hash"]).toBe("string");
    expect((spanArg!["hash"] as string).length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Hard stop / block (count >= 3)
  // -------------------------------------------------------------------------

  it("does NOT call execute at block threshold (count 3)", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);

    // execute called on call 1 and call 2, but NOT call 3
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("returns a synthesis instruction string at count 3", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    const result = await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);

    expect(typeof result).toBe("string");
    expect(result as string).toMatch(/synthesize/i);
    expect(result as string).toMatch(/loop detection/i);
  });

  it("continues to block at counts beyond 3", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    for (let i = 0; i < 5; i++) {
      await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    }

    // execute called only on calls 1 and 2
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("emits a loop-detection:blocked span at count 3 with hash and count metadata", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("ok");
    const createSpanSpy = vi.spyOn(ctx.tracing, "createSpan");

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute); // warning span
    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute); // blocked span

    expect(createSpanSpy).toHaveBeenCalledTimes(2);
    expect(createSpanSpy).toHaveBeenNthCalledWith(
      2,
      "loop-detection:blocked",
      expect.objectContaining({ count: 3, toolName: "search" })
    );
    const blockedSpanMeta = createSpanSpy.mock.calls[1]![1];
    expect(typeof blockedSpanMeta!["hash"]).toBe("string");
  });

  // -------------------------------------------------------------------------
  // Different args should NOT trigger loop detection
  // -------------------------------------------------------------------------

  it("does not flag legitimately different calls to the same tool", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "world" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "foo" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "bar" }, execute);

    // All 4 calls go through — no blocking or warnings
    expect(execute).toHaveBeenCalledTimes(4);
  });

  it("treats arg order as irrelevant (order-independent hashing)", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    // Same logical args, different key order — should hash identically
    await mw.wrapToolCall(ctx, "search", { q: "hello", lang: "en" }, execute);
    const result = await mw.wrapToolCall(ctx, "search", { lang: "en", q: "hello" }, execute);

    // Count should be 2 → warning
    expect(typeof result === "string" ? result : (result as { warning: string }).warning).toMatch(
      /loop detection warning/i
    );
  });

  it("treats different tools with same args as distinct calls", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx, "search", { q: "hello" }, execute); // count 2 for "search"
    await mw.wrapToolCall(ctx, "fetch", { q: "hello" }, execute);  // count 1 for "fetch" — no warning

    // Call 3 (fetch with same args as search) should NOT be warned
    expect(execute).toHaveBeenCalledTimes(3);
  });

  // -------------------------------------------------------------------------
  // Sliding window LRU eviction
  // -------------------------------------------------------------------------

  it("evicts the LRU hash when the window reaches size 20", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    // Fill the window with 20 unique hashes (query-0 is LRU after these)
    for (let i = 0; i < 20; i++) {
      await mw.wrapToolCall(ctx, "search", { q: `query-${i}` }, execute);
    }

    // Add a 21st unique hash — triggers eviction of query-0 (LRU)
    await mw.wrapToolCall(ctx, "search", { q: "new-query" }, execute);

    // query-0 was evicted: re-using it starts a fresh count of 1 (no warning)
    const result1 = await mw.wrapToolCall(ctx, "search", { q: "query-0" }, execute);

    // First re-use after eviction → count 1, should pass through cleanly
    expect(result1).toBe("result");
    expect(execute).toHaveBeenCalledTimes(22); // 20 fill + 1 new + 1 re-use
  });

  it("promotes a re-used hash to MRU, protecting it from eviction", async () => {
    const ctx = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    // Add query-0 first
    await mw.wrapToolCall(ctx, "search", { q: "query-0" }, execute);

    // Fill remaining 19 slots with unique queries
    for (let i = 1; i < 20; i++) {
      await mw.wrapToolCall(ctx, "search", { q: `query-${i}` }, execute);
    }

    // Re-use query-0 → promotes it to MRU (count becomes 2, warning)
    await mw.wrapToolCall(ctx, "search", { q: "query-0" }, execute);

    // Now add a 21st unique hash: should evict query-1 (now LRU), NOT query-0
    await mw.wrapToolCall(ctx, "search", { q: "new-query" }, execute);

    // query-1 was evicted; using it again gives count 1 (no warning)
    const result = await mw.wrapToolCall(ctx, "search", { q: "query-1" }, execute);
    expect(result).toBe("result");

    // query-0 is still in the window with count 2; using it again gives count 3 → blocked
    const blocked = await mw.wrapToolCall(ctx, "search", { q: "query-0" }, execute);
    expect(blocked as string).toMatch(/synthesize/i);
  });

  // -------------------------------------------------------------------------
  // Context isolation — separate ctx means separate window
  // -------------------------------------------------------------------------

  it("tracks state per context (separate ctx = separate window)", async () => {
    const ctx1 = makeCtx();
    const ctx2 = makeCtx();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("result");

    // Reach count 3 in ctx1
    await mw.wrapToolCall(ctx1, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx1, "search", { q: "hello" }, execute);
    await mw.wrapToolCall(ctx1, "search", { q: "hello" }, execute);

    // ctx2 is independent — first call should pass through cleanly
    const result = await mw.wrapToolCall(ctx2, "search", { q: "hello" }, execute);
    expect(result).toBe("result");
  });
});
