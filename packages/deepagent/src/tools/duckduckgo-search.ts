/**
 * DuckDuckGo Search Tool
 *
 * Uses the DuckDuckGo Instant Answer API — no API key required.
 * Falls back to a text summary from the Abstract field when available.
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

const DUCKDUCKGO_API_URL = "https://api.duckduckgo.com/";

interface DuckDuckGoResponse {
  Abstract?: string;
  AbstractText?: string;
  AbstractSource?: string;
  AbstractURL?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
    Result?: string;
    Topics?: Array<{
      Text?: string;
      FirstURL?: string;
    }>;
  }>;
  Results?: Array<{
    Text?: string;
    FirstURL?: string;
  }>;
  Definition?: string;
  DefinitionURL?: string;
}

export interface DuckDuckGoSearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchDuckDuckGo(
  query: string
): Promise<DuckDuckGoSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    no_html: "1",
    skip_disambig: "1",
    no_redirect: "1",
  });

  const res = await fetch(`${DUCKDUCKGO_API_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": "rabbit-hole-research-agent/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`DuckDuckGo API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as DuckDuckGoResponse;
  const results: DuckDuckGoSearchResult[] = [];

  // Include abstract/instant answer if available
  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.AbstractSource || query,
      url: data.AbstractURL,
      snippet: data.AbstractText,
    });
  }

  // Include definition if available
  if (data.Definition && data.DefinitionURL) {
    results.push({
      title: `Definition: ${query}`,
      url: data.DefinitionURL,
      snippet: data.Definition,
    });
  }

  // Include top-level results
  if (data.Results) {
    for (const r of data.Results) {
      if (r.Text && r.FirstURL) {
        results.push({
          title: r.Text.slice(0, 100),
          url: r.FirstURL,
          snippet: r.Text,
        });
      }
    }
  }

  // Include related topics (up to 5)
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 5)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.slice(0, 100),
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
      // Handle nested topic groups
      if (topic.Topics) {
        for (const sub of topic.Topics.slice(0, 3)) {
          if (sub.Text && sub.FirstURL) {
            results.push({
              title: sub.Text.slice(0, 100),
              url: sub.FirstURL,
              snippet: sub.Text,
            });
          }
        }
      }
    }
  }

  return results;
}

export const duckduckgoSearchTool = tool(
  async (input: { query: string }, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput() as { files?: Record<string, string> };

    try {
      const results = await searchDuckDuckGo(input.query);

      if (results.length === 0) {
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: `DuckDuckGo: no results found for "${input.query}"`,
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      }

      const formatted = results
        .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`)
        .join("\n\n");

      const fileKey = `/research/duckduckgo-${Date.now()}.txt`;

      return new Command({
        update: {
          files: {
            ...(state?.files || {}),
            [fileKey]: formatted,
          },
          messages: [
            new ToolMessage({
              content: `DuckDuckGo: ${results.length} results for "${input.query}" (${formatted.length} chars)`,
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
              content: `DuckDuckGo error: ${error instanceof Error ? error.message : String(error)}`,
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }
  },
  {
    name: "duckduckgo_search",
    description:
      "Search the web using DuckDuckGo. No API key required. Returns instant answers and related topics.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);
