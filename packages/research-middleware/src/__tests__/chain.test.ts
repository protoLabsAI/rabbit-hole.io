import { describe, it, expect, vi, beforeEach } from "vitest";
import { MiddlewareChain } from "../runtime.js";
import { MiddlewareRegistry } from "../registry.js";
import { PassthroughMiddleware } from "../middleware/passthrough.js";
import { createTracingContext } from "../tracing.js";
import type {
  AgentResult,
  MiddlewareContext,
  MiddlewareRegistryEntry,
  ModelMessage,
  ModelResponse,
  ResearchMiddleware,
  ToolExecutor,
} from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** No-op tracing context for tests (LANGFUSE_PUBLIC_KEY is not set). */
const nullTracing = createTracingContext({ agentId: "test-agent" });

function makeCtx(overrides?: Partial<MiddlewareContext>): MiddlewareContext {
  return { agentId: "test-agent", state: {}, tracing: nullTracing, ...overrides };
}

const noopResult: AgentResult = { text: "done", finishReason: "stop" };
const baseMessages: ModelMessage[] = [
  { role: "user", content: "hello" },
];
const baseResponse: ModelResponse = { text: "hi", usage: { totalTokens: 10 } };

// ---------------------------------------------------------------------------
// PassthroughMiddleware
// ---------------------------------------------------------------------------

describe("PassthroughMiddleware", () => {
  it("has the expected id", () => {
    const mw = new PassthroughMiddleware();
    expect(mw.id).toBe("passthrough");
  });

  it("beforeAgent resolves without error", async () => {
    const mw = new PassthroughMiddleware();
    await expect(mw.beforeAgent(makeCtx())).resolves.toBeUndefined();
  });

  it("afterAgent resolves without error", async () => {
    const mw = new PassthroughMiddleware();
    await expect(mw.afterAgent(makeCtx(), noopResult)).resolves.toBeUndefined();
  });

  it("beforeModel returns undefined (no modification)", async () => {
    const mw = new PassthroughMiddleware();
    const result = await mw.beforeModel(makeCtx(), baseMessages);
    expect(result).toBeUndefined();
  });

  it("afterModel resolves without error", async () => {
    const mw = new PassthroughMiddleware();
    await expect(mw.afterModel(makeCtx(), baseResponse)).resolves.toBeUndefined();
  });

  it("wrapToolCall delegates to execute", async () => {
    const mw = new PassthroughMiddleware();
    const execute: ToolExecutor = vi.fn().mockResolvedValue("tool-result");
    const result = await mw.wrapToolCall(makeCtx(), "myTool", { a: 1 }, execute);
    expect(execute).toHaveBeenCalledWith({ a: 1 });
    expect(result).toBe("tool-result");
  });
});

// ---------------------------------------------------------------------------
// MiddlewareChain — ordering
// ---------------------------------------------------------------------------

describe("MiddlewareChain — ordering", () => {
  let callOrder: string[];
  let mw1: ResearchMiddleware;
  let mw2: ResearchMiddleware;
  let mw3: ResearchMiddleware;

  beforeEach(() => {
    callOrder = [];

    mw1 = {
      id: "mw1",
      async beforeAgent() { callOrder.push("mw1:beforeAgent"); },
      async afterAgent() { callOrder.push("mw1:afterAgent"); },
      async beforeModel(_ctx, messages) { callOrder.push("mw1:beforeModel"); return messages; },
      async afterModel() { callOrder.push("mw1:afterModel"); },
    };

    mw2 = {
      id: "mw2",
      async beforeAgent() { callOrder.push("mw2:beforeAgent"); },
      async afterAgent() { callOrder.push("mw2:afterAgent"); },
      async beforeModel(_ctx, messages) { callOrder.push("mw2:beforeModel"); return messages; },
      async afterModel() { callOrder.push("mw2:afterModel"); },
    };

    mw3 = {
      id: "mw3",
      async beforeAgent() { callOrder.push("mw3:beforeAgent"); },
    };
  });

  it("calls beforeAgent in registration order", async () => {
    const chain = new MiddlewareChain([mw1, mw2, mw3]);
    await chain.beforeAgent(makeCtx());
    expect(callOrder).toEqual(["mw1:beforeAgent", "mw2:beforeAgent", "mw3:beforeAgent"]);
  });

  it("calls afterAgent in registration order", async () => {
    const chain = new MiddlewareChain([mw1, mw2]);
    await chain.afterAgent(makeCtx(), noopResult);
    expect(callOrder).toEqual(["mw1:afterAgent", "mw2:afterAgent"]);
  });

  it("calls beforeModel in registration order and threads messages", async () => {
    const chain = new MiddlewareChain([mw1, mw2]);
    const result = await chain.beforeModel(makeCtx(), baseMessages);
    expect(callOrder).toEqual(["mw1:beforeModel", "mw2:beforeModel"]);
    expect(result).toEqual(baseMessages);
  });

  it("calls afterModel in registration order", async () => {
    const chain = new MiddlewareChain([mw1, mw2]);
    await chain.afterModel(makeCtx(), baseResponse);
    expect(callOrder).toEqual(["mw1:afterModel", "mw2:afterModel"]);
  });

  it("skips hooks that are not implemented by a middleware", async () => {
    // mw3 only has beforeAgent — other hooks should be silently skipped
    const chain = new MiddlewareChain([mw1, mw3]);
    await expect(chain.afterAgent(makeCtx(), noopResult)).resolves.toBeUndefined();
    expect(callOrder).toEqual(["mw1:afterAgent"]);
  });
});

