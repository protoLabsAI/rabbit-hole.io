/**
 * Task Delegation Tool
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod";

interface ToolConfig {
  toolCall?: {
    id?: string;
  };
}

/**
 * Task Tool Schema
 */
const taskToolSchema = z.object({
  description: z
    .string()
    .describe("Detailed task description for the subagent"),
  subagent_type: z
    .enum(["media-processing"])
    .describe("Which subagent to delegate to"),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe("Additional context for subagent"),
});

/**
 * Task Delegation Tool
 * Routes work to specialized subagents
 */
export const taskTool = tool(
  async (input: z.infer<typeof taskToolSchema>, config: ToolConfig) => {
    console.log(`[Task Tool] Delegating to ${input.subagent_type}`);

    const toolCallId = config.toolCall?.id || "task_fallback";

    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: `Task delegated to ${input.subagent_type}. Routing will handle execution.`,
            tool_call_id: toolCallId,
          }),
        ],
      },
    });
  },
  {
    name: "task",
    description:
      "Delegate work to specialized subagent. Use this for media processing, research, and other complex tasks.",
    schema: taskToolSchema,
  }
);
