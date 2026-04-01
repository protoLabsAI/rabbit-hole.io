/**
 * Vector Memory Tool — research session semantic memory
 *
 * Allows the research loop LLM to search prior findings before
 * making external tool calls, avoiding redundant web searches.
 *
 * Backed by Qdrant research-memory collection, scoped per sessionId.
 * No-ops gracefully if QDRANT_URL or OLLAMA_ENDPOINT are not set.
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

import { searchResearchMemory } from "@proto/vector";

const VECTOR_ENABLED = !!(
  process.env.QDRANT_URL && process.env.OLLAMA_ENDPOINT
);

export const vectorMemoryTool = tool(
  async (input: { query: string }, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput() as { sessionId?: string };
    const sessionId = state?.sessionId;
    const toolCallId = config.toolCall?.id as string;

    if (!VECTOR_ENABLED || !sessionId) {
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content:
                "Vector memory not available — no prior findings to search.",
              tool_call_id: toolCallId,
            }),
          ],
        },
      });
    }

    try {
      const results = await searchResearchMemory(input.query, sessionId, 5);

      if (results.length === 0) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: `No prior findings match "${input.query}". Proceed with external search.`,
                tool_call_id: toolCallId,
              }),
            ],
          },
        });
      }

      const formatted = results
        .map(
          (r, i) =>
            `[Memory ${i + 1}] (score: ${r.score.toFixed(3)}) [${r.source}]\n${r.content}`
        )
        .join("\n\n");

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: `Found ${results.length} relevant prior findings:\n\n${formatted}`,
              tool_call_id: toolCallId,
            }),
          ],
        },
      });
    } catch (err) {
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: `Vector memory error: ${err instanceof Error ? err.message : String(err)}`,
              tool_call_id: toolCallId,
            }),
          ],
        },
      });
    }
  },
  {
    name: "search_memory",
    description:
      "Search prior research findings from this session using semantic similarity. " +
      "Call this BEFORE making external searches to avoid redundant work. " +
      "Returns the most relevant chunks from what has already been gathered.",
    schema: z.object({
      query: z
        .string()
        .describe("What you're looking for in prior research findings"),
    }),
  }
);
