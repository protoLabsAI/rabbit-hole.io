/**
 * Unit tests for EntityMemoryMiddleware.
 *
 * Covers:
 *  1. Prior knowledge injection — entities found in Neo4j are stored in ctx.state
 *  2. Staleness detection — entities with updatedAt > 30 days flagged as stale
 *  3. Update flagging in afterAgent — entities mentioned in agent output flagged
 *  4. Empty/no results case — priorKnowledge.entities is empty
 *  5. Neo4j error handling — should not throw, pipeline continues
 *  6. Langfuse span tracking — latency and hit/miss counts
 *  7. Missing query — beforeAgent is a no-op when ctx.state.query is absent
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { createTracingContext } from "../tracing";
import type { AgentResult, MiddlewareContext } from "../types";

import {
  EntityMemoryMiddleware,
  buildLuceneQuery,
  isStale,
  type PriorKnowledge,
} from "./entity-memory";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock @proto/database so tests never touch a real Neo4j instance.
vi.mock("@proto/database", () => ({
  getGlobalNeo4jClient: vi.fn(),
}));

import { getGlobalNeo4jClient } from "@proto/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(stateOverrides?: Record<string, unknown>): MiddlewareContext {
  return {
    agentId: "test-agent",
    state: { ...stateOverrides },
    tracing: createTracingContext({ agentId: "test-agent" }),
  };
}

function makeAgentResult(text?: string): AgentResult {
  return { text, finishReason: "stop" };
}

/** Build a mock Neo4j record. */
function makeRecord(fields: {
  name: string;
  type: string;
  relationshipCount: number;
  updatedAt: string | null;
}) {
  return {
    get: (key: string) => {
      switch (key) {
        case "name":
          return fields.name;
        case "type":
          return fields.type;
        case "relationshipCount":
          return fields.relationshipCount;
        case "updatedAt":
          return fields.updatedAt;
        default:
          return null;
      }
    },
  };
}

/** Returns an ISO date string N days in the past. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Build a mock Neo4j client that returns given records. */
function mockNeo4jClient(records: ReturnType<typeof makeRecord>[]) {
  const mockClient = {
    executeRead: vi.fn().mockResolvedValue({ records }),
  };
  vi.mocked(getGlobalNeo4jClient).mockReturnValue(mockClient as any);
  return mockClient;
}

// ---------------------------------------------------------------------------
// Pure helper tests
// ---------------------------------------------------------------------------

describe("buildLuceneQuery", () => {
  it("adds a wildcard to the last token", () => {
    expect(buildLuceneQuery("trump")).toBe("trump*");
  });

  it("adds wildcard only to last token for multi-word query", () => {
    expect(buildLuceneQuery("donald trump")).toBe("donald trump*");
  });

  it("escapes Lucene special characters", () => {
    // colon is a special char
    expect(buildLuceneQuery("test:query")).toBe("test\\:query*");
  });

  it("returns empty string for empty/whitespace input", () => {
    expect(buildLuceneQuery("")).toBe("");
    expect(buildLuceneQuery("   ")).toBe("");
  });
});

