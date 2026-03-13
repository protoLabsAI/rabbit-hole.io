/**
 * Research Agent Graph - Node Implementations
 *
 * Uses shared implementation from @proto/llm-tools
 */

import {
  convertActionsToDynamicStructuredTools,
  copilotkitEmitState,
} from "@copilotkit/sdk-js/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";

import { createLangfuseHandler } from "../../config/langfuse.js";
import { agentLLMConfig } from "../../config/llm-config.js";
import { COORDINATOR_PROMPT } from "../prompts/index.js";
import type { ResearchAgentState } from "../state.js";

/**
 * Coordinator Node
 * Orchestrates research workflow with real-time state streaming
 */
export async function coordinatorNode(
  state: ResearchAgentState,
  config: RunnableConfig,
  tools: any[] // Limited tools passed from workflow
) {
  console.log("[Research Agent] Coordinator invoked:", {
    entityName: state.entityName,
    entityType: state.entityType,
    researchDepth: state.researchDepth,
    todoCount: state.todos?.length || 0,
    fileCount: Object.keys(state.files || {}).length,
    messageCount: state.messages?.length || 0,
  });

  const model = agentLLMConfig.chat({ maxTokens: 4096 });

  // Extract session/user info from multiple sources
  // 1. config.configurable - LangGraph standard (thread_id)
  // 2. config.properties - CopilotKit runtime properties (passed from API route)
  const configurable = (config as any).configurable || {};
  const properties = (config as any).properties || {};

  const threadId = configurable.thread_id || configurable.threadId;
  const userId =
    properties.user_id || configurable.user_id || configurable.userId;

  // Debug: log what we have available
  console.log("[Research Agent] Langfuse context:", {
    threadId: threadId || "(none)",
    userId: userId || "(none)",
    configurableKeys: Object.keys(configurable),
    propertiesKeys: Object.keys(properties),
  });

  // Create Langfuse handler with available context
  const langfuseHandler = createLangfuseHandler({
    agentName: "research-agent-coordinator",
    userId: userId || threadId, // Use threadId as fallback for user grouping
    sessionId: threadId, // thread_id is the session
    tags: ["research-agent", "coordinator"],
  });

  // Bind LIMITED tools including CopilotKit actions (forces delegation)
  const modelWithTools = model.bindTools!([
    ...convertActionsToDynamicStructuredTools(state.copilotkit?.actions || []),
    ...tools,
  ]);

  const systemMessage = new SystemMessage(COORDINATOR_PROMPT);
  const messages = [systemMessage, ...state.messages];

  // Merge callbacks to preserve existing instrumentation
  // config.callbacks can be an array, CallbackManager, or undefined
  const existingCallbacks = Array.isArray(config.callbacks)
    ? config.callbacks
    : [];
  const callbacks = [
    ...existingCallbacks,
    ...(langfuseHandler ? [langfuseHandler] : []),
  ];
  const response = await modelWithTools.invoke(messages, {
    ...config,
    callbacks: callbacks.length > 0 ? callbacks : undefined,
  });

  console.log("[Research Agent] Response received:", {
    hasToolCalls: !!(response as any).tool_calls?.length,
    toolCalls: (response as any).tool_calls?.map((tc: any) => tc.name),
  });

  // Check if bundle file exists and parse it for state streaming
  let parsedBundle = state.bundle;
  if (state.files?.["/research/bundle.json"] && !parsedBundle) {
    try {
      const bundleContent = state.files["/research/bundle.json"];
      parsedBundle = JSON.parse(bundleContent);
      console.log("[Research Agent] Parsed bundle from file:", {
        entities: parsedBundle.bundle?.entities?.length || 0,
        relationships: parsedBundle.bundle?.relationships?.length || 0,
        evidence: parsedBundle.bundle?.evidence?.length || 0,
      });
    } catch (error) {
      console.error("[Research Agent] Failed to parse bundle:", error);
    }
  }

  // Always emit state for real-time frontend updates
  await copilotkitEmitState(config, {
    ...state,
    messages: [response],
    bundle: parsedBundle,
  });

  console.log("[Research Agent] State emitted to frontend");

  return { messages: [response], bundle: parsedBundle };
}
