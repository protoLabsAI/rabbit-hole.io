/**
 * Built-in Tools for Research Agent
 *
 * Core tools for task management and file I/O:
 * - write_todos: Manage todo list
 * - read_file: Read from mock filesystem
 * - write_file: Write to mock filesystem
 * - ls: List files in mock filesystem
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

export interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

/**
 * Write Todos Tool
 * Manages todo list with complete replacement
 */
export const writeTodos = tool(
  async (input: { todos: Todo[] }, config: ToolRunnableConfig) => {
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
    description:
      "Create and manage a todo list for tracking research progress. Use frequently to show transparent progress.",
    schema: z.object({
      todos: z
        .array(
          z.object({
            content: z.string().describe("Content of the todo item"),
            status: z
              .enum(["pending", "in_progress", "completed", "failed"])
              .describe("Status of the todo"),
          })
        )
        .describe("Complete list of todo items"),
    }),
  }
);

/**
 * List Files Tool
 */
export const ls = tool(
  (input: { pattern?: string }) => {
    const state = getCurrentTaskInput() as any;
    const files = state?.files || {};
    const fileList = Object.keys(files);

    if (input.pattern) {
      return fileList.filter((f) => f.includes(input.pattern!));
    }
    return fileList;
  },
  {
    name: "ls",
    description: "List all files in the research workspace",
    schema: z.object({
      pattern: z
        .string()
        .optional()
        .describe("Optional pattern to filter files"),
    }),
  }
);

/**
 * Read File Tool
 */
export const readFile = tool(
  (input: { file_path: string; offset?: number; limit?: number }) => {
    const state = getCurrentTaskInput() as any;
    const mockFilesystem = state?.files || {};
    const { file_path, offset = 0, limit = 2000 } = input;

    if (!(file_path in mockFilesystem)) {
      return `Error: File '${file_path}' not found`;
    }

    const content = mockFilesystem[file_path];

    if (!content || content.trim() === "") {
      return "System reminder: File exists but has empty contents";
    }

    const lines = content.split("\n");
    const startIdx = offset;
    const endIdx = Math.min(startIdx + limit, lines.length);

    if (startIdx >= lines.length) {
      return `Error: Line offset ${offset} exceeds file length (${lines.length} lines)`;
    }

    const resultLines: string[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      let lineContent = lines[i];
      if (lineContent.length > 2000) {
        lineContent = lineContent.substring(0, 2000);
      }
      const lineNumber = i + 1;
      resultLines.push(`${lineNumber.toString().padStart(6)}	${lineContent}`);
    }

    return resultLines.join("\n");
  },
  {
    name: "read_file",
    description:
      "Read a file from the research workspace. Returns content with line numbers.",
    schema: z.object({
      file_path: z.string().describe("Path to the file to read"),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe("Line offset to start reading from"),
      limit: z
        .number()
        .optional()
        .default(2000)
        .describe("Maximum number of lines to read"),
    }),
  }
);

/**
 * Write File Tool
 */
export const writeFile = tool(
  (
    input: { file_path: string; content: string },
    config: ToolRunnableConfig
  ) => {
    const state = getCurrentTaskInput() as any;
    const existingFiles = state?.files || {};
    const files = { ...existingFiles };
    files[input.file_path] = input.content;

    return new Command({
      update: {
        files: files,
        messages: [
          new ToolMessage({
            content: `Successfully wrote ${input.content.length} characters to ${input.file_path}`,
            tool_call_id: (config.toolCall?.id as string) || "write_file",
          }),
        ],
      },
    });
  },
  {
    name: "write_file",
    description:
      "Write content to a file in the research workspace. For structured data, use submit_output tools instead.",
    schema: z.object({
      file_path: z.string().describe("Path to the file to write"),
      content: z.string().describe("Content to write to the file"),
    }),
  }
);
