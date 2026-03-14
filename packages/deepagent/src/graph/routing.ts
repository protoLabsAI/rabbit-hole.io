/**
 * Graph Routing
 *
 * Based on deepagentsjs patterns:
 * - Explicit termination conditions
 * - Max iteration guards
 * - Bundle completion detection
 */

import { END } from "@langchain/langgraph";

import { DEFAULT_RESEARCH_SESSION_CONFIG } from "@proto/types";

import type { EntityResearchAgentStateType } from "../state";
import { log } from "../utils/logger";

const SUBAGENT_TYPES = [
  "evidence-gatherer",
  "entity-extractor",
  "field-analyzer",
  "entity-creator",
  "relationship-mapper",
  "bundle-assembler",
] as const;

/**
 * Compute max coordinator iterations based on research depth.
 *
 * Depth mapping:
 * - basic (shallow):        8 iterations  — 1 pass through subagent pipeline
 * - detailed (standard):   16 iterations  — 2–3 passes with gap-fill
 * - comprehensive (deep):  30 iterations  — 5+ passes with recursive expansion
 */
function getMaxIterations(state: EntityResearchAgentStateType): number {
  const depth =
    state.sessionConfig?.depth ?? DEFAULT_RESEARCH_SESSION_CONFIG.depth;
  switch (depth) {
    case "basic":
      return 8;
    case "comprehensive":
      return 30;
    case "detailed":
    default:
      return 16;
  }
}

// Track iterations per thread (reset on new thread)
const iterationCounts = new Map<string, number>();

interface MessageWithToolCalls {
  tool_calls?: Array<{
    name: string;
    args?: { subagent_type?: string };
    arguments?: { subagent_type?: string };
  }>;
  content?: string;
}

/**
 * Check if bundle is complete (termination signal)
 */
function isBundleComplete(state: EntityResearchAgentStateType): boolean {
  // Check if bundle exists and has required fields
  if (state.bundle && typeof state.bundle === "object") {
    const bundle = state.bundle as Record<string, unknown>;
    const hasEntities =
      Array.isArray(bundle.entities) && bundle.entities.length > 0;
    const hasEvidence =
      Array.isArray(bundle.evidence) && bundle.evidence.length > 0;
    if (hasEntities && hasEvidence) {
      log.debug("Bundle complete - terminating");
      return true;
    }
  }

  // Check completeness threshold
  if (state.completeness && state.completeness >= 0.9) {
    log.debug("Completeness threshold reached - terminating");
    return true;
  }

  return false;
}

/**
 * Check if all todos are completed
 */
function allTodosComplete(state: EntityResearchAgentStateType): boolean {
  if (!state.todos || state.todos.length === 0) return false;
  const allDone = state.todos.every(
    (t) => t.status === "completed" || t.status === "failed"
  );
  if (allDone) {
    log.debug("All todos complete - terminating");
  }
  return allDone;
}

/**
 * Get thread ID for iteration tracking
 */
function getThreadId(state: EntityResearchAgentStateType): string {
  // Use entity name + type as thread key for iteration tracking
  return `${state.entityName || "unknown"}-${state.entityType || "unknown"}`;
}

export function routeFromCoordinator(
  state: EntityResearchAgentStateType
): string {
  const threadId = getThreadId(state);
  const maxIterations = getMaxIterations(state);

  // Increment and check iteration count
  const currentCount = (iterationCounts.get(threadId) || 0) + 1;
  iterationCounts.set(threadId, currentCount);

  if (currentCount > maxIterations) {
    log.warn(
      `Max iterations (${maxIterations}) reached for depth=${state.sessionConfig?.depth ?? "detailed"} - forcing termination`
    );
    iterationCounts.delete(threadId); // Reset for next run
    return END;
  }

  // Check termination conditions
  if (isBundleComplete(state)) {
    iterationCounts.delete(threadId);
    return END;
  }

  if (allTodosComplete(state) && currentCount > 3) {
    // Give at least a few iterations before checking todos
    iterationCounts.delete(threadId);
    return END;
  }

  const lastMessage = state.messages[state.messages.length - 1] as
    | MessageWithToolCalls
    | undefined;

  // No tool calls = done
  if (!lastMessage?.tool_calls?.length) {
    iterationCounts.delete(threadId);
    return END;
  }

  const taskCall = lastMessage.tool_calls.find((tc) => tc.name === "task");

  if (taskCall) {
    const subagentType =
      taskCall.args?.subagent_type || taskCall.arguments?.subagent_type;
    if (
      SUBAGENT_TYPES.includes(subagentType as (typeof SUBAGENT_TYPES)[number])
    ) {
      log.debug(`Route → ${subagentType} (iteration ${currentCount})`);
      return subagentType as string;
    }
    log.warn(`Invalid subagent_type: ${subagentType}`);
    return "tools";
  }

  return "tools";
}

/**
 * Reset iteration tracking (for testing)
 */
export function resetIterationTracking(): void {
  iterationCounts.clear();
}
