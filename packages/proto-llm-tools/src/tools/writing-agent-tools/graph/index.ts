/**
 * Writing Agent Graph Builder
 */

import { ToolMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";
import { StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { getModel } from "@protolabsai/llm-providers/server";

import { summarizeTool } from "../../core/summarize/index.js";
import {
  enqueueYouTubeJobTool,
  waitForJobTool,
  transcribeAudioTool,
  submitMediaOutputTool,
} from "../media-processing-tools.js";
import { buildMediaProcessingSubagent } from "../subagents/media-processing.js";

import { routeFromCoordinator } from "./routing.js";
import type { WritingAgentGraphOptions } from "./types.js";

/**
 * Create subgraph wrapper with message isolation
 */
function createSubgraphWrapper(name: string, compiledSubgraph: any) {
  return async (state: any, config: RunnableConfig) => {
    if (!state?.messages || !Array.isArray(state.messages)) {
      throw new Error(`[${name}] Invalid state: messages array required`);
    }

    const lastMessage = state.messages[state.messages.length - 1];
    const taskCall = lastMessage?.tool_calls?.find(
      (tc: any) => tc.name === "task"
    );

    const description = taskCall?.args?.description || `Execute ${name} task`;
    const metadata = taskCall?.args?.metadata || {};
    const toolCallId = taskCall?.id || `task_${name}`;

    console.log(`[${name}] Subagent invoked:`, description);

    // Transform state: fresh messages, preserve files/todos
    const transformedState = {
      ...state,
      messages: [{ role: "user", content: description, metadata }],
    };

    // Remove callbacks to prevent CopilotKit streaming duplication
    // NOTE: Interrupts not used - using frontend tool pattern instead
    const subgraphConfig: RunnableConfig = {
      ...config,
      callbacks: undefined,
      tags: [...(config.tags || []), `subagent:${name}`],
    };

    // Invoke subagent
    let result;
    try {
      result = await compiledSubgraph.invoke(transformedState, subgraphConfig);
    } catch (error) {
      console.error(`[${name}] Subagent invocation failed:`, error);
      throw new Error(
        `${name} subagent failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Preserve subagent's messages (including submit_output structured data)
    const messages = Array.isArray(result.messages) ? result.messages : [];

    return {
      ...result, // Preserve all state updates (files, todos, etc.)
      messages: [
        ...messages, // Keep subagent tool outputs
        new ToolMessage({
          content: `${name} completed successfully`,
          tool_call_id: toolCallId,
        }),
      ],
    };
  };
}

/**
 * Build Writing Agent Coordinator Graph
 */
export function buildWritingAgentGraph(options: WritingAgentGraphOptions) {
  // Get or create model
  const model =
    options.model || getModel("smart", undefined, { maxTokens: 4096 });

  const WritingAgentStateAnnotation = options.WritingAgentStateAnnotation;
  const coordinatorTools = options.coordinatorTools;

  // Create tools map for subagents
  const toolsMap: Record<string, StructuredTool> = {
    enqueue_youtube_job: enqueueYouTubeJobTool,
    wait_for_job: waitForJobTool,
    transcribe_audio: transcribeAudioTool,
    summarize: summarizeTool,
    submit_output: submitMediaOutputTool,
    write_file: options.writeFile,
    read_file: options.readFile,
  };

  // Build subagent
  const mediaProcessingGraph = buildMediaProcessingSubagent(
    model,
    toolsMap,
    WritingAgentStateAnnotation
  );

  // Coordinator tool node
  const toolNode = new ToolNode(coordinatorTools);

  // Coordinator node wrapper
  const coordinatorNodeWrapper = async (state: any, config: RunnableConfig) => {
    // Pass state to config for file tools to access
    const configWithState = {
      ...config,
      state,
    };

    return options.coordinatorNode(state, configWithState, coordinatorTools);
  };

  // Build parent graph
  return new StateGraph(WritingAgentStateAnnotation)
    .addNode("coordinator", coordinatorNodeWrapper)
    .addNode("tools", toolNode)
    .addNode(
      "media-processing",
      createSubgraphWrapper("media-processing", mediaProcessingGraph)
    )
    .addEdge(START, "coordinator")
    .addConditionalEdges("coordinator", routeFromCoordinator, {
      "media-processing": "media-processing",
      tools: "tools",
      [END]: END,
    })
    .addEdge("media-processing", "coordinator")
    .addEdge("tools", "coordinator")
    .compile();
}
