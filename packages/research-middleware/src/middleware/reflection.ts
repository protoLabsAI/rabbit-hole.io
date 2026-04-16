/**
 * ReflectionMiddleware — evaluates accumulated evidence and guides the agent.
 *
 * Fires in `afterModel` after each LLM turn that produces tool calls. Tracks
 * evidence across tool executions (via `wrapToolCall`) and, after each turn,
 * makes a fast LLM call to evaluate evidence quality:
 *
 *  - If gaps are found and the step budget allows (step < 4): stores a
 *    gap-filling system message in `ctx.state.reflectionGuidance`.
 *  - If evidence is sufficient: stores a synthesis-encouragement message.
 *
 * The stored guidance is injected as a system message at the START of the
 * NEXT turn via `beforeModel`, so the agent receives it before it reasons
 * about its next step.
 *
 * Does NOT fire on the final step (step >= 4) to allow free synthesis.
 *
 * Evidence quality metrics (sourceCount, sourceDiversity, topicCoverage) are
 * attached as metadata to the Langfuse generation, creating an eval dataset
 * of evidence quality over time.
 */

import { generateText } from "ai";

import { getAIModel } from "@protolabsai/llm-providers/server";

import type {
  MiddlewareContext,
  ModelMessage,
  ModelResponse,
  ResearchMiddleware,
  ToolExecutor,
} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Recognised source types for evidence tracking. */
export type SourceType = "graph" | "web" | "wikipedia";

/** One entry per tool execution, stored in ctx.state.evidenceSources. */
export interface EvidenceSource {
  source: SourceType;
  resultCount: number;
}

