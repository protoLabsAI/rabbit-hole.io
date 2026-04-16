/**
 * Unit tests for StructuredExtractionMiddleware.
 *
 * Coverage:
 *  - Tool result accumulation via wrapToolCall
 *  - Extraction context building (final text + tool results)
 *  - Prompt construction includes research context and instructions
 *  - JSON parsing: clean JSON, markdown-fenced JSON, prose-wrapped JSON
 *  - JSON parsing edge cases: missing fields, empty entities, invalid JSON
 *  - afterAgent: LLM call made, preview stored in ctx.state
 *  - afterAgent: skips extraction when final text is too short
 *  - afterAgent: Langfuse generation created with entity/rel/confidence metadata
 *  - afterAgent: extraction errors are swallowed (agent flow unaffected)
 *  - RabbitHoleBundleData-compatible field validation
 */

import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAIModel } from "@protolabsai/llm-providers/server";

import type { AgentResult, MiddlewareContext } from "../types";

// ---------------------------------------------------------------------------
// Mocks — hoisted by vitest regardless of position in file
// ---------------------------------------------------------------------------

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@protolabsai/llm-providers/server", () => ({
  getAIModel: vi.fn(() => "mock-model"),
}));

import {
  StructuredExtractionMiddleware,
  buildExtractionContext,
  buildExtractionPrompt,
  parseExtractionResult,
  type ExtractionPreview,
  type ToolCallRecord,
} from "./structured-extraction";

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

/** Returns a minimal execute stub. */
function makeExecute(result: unknown = { title: "Test", text: "content" }) {
  return vi.fn().mockResolvedValue(result);
}

/** A valid extraction JSON payload for testing. */
const VALID_EXTRACTION_JSON = JSON.stringify({
  entities: [
    {
      uid: "person:nicole_forsgren",
      type: "person",
      name: "Nicole Forsgren",
      properties: { role: "researcher" },
    },
    {
      uid: "organization:dora",
      type: "organization",
      name: "DORA",
      properties: {},
    },
    {
      uid: "concept:devops",
      type: "concept",
      name: "DevOps",
      properties: {},
    },
  ],
  relationships: [
    {
      uid: "rel:person_forsgren__AUTHORED__concept_devops",
      type: "AUTHORED",
      source: "person:nicole_forsgren",
      target: "concept:devops",
      confidence: 0.95,
    },
    {
      uid: "rel:person_forsgren__WORKS_AT__org_dora",
      type: "WORKS_AT",
      source: "person:nicole_forsgren",
      target: "organization:dora",
      confidence: 0.9,
    },
  ],
  citations: ["https://dora.dev/research"],
  confidence: 0.88,
});

// ---------------------------------------------------------------------------
// buildExtractionContext
// ---------------------------------------------------------------------------

describe("buildExtractionContext", () => {
  it("includes final text in the context", () => {
    const text = "DevOps research findings from Nicole Forsgren.";
    const ctx = buildExtractionContext(text, []);
    expect(ctx).toContain("DevOps research findings from Nicole Forsgren.");
    expect(ctx).toContain("## Final Answer");
  });

  it("includes tool results with tool names and queries", () => {
    const toolResults: ToolCallRecord[] = [
      {
        toolName: "searchWeb",
        args: { query: "Nicole Forsgren DORA" },
        result: {
          results: [{ title: "DORA Research", url: "https://dora.dev" }],
        },
      },
    ];
    const ctx = buildExtractionContext("answer text", toolResults);
    expect(ctx).toContain("searchWeb");
    expect(ctx).toContain("Nicole Forsgren DORA");
    expect(ctx).toContain("DORA Research");
  });

  it("handles empty tool results gracefully", () => {
    const ctx = buildExtractionContext("answer text", []);
    expect(ctx).toContain("## Final Answer");
    expect(ctx).not.toContain("## Research Context");
  });

  it("truncates oversized tool results to prevent runaway context", () => {
    const bigResult = "x".repeat(10000);
    const toolResults: ToolCallRecord[] = [
      { toolName: "searchWikipedia", args: {}, result: bigResult },
    ];
    const ctx = buildExtractionContext("answer", toolResults);
    // Context must not include the full 10 000 chars
    expect(ctx.length).toBeLessThan(bigResult.length);
  });

  it("includes query for tool results with query arg", () => {
    const toolResults: ToolCallRecord[] = [
      {
        toolName: "searchGraph",
        args: { query: "devops metrics" },
        result: [{ name: "DORA", uid: "org:dora", type: "organization" }],
      },
    ];
    const ctx = buildExtractionContext("answer", toolResults);
    expect(ctx).toContain('query: "devops metrics"');
  });
});

