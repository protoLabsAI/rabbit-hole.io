/**
 * Built-in Tools
 */

import { copilotkitEmitMessage } from "@copilotkit/sdk-js/langgraph";
import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

import type { Todo } from "../types";

export const writeTodos = tool(
  async (input: { todos: Todo[] }, config: ToolRunnableConfig) => {
    const completedTodo = input.todos.find((t) => t.status === "completed");
    if (completedTodo && config) {
      await copilotkitEmitMessage(
        config as unknown as Parameters<typeof copilotkitEmitMessage>[0],
        `Completed: ${completedTodo.content}`
      );
    }

    return new Command({
      update: {
        todos: input.todos,
        messages: [
          new ToolMessage({
            content: `Updated todo list with ${input.todos.length} items`,
            tool_call_id: (config.toolCall?.id as string) || "write_todos",
          }),
        ],
      },
    });
  },
  {
    name: "write_todos",
    description: "Create and manage todo list for tracking research progress.",
    schema: z.object({
      todos: z.array(
        z.object({
          content: z.string(),
          status: z.enum(["pending", "in_progress", "completed", "failed"]),
        })
      ),
    }),
  }
);

export const ls = tool(
  (input: { pattern?: string }) => {
    const state = getCurrentTaskInput() as { files?: Record<string, string> };
    const files = state?.files || {};
    const fileList = Object.keys(files);
    if (input.pattern)
      return fileList.filter((f) => f.includes(input.pattern!));
    return fileList;
  },
  {
    name: "ls",
    description: "List files in the research workspace",
    schema: z.object({
      pattern: z.string().optional(),
    }),
  }
);

export const readFile = tool(
  (input: { file_path: string; offset?: number; limit?: number }) => {
    const state = getCurrentTaskInput() as { files?: Record<string, string> };
    const files = state?.files || {};
    const { file_path, offset = 0, limit = 2000 } = input;

    if (!(file_path in files)) return `Error: File '${file_path}' not found`;

    const content = files[file_path];
    if (!content?.trim()) return "File exists but is empty";

    const lines = content.split("\n");
    const startIdx = offset;
    const endIdx = Math.min(startIdx + limit, lines.length);

    if (startIdx >= lines.length) {
      return `Error: Offset ${offset} exceeds file length (${lines.length})`;
    }

    return lines
      .slice(startIdx, endIdx)
      .map((line, i) => `${(startIdx + i + 1).toString().padStart(6)}\t${line}`)
      .join("\n");
  },
  {
    name: "read_file",
    description: "Read a file from the research workspace.",
    schema: z.object({
      file_path: z.string(),
      offset: z.number().optional().default(0),
      limit: z.number().optional().default(2000),
    }),
  }
);

export const writeFile = tool(
  (
    input: { file_path: string; content: string },
    config: ToolRunnableConfig
  ) => {
    const state = getCurrentTaskInput() as { files?: Record<string, string> };
    const files = { ...state?.files, [input.file_path]: input.content };

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: `Wrote ${input.content.length} chars to ${input.file_path}`,
            tool_call_id: (config.toolCall?.id as string) || "write_file",
          }),
        ],
      },
    });
  },
  {
    name: "write_file",
    description:
      "Write content to a file. Use submit_output for structured data.",
    schema: z.object({
      file_path: z.string(),
      content: z.string(),
    }),
  }
);
