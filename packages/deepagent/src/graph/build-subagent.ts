/**
 * Subagent Graph Builder
 *
 * Based on deepagentsjs patterns:
 * - Limited iterations per subagent (max 10)
 * - Clear termination on submit_output
 * - Isolated message context
 */

import { SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";
import { StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { EntityResearchAgentStateAnnotation } from "../state";
import type { EntityResearchAgentStateType } from "../state";
import { getLangfuse, log } from "../utils";

// Max iterations per subagent to prevent internal loops
const MAX_SUBAGENT_ITERATIONS = 10;

interface MessageWithToolCalls {
  tool_calls?: Array<{ name?: string }>;
}

// Track subagent iterations
const subagentIterations = new Map<string, number>();

export function buildSubagentGraph(params: {
  name: string;
  prompt: string;
  tools: StructuredTool[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
}) {
  const { name, prompt, tools, model } = params;

  const modelWithTools = model.bindTools(tools);
  const systemMessage = new SystemMessage(prompt);

  const agentNode = async (
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ): Promise<Partial<EntityResearchAgentStateType>> => {
    // Track iterations for this subagent invocation
    // Use stable fallback to ensure iteration tracking works without explicit thread_id
    const invocationKey = `${name}-${config?.configurable?.thread_id || "default"}`;
    const currentIteration = (subagentIterations.get(invocationKey) || 0) + 1;
    subagentIterations.set(invocationKey, currentIteration);

    log.debug(`[${name}] Agent node (iteration ${currentIteration})`, {
      files: Object.keys(state.files || {}),
    });

    // Force termination if max iterations exceeded
    if (currentIteration > MAX_SUBAGENT_ITERATIONS) {
      log.warn(
        `[${name}] Max iterations (${MAX_SUBAGENT_ITERATIONS}) reached - forcing end`
      );
      subagentIterations.delete(invocationKey);
      return { messages: [] };
    }

    // Extract context for tracing
    const threadId =
      (config?.configurable?.thread_id as string) || `thread-${Date.now()}`;
    const userId = config?.configurable?.user_id as string | undefined;

    // Create trace for this subagent call
    const langfuse = getLangfuse();
    const trace = langfuse?.trace({
      name: `subagent-${name}`,
      sessionId: threadId,
      userId: userId,
      tags: ["deep-agent", "subagent", name],
      metadata: {
        subagentName: name,
        toolCount: tools.length,
        iteration: currentIteration,
      },
    });

    const messages = [systemMessage, ...state.messages];

    // Create generation span
    const generation = trace?.generation({
      name: `${name}-reasoning`,
      model: "claude-sonnet-4-20250514",
      input: {
        systemPrompt: prompt.slice(0, 300),
        messageCount: messages.length,
      },
      metadata: {
        toolNames: tools.map((t) => t.name),
      },
    });

    try {
      const response = await modelWithTools.invoke(messages, config);

      const typedResponse = response as MessageWithToolCalls;
      generation?.end({
        output: {
          hasToolCalls: Boolean(typedResponse.tool_calls?.length),
        },
      });

      // Check if this is a submit_output call - if so, clear iteration counter
      const hasSubmitCall = typedResponse.tool_calls?.some((tc) =>
        tc.name?.startsWith("submit_output")
      );
      if (hasSubmitCall) {
        log.debug(`[${name}] Submit output called - completing subagent`);
        subagentIterations.delete(invocationKey);
      }

      return { messages: [response] } as Partial<EntityResearchAgentStateType>;
    } catch (error) {
      generation?.end({
        output: null,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      subagentIterations.delete(invocationKey);
      throw error;
    }
  };

  // Create ToolNode once outside the wrapper for efficiency
  const baseToolNode = new ToolNode(tools);

  const wrappedToolNode = async (
    state: EntityResearchAgentStateType,
    config: RunnableConfig
  ) => {
    return await baseToolNode.invoke(state, config);
  };

  const agentNodeName = `${name}_agent`;
  const toolsNodeName = `${name}_tools`;

  const shouldContinue = (state: EntityResearchAgentStateType) => {
    const lastMessage = state.messages[state.messages.length - 1] as
      | MessageWithToolCalls
      | undefined;

    // No tool calls = done
    if (!lastMessage?.tool_calls?.length) {
      return END;
    }

    // Route to tools for execution - afterTools handles termination for submit_output
    return toolsNodeName;
  };

  // Custom post-tool routing that terminates after submit_output
  const afterTools = (state: EntityResearchAgentStateType) => {
    const messages = state.messages || [];

    // Check last few messages for submit_output tool result
    for (
      let i = messages.length - 1;
      i >= Math.max(0, messages.length - 3);
      i--
    ) {
      const msg = messages[i] as { name?: string };
      if (msg.name?.startsWith("submit_output")) {
        log.debug(`[${name}] Submit output executed - terminating subagent`);
        return END;
      }
    }

    return agentNodeName;
  };

  const graph = new StateGraph(EntityResearchAgentStateAnnotation)
    .addNode(agentNodeName, agentNode)
    .addNode(toolsNodeName, wrappedToolNode)
    .addEdge(START, agentNodeName)
    .addConditionalEdges(agentNodeName, shouldContinue, {
      [toolsNodeName]: toolsNodeName,
      [END]: END,
    })
    .addConditionalEdges(toolsNodeName, afterTools, {
      [agentNodeName]: agentNodeName,
      [END]: END,
    });

  return graph.compile();
}

/**
 * Reset subagent iteration tracking (for testing)
 */
export function resetSubagentIterations(): void {
  subagentIterations.clear();
}
