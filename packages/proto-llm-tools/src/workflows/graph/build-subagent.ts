/**
 * Build Subagent Graph Utility
 *
 * Creates mini StateGraphs for subagents with:
 * - Agent node (LLM + tools)
 * - Tool node (executes tools)
 * - Routing (agent ↔ tools loop)
 *
 * This shared utility is used by the research agent supervisor pattern
 * to create specialized subagent workflows for search and entity building.
 */

import { SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";
import { StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

/**
 * Shared EntityResearchState type - re-exported from entity-research workflow
 * Represents the state schema for research workflows
 */
export type { EntityResearchState } from "../entity-research/state";

/**
 * Build subagent as mini StateGraph
 *
 * Creates a compiled subagent graph that runs an agent node in a loop with tools.
 * Used by the research agent coordinator to delegate specialized tasks (search, entity extraction).
 *
 * @param params.name - Subagent name for logging
 * @param params.prompt - System prompt for the agent
 * @param params.tools - Tools available to the agent
 * @param params.model - LLM model instance with bindTools capability
 * @param params.stateAnnotation - StateAnnotation class defining the state schema
 * @returns Compiled StateGraph sharing parent state schema
 *
 * @example
 * ```typescript
 * const searchGraph = buildSubagentGraph({
 *   name: "SearchSubagent",
 *   prompt: "You are a search specialist...",
 *   tools: [wikipediaSearchTool, submitResultsTool],
 *   model: anthropic,
 *   stateAnnotation: ResearchAgentStateAnnotation,
 * });
 * ```
 */
export function buildSubagentGraph(params: {
  name: string;
  prompt: string;
  tools: StructuredTool[];
  model: any;
  stateAnnotation: any;
}) {
  const { name, prompt, tools, model, stateAnnotation } = params;

  const modelWithTools = model.bindTools!(tools);
  const systemMessage = new SystemMessage(prompt);

  // Agent node
  const agentNode = async (
    state: any,
    config: RunnableConfig
  ): Promise<Partial<any>> => {
    console.log(`[${name}] Agent node invoked`, {
      files: Object.keys(state.files || {}),
      messageCount: state.messages?.length || 0,
    });

    const messages = [systemMessage, ...(state.messages || [])];
    const response = await modelWithTools.invoke(messages, config);

    return { messages: [response] };
  };

  // Tool node
  const wrappedToolNode = async (state: any, config: RunnableConfig) => {
    const baseToolNode = new ToolNode(tools);
    return await baseToolNode.invoke(state, config);
  };

  // Routing: continue to tools or end
  const shouldContinue = (state: any) => {
    const lastMessage = state.messages?.[state.messages.length - 1];

    if (
      lastMessage &&
      "tool_calls" in lastMessage &&
      (lastMessage as any).tool_calls?.length
    ) {
      return "tools";
    }

    return END;
  };

  // Build mini-graph
  const graph = new StateGraph(stateAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", wrappedToolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      [END]: END,
    })
    .addEdge("tools", "agent");

  return graph.compile();
}