// ---------------------------------------------------------------------------
// buildExtractionPrompt
// ---------------------------------------------------------------------------

describe("buildExtractionPrompt", () => {
  it("includes the context in the prompt", () => {
    const context = "Research context about DevOps.";
    const prompt = buildExtractionPrompt(context);
    expect(prompt).toContain(context);
  });

  it("lists allowed relationship types", () => {
    const prompt = buildExtractionPrompt("context");
    expect(prompt).toContain("RELATED_TO");
    expect(prompt).toContain("AUTHORED");
    expect(prompt).toContain("FOUNDED");
    expect(prompt).toContain("WORKS_AT");
    expect(prompt).toContain("PART_OF");
  });

  it("specifies the entity UID format", () => {
    const prompt = buildExtractionPrompt("context");
    expect(prompt).toContain("{type}:{snake_case_name}");
    expect(prompt).toContain("person:nicole_forsgren");
  });

  it("specifies that relationship UIDs must start with rel:", () => {
    const prompt = buildExtractionPrompt("context");
    expect(prompt).toContain('must start with "rel:"');
  });

  it("requests JSON-only output", () => {
    const prompt = buildExtractionPrompt("context");
    expect(prompt).toContain("Output ONLY valid JSON");
  });
});

// ---------------------------------------------------------------------------
// parseExtractionResult
// ---------------------------------------------------------------------------

describe("parseExtractionResult", () => {
  it("parses clean JSON output", () => {
    const preview = parseExtractionResult(VALID_EXTRACTION_JSON);
    expect(preview).not.toBeNull();
    expect(preview!.entities).toHaveLength(3);
    expect(preview!.relationships).toHaveLength(2);
    expect(preview!.confidence).toBe(0.88);
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const fenced = "```json\n" + VALID_EXTRACTION_JSON + "\n```";
    const preview = parseExtractionResult(fenced);
    expect(preview).not.toBeNull();
    expect(preview!.entities).toHaveLength(3);
  });

  it("parses JSON wrapped in plain code fences (no language tag)", () => {
    const fenced = "```\n" + VALID_EXTRACTION_JSON + "\n```";
    const preview = parseExtractionResult(fenced);
    expect(preview).not.toBeNull();
    expect(preview!.entities).toHaveLength(3);
  });

  it("extracts JSON embedded in prose", () => {
    const prose =
      "Here is the extraction:\n" +
      VALID_EXTRACTION_JSON +
      "\nHope that helps.";
    const preview = parseExtractionResult(prose);
    expect(preview).not.toBeNull();
    expect(preview!.entities).toHaveLength(3);
  });

  it("returns null for completely invalid JSON", () => {
    expect(parseExtractionResult("not json at all")).toBeNull();
  });

  it("returns null when entities array is empty", () => {
    const empty = JSON.stringify({
      entities: [],
      relationships: [],
      confidence: 0.5,
    });
    expect(parseExtractionResult(empty)).toBeNull();
  });

  it("filters out entities missing required fields", () => {
    const partial = JSON.stringify({
      entities: [
        { uid: "person:a", type: "person", name: "Valid" },
        { uid: "broken" /* no type or name */ },
        { type: "organization", name: "No UID" },
      ],
      relationships: [],
      confidence: 0.5,
    });
    const preview = parseExtractionResult(partial);
    // Only the valid entity passes
    expect(preview!.entities).toHaveLength(1);
    expect(preview!.entities[0]!.name).toBe("Valid");
  });

  it("filters out relationships missing required fields", () => {
    const partial = JSON.stringify({
      entities: [{ uid: "person:a", type: "person", name: "A" }],
      relationships: [
        {
          uid: "rel:a__RELATED_TO__b",
          type: "RELATED_TO",
          source: "person:a",
          target: "concept:b",
          confidence: 0.8,
        },
        { uid: "rel:bad", type: "RELATED_TO" /* no source/target */ },
      ],
      confidence: 0.5,
    });
    const preview = parseExtractionResult(partial);
    expect(preview!.relationships).toHaveLength(1);
    expect(preview!.relationships[0]!.uid).toBe("rel:a__RELATED_TO__b");
  });

  it("clamps confidence values to [0, 1]", () => {
    const out_of_range = JSON.stringify({
      entities: [{ uid: "person:a", type: "person", name: "A" }],
      relationships: [],
      confidence: 1.5,
    });
    expect(parseExtractionResult(out_of_range)!.confidence).toBe(1);
  });

  it("defaults confidence to 0.7 when missing", () => {
    const no_confidence = JSON.stringify({
      entities: [{ uid: "person:a", type: "person", name: "A" }],
      relationships: [],
    });
    expect(parseExtractionResult(no_confidence)!.confidence).toBe(0.7);
  });

  it("maps citations to evidence field", () => {
    const preview = parseExtractionResult(VALID_EXTRACTION_JSON);
    expect(preview!.citations).toEqual(["https://dora.dev/research"]);
    expect(preview!.evidence).toEqual(["https://dora.dev/research"]);
  });

  it("produces entities with RabbitHoleBundleData-compatible fields", () => {
    const preview = parseExtractionResult(VALID_EXTRACTION_JSON)!;
    const entity = preview.entities[0]!;
    // Must have uid, type, name — core EntitySchema fields
    expect(entity).toHaveProperty("uid");
    expect(entity).toHaveProperty("type");
    expect(entity).toHaveProperty("name");
    // uid follows {type}:{name} convention
    expect(entity.uid).toMatch(/^[a-z]+:/);
  });

  it("produces relationships with RabbitHoleBundleData-compatible fields", () => {
    const preview = parseExtractionResult(VALID_EXTRACTION_JSON)!;
    const rel = preview.relationships[0]!;
    // Must have uid, type, source, target — core RelationshipSchema fields
    expect(rel).toHaveProperty("uid");
    expect(rel).toHaveProperty("type");
    expect(rel).toHaveProperty("source");
    expect(rel).toHaveProperty("target");
    // uid must start with "rel:"
    expect(rel.uid).toMatch(/^rel:/);
  });
});