// ---------------------------------------------------------------------------
// MiddlewareChain — beforeModel message threading
// ---------------------------------------------------------------------------

describe("MiddlewareChain — beforeModel message threading", () => {
  it("allows a middleware to modify messages for subsequent middleware", async () => {
    const extra: ModelMessage = { role: "system", content: "injected" };

    const injector: ResearchMiddleware = {
      id: "injector",
      beforeModel: async (_ctx, messages) => [extra, ...messages],
    };

    const spy = vi.fn(async (_ctx: MiddlewareContext, messages: ModelMessage[]) => messages);
    const observer: ResearchMiddleware = { id: "observer", beforeModel: spy };

    const chain = new MiddlewareChain([injector, observer]);
    const result = await chain.beforeModel(makeCtx(), baseMessages);

    expect(result).toEqual([extra, ...baseMessages]);
    expect(spy).toHaveBeenCalledWith(expect.anything(), [extra, ...baseMessages]);
  });

  it("returns original messages when no middleware modifies them", async () => {
    const passthrough = new PassthroughMiddleware();
    const chain = new MiddlewareChain([passthrough]);
    const result = await chain.beforeModel(makeCtx(), baseMessages);
    expect(result).toEqual(baseMessages);
  });
});

// ---------------------------------------------------------------------------
// MiddlewareChain — wrapToolCall onion composition
// ---------------------------------------------------------------------------

describe("MiddlewareChain — wrapToolCall onion composition", () => {
  it("composes wrapToolCall as an onion (outer wraps inner)", async () => {
    const order: string[] = [];

    const outer: ResearchMiddleware = {
      id: "outer",
      async wrapToolCall(_ctx, _name, args, execute) {
        order.push("outer-before");
        const result = await execute(args);
        order.push("outer-after");
        return result;
      },
    };

    const inner: ResearchMiddleware = {
      id: "inner",
      async wrapToolCall(_ctx, _name, args, execute) {
        order.push("inner-before");
        const result = await execute(args);
        order.push("inner-after");
        return result;
      },
    };

    const realExecute: ToolExecutor = vi.fn().mockResolvedValue("real-result");

    const chain = new MiddlewareChain([outer, inner]);
    const result = await chain.wrapToolCall(makeCtx(), "myTool", {}, realExecute);

    expect(order).toEqual(["outer-before", "inner-before", "inner-after", "outer-after"]);
    expect(result).toBe("real-result");
    expect(realExecute).toHaveBeenCalledTimes(1);
  });

  it("allows middleware to short-circuit tool execution", async () => {
    const short: ResearchMiddleware = {
      id: "short",
      async wrapToolCall() {
        return "mocked-result";
      },
    };

    const execute: ToolExecutor = vi.fn();
    const chain = new MiddlewareChain([short]);
    const result = await chain.wrapToolCall(makeCtx(), "myTool", {}, execute);

    expect(result).toBe("mocked-result");
    expect(execute).not.toHaveBeenCalled();
  });

  it("passes args to the real executor when no middleware implements wrapToolCall", async () => {
    const noWrap: ResearchMiddleware = { id: "no-wrap" };
    const execute: ToolExecutor = vi.fn().mockResolvedValue("real");
    const chain = new MiddlewareChain([noWrap]);
    const result = await chain.wrapToolCall(makeCtx(), "t", { x: 1 }, execute);
    expect(result).toBe("real");
    expect(execute).toHaveBeenCalledWith({ x: 1 });
  });
});

