/**
 * Tavily Search Tool
 *
 * Uses the Tavily Search API for high-quality web search results.
 * Requires TAVILY_API_KEY environment variable. If the key is absent,
 * the tool is not exported (callers should use filter(Boolean)).
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

const TAVILY_API_URL = "https://api.tavily.com/search";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface TavilyResponse {
  results?: TavilyResult[];
  answer?: string;
  error?: string;
}

async function searchTavily(
  query: string,
  apiKey: string,
  maxResults = 5
): Promise<TavilyResult[]> {
  const res = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Tavily API error: ${res.status} ${res.statusText} — ${body}`
    );
  }

  const data = (await res.json()) as TavilyResponse;

  if (data.error) {
    throw new Error(`Tavily API returned error: ${data.error}`);
  }

  return data.results || [];
}

function buildTavilyTool() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return null;
  }

  return tool(
    async (
      input: { query: string; maxResults?: number },
      config: ToolRunnableConfig
    ) => {
      const state = getCurrentTaskInput() as {
        files?: Record<string, string>;
      };

      try {
        const results = await searchTavily(
          input.query,
          apiKey,
          input.maxResults ?? 5
        );

        if (results.length === 0) {
          return new Command({
            update: {
              messages: [
                new ToolMessage({
                  content: `Tavily: no results found for "${input.query}"`,
                  tool_call_id: config.toolCall?.id as string,
                }),
              ],
            },
          });
        }

        const formatted = results
          .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
          .join("\n\n");

        const fileKey = `/research/tavily-${Date.now()}.txt`;

        return new Command({
          update: {
            files: {
              ...(state?.files || {}),
              [fileKey]: formatted,
            },
            messages: [
              new ToolMessage({
                content: `Tavily: ${results.length} results for "${input.query}" (${formatted.length} chars)`,
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      } catch (error) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: `Tavily error: ${error instanceof Error ? error.message : String(error)}`,
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      }
    },
    {
      name: "tavily_search",
      description:
        "Search the web using Tavily for high-quality, recent results. Requires TAVILY_API_KEY.",
      schema: z.object({
        query: z.string().describe("The search query"),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum number of results to return (default: 5)"),
      }),
    }
  );
}

/**
 * Tavily search tool instance. Will be null if TAVILY_API_KEY is not set.
 * Wire into subgraphs using .filter(Boolean) to gracefully skip when unavailable.
 */
export const tavilySearchTool = buildTavilyTool();
