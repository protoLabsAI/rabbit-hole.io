/**
 * SearXNG Search Tool
 *
 * Full-surface SearXNG JSON API tool for multi-hop research agents.
 * Connects to SEARXNG_ENDPOINT (default: http://searxng:8888).
 * No API key required — fully self-contained.
 *
 * Replaces dedicated web search, news, Wikipedia, and DuckDuckGo tools
 * by routing through SearXNG categories and bang syntax.
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

// ---------------------------------------------------------------------------
// SearXNG response types
// ---------------------------------------------------------------------------

interface SearxngResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  score?: number;
}

interface SearxngInfoboxAttribute {
  label: string;
  value: string;
}

interface SearxngInfoboxUrl {
  url: string;
  title: string;
}

interface SearxngInfoboxRelatedTopic {
  name: string;
}

interface SearxngInfobox {
  infobox: string;
  content: string;
  attributes: SearxngInfoboxAttribute[];
  urls: SearxngInfoboxUrl[];
  relatedTopics: SearxngInfoboxRelatedTopic[];
}

interface SearxngResponse {
  results?: SearxngResult[];
  suggestions?: string[];
  infoboxes?: SearxngInfobox[];
  answers?: string[];
  error?: string;
}

// ---------------------------------------------------------------------------
// HTTP fetch helper
// ---------------------------------------------------------------------------

async function fetchSearxng(
  query: string,
  endpoint: string,
  options: {
    category?: string;
    time_range?: string;
    pageno?: number;
  } = {}
): Promise<SearxngResponse> {
  const url = new URL("/search", endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");

  if (options.category) {
    url.searchParams.set("categories", options.category);
  }
  if (options.time_range) {
    url.searchParams.set("time_range", options.time_range);
  }
  url.searchParams.set("pageno", String(options.pageno ?? 1));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SearXNG error: ${res.status} ${res.statusText} — ${body}`);
  }

  const data = (await res.json()) as SearxngResponse;

  if (data.error) {
    throw new Error(`SearXNG returned error: ${data.error}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const searxngSearchTool = tool(
  async (
    input: {
      query: string;
      category?: "general" | "news" | "science" | "it";
      time_range?: "day" | "week" | "month" | "year";
      pageno?: number;
    },
    config: ToolRunnableConfig
  ) => {
    const endpoint = process.env.SEARXNG_ENDPOINT ?? "http://searxng:8888";

    const state = getCurrentTaskInput() as {
      files?: Record<string, string>;
    };

    try {
      const data = await fetchSearxng(input.query, endpoint, {
        category: input.category,
        time_range: input.time_range,
        pageno: input.pageno,
      });

      const results = data.results ?? [];
      const suggestions = data.suggestions ?? [];
      const infoboxes = (data.infoboxes ?? []).map((ib) => ({
        infobox: ib.infobox ?? "",
        content: ib.content ?? "",
        attributes: ib.attributes ?? [],
        urls: ib.urls ?? [],
        relatedTopics: ib.relatedTopics ?? [],
      }));
      const answers = data.answers ?? [];

      // Build formatted results text (stored in files state)
      const sections: string[] = [];

      if (answers.length > 0) {
        sections.push(
          `=== Direct Answers ===\n${answers.map((a, i) => `[A${i + 1}] ${a}`).join("\n")}`
        );
      }

      if (results.length > 0) {
        sections.push(
          `=== Results ===\n${results
            .map(
              (r, i) =>
                `[${i + 1}] ${r.title}\nURL: ${r.url}\nEngine: ${r.engine}${r.score != null ? ` | Score: ${r.score}` : ""}\n${r.content}`
            )
            .join("\n\n")}`
        );
      }

      if (infoboxes.length > 0) {
        sections.push(
          `=== Infoboxes ===\n${infoboxes
            .map((ib) => {
              const parts = [`** ${ib.infobox} **`, ib.content];
              if (ib.attributes.length > 0) {
                parts.push(
                  ib.attributes
                    .map((a) => `  ${a.label}: ${a.value}`)
                    .join("\n")
                );
              }
              if (ib.urls.length > 0) {
                parts.push(
                  ib.urls.map((u) => `  ${u.title}: ${u.url}`).join("\n")
                );
              }
              if (ib.relatedTopics.length > 0) {
                parts.push(
                  `  Related: ${ib.relatedTopics.map((t) => t.name).join(", ")}`
                );
              }
              return parts.join("\n");
            })
            .join("\n\n")}`
        );
      }

      if (suggestions.length > 0) {
        sections.push(
          `=== Suggestions ===\n${suggestions.map((s) => `- ${s}`).join("\n")}`
        );
      }

      const formatted =
        sections.length > 0
          ? sections.join("\n\n")
          : `No results found for "${input.query}"`;

      const fileKey = `/research/searxng-${Date.now()}.txt`;

      const summary = `SearXNG: ${results.length} results, ${suggestions.length} suggestions, ${infoboxes.length} infoboxes for "${input.query}"`;

      return new Command({
        update: {
          files: {
            ...(state?.files || {}),
            [fileKey]: formatted,
          },
          pendingSuggestions: suggestions,
          infoboxes: infoboxes,
          messages: [
            new ToolMessage({
              content: summary,
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
              content: `SearXNG error: ${error instanceof Error ? error.message : String(error)}`,
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }
  },
  {
    name: "searxng_search",
    description:
      "Search via SearXNG with category routing (general, news, science, it). " +
      "Replaces web search, news, Wikipedia, and DuckDuckGo. " +
      "Supports bang syntax (!wp, !scholar, !ddg) in the query string. " +
      "No API key required.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search query. Supports SearXNG bang syntax (e.g. !wp, !scholar)."
        ),
      category: z
        .enum(["general", "news", "science", "it"])
        .optional()
        .describe("SearXNG category to search. Defaults to 'general'."),
      time_range: z
        .enum(["day", "week", "month", "year"])
        .optional()
        .describe("Limit results to a time range."),
      pageno: z
        .number()
        .optional()
        .describe("Page number for pagination. Defaults to 1."),
    }),
  }
);