/** Computed quality metrics derived from accumulated evidence sources. */
export interface EvidenceMetrics {
  /** Total number of tool executions tracked. */
  sourceCount: number;
  /** Number of distinct source types (graph / web / wikipedia). */
  sourceDiversity: number;
  /**
   * Composite coverage score in [0, 1].
   * Grows with both diversity and raw count, capped at 1.
   */
  topicCoverage: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Reflection does not fire on or after this step — let the agent synthesize. */
const MAX_STEPS = 4;

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

function getOrInitEvidenceSources(ctx: MiddlewareContext): EvidenceSource[] {
  if (!ctx.state["evidenceSources"]) {
    ctx.state["evidenceSources"] = [] as EvidenceSource[];
  }
  return ctx.state["evidenceSources"] as EvidenceSource[];
}

function getStepCount(ctx: MiddlewareContext): number {
  return (ctx.state["stepCount"] as number | undefined) ?? 0;
}

function incrementStepCount(ctx: MiddlewareContext): number {
  const next = getStepCount(ctx) + 1;
  ctx.state["stepCount"] = next;
  return next;
}

// ---------------------------------------------------------------------------
// Source detection
// ---------------------------------------------------------------------------

/**
 * Infers the source type for a tool call based on its name.
 *
 * Matching rules (first match wins):
 *  - "wikipedia" → wikipedia
 *  - "graph" or "neo4j" → graph
 *  - anything else → web
 */
export function detectSourceType(toolName: string): SourceType {
  const lower = toolName.toLowerCase();
  if (lower.includes("wikipedia")) return "wikipedia";
  if (lower.includes("graph") || lower.includes("neo4j")) return "graph";
  return "web";
}

// ---------------------------------------------------------------------------
// Metrics computation
// ---------------------------------------------------------------------------

/**
 * Computes evidence quality metrics from accumulated sources.
 *
 * topicCoverage formula:
 *   min(1, diversity/3 × 0.5  +  min(count, 6)/12)
 * Reaches 1 when all three source types are present (diversity = 3) and
 * at least 6 total tool calls have been made.
 */
export function computeMetrics(sources: EvidenceSource[]): EvidenceMetrics {
  const sourceCount = sources.length;
  const uniqueTypes = new Set(sources.map((s) => s.source));
  const sourceDiversity = uniqueTypes.size;
  const topicCoverage = Math.min(
    1,
    (sourceDiversity / 3) * 0.5 + Math.min(sourceCount, 6) / 12
  );
  return { sourceCount, sourceDiversity, topicCoverage };
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/** Builds the prompt sent to the fast LLM for evidence evaluation. */
export function buildReflectionPrompt(
  sources: EvidenceSource[],
  metrics: EvidenceMetrics,
  researchPlan?: string
): string {
  const sourceSummary =
    sources.length > 0
      ? sources.map((s) => `${s.source}: ${s.resultCount} result(s)`).join(", ")
      : "none";

  const planSection = researchPlan ? `\nResearch plan:\n${researchPlan}\n` : "";

  return (
    `You are evaluating evidence quality for a research task.` +
    planSection +
    `\nSources gathered so far: ${sourceSummary}` +
    `\nMetrics: ${metrics.sourceCount} sources, ${metrics.sourceDiversity} unique source type(s), coverage score ${metrics.topicCoverage.toFixed(2)}` +
    `\n\nAnalyze: Are there gaps in the evidence? What angles are not covered? Is the evidence sufficient to synthesize a good answer?` +
    `\nRespond with "GAPS:" followed by specific missing areas, or "SUFFICIENT" if the evidence is comprehensive.`
  );
}

// ---------------------------------------------------------------------------
// Reflection output parsing
// ---------------------------------------------------------------------------

/** Returns true when the reflection text signals evidence gaps. */
export function detectGaps(reflectionText: string): boolean {
  return /GAPS?:/i.test(reflectionText);
}

/**
 * Returns true when either the reflection text signals sufficiency or the
 * metrics exceed a heuristic threshold (diversity ≥ 2 and count ≥ 3).
 */
export function detectSufficiency(
  reflectionText: string,
  metrics: EvidenceMetrics
): boolean {
  return (
    /SUFFICIENT/i.test(reflectionText) ||
    (metrics.sourceDiversity >= 2 && metrics.sourceCount >= 3)
  );
}

// ---------------------------------------------------------------------------
// Guidance builders
// ---------------------------------------------------------------------------

/** Builds a gap-filling system message from the reflection output. */
export function buildGapFillingGuidance(
  reflectionText: string,
  metrics: EvidenceMetrics
): string {
  const gapsMatch = reflectionText.match(/GAPS?:\s*([\s\S]+?)(?:\n\n|$)/i);
  const gaps = gapsMatch
    ? gapsMatch[1].trim()
    : "additional sources and perspectives";

  return (
    `[Research Reflection] Evidence review: ${metrics.sourceCount} source(s) across ${metrics.sourceDiversity} source type(s). ` +
    `Gaps identified: ${gaps}. ` +
    `Please search for additional information to fill these gaps before synthesizing your answer.`
  );
}

/** Builds a synthesis-encouragement system message. */
export function buildSynthesisGuidance(metrics: EvidenceMetrics): string {
  return (
    `[Research Reflection] You have gathered sufficient evidence: ${metrics.sourceCount} source(s) across ${metrics.sourceDiversity} source type(s). ` +
    `The evidence base is comprehensive. Please synthesize a thorough, well-supported answer using the information you have gathered.`
  );
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export class ReflectionMiddleware implements ResearchMiddleware {
  readonly id = "reflection";

  // -------------------------------------------------------------------------
  // wrapToolCall — accumulate evidence as tools execute
  // -------------------------------------------------------------------------

  /**
   * Executes the tool then records its source type and result count in
   * `ctx.state.evidenceSources` for later reflection.
   */
  async wrapToolCall(
    ctx: MiddlewareContext,
    toolName: string,
    args: Record<string, unknown>,
    execute: ToolExecutor
  ): Promise<unknown> {
    const result = await execute(args);

    const sources = getOrInitEvidenceSources(ctx);
    const source = detectSourceType(toolName);

    // Estimate result count from the tool's return value.
    let resultCount = 1;
    if (Array.isArray(result)) {
      resultCount = result.length;
    } else if (
      result !== null &&
      typeof result === "object" &&
      "results" in result &&
      Array.isArray((result as { results: unknown }).results)
    ) {
      resultCount = (result as { results: unknown[] }).results.length;
    }

    sources.push({ source, resultCount });

    return result;
  }

  // -------------------------------------------------------------------------
  // afterModel — evaluate evidence and store guidance
  // -------------------------------------------------------------------------

  /**
   * Fires after each LLM turn.
   *
   * When the turn produced tool calls (i.e. evidence is actively being
   * gathered) and the step budget has not been exhausted, makes a fast LLM
   * reflection call to evaluate evidence quality and stores any resulting
   * guidance in `ctx.state.reflectionGuidance`.
   *
   * Reflection failures are swallowed — they must not interrupt the agent.
   */
  async afterModel(
    ctx: MiddlewareContext,
    response: ModelResponse
  ): Promise<void> {
    const step = incrementStepCount(ctx);

    // Final step: let the agent synthesize freely.
    if (step >= MAX_STEPS) return;

    // Only reflect when the model made tool calls (evidence is being gathered).
    const hasToolCalls =
      Array.isArray(response.toolCalls) && response.toolCalls.length > 0;
    if (!hasToolCalls) return;

    const sources = getOrInitEvidenceSources(ctx);
    const metrics = computeMetrics(sources);
    const researchPlan = ctx.state["researchPlan"] as string | undefined;

    const reflectionPrompt = buildReflectionPrompt(
      sources,
      metrics,
      researchPlan
    );

    // Langfuse generation — includes quality metrics as metadata.
    const generation = ctx.tracing.createGeneration(
      "reflection",
      "fast",
      reflectionPrompt,
      {
        sourceCount: metrics.sourceCount,
        sourceDiversity: metrics.sourceDiversity,
        topicCoverage: metrics.topicCoverage,
        step,
      }
    );

    let reflectionText: string;
    let usage: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    } = {};

    try {
      const model = getAIModel("fast");
      const result = await generateText({ model, prompt: reflectionPrompt });
      reflectionText = result.text;

      const inputTokens = result.usage?.inputTokens;
      const outputTokens = result.usage?.outputTokens;
      const totalTokens =
        inputTokens !== undefined && outputTokens !== undefined
          ? inputTokens + outputTokens
          : undefined;
      usage = {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens,
      };
    } catch (err) {
      // Tracing failure must not affect the agent flow.
      generation.end(`[reflection error: ${String(err)}]`);
      return;
    }

    generation.end(reflectionText, usage);

    // Determine guidance based on reflection output.
    const hasGaps = detectGaps(reflectionText);
    const isSufficient = detectSufficiency(reflectionText, metrics);

    let guidance: string | undefined;
    if (hasGaps) {
      guidance = buildGapFillingGuidance(reflectionText, metrics);
    } else if (isSufficient) {
      guidance = buildSynthesisGuidance(metrics);
    }

    if (guidance) {
      ctx.state["reflectionGuidance"] = guidance;
    }
  }

  // -------------------------------------------------------------------------
  // beforeModel — inject stored guidance into the next turn
  // -------------------------------------------------------------------------

  /**
   * If a reflection produced guidance in the previous turn, prepends it as
   * a system message so the agent receives it at the start of its next
   * reasoning step.
   *
   * The guidance is consumed (cleared) immediately so it fires only once.
   */
  async beforeModel(
    ctx: MiddlewareContext,
    messages: ModelMessage[]
  ): Promise<ModelMessage[] | undefined> {
    const guidance = ctx.state["reflectionGuidance"] as string | undefined;
    if (!guidance) return undefined;

    // Clear so the message is only injected once.
    ctx.state["reflectionGuidance"] = undefined;

    const systemMessage: ModelMessage = {
      role: "system",
      content: guidance,
    };

    return [systemMessage, ...messages];
  }
}