// ---------------------------------------------------------------------------
// MiddlewareRegistry — enable/disable
// ---------------------------------------------------------------------------

describe("MiddlewareRegistry", () => {
  function makeEntry(id: string, enabled = true): MiddlewareRegistryEntry {
    return { id, enabled, middleware: { id } };
  }

  it("loads entries from config", () => {
    const registry = new MiddlewareRegistry({
      entries: [makeEntry("a"), makeEntry("b")],
    });
    expect(registry.getAll()).toHaveLength(2);
  });

  it("returns only enabled middleware from getEnabled()", () => {
    const registry = new MiddlewareRegistry({
      entries: [makeEntry("a", true), makeEntry("b", false)],
    });
    const enabled = registry.getEnabled();
    expect(enabled).toHaveLength(1);
    expect(enabled[0].id).toBe("a");
  });

  it("enable() activates a disabled middleware", () => {
    const registry = new MiddlewareRegistry({
      entries: [makeEntry("a", false)],
    });
    registry.enable("a");
    expect(registry.isEnabled("a")).toBe(true);
  });

  it("disable() deactivates an enabled middleware", () => {
    const registry = new MiddlewareRegistry({
      entries: [makeEntry("a", true)],
    });
    registry.disable("a");
    expect(registry.isEnabled("a")).toBe(false);
  });

  it("enable() throws for unknown id", () => {
    const registry = new MiddlewareRegistry();
    expect(() => registry.enable("unknown")).toThrow(/unknown/);
  });

  it("disable() throws for unknown id", () => {
    const registry = new MiddlewareRegistry();
    expect(() => registry.disable("unknown")).toThrow(/unknown/);
  });

  it("register() adds a new entry", () => {
    const registry = new MiddlewareRegistry();
    registry.register(makeEntry("new"));
    expect(registry.has("new")).toBe(true);
  });

  it("register() replaces an existing entry with the same id", () => {
    const registry = new MiddlewareRegistry({
      entries: [makeEntry("a", true)],
    });
    registry.register(makeEntry("a", false));
    expect(registry.isEnabled("a")).toBe(false);
    expect(registry.getAll()).toHaveLength(1);
  });

  it("unregister() removes a middleware", () => {
    const registry = new MiddlewareRegistry({
      entries: [makeEntry("a")],
    });
    registry.unregister("a");
    expect(registry.has("a")).toBe(false);
  });

  it("buildChain() returns a MiddlewareChain with only enabled entries", async () => {
    const order: string[] = [];
    const mwA: ResearchMiddleware = {
      id: "a",
      async beforeAgent() { order.push("a"); },
    };
    const mwB: ResearchMiddleware = {
      id: "b",
      async beforeAgent() { order.push("b"); },
    };

    const registry = new MiddlewareRegistry({
      entries: [
        { id: "a", enabled: true, middleware: mwA },
        { id: "b", enabled: false, middleware: mwB },
      ],
    });

    const chain = registry.buildChain();
    await chain.beforeAgent(makeCtx());
    expect(order).toEqual(["a"]);
  });

  it("initialises without config (empty registry)", () => {
    const registry = new MiddlewareRegistry();
    expect(registry.getAll()).toHaveLength(0);
    expect(registry.getEnabled()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// MiddlewareContext state passing
// ---------------------------------------------------------------------------

describe("MiddlewareContext state passing", () => {
  it("middleware can write to ctx.state and subsequent middleware can read it", async () => {
    const writer: ResearchMiddleware = {
      id: "writer",
      async beforeAgent(ctx) {
        ctx.state.plan = "research-plan-value";
      },
    };

    let readValue: unknown;
    const reader: ResearchMiddleware = {
      id: "reader",
      async beforeAgent(ctx) {
        readValue = ctx.state.plan;
      },
    };

    const chain = new MiddlewareChain([writer, reader]);
    await chain.beforeAgent(makeCtx());
    expect(readValue).toBe("research-plan-value");
  });
});
