/**
 * ClarificationMiddleware — intercepts ask_clarification tool calls.
 *
 * When the agent calls `ask_clarification`, this middleware:
 *  1. Checks the per-turn clarification limit (max 1 per turn).
 *  2. If within limit: records the question in ctx.state, emits a Langfuse
 *     span tagged with the question text, and returns a special
 *     `clarification_requested` result that the frontend renders as a
 *     question card.
 *  3. If the limit has been reached: returns a `clarification_blocked`
 *     result telling the agent to proceed with its best interpretation.
 *
 * All other tool names are passed straight through to the next executor.
 */

import type {
  MiddlewareContext,
  ResearchMiddleware,
  ToolExecutor,
} from "../types";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Discriminant used by the frontend to detect clarification results. */
export const CLARIFICATION_RESULT_TYPE = "clarification_requested" as const;

/** Discriminant returned when the per-turn limit has been exceeded. */
export const CLARIFICATION_BLOCKED_TYPE = "clarification_blocked" as const;

/** Returned by the middleware when it intercepts a valid clarification call. */
export interface ClarificationResult {
  __type: typeof CLARIFICATION_RESULT_TYPE;
  /** The question the agent wants to ask the user. */
  question: string;
}

/** Returned by the middleware when the per-turn limit has been exceeded. */
export interface ClarificationBlockedResult {
  __type: typeof CLARIFICATION_BLOCKED_TYPE;
  /** Human-readable reason, forwarded to the agent as its tool result. */
  reason: string;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export class ClarificationMiddleware implements ResearchMiddleware {
  readonly id = "clarification";

  async wrapToolCall(
    ctx: MiddlewareContext,
    toolName: string,
    args: Record<string, unknown>,
    execute: ToolExecutor
  ): Promise<unknown> {
    // Only intercept ask_clarification; all other tools pass through.
    if (toolName !== "ask_clarification") {
      return execute(args);
    }

    // ── Limit enforcement ────────────────────────────────────────────────────
    // Allow at most 1 clarification per conversation turn.
    const count = (ctx.state.clarificationCount as number | undefined) ?? 0;
    if (count >= 1) {
      return {
        __type: CLARIFICATION_BLOCKED_TYPE,
        reason:
          "Clarification limit reached for this turn. Proceed with your best interpretation of the query.",
      } satisfies ClarificationBlockedResult;
    }

    // ── Intercept ────────────────────────────────────────────────────────────
    const question = args["question"] as string;

    // Increment the counter so subsequent calls are blocked.
    ctx.state.clarificationCount = count + 1;

    // Emit a Langfuse span so we can measure how often clarification fires
    // and whether it improves answer quality.
    const span = ctx.tracing.createSpan("clarification", { question });
    span.end({ question });

    // Return the special result — do NOT call execute(args).
    // The agent sees this tool result and (per system prompt) stops to surface
    // the question to the user. The agent loop halts because the LLM is
    // instructed to wait for user input after receiving this result.
    return {
      __type: CLARIFICATION_RESULT_TYPE,
      question,
    } satisfies ClarificationResult;
  }
}
