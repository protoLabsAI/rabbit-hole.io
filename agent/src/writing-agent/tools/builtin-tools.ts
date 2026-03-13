/**
 * Builtin Tools for Writing Agent
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod";

import type { Todo } from "../state.js";

interface ToolConfig {
  toolCall?: {
    id?: string;
  };
}

/**
 * Write Todos Tool
 */
const todoSchema = z.array(
  z.object({
    content: z.string(),
    status: z.enum(["pending", "in_progress", "completed", "failed"]),
  })
);

export const writeTodos = tool(
  async (input: { todos: Todo[] }, config: ToolConfig) => {
    return new Command({
      update: {
        todos: input.todos,
        messages: [
          new ToolMessage({
            content: `Updated todos`,
            tool_call_id: config.toolCall?.id || "write_todos",
          }),
        ],
      },
    });
  },
  {
    name: "write_todos",
    description: "Update the task list to track writing progress",
    schema: z.object({
      todos: todoSchema.describe("Array of todo items"),
    }),
  }
);

/**
 * Read File Tool
 */
export const readFile = tool(
  async (input: { path: string }, config: ToolConfig) => {
    // Access state via closure - will be bound in node context
    const state = (config as any).state;
    const content = state?.files?.[input.path];

    if (!content) {
      throw new Error(`File not found: ${input.path}`);
    }

    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content,
            tool_call_id: config.toolCall?.id || "read_file",
          }),
        ],
      },
    });
  },
  {
    name: "read_file",
    description: "Read file from workspace (e.g., /workspace/transcript.json)",
    schema: z.object({
      path: z.string().describe("File path to read"),
    }),
  }
);

/**
 * Write File Tool
 */
export const writeFile = tool(
  async (input: { path: string; content: string }, config: ToolConfig) => {
    return new Command({
      update: {
        files: { [input.path]: input.content },
        messages: [
          new ToolMessage({
            content: `File written to ${input.path}`,
            tool_call_id: config.toolCall?.id || "write_file",
          }),
        ],
      },
    });
  },
  {
    name: "write_file",
    description:
      "Write file to workspace for sharing data between operations (usually JSON)",
    schema: z.object({
      path: z.string().describe("File path (e.g., /workspace/data.json)"),
      content: z.string().describe("File content"),
    }),
  }
);

/**
 * List Files Tool
 */
export const ls = tool(
  async (_input: Record<string, never>, config: ToolConfig) => {
    const state = (config as any).state;
    const files = Object.keys(state?.files || {});

    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: files.length > 0 ? files.join("\n") : "No files",
            tool_call_id: config.toolCall?.id || "ls",
          }),
        ],
      },
    });
  },
  {
    name: "ls",
    description: "List all files in workspace",
    schema: z.object({}),
  }
);
