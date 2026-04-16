/**
 * Graph Nodes
 */

import { convertActionsToDynamicStructuredTools } from "@copilotkit/sdk-js/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";

import { getModel } from "@protolabsai/llm-providers/server";

import { COORDINATOR_PROMPT } from "../prompts";
import type { EntityResearchAgentStateType } from "../state";
import { getLangfuse, log } from "../utils";

let coordinatorModel: ReturnType<typeof getModel> | null = null;

function getCoordinatorModel() {
  if (!coordinatorModel) {
    coordinatorModel = getModel("smart", undefined, { maxTokens: 4096 });
  }
  return coordinatorModel;
}

export function resetCoordinatorModel() {
  coordinatorModel = null;
}

interface CopilotKitState {
  copilotkit?: {
    actions?: unknown[];
  };
}

export async function coordinatorNode(
  state: EntityResearchAgentStateType,
  config: RunnableConfig,
  tools: StructuredTool[]
) {
  const model = getCoordinatorModel();
  const copilotState = state as unknown as CopilotKitState;

  // Extract context from config
  const threadId =
    (config?.configurable?.thread_id as string) || `thread-${Date.now()}`;
  const userId = config?.configurable?.user_id as string | undefined;

  // Create Langfuse trace for this coordinator call
  const langfuse = getLangfuse();
  const trace = langfuse?.trace({
    name: "deep-agent-coordinator",
    sessionId: threadId,
    userId: userId,
    tags: ["deep-agent", "coordinator"],
    metadata: {
      toolCount: tools.length,
      messageCount: state.messages?.length || 0,
    },
  });

  const modelWithTools = model.bindTools!([
    ...convertActionsToDynamicStructuredTools(
      copilotState.copilotkit?.actions || []
    ),
    ...tools,
  ]);

  const systemMessage = new SystemMessage(COORDINATOR_PROMPT);
  const messages = [systemMessage, ...(state.messages || [])];

  // Create generation span for the LLM call
  const generation = trace?.generation({
    name: "coordinator-decision",
    model: "claude-sonnet-4-20250514",
    input: messages.map((m) => ({
      role: m._getType(),
      content:
        typeof m.content === "string"
          ? m.content.slice(0, 500)
          : "[structured content]",
    })),
    modelParameters: {
      maxTokens: 4096,
    },
    metadata: {
      toolNames: tools.map((t) => t.name),
    },
  });

  try {
    const response = await modelWithTools.invoke(messages);

    // End generation with output
    generation?.end({
      output: {
        type: response._getType(),
        hasToolCalls: Boolean(
          response.tool_calls && response.tool_calls.length > 0
        ),
        toolCalls: response.tool_calls?.map((tc: { name: string }) => tc.name),
      },
    });

    log.debug("[Coordinator] Response generated", {
      hasToolCalls: Boolean(response.tool_calls?.length),
      traceId: trace?.id,
    });

    return { messages: [response] };
  } catch (error) {
    generation?.end({
      output: null,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