// ---------------------------------------------------------------------------
// StructuredExtractionMiddleware — wrapToolCall
// ---------------------------------------------------------------------------

describe("StructuredExtractionMiddleware — wrapToolCall", () => {
  let middleware: StructuredExtractionMiddleware;
  let ctx: MiddlewareContext;

  beforeEach(() => {
    middleware = new StructuredExtractionMiddleware();
    ctx = makeCtx();
  });

  it("executes the tool and returns its result", async () => {
    const execute = makeExecute({ results: [{ title: "Test" }] });
    const result = await middleware.wrapToolCall(
      ctx,
      "searchWeb",
      { query: "test" },
      execute
    );
    expect(execute).toHaveBeenCalledWith({ query: "test" });
    expect(result).toEqual({ results: [{ title: "Test" }] });
  });

  it("accumulates tool results in ctx.state.toolResults", async () => {
    const execute1 = makeExecute([{ name: "Entity A" }]);
    const execute2 = makeExecute({ results: [{ title: "Web Result" }] });

    await middleware.wrapToolCall(ctx, "searchGraph", { query: "a" }, execute1);
    await middleware.wrapToolCall(ctx, "searchWeb", { query: "b" }, execute2);

    const toolResults = ctx.state["toolResults"] as ToolCallRecord[];
    expect(toolResults).toHaveLength(2);
    expect(toolResults[0]!.toolName).toBe("searchGraph");
    expect(toolResults[1]!.toolName).toBe("searchWeb");
  });

  it("stores tool name, args, and result in each record", async () => {
    const execute = makeExecute({ title: "Wikipedia Article" });
    await middleware.wrapToolCall(
      ctx,
      "searchWikipedia",
      { query: "DevOps" },
      execute
    );

    const toolResults = ctx.state["toolResults"] as ToolCallRecord[];
    const record = toolResults[0]!;
    expect(record.toolName).toBe("searchWikipedia");
    expect(record.args).toEqual({ query: "DevOps" });
    expect(record.result).toEqual({ title: "Wikipedia Article" });
  });
});

// ---------------------------------------------------------------------------
// StructuredExtractionMiddleware — afterAgent
// ---------------------------------------------------------------------------

