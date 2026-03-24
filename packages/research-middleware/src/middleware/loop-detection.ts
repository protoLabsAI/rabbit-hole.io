/**
 * LoopDetectionMiddleware — detects and breaks repetitive tool call patterns.
 *
 * Ports DeerFlow's loop detection pattern to the AI SDK middleware pipeline.
 * Hashes each tool call (tool name + normalized args, order-independent) and
 * tracks frequency in a sliding LRU window of size 20.
 *
 * Thresholds:
 *   - count === 2: Executes the tool but appends a warning to the result,
 *     advising the agent it is repeating itself.
 *   - count >= 3: Blocks the tool call entirely and returns a synthesis
 *     instruction, forcing the agent to work with what it has.
 *
 * Langfuse spans are emitted for each loop-detection event (warning / blocked)
 * with the repeated hash and count as metadata.
 */

import type {
  MiddlewareContext,
  ResearchMiddleware,
  ToolExecutor,
} from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WINDOW_SIZE = 20;
const WARNING_THRESHOLD = 2;
const BLOCK_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/**
 * Per-invocation state stored on `ctx.state.loopDetection`.
 *
 * The Map is used as an LRU cache:
 *   - Insertion order tracks recency (first = least recently used).
 *   - On access, the entry is deleted and re-inserted to move it to MRU.
 *   - On overflow, the first (LRU) entry is evicted.
 */
interface LoopDetectionState {
  window: Map<string, number>;
}

function getOrInitState(ctx: MiddlewareContext): LoopDetectionState {
  if (!ctx.state["loopDetection"]) {
    ctx.state["loopDetection"] = {
      window: new Map<string, number>(),
    } satisfies LoopDetectionState;
  }
  return ctx.state["loopDetection"] as LoopDetectionState;
}

// ---------------------------------------------------------------------------
// Hash helpers
// ---------------------------------------------------------------------------

/** Recursively sorts object keys so serialization is order-independent. */
function sortObjectKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  const obj = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(obj)
      .sort()
      .map((k) => [k, sortObjectKeys(obj[k])])
  );
}

/**
 * Produces a deterministic string key for a tool call.
 * The key encodes both tool name and normalized (key-sorted) args so that
 * calls with the same semantics — regardless of argument key order — hash
 * identically.
 */
function hashToolCall(toolName: string, args: Record<string, unknown>): string {
  const sortedArgs = sortObjectKeys(args) as Record<string, unknown>;
  return JSON.stringify({ toolName, ...sortedArgs });
}

// ---------------------------------------------------------------------------
// LRU window
// ---------------------------------------------------------------------------

/**
 * Records a tool call hash in the LRU window and returns the new count.
 *
 * Behaviour:
 *  - Existing hash: increment count, move to MRU position.
 *  - New hash + window full: evict LRU entry, then insert new hash with count 1.
 *  - New hash + window not full: insert with count 1.
 */
function recordHash(state: LoopDetectionState, hash: string): number {
  const { window } = state;
  const currentCount = window.get(hash) ?? 0;
  const newCount = currentCount + 1;

  if (currentCount > 0) {
    // Move to MRU: delete then re-insert at end
    window.delete(hash);
    window.set(hash, newCount);
  } else {
    // New entry
    if (window.size >= WINDOW_SIZE) {
      // Evict least recently used (first key in insertion order)
      const lruKey = window.keys().next().value;
      if (lruKey !== undefined) {
        window.delete(lruKey);
      }
    }
    window.set(hash, newCount);
  }

  return newCount;
}

// ---------------------------------------------------------------------------
// Middleware implementation
// ---------------------------------------------------------------------------

export class LoopDetectionMiddleware implements ResearchMiddleware {
  readonly id = "loop-detection";

  async wrapToolCall(
    ctx: MiddlewareContext,
    toolName: string,
    args: Record<string, unknown>,
    execute: ToolExecutor
  ): Promise<unknown> {
    const hash = hashToolCall(toolName, args);
    const state = getOrInitState(ctx);
    const count = recordHash(state, hash);

    if (count >= BLOCK_THRESHOLD) {
      const span = ctx.tracing.createSpan("loop-detection:blocked", {
        hash,
        count,
        toolName,
      });
      span.end({ action: "blocked", toolName, count });

      return (
        `[Loop Detection] This tool call has been repeated ${count} times with ` +
        `identical arguments. You are in a loop. Do not call any more tools — ` +
        `synthesize a final answer using the information you have already gathered.`
      );
    }

    if (count >= WARNING_THRESHOLD) {
      const span = ctx.tracing.createSpan("loop-detection:warning", {
        hash,
        count,
        toolName,
      });
      span.end({ action: "warning", toolName, count });

      const result = await execute(args);
      const warning =
        `\n\n[Loop Detection Warning] You have called "${toolName}" with the same ` +
        `arguments ${count} times. Consider trying different search terms, a ` +
        `different approach, or synthesizing with the information you already have.`;

      if (typeof result === "string") {
        return result + warning;
      }
      return { result, warning };
    }

    return execute(args);
  }
}
