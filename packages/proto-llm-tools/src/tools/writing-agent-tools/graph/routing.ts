/**
 * Writing Agent Graph - Routing Logic
 */

import { END } from "@langchain/langgraph";

/**
 * Valid subagent types matching subgraph node names
 */
const SUBAGENT_TYPES = ["media-processing"] as const;

/**
 * Route from coordinator to subgraphs, tools, or end
 *
 * Logic:
 * 1. If task tool called → route to matching subgraph node
 * 2. If other tools called → route to tools node
 * 3. If no tool calls → end execution
 */
export function routeFromCoordinator(state: any): string {
  const lastMessage = state.messages[state.messages.length - 1];

  // Check if message has tool_calls
  if (
    !lastMessage ||
    !("tool_calls" in lastMessage) ||
    !(lastMessage as any).tool_calls?.length
  ) {
    return END;
  }

  // Check for task tool call (subgraph delegation)
  const taskCall = (lastMessage as any).tool_calls.find(
    (tc: any) => tc.name === "task"
  );

  if (taskCall) {
    const { subagent_type } = taskCall.args || taskCall.arguments || {};

    // Validate subagent type
    if (SUBAGENT_TYPES.includes(subagent_type)) {
      // Debug logging only - production should use structured logger
      if (process.env.NODE_ENV === "development") {
        console.log(`[Routing] → ${subagent_type}`);
      }
      return subagent_type;
    } else {
      // Warning for invalid subagent type
      if (process.env.NODE_ENV === "development") {
        console.warn(`[Routing] Invalid subagent_type: ${subagent_type}`);
      }
      return "tools";
    }
  }

  // Other tool calls go to tools node
  return "tools";
}
