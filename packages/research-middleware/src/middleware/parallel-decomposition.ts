/**
 * ParallelDecompositionMiddleware — breaks complex queries into focused sub-queries.
 *
 * When a 'deep' query is detected (ctx.state.researchPlan.queryType === 'deep'),
 * this middleware:
 *  1. Calls the injected decompose() function to split the query into 2–3 sub-queries.
 *  2. Stores them in ctx.state.subQueries.
 *  3. Injects a system message on the first model call with the full research plan.
 *  4. Emits a Langfuse generation span for the decomposition call.
 *  5. Gracefully degrades: if decomposition fails or is unavailable, the agent
 *     continues normally without sub-queries.
 *
 * For queries not marked as 'deep', the middleware is a complete no-op.
 */

import type {
  MiddlewareContext,
  ModelMessage,
  ResearchMiddleware,
} from "../types";

// ---------------------------------------------------------------------------
// Result types (for frontend rendering)
// ---------------------------------------------------------------------------

/** Discriminant used by the frontend to detect a sub-query plan result. */
export const SUBQUERY_PLAN_TYPE = "subquery_plan" as const;

/** Emitted as a tool result when the middleware surfaces the research plan. */
export interface SubQueryPlanResult {
  __type: typeof SUBQUERY_PLAN_TYPE;
  /** The original user query that was decomposed. */
  originalQuery: string;
  /** The individual sub-queries to research. */
  subQueries: string[];
}

// ---------------------------------------------------------------------------
// Internal state shape
// ---------------------------------------------------------------------------

/** Shape of ctx.state.researchPlan (written by planner middleware). */
interface ResearchPlan {
  queryType: "deep" | "simple";
  /** The original user query string. */
  query?: string;
}

// ---------------------------------------------------------------------------
// Middleware options
// ---------------------------------------------------------------------------

/**
 * Async function that decomposes a query into independent sub-queries.
 * Implementations should call an LLM or use a rule-based heuristic.
 * Must return between 1 and maxSubQueries strings (empty array = skip).
 */
export type DecomposeFunction = (query: string) => Promise<string[]>;

export interface ParallelDecompositionOptions {
  /**
   * Called when a deep query is detected. Returns 2–3 independent sub-queries.
   * If omitted or if it throws, decomposition is skipped and the agent runs
   * against the original query unchanged.
   */
  decompose?: DecomposeFunction;

  /**
   * Hard cap on the number of sub-queries generated. Any extras are silently
   * discarded. Defaults to 3.
   */
  maxSubQueries?: number;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export class ParallelDecompositionMiddleware implements ResearchMiddleware {
  readonly id = "parallel-decomposition";

  private readonly _decompose: DecomposeFunction | undefined;
  private readonly _maxSubQueries: number;

  constructor(options: ParallelDecompositionOptions = {}) {
    this._decompose = options.decompose;
    this._maxSubQueries = Math.max(1, options.maxSubQueries ?? 3);
  }

  // ── beforeAgent ───────────────────────────────────────────────────────────

  /**
   * Fires before the streamText loop begins.
   *
   * Checks ctx.state.researchPlan for a 'deep' marker, then calls decompose()
   * to produce sub-queries. Results are stored in ctx.state.subQueries.
   * A Langfuse generation span is emitted for the decomposition call.
   *
   * Errors from decompose() are caught and logged as span metadata — the agent
   * continues without sub-queries rather than failing the request.
   */
  async beforeAgent(ctx: MiddlewareContext): Promise<void> {
    const plan = ctx.state["researchPlan"] as ResearchPlan | undefined;

    // Only activate for queries marked as 'deep' by the planner middleware.
    if (!plan || plan.queryType !== "deep") {
      return;
    }

    const query = plan.query;
    if (!query || !this._decompose) {
      return;
    }

    // Emit a generation span so we can track decomposition quality in Langfuse.
    const generation = ctx.tracing.createGeneration(
      "parallel-decomposition:decompose",
      "decomposer",
      { query },
      { queryType: "deep" }
    );

    try {
      const raw = await this._decompose(query);

      // Enforce the sub-query cap — discard anything beyond maxSubQueries.
      const subQueries = raw.filter(
        (q): q is string => typeof q === "string" && q.trim().length > 0
      ).slice(0, this._maxSubQueries);

      if (subQueries.length > 0) {
        ctx.state["subQueries"] = subQueries;
        ctx.state["originalQuery"] = query;
      }

      generation.end({ subQueries });

      // Extra span so we can identify which decomposition strategies work best.
      const span = ctx.tracing.createSpan("parallel-decomposition:plan", {
        originalQuery: query,
        subQueryCount: subQueries.length,
        subQueries,
      });
      span.end({ subQueries });
    } catch (err) {
      // Graceful degradation — decomposition failure must never abort the agent.
      generation.end({ error: String(err) });
    }
  }

  // ── beforeModel ───────────────────────────────────────────────────────────

  /**
   * Injects the research plan into the first LLM turn as a system message.
   *
   * Only fires once per agent invocation (tracked via ctx.state.subQueryPlanInjected).
   * Returns undefined (no-op) when sub-queries are absent or already injected.
   */
  beforeModel(
    ctx: MiddlewareContext,
    messages: ModelMessage[]
  ): ModelMessage[] | undefined {
    const subQueries = ctx.state["subQueries"] as string[] | undefined;

    if (
      !subQueries ||
      subQueries.length === 0 ||
      ctx.state["subQueryPlanInjected"]
    ) {
      return undefined; // No-op: leave messages unchanged.
    }

    // Mark as injected so subsequent model turns don't repeat the plan.
    ctx.state["subQueryPlanInjected"] = true;

    const planLines = subQueries
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");

    const planMessage: ModelMessage = {
      role: "system",
      content:
        `Research plan: This query has been decomposed into ${subQueries.length} ` +
        `focused sub-topics. Research each one in turn:\n${planLines}\n\n` +
        `After researching all sub-topics, synthesize the findings into a ` +
        `comprehensive, well-structured answer.`,
    };

    // Prepend the plan message so it appears as context before existing messages.
    return [planMessage, ...messages];
  }
}