describe("StructuredExtractionMiddleware — afterAgent", () => {
  let middleware: StructuredExtractionMiddleware;
  let ctx: MiddlewareContext;

  beforeEach(() => {
    vi.clearAllMocks();
    getAIModelMock.mockReturnValue("mock-model");
    generateTextMock.mockResolvedValue({
      text: VALID_EXTRACTION_JSON,
      usage: { inputTokens: 500, outputTokens: 200 },
    });
    middleware = new StructuredExtractionMiddleware();
    ctx = makeCtx();
  });

  it("stores extraction preview in ctx.state.extractionPreview", async () => {
    const result: AgentResult = {
      text: "DevOps is a set of practices that combines software development (Dev) and IT operations (Ops). ".repeat(
        5
      ),
    };
    await middleware.afterAgent(ctx, result);

    const preview = ctx.state["extractionPreview"] as ExtractionPreview;
    expect(preview).toBeDefined();
    expect(preview.entities).toHaveLength(3);
    expect(preview.relationships).toHaveLength(2);
    expect(preview.confidence).toBe(0.88);
  });

  it("skips extraction when final text is too short", async () => {
    const result: AgentResult = { text: "Short." };
    await middleware.afterAgent(ctx, result);

    expect(generateText).not.toHaveBeenCalled();
    expect(ctx.state["extractionPreview"]).toBeUndefined();
  });

  it("skips extraction when result text is undefined", async () => {
    const result: AgentResult = {};
    await middleware.afterAgent(ctx, result);

    expect(generateText).not.toHaveBeenCalled();
    expect(ctx.state["extractionPreview"]).toBeUndefined();
  });

  it("calls getAIModel with 'fast' for extraction", async () => {
    const result: AgentResult = { text: "Long enough text ".repeat(10) };
    await middleware.afterAgent(ctx, result);

    expect(getAIModel).toHaveBeenCalledWith("fast");
  });

  it("passes full context to generateText (final text + tool results)", async () => {
    // Pre-populate tool results via wrapToolCall
    const execute = makeExecute([
      { name: "DORA", uid: "org:dora", type: "organization" },
    ]);
    await middleware.wrapToolCall(
      ctx,
      "searchGraph",
      { query: "DORA" },
      execute
    );

    const result: AgentResult = {
      text: "The DORA research program measures DevOps performance. ".repeat(5),
    };
    await middleware.afterAgent(ctx, result);

    const callArgs = generateTextMock.mock.calls[0][0];
    expect(callArgs.prompt).toContain("searchGraph");
    expect(callArgs.prompt).toContain("DORA");
    expect(callArgs.prompt).toContain("DevOps performance");
  });

  it("creates a Langfuse generation with entity/relationship/confidence metadata", async () => {
    const result: AgentResult = { text: "DevOps research ".repeat(10) };
    await middleware.afterAgent(ctx, result);

    expect(ctx.tracing.createGeneration).toHaveBeenCalledWith(
      "structured-extraction",
      "fast",
      expect.any(String),
      expect.objectContaining({
        entityCount: 3,
        relationshipCount: 2,
        confidence: 0.88,
        toolResultCount: 0,
      })
    );
  });

  it("ends the Langfuse generation with output and token usage", async () => {
    const result: AgentResult = { text: "DevOps research ".repeat(10) };
    await middleware.afterAgent(ctx, result);

    const generationHandle = (
      ctx.tracing.createGeneration as ReturnType<typeof vi.fn>
    ).mock.results[0]!.value;
    expect(generationHandle.end).toHaveBeenCalledWith(
      VALID_EXTRACTION_JSON,
      expect.objectContaining({
        promptTokens: 500,
        completionTokens: 200,
        totalTokens: 700,
      })
    );
  });

  it("includes toolResultCount in generation metadata", async () => {
    // Add tool results to state
    const execute = makeExecute([]);
    await middleware.wrapToolCall(ctx, "searchWeb", { query: "q" }, execute);
    await middleware.wrapToolCall(
      ctx,
      "searchWikipedia",
      { query: "w" },
      execute
    );

    const result: AgentResult = { text: "DevOps research ".repeat(10) };
    await middleware.afterAgent(ctx, result);

    expect(ctx.tracing.createGeneration).toHaveBeenCalledWith(
      "structured-extraction",
      "fast",
      expect.any(String),
      expect.objectContaining({ toolResultCount: 2 })
    );
  });

  it("swallows LLM errors without affecting agent flow", async () => {
    generateTextMock.mockRejectedValue(new Error("LLM unavailable"));
    const result: AgentResult = { text: "DevOps research ".repeat(10) };

    // Should not throw
    await expect(middleware.afterAgent(ctx, result)).resolves.toBeUndefined();
    expect(ctx.state["extractionPreview"]).toBeUndefined();
  });

  it("does not store preview when LLM returns unparseable output", async () => {
    generateTextMock.mockResolvedValue({
      text: "I cannot extract any entities from this content.",
      usage: { inputTokens: 100, outputTokens: 50 },
    });
    const result: AgentResult = { text: "DevOps research ".repeat(10) };
    await middleware.afterAgent(ctx, result);

    expect(ctx.state["extractionPreview"]).toBeUndefined();
  });

  it("does not auto-ingest — only stores preview for user confirmation", async () => {
    const result: AgentResult = { text: "DevOps research ".repeat(10) };
    await middleware.afterAgent(ctx, result);

    // Only ctx.state should be written — no external calls other than the LLM
    expect(generateText).toHaveBeenCalledTimes(1);
    // No database calls, no ingest calls
  });
});
