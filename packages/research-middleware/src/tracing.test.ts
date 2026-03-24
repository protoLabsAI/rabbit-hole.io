/**
 * Unit tests for the Langfuse tracing integration.
 *
 * These tests run without a real Langfuse connection. They verify:
 *  - NullTracingContext is returned when LANGFUSE_PUBLIC_KEY is not set
 *  - NullTracingContext methods are callable and return valid handles
 *  - SpanHandle and GenerationHandle `end()` do not throw
 *  - flush() resolves cleanly
 *  - createTracingContext returns a fresh context each time
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  createTracingContext,
  _resetLangfuseSingleton,
} from "./tracing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withoutLangfuseKey(fn: () => void) {
  const original = process.env["LANGFUSE_PUBLIC_KEY"];
  delete process.env["LANGFUSE_PUBLIC_KEY"];
  try {
    fn();
  } finally {
    if (original !== undefined) {
      process.env["LANGFUSE_PUBLIC_KEY"] = original;
    }
  }
}

// ---------------------------------------------------------------------------
// NullTracingContext (no LANGFUSE_PUBLIC_KEY)
// ---------------------------------------------------------------------------

describe("createTracingContext — no-op mode (LANGFUSE_PUBLIC_KEY not set)", () => {
  beforeEach(() => {
    _resetLangfuseSingleton();
    delete process.env["LANGFUSE_PUBLIC_KEY"];
  });

  afterEach(() => {
    _resetLangfuseSingleton();
  });

  it("returns a TracingContext even when the key is absent", () => {
    const ctx = createTracingContext({ agentId: "a1" });
    expect(ctx).toBeDefined();
    expect(typeof ctx.createSpan).toBe("function");
    expect(typeof ctx.createGeneration).toBe("function");
    expect(typeof ctx.flush).toBe("function");
  });

  it("createSpan returns a SpanHandle with an end() function", () => {
    const ctx = createTracingContext({ agentId: "a1" });
    const span = ctx.createSpan("test-span");
    expect(typeof span.end).toBe("function");
  });

  it("SpanHandle.end() does not throw when called with no arguments", () => {
    const ctx = createTracingContext({ agentId: "a1" });
    const span = ctx.createSpan("test-span");
    expect(() => span.end()).not.toThrow();
  });

  it("SpanHandle.end() does not throw when called with output", () => {
    const ctx = createTracingContext({ agentId: "a1" });
    const span = ctx.createSpan("test-span", { meta: "value" });
    expect(() => span.end({ result: 42 })).not.toThrow();
  });

  it("createGeneration returns a GenerationHandle with an end() function", () => {
    const ctx = createTracingContext({ agentId: "a1" });
    const gen = ctx.createGeneration("llm-call", "gpt-4o", { prompt: "hi" });
    expect(typeof gen.end).toBe("function");
  });

  it("GenerationHandle.end() does not throw when called with output and usage", () => {
    const ctx = createTracingContext({ agentId: "a1" });
    const gen = ctx.createGeneration("llm-call", "gpt-4o", "hello");
    expect(() =>
      gen.end("world", {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      })
    ).not.toThrow();
  });

  it("GenerationHandle.end() does not throw when called with no arguments", () => {
    const ctx = createTracingContext({ agentId: "a1" });
    const gen = ctx.createGeneration("llm-call", "gpt-4o", null);
    expect(() => gen.end()).not.toThrow();
  });

  it("flush() resolves without error", async () => {
    const ctx = createTracingContext({ agentId: "a1" });
    await expect(ctx.flush()).resolves.toBeUndefined();
  });

  it("each call to createTracingContext returns a distinct object", () => {
    const ctx1 = createTracingContext({ agentId: "a1" });
    const ctx2 = createTracingContext({ agentId: "a2" });
    expect(ctx1).not.toBe(ctx2);
  });

  it("accepts optional query, sessionId, and metadata without error", () => {
    expect(() =>
      createTracingContext({
        agentId: "a1",
        query: "what is AGI?",
        sessionId: "session-xyz",
        metadata: { middlewareChain: ["planner", "reflector"] },
      })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// NullTracingContext reuse — singleton identity
// ---------------------------------------------------------------------------

describe("createTracingContext — singleton SpanHandle reuse", () => {
  beforeEach(() => {
    _resetLangfuseSingleton();
    delete process.env["LANGFUSE_PUBLIC_KEY"];
  });

  afterEach(() => {
    _resetLangfuseSingleton();
  });

  it("null span handles can be called multiple times without error", () => {
    const ctx = createTracingContext({ agentId: "a1" });
    const span = ctx.createSpan("s");
    expect(() => {
      span.end();
      span.end("again");
    }).not.toThrow();
  });
});