describe("isStale", () => {
  it("returns true for null lastUpdated", () => {
    expect(isStale(null)).toBe(true);
  });

  it("returns true for invalid date string", () => {
    expect(isStale("not-a-date")).toBe(true);
  });

  it("returns true for a date 31 days ago", () => {
    expect(isStale(daysAgo(31))).toBe(true);
  });

  it("returns false for a date 29 days ago", () => {
    expect(isStale(daysAgo(29))).toBe(false);
  });

  it("returns false for a recent date (today)", () => {
    expect(isStale(new Date().toISOString())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EntityMemoryMiddleware
// ---------------------------------------------------------------------------

describe("EntityMemoryMiddleware", () => {
  let mw: EntityMemoryMiddleware;

  beforeEach(() => {
    mw = new EntityMemoryMiddleware();
    vi.clearAllMocks();
  });

  it("has the expected id", () => {
    expect(mw.id).toBe("entity-memory");
  });

  // -------------------------------------------------------------------------
  // beforeAgent — no-op cases
  // -------------------------------------------------------------------------

  it("is a no-op when ctx.state.query is not set", async () => {
    const ctx = makeCtx();
    await mw.beforeAgent(ctx);
    expect(ctx.state["priorKnowledge"]).toBeUndefined();
    expect(getGlobalNeo4jClient).not.toHaveBeenCalled();
  });

  it("is a no-op when ctx.state.query is an empty string", async () => {
    const ctx = makeCtx({ query: "   " });
    await mw.beforeAgent(ctx);
    expect(ctx.state["priorKnowledge"]).toBeUndefined();
    expect(getGlobalNeo4jClient).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Prior knowledge injection
  // -------------------------------------------------------------------------

  it("stores priorKnowledge in ctx.state when entities are found", async () => {
    const records = [
      makeRecord({
        name: "Donald Trump",
        type: "Person",
        relationshipCount: 42,
        updatedAt: daysAgo(5),
      }),
    ];
    mockNeo4jClient(records);

    const ctx = makeCtx({ query: "Donald Trump" });
    await mw.beforeAgent(ctx);

    const pk = ctx.state["priorKnowledge"] as PriorKnowledge;
    expect(pk).toBeDefined();
    expect(pk.entities).toHaveLength(1);
    expect(pk.entities[0]).toMatchObject({
      name: "Donald Trump",
      type: "Person",
      relationshipCount: 42,
    });
  });

  it("stores correct lastUpdated on entity", async () => {
    const updatedAt = daysAgo(10);
    mockNeo4jClient([
      makeRecord({
        name: "Entity A",
        type: "Organization",
        relationshipCount: 7,
        updatedAt,
      }),
    ]);

    const ctx = makeCtx({ query: "Entity A" });
    await mw.beforeAgent(ctx);

    const pk = ctx.state["priorKnowledge"] as PriorKnowledge;
    expect(pk.entities[0]!.lastUpdated).toBe(updatedAt);
  });

  // -------------------------------------------------------------------------
  // Staleness detection
  // -------------------------------------------------------------------------

  it("flags entities with updatedAt > 30 days as stale", async () => {
    const records = [
      makeRecord({
        name: "Old Entity",
        type: "Person",
        relationshipCount: 5,
        updatedAt: daysAgo(45),
      }),
      makeRecord({
        name: "Fresh Entity",
        type: "Person",
        relationshipCount: 3,
        updatedAt: daysAgo(10),
      }),
    ];
    mockNeo4jClient(records);

    const ctx = makeCtx({ query: "entity" });
    await mw.beforeAgent(ctx);

    const pk = ctx.state["priorKnowledge"] as PriorKnowledge;
    expect(pk.staleEntities).toContain("Old Entity");
    expect(pk.staleEntities).not.toContain("Fresh Entity");
  });

  it("flags entity with null updatedAt as stale", async () => {
    mockNeo4jClient([
      makeRecord({
        name: "No Date Entity",
        type: "Concept",
        relationshipCount: 0,
        updatedAt: null,
      }),
    ]);

    const ctx = makeCtx({ query: "concept" });
    await mw.beforeAgent(ctx);

    const pk = ctx.state["priorKnowledge"] as PriorKnowledge;
    expect(pk.staleEntities).toContain("No Date Entity");
  });

  it("produces empty staleEntities when all entities are fresh", async () => {
    mockNeo4jClient([
      makeRecord({
        name: "Recent Entity",
        type: "Event",
        relationshipCount: 2,
        updatedAt: daysAgo(1),
      }),
    ]);

    const ctx = makeCtx({ query: "event" });
    await mw.beforeAgent(ctx);

    const pk = ctx.state["priorKnowledge"] as PriorKnowledge;
    expect(pk.staleEntities).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Empty / no results
  // -------------------------------------------------------------------------

  it("stores empty priorKnowledge when Neo4j returns no records", async () => {
    mockNeo4jClient([]);

    const ctx = makeCtx({ query: "unknown entity xyz" });
    await mw.beforeAgent(ctx);

    const pk = ctx.state["priorKnowledge"] as PriorKnowledge;
    expect(pk.entities).toHaveLength(0);
    expect(pk.staleEntities).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Neo4j error handling
  // -------------------------------------------------------------------------

  it("does not throw when Neo4j client throws an error", async () => {
    const mockClient = {
      executeRead: vi.fn().mockRejectedValue(new Error("Neo4j connection refused")),
    };
    vi.mocked(getGlobalNeo4jClient).mockReturnValue(mockClient as any);

    const ctx = makeCtx({ query: "some query" });
    await expect(mw.beforeAgent(ctx)).resolves.toBeUndefined();
  });

  it("leaves priorKnowledge undefined when Neo4j errors", async () => {
    const mockClient = {
      executeRead: vi.fn().mockRejectedValue(new Error("timeout")),
    };
    vi.mocked(getGlobalNeo4jClient).mockReturnValue(mockClient as any);

    const ctx = makeCtx({ query: "some query" });
    await mw.beforeAgent(ctx);
    expect(ctx.state["priorKnowledge"]).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Langfuse span tracking
  // -------------------------------------------------------------------------

  it("creates a Langfuse span for the graph lookup", async () => {
    mockNeo4jClient([]);

    const ctx = makeCtx({ query: "test" });
    const createSpanSpy = vi.spyOn(ctx.tracing, "createSpan");

    await mw.beforeAgent(ctx);

    expect(createSpanSpy).toHaveBeenCalledOnce();
    expect(createSpanSpy).toHaveBeenCalledWith(
      "entity-memory:graph-lookup",
      expect.objectContaining({ query: "test" })
    );
  });

  it("ends the span with hit count when entities are found", async () => {
    mockNeo4jClient([
      makeRecord({
        name: "Hit Entity",
        type: "Person",
        relationshipCount: 1,
        updatedAt: daysAgo(5),
      }),
    ]);

    const ctx = makeCtx({ query: "hit" });
    const mockSpanHandle = { end: vi.fn() };
    vi.spyOn(ctx.tracing, "createSpan").mockReturnValue(mockSpanHandle);

    await mw.beforeAgent(ctx);

    expect(mockSpanHandle.end).toHaveBeenCalledOnce();
    const endArg = mockSpanHandle.end.mock.calls[0]![0] as Record<string, unknown>;
    expect(endArg).toMatchObject({ hitCount: 1, missCount: 0 });
    expect(typeof endArg["latencyMs"]).toBe("number");
  });

  it("ends the span with miss count when no entities found", async () => {
    mockNeo4jClient([]);

    const ctx = makeCtx({ query: "nothing" });
    const mockSpanHandle = { end: vi.fn() };
    vi.spyOn(ctx.tracing, "createSpan").mockReturnValue(mockSpanHandle);

    await mw.beforeAgent(ctx);

    expect(mockSpanHandle.end).toHaveBeenCalledOnce();
    const endArg = mockSpanHandle.end.mock.calls[0]![0] as Record<string, unknown>;
    expect(endArg).toMatchObject({ hitCount: 0, missCount: 1 });
  });

  it("ends the span with error info when Neo4j throws", async () => {
    const mockClient = {
      executeRead: vi.fn().mockRejectedValue(new Error("DB down")),
    };
    vi.mocked(getGlobalNeo4jClient).mockReturnValue(mockClient as any);

    const ctx = makeCtx({ query: "failing query" });
    const mockSpanHandle = { end: vi.fn() };
    vi.spyOn(ctx.tracing, "createSpan").mockReturnValue(mockSpanHandle);

    await mw.beforeAgent(ctx);

    expect(mockSpanHandle.end).toHaveBeenCalledOnce();
    const endArg = mockSpanHandle.end.mock.calls[0]![0] as Record<string, unknown>;
    expect(endArg["error"]).toContain("DB down");
  });

  // -------------------------------------------------------------------------
  // afterAgent — update flagging
  // -------------------------------------------------------------------------

  it("flags entities mentioned in agent output as needing update", async () => {
    const ctx = makeCtx();
    ctx.state["priorKnowledge"] = {
      entities: [
        { name: "Alice", type: "Person", relationshipCount: 3, lastUpdated: daysAgo(5) },
        { name: "Bob", type: "Person", relationshipCount: 1, lastUpdated: daysAgo(5) },
      ],
      staleEntities: [],
    } satisfies PriorKnowledge;

    const result = makeAgentResult(
      "Alice is a notable figure in this space. No mention of the other person."
    );
    await mw.afterAgent(ctx, result);

    const toUpdate = ctx.state["entitiesToUpdate"] as string[];
    expect(toUpdate).toContain("Alice");
    expect(toUpdate).not.toContain("Bob");
  });

  it("flags no entities when agent output is empty", async () => {
    const ctx = makeCtx();
    ctx.state["priorKnowledge"] = {
      entities: [
        { name: "Alice", type: "Person", relationshipCount: 3, lastUpdated: null },
      ],
      staleEntities: ["Alice"],
    } satisfies PriorKnowledge;

    await mw.afterAgent(ctx, makeAgentResult(""));

    expect(ctx.state["entitiesToUpdate"]).toBeUndefined();
  });

  it("is a no-op in afterAgent when priorKnowledge is absent", async () => {
    const ctx = makeCtx();
    await mw.afterAgent(ctx, makeAgentResult("some agent text"));
    expect(ctx.state["entitiesToUpdate"]).toBeUndefined();
  });

  it("flags all entities that appear in agent output (case-insensitive)", async () => {
    const ctx = makeCtx();
    ctx.state["priorKnowledge"] = {
      entities: [
        { name: "Tesla", type: "Organization", relationshipCount: 10, lastUpdated: daysAgo(5) },
        { name: "SpaceX", type: "Organization", relationshipCount: 8, lastUpdated: daysAgo(5) },
      ],
      staleEntities: [],
    } satisfies PriorKnowledge;

    const result = makeAgentResult(
      "TESLA has expanded its fleet. SPACEX launched another rocket."
    );
    await mw.afterAgent(ctx, result);

    const toUpdate = ctx.state["entitiesToUpdate"] as string[];
    expect(toUpdate).toContain("Tesla");
    expect(toUpdate).toContain("SpaceX");
  });
});
