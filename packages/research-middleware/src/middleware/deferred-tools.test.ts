/**
 * Unit tests for DeferredToolLoadingMiddleware.
 *
 * Covers:
 *  - registry: constructor stores tools by name
 *  - beforeAgent: injects deferred tool note into ctx.state
 *  - tool_search: returns tool_loaded result and binds schema in ctx.state
 *  - tool_search: returns tool_not_found when name is unknown
 *  - persistence: loaded tools accumulate across multiple calls
 *  - passthrough: non-tool_search tools pass through to execute unchanged
 */

import { describe, it, expect, vi } from "vitest";

import { createTracingContext } from "../tracing.js";
import type { MiddlewareContext, ToolExecutor } from "../types.js";

import {
  DeferredToolLoadingMiddleware,
  TOOL_LOADED_TYPE,
  TOOL_NOT_FOUND_TYPE,
  type ToolLoadedResult,
  type ToolNotFoundResult,
  type DeferredToolEntry,
} from "./deferred-tools.js";

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

const SAMPLE_TOOLS: DeferredToolEntry[] = [
  {
    name: "extractEntities",
    description: "Extract named entities from text",
    schema: { type: "object", properties: { text: { type: "string" } } },
  },
  {
    name: "summarizeDocument",
    description: "Produce a brief summary of a document",
    schema: { type: "object", properties: { url: { type: "string" } } },
  },
];

// ---------------------------------------------------------------------------
// Registry: constructor
// ---------------------------------------------------------------------------

describe("DeferredToolLoadingMiddleware — registry", () => {
  it("has the expected id", () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: [] });
    expect(mw.id).toBe("deferred-tool-loading");
  });

  it("stores all provided tools", () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    // Verify the registry is populated by doing a successful load
    const ctx = makeCtx();
    mw.beforeAgent(ctx);
    expect(ctx.state.deferredToolsNote).toContain("extractEntities");
    expect(ctx.state.deferredToolsNote).toContain("summarizeDocument");
  });
});

// ---------------------------------------------------------------------------
// beforeAgent: system prompt injection
// ---------------------------------------------------------------------------

describe("DeferredToolLoadingMiddleware — beforeAgent", () => {
  it("appends deferredToolsNote to ctx.state listing available tools", () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();

    mw.beforeAgent(ctx);

    expect(typeof ctx.state.deferredToolsNote).toBe("string");
    const note = ctx.state.deferredToolsNote as string;
    expect(note).toContain("Additional tools available (use tool_search to activate)");
    expect(note).toContain("extractEntities: Extract named entities from text");
    expect(note).toContain("summarizeDocument: Produce a brief summary of a document");
  });

  it("does NOT set deferredToolsNote when registry is empty", () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: [] });
    const ctx = makeCtx();

    mw.beforeAgent(ctx);

    expect(ctx.state.deferredToolsNote).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// tool_search: successful load
// ---------------------------------------------------------------------------

describe("DeferredToolLoadingMiddleware — tool_search (load)", () => {
  it("returns tool_loaded result when tool name is found", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const execute = makeExecutor();

    const result = await mw.wrapToolCall(
      ctx,
      "tool_search",
      { select: "extractEntities" },
      execute
    );

    expect((result as ToolLoadedResult).__type).toBe(TOOL_LOADED_TYPE);
    expect((result as ToolLoadedResult).toolName).toBe("extractEntities");
    expect((result as ToolLoadedResult).schema).toEqual(SAMPLE_TOOLS[0].schema);
  });

  it("does NOT call execute when intercepting tool_search", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const execute = makeExecutor();

    await mw.wrapToolCall(ctx, "tool_search", { select: "extractEntities" }, execute);

    expect(execute).not.toHaveBeenCalled();
  });

  it("adds the loaded tool to ctx.state.loadedTools", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const execute = makeExecutor();

    await mw.wrapToolCall(ctx, "tool_search", { select: "extractEntities" }, execute);

    const loadedTools = ctx.state.loadedTools as Record<string, DeferredToolEntry>;
    expect(loadedTools).toBeDefined();
    expect(loadedTools["extractEntities"]).toBeDefined();
    expect(loadedTools["extractEntities"].name).toBe("extractEntities");
  });
});

// ---------------------------------------------------------------------------
// tool_search: not found
// ---------------------------------------------------------------------------

describe("DeferredToolLoadingMiddleware — tool_search (not found)", () => {
  it("returns tool_not_found when the tool name is unknown", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const execute = makeExecutor();

    const result = await mw.wrapToolCall(
      ctx,
      "tool_search",
      { select: "nonExistentTool" },
      execute
    );

    expect((result as ToolNotFoundResult).__type).toBe(TOOL_NOT_FOUND_TYPE);
    expect((result as ToolNotFoundResult).requestedName).toBe("nonExistentTool");
    expect(typeof (result as ToolNotFoundResult).reason).toBe("string");
  });

  it("does NOT add anything to ctx.state.loadedTools on not found", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const execute = makeExecutor();

    await mw.wrapToolCall(ctx, "tool_search", { select: "nonExistentTool" }, execute);

    expect(ctx.state.loadedTools).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Persistence: loaded tools accumulate across calls
// ---------------------------------------------------------------------------

describe("DeferredToolLoadingMiddleware — persistence", () => {
  it("accumulates multiple loaded tools in ctx.state.loadedTools", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const execute = makeExecutor();

    await mw.wrapToolCall(ctx, "tool_search", { select: "extractEntities" }, execute);
    await mw.wrapToolCall(ctx, "tool_search", { select: "summarizeDocument" }, execute);

    const loadedTools = ctx.state.loadedTools as Record<string, DeferredToolEntry>;
    expect(Object.keys(loadedTools)).toHaveLength(2);
    expect(loadedTools["extractEntities"]).toBeDefined();
    expect(loadedTools["summarizeDocument"]).toBeDefined();
  });

  it("does not duplicate a tool if loaded twice", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const execute = makeExecutor();

    await mw.wrapToolCall(ctx, "tool_search", { select: "extractEntities" }, execute);
    await mw.wrapToolCall(ctx, "tool_search", { select: "extractEntities" }, execute);

    const loadedTools = ctx.state.loadedTools as Record<string, DeferredToolEntry>;
    expect(Object.keys(loadedTools)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Passthrough: non-tool_search tools are forwarded unchanged
// ---------------------------------------------------------------------------

describe("DeferredToolLoadingMiddleware — passthrough", () => {
  it("calls execute for searchGraph and returns its result", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const expected = [{ uid: "entity:1", name: "Mercury" }];
    const execute = makeExecutor(expected);

    const result = await mw.wrapToolCall(ctx, "searchGraph", { query: "Mercury" }, execute);

    expect(execute).toHaveBeenCalledWith({ query: "Mercury" });
    expect(result).toEqual(expected);
  });

  it("calls execute for searchWeb and returns its result", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const expected = { results: [] };
    const execute = makeExecutor(expected);

    const result = await mw.wrapToolCall(ctx, "searchWeb", { query: "Mercury planet" }, execute);

    expect(execute).toHaveBeenCalledWith({ query: "Mercury planet" });
    expect(result).toEqual(expected);
  });

  it("does not modify ctx.state.loadedTools for non-tool_search tools", async () => {
    const mw = new DeferredToolLoadingMiddleware({ deferredTools: SAMPLE_TOOLS });
    const ctx = makeCtx();
    const execute = makeExecutor();

    await mw.wrapToolCall(ctx, "searchGraph", { query: "foo" }, execute);

    expect(ctx.state.loadedTools).toBeUndefined();
  });
});
