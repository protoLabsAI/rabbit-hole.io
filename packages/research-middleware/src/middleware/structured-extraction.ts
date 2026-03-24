/**
 * StructuredExtractionMiddleware — extracts entities and relationships from agent research.
 *
 * Fires in `afterAgent` after streamText completes. Uses the FULL research context
 * (all tool results accumulated during the session + final answer text) to extract
 * structured entities and relationships in RabbitHoleBundleData-compatible format.
 *
 * Key difference from /api/chat/ingest: this middleware has access to ALL tool
 * results from ALL search steps, not just the final answer text. The resulting
 * extraction is substantially higher quality.
 *
 * The extraction is stored in `ctx.state.extractionPreview` as an `ExtractionPreview`
 * object. The frontend reads this from the data stream and renders an "Add to Graph"
 * preview card — the user must explicitly confirm before any ingestion occurs.
 *
 * Extraction LLM call is tracked as a Langfuse generation with:
 *  - entityCount, relationshipCount, confidence — for quality evaluation
 *  - toolResultCount — context volume metric
 *
 * Hook order: wrapToolCall (accumulate) → afterAgent (extract + store)
 */

import { generateText } from "ai";

import { getAIModel } from "@proto/llm-providers/server";

import type {
  AgentResult,
  MiddlewareContext,
  ResearchMiddleware,
  ToolExecutor,
} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single accumulated tool execution record. */
export interface ToolCallRecord {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

/** An extracted entity in RabbitHoleBundleData-compatible format. */
export interface ExtractedEntity {
  /** UID in `{type}:{snake_case_name}` format, e.g. `person:nicole_forsgren`. */
  uid: string;
  /** Entity type: person, organization, concept, place, event, technology, product. */
  type: string;
  /** Human-readable display name. */
  name: string;
  aliases?: string[];
  properties?: Record<string, unknown>;
}

/** An extracted relationship in RabbitHoleBundleData-compatible format. */
export interface ExtractedRelationship {
  /** UID in `rel:...` format, e.g. `rel:person_a__WORKS_AT__org_b`. */
  uid: string;
  /** One of: RELATED_TO, AUTHORED, FOUNDED, WORKS_AT, PART_OF. */
  type: string;
  /** Source entity UID. */
  source: string;
  /** Target entity UID. */
  target: string;
  confidence?: number;
}

/**
 * The structured extraction output stored in `ctx.state.extractionPreview`.
 * Structurally compatible with RabbitHoleBundleData (entities + relationships +
 * evidence + citations fields).
 */
export interface ExtractionPreview {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  /** Evidence strings (excerpts supporting the entities/relationships). */
  evidence: string[];
  /** Source URLs from web search results. */
  citations: string[];
  /** Overall extraction confidence in [0, 1]. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum final answer length to attempt extraction (skip trivial responses). */
const MIN_TEXT_LENGTH = 100;

/**
 * Per-tool-result character budget for context building.
 * Prevents runaway context from large Wikipedia articles or long graph results.
 */
const MAX_CHARS_PER_TOOL_RESULT = 2000;

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

function getOrInitToolResults(ctx: MiddlewareContext): ToolCallRecord[] {
  if (!ctx.state["toolResults"]) {
    ctx.state["toolResults"] = [] as ToolCallRecord[];
  }
  return ctx.state["toolResults"] as ToolCallRecord[];
}

// ---------------------------------------------------------------------------
// Context builders
// ---------------------------------------------------------------------------

/**
 * Builds a rich research context string from the agent's final answer and all
 * accumulated tool results. This is the key advantage over the naive approach
 * of extracting only from the final text — all raw search data is included.
 */
export function buildExtractionContext(
  finalText: string,
  toolResults: ToolCallRecord[]
): string {
  const parts: string[] = [];

  if (toolResults.length > 0) {
    parts.push("## Research Context (Tool Results)\n");
    for (const { toolName, args, result } of toolResults) {
      const query =
        typeof (args as Record<string, unknown>)["query"] === "string"
          ? (args as Record<string, unknown>)["query"]
          : "";
      parts.push(
        `### ${toolName}${query ? ` (query: "${query}")` : ""}`
      );
      // Cap each tool result to avoid oversized prompts.
      const serialised = JSON.stringify(result, null, 2);
      parts.push(serialised.slice(0, MAX_CHARS_PER_TOOL_RESULT));
    }
    parts.push("");
  }

  parts.push("## Final Answer");
  parts.push(finalText);

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

/**
 * Builds the extraction prompt sent to the fast LLM.
 * Requests JSON output with entities, relationships, citations, and a confidence score.
 */
export function buildExtractionPrompt(context: string): string {
  return (
    `You are a knowledge graph extraction agent. Extract structured entities and relationships from the research content below.\n\n` +
    `${context}\n\n` +
    `## Instructions\n\n` +
    `Extract all notable entities (people, organizations, concepts, places, events, technologies) and their relationships.\n\n` +
    `Output ONLY valid JSON in this exact format:\n` +
    `{\n` +
    `  "entities": [\n` +
    `    { "uid": "person:name_in_snake_case", "type": "person", "name": "Full Name", "properties": {} }\n` +
    `  ],\n` +
    `  "relationships": [\n` +
    `    { "uid": "rel:source_uid__TYPE__target_uid", "type": "RELATED_TO", "source": "person:source_name", "target": "organization:target_name", "confidence": 0.9 }\n` +
    `  ],\n` +
    `  "citations": ["https://example.com/source1"],\n` +
    `  "confidence": 0.85\n` +
    `}\n\n` +
    `Rules:\n` +
    `- Entity UIDs: {type}:{snake_case_name} (e.g., "person:nicole_forsgren", "organization:google")\n` +
    `- Relationship UIDs: must start with "rel:" (e.g., "rel:person_a__WORKS_AT__org_b")\n` +
    `- Relationship types — use ONLY: RELATED_TO, AUTHORED, FOUNDED, WORKS_AT, PART_OF\n` +
    `- Entity types — use ONLY: person, organization, concept, place, event, technology, product\n` +
    `- confidence: float 0–1 representing overall extraction confidence\n` +
    `- Extract 3–15 entities and 2–10 relationships\n` +
    `- Only include well-supported facts from the research context\n` +
    `- citations: list of source URLs from web search results (empty array if none)`
  );
}

// ---------------------------------------------------------------------------
// Result parser
// ---------------------------------------------------------------------------

/**
 * Parses the LLM's text output into a structured `ExtractionPreview`.
 *
 * Handles common LLM quirks:
 *  - Markdown code fences (```json ... ```)
 *  - Leading/trailing prose before/after the JSON object
 *
 * Returns null if parsing fails or the output is missing required fields.
 */
export function parseExtractionResult(text: string): ExtractionPreview | null {
  // Strip markdown code fences if present.
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to find the first JSON object in the text.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const raw = parsed as Record<string, unknown>;

  const entities: ExtractedEntity[] = (
    Array.isArray(raw["entities"]) ? (raw["entities"] as unknown[]) : []
  )
    .filter(
      (e): e is Record<string, unknown> =>
        typeof e === "object" &&
        e !== null &&
        !Array.isArray(e) &&
        typeof (e as Record<string, unknown>)["uid"] === "string" &&
        typeof (e as Record<string, unknown>)["type"] === "string" &&
        typeof (e as Record<string, unknown>)["name"] === "string"
    )
    .map((e) => ({
      uid: e["uid"] as string,
      type: e["type"] as string,
      name: e["name"] as string,
      aliases: Array.isArray(e["aliases"])
        ? (e["aliases"] as unknown[]).map(String)
        : undefined,
      properties:
        typeof e["properties"] === "object" && e["properties"] !== null
          ? (e["properties"] as Record<string, unknown>)
          : {},
    }));

  const relationships: ExtractedRelationship[] = (
    Array.isArray(raw["relationships"]) ? (raw["relationships"] as unknown[]) : []
  )
    .filter(
      (r): r is Record<string, unknown> =>
        typeof r === "object" &&
        r !== null &&
        !Array.isArray(r) &&
        typeof (r as Record<string, unknown>)["uid"] === "string" &&
        typeof (r as Record<string, unknown>)["type"] === "string" &&
        typeof (r as Record<string, unknown>)["source"] === "string" &&
        typeof (r as Record<string, unknown>)["target"] === "string"
    )
    .map((r) => ({
      uid: r["uid"] as string,
      type: r["type"] as string,
      source: r["source"] as string,
      target: r["target"] as string,
      confidence:
        typeof r["confidence"] === "number"
          ? Math.max(0, Math.min(1, r["confidence"] as number))
          : undefined,
    }));

  const citations: string[] = (
    Array.isArray(raw["citations"]) ? (raw["citations"] as unknown[]) : []
  ).map(String);

  const confidence =
    typeof raw["confidence"] === "number"
      ? Math.max(0, Math.min(1, raw["confidence"] as number))
      : 0.7;

  if (entities.length === 0) return null;

  return {
    entities,
    relationships,
    evidence: citations, // Citations double as evidence references.
    citations,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export class StructuredExtractionMiddleware implements ResearchMiddleware {
  readonly id = "structured-extraction";

  // -------------------------------------------------------------------------
  // wrapToolCall — accumulate tool results for full-context extraction
  // -------------------------------------------------------------------------

  /**
   * Executes the tool then stores its result in `ctx.state.toolResults`.
   * All tool results are available to `afterAgent` for the extraction LLM call.
   */
  async wrapToolCall(
    ctx: MiddlewareContext,
    toolName: string,
    args: Record<string, unknown>,
    execute: ToolExecutor
  ): Promise<unknown> {
    const result = await execute(args);
    const toolResults = getOrInitToolResults(ctx);
    toolResults.push({ toolName, args, result });
    return result;
  }

  // -------------------------------------------------------------------------
  // afterAgent — extract entities/relationships from full research context
  // -------------------------------------------------------------------------

  /**
   * Fires after the agent loop completes.
   *
   * Builds a rich context from the final answer + all tool results, then
   * makes a fast LLM call to extract entities and relationships. Stores the
   * result in `ctx.state.extractionPreview` for the frontend to preview.
   *
   * Extraction failures are swallowed — they must never interrupt the user flow.
   * The extraction LLM call is tracked as a Langfuse generation with
   * entity count, relationship count, and confidence as quality metadata.
   */
  async afterAgent(
    ctx: MiddlewareContext,
    result: AgentResult
  ): Promise<void> {
    const finalText = result.text ?? "";
    if (finalText.length < MIN_TEXT_LENGTH) return;

    const toolResults = getOrInitToolResults(ctx);
    const context = buildExtractionContext(finalText, toolResults);
    const prompt = buildExtractionPrompt(context);

    let extractionText: string;
    let tokenUsage: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    } = {};

    try {
      const model = getAIModel("fast");
      const llmResult = await generateText({ model, prompt });
      extractionText = llmResult.text;

      const inputTokens = llmResult.usage?.inputTokens;
      const outputTokens = llmResult.usage?.outputTokens;
      tokenUsage = {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens:
          inputTokens !== undefined && outputTokens !== undefined
            ? inputTokens + outputTokens
            : undefined,
      };
    } catch (err) {
      // Extraction failures must not affect the user-visible agent flow.
      void err;
      return;
    }

    const preview = parseExtractionResult(extractionText);
    if (!preview) return;

    // Track as Langfuse generation — entity/rel/confidence metadata builds
    // an evaluation dataset for extraction quality tuning over time.
    const generation = ctx.tracing.createGeneration(
      "structured-extraction",
      "fast",
      prompt,
      {
        entityCount: preview.entities.length,
        relationshipCount: preview.relationships.length,
        confidence: preview.confidence,
        toolResultCount: toolResults.length,
      }
    );
    generation.end(extractionText, tokenUsage);

    ctx.state["extractionPreview"] = preview;
  }
}
