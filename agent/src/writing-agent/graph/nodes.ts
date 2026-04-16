/**
 * Writing Agent Graph Nodes
 */

import {
  convertActionsToDynamicStructuredTools,
  copilotkitEmitState,
} from "@copilotkit/sdk-js/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";

import { WRITING_COORDINATOR_PROMPT } from "@protolabsai/llm-tools";

import { createLangfuseHandler } from "../../config/langfuse.js";
import { agentLLMConfig } from "../../config/llm-config.js";
import type { WritingAgentState } from "../state.js";

/**
 * Coordinator Node
 * Main agent node with CopilotKit integration
 */
export async function coordinatorNode(
  state: WritingAgentState,
  config: RunnableConfig,
  tools: StructuredTool[]
) {
  const model = agentLLMConfig.research({ maxTokens: 4096 });

  // Extract shared state from CoAgent (LangGraph integration)
  const activeDoc = state.activeDocument;
  const accessibleTabs = state.accessibleTabs || [];

  // Create Langfuse handler
  // Extract session ID from CopilotKit's shared graph state
  const sessionId = state.sharedGraphState?.sessionId;
  const langfuseHandler = createLangfuseHandler({
    agentName: "writing-coordinator",
    userId: sessionId,
    sessionId: sessionId,
    tags: ["writing", "coordinator"],
  });

  // Bind tools (coordinator tools + frontend actions from CopilotKit)
  const modelWithTools = model.bindTools!([
    ...convertActionsToDynamicStructuredTools(state.copilotkit?.actions || []),
    ...tools,
  ]);

  // Debug logging
  console.log("[WritingAgent] Active doc:", activeDoc?.tabName);
  console.log("[WritingAgent] Accessible tabs:", accessibleTabs.length);
  console.log("[WritingAgent] Full state keys:", Object.keys(state));

  // Build context string
  let contextInfo = "\n\n=== DOCUMENT CONTEXT ===\n";

  if (activeDoc) {
    contextInfo += `\nACTIVE TAB: "${activeDoc.tabName}" (ID: ${activeDoc.tabId})\n`;
    contextInfo += `- Read Access: ${activeDoc.content !== null ? "YES" : "NO"}\n`;
    contextInfo += `- Write Access: ${activeDoc.canWrite ? "YES" : "NO"}\n`;
    contextInfo += `- Word Count: ${activeDoc.wordCount}\n`;
    contextInfo += `- Character Count: ${activeDoc.characterCount}\n`;

    if (activeDoc.content) {
      contextInfo += `\nCONTENT:\n${activeDoc.content}\n`;
    } else {
      contextInfo += `\nCONTENT: [No read access granted]\n`;
    }
  } else {
    contextInfo += "\nACTIVE TAB: None\n";
  }

  if (accessibleTabs.length > 0) {
    contextInfo += `\n\nALL ACCESSIBLE TABS (${accessibleTabs.length}):\n`;
    accessibleTabs.forEach((tab) => {
      contextInfo += `\n- "${tab.name}" (ID: ${tab.id})\n`;
      contextInfo += `  Read: ${tab.content !== undefined ? "YES" : "NO"}\n`;
      contextInfo += `  Write: ${tab.canWrite ? "YES" : "NO"}\n`;
      contextInfo += `  Words: ${tab.wordCount}, Chars: ${tab.characterCount}\n`;
      if (tab.content && tab.id !== activeDoc?.tabId) {
        contextInfo += `  Content: ${tab.content.substring(0, 200)}${tab.content.length > 200 ? "..." : ""}\n`;
      }
    });
  } else {
    contextInfo += `\nALL ACCESSIBLE TABS: None (user hasn't granted read access to any tabs)\n`;
  }

  contextInfo += "\n=== END CONTEXT ===\n";

  const systemMessage = new SystemMessage(
    WRITING_COORDINATOR_PROMPT + contextInfo
  );
  const messages = [systemMessage, ...state.messages];

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

  // Only emit state if no backend tool calls pending
  // (Frontend actions are handled automatically by CopilotKit)
  const hasBackendToolCalls = (response as any).tool_calls?.length > 0;
  const actions = state.copilotkit?.actions || [];
  const isOnlyFrontendActions =
    hasBackendToolCalls &&
    (response as any).tool_calls.every((tc: any) =>
      actions.some((action: any) => action.name === tc.name)
    );

  // Emit state only when workflow is ending or only frontend actions called
  if (!hasBackendToolCalls || isOnlyFrontendActions) {
    await copilotkitEmitState(config, {
      ...state,
      messages: [response],
    });
  }

  return { messages: [response] };
}
