/**
 * Media Processing Subagent
 */

import { SystemMessage } from "@langchain/core/messages";
import type { StructuredTool } from "@langchain/core/tools";
import { StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { MEDIA_PROCESSING_PROMPT } from "../prompts/media-processing.js";

/**
 * Build Media Processing Subagent Graph
 */
export function buildMediaProcessingSubagent(
  model: any,
  toolsMap: Record<string, StructuredTool>,
  WritingAgentStateAnnotation: any
) {
  const subagentTools = [
    toolsMap["enqueue_youtube_job"],
    toolsMap["wait_for_job"],
    toolsMap["transcribe_audio"],
    toolsMap["summarize"],
    toolsMap["write_file"],
    toolsMap["read_file"],
    toolsMap["submit_output"],
  ].filter(Boolean) as StructuredTool[];

  const modelWithTools = model.bindTools(subagentTools);
  const systemMessage = new SystemMessage(MEDIA_PROCESSING_PROMPT);

  // Agent node
  const agentNode = async (state: any, config: any) => {
    console.log(`[MediaProcessing] Agent node invoked`);

    const messages = [systemMessage, ...state.messages];
    const response = await modelWithTools.invoke(messages, config);

    return { messages: [response] };
  };

  // Tool node
  const toolNode = new ToolNode(subagentTools);

  // Routing
  const shouldContinue = (state: any) => {
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage?.tool_calls?.length > 0) {
      return "tools";
    }

    return END;
  };

  // Build subagent graph
  return new StateGraph(WritingAgentStateAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      [END]: END,
    })
    .addEdge("tools", "agent")
    .compile();
}
