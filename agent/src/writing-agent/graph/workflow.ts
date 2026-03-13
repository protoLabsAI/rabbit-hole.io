/**
 * Writing Agent Workflow
 */

import { copilotkitEmitState } from "@copilotkit/sdk-js/langgraph";
import { AIMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { START, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import {
  WritingAgentStateAnnotation,
  type WritingAgentState,
} from "../state.js";
import { writeTodos } from "../tools/index.js";

import { coordinatorNode } from "./nodes.js";

/**
 * Build Writing Agent Workflow
 */

// Coordinator tools
const coordinatorTools = [writeTodos];

// Coordinator node wrapper with tools
const coordinatorWithTools = (
  state: WritingAgentState,
  config: RunnableConfig
) => coordinatorNode(state, config, coordinatorTools);

// Tools node wrapper that emits state after execution
const toolsWithStateEmit = async (
  state: WritingAgentState,
  config: RunnableConfig
) => {
  const baseToolNode = new ToolNode(coordinatorTools);
  const result = await baseToolNode.invoke(state, config);

  // Emit state after tool execution (e.g., todos updated)
  await copilotkitEmitState(config, {
    ...state,
    ...result,
  });

  return result;
};

// Build workflow graph
export const workflow = new StateGraph(WritingAgentStateAnnotation)
  .addNode("coordinator", coordinatorWithTools)
  .addNode("tools", toolsWithStateEmit)
  .addEdge(START, "coordinator")
  .addConditionalEdges("coordinator", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];

    // No tool calls - end conversation
    if (
      !(lastMessage instanceof AIMessage) ||
      !lastMessage.tool_calls ||
      lastMessage.tool_calls.length === 0
    ) {
      return "__end__";
    }

    // Check ALL tool calls, not just the first one
    const actions = state.copilotkit?.actions || [];
    const actionNames = new Set(actions.map((a: any) => a.name));

    // Separate frontend (CopilotKit) and backend tool calls
    const backendToolCalls = lastMessage.tool_calls.filter(
      (tc: any) => !actionNames.has(tc.name)
    );

    // If ALL tool calls are CopilotKit frontend actions, end
    // (CopilotKit framework handles their tool results automatically)
    if (backendToolCalls.length === 0) {
      return "__end__";
    }

    // If there are ANY backend tools, route to tools node
    // (even if there are also CopilotKit actions mixed in)
    return "tools";
  })
  .addEdge("tools", "coordinator");
