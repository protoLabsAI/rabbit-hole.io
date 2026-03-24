/**
 * ResearchPlannerMiddleware — generates a research plan before the agent begins.
 *
 * Before the agent's tool loop starts, makes a lightweight LLM call (using
 * getAIModel('fast')) to produce a 3–5 step research plan. The plan is stored
 * in ctx.state.researchPlan so other middleware and the runtime can access it.
 *
 * Simple queries (< 10 words, starting with who/what/when/where/how) skip
 * planning to avoid overhead.
 *
 * The planning LLM call is tracked as a Langfuse generation with plan output
 * and token usage, enabling evaluation of plan quality vs research outcome.
 */

import { generateText } from "ai";

import { getAIModel } from "@proto/llm-providers/server";

import type { MiddlewareContext, ResearchMiddleware } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Factual interrogatives that indicate a simple query when the query is short. */
const SIMPLE_QUERY_PATTERN = /^(who|what|when|where|how)\b/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the query is a simple factual question that does not
 * benefit from a research plan.
 *
 * Heuristic: fewer than 10 words AND starts with a factual interrogative
 * (who / what / when / where / how).
 */
function isSimpleQuery(query: string): boolean {
  const trimmed = query.trim();
  const wordCount = trimmed.split(/\s+/).length;
  return wordCount < 10 && SIMPLE_QUERY_PATTERN.test(trimmed);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export class ResearchPlannerMiddleware implements ResearchMiddleware {
  readonly id = "research-planner";

  /**
   * Fires before the agent's streamText loop begins.
   *
   * Reads `ctx.state.query`, skips planning for simple queries, and for all
   * others makes a fast LLM call to produce a 3-5 step research plan. The plan
   * is written to `ctx.state.researchPlan` and the LLM call is recorded as a
   * Langfuse generation.
   */
  async beforeAgent(ctx: MiddlewareContext): Promise<void> {
    const query = ctx.state["query"] as string | undefined;

    // Nothing to plan if no query is present
    if (!query) return;

    // Skip planning for short factual questions to avoid unnecessary overhead
    if (isSimpleQuery(query)) return;

    const planPrompt =
      `Generate a 3-5 step research plan for: ${query}. ` +
      `Include: 1) What to search first 2) What gaps to anticipate 3) When to stop.`;

    // Start a Langfuse generation record for this planning call
    const generation = ctx.tracing.createGeneration(
      "research-plan",
      "fast",
      planPrompt
    );

    const model = getAIModel("fast");
    const result = await generateText({ model, prompt: planPrompt });

    const plan = result.text;

    // Map ai@6 usage fields (inputTokens/outputTokens) to GenerationUsage
    const inputTokens = result.usage?.inputTokens;
    const outputTokens = result.usage?.outputTokens;
    const totalTokens =
      inputTokens !== undefined && outputTokens !== undefined
        ? inputTokens + outputTokens
        : undefined;

    generation.end(plan, {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens,
    });

    // Store the plan in shared state — surfaced as a data annotation for the
    // frontend and consumed by downstream middleware (e.g. reflection)
    ctx.state["researchPlan"] = plan;
  }
}
