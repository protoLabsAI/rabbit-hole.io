/**
 * Wikipedia Search Tool for Research Agent
 * Reuses shared Wikipedia client with caching
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Cache stores resolved title + content to ensure URL matches fetched page
interface WikipediaEntry {
  title: string;
  content: string;
}
const cache = new Map<string, WikipediaEntry>();

async function fetchWikipediaWithCache(query: string): Promise<WikipediaEntry> {
  const key = query.toLowerCase().trim();
  const cached = cache.get(key);
  if (cached) return cached;

  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;
  const searchRes = await fetch(searchUrl);

  if (!searchRes.ok) {
    throw new Error(
      `Wikipedia search failed: ${searchRes.status} ${searchRes.statusText}`
    );
  }

  const searchData = (await searchRes.json()) as {
    query?: { search?: Array<{ title?: string }> };
  };

  const pageTitle = searchData.query?.search?.[0]?.title;
  if (!pageTitle) throw new Error(`No Wikipedia page found for: ${query}`);

  const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&explaintext=true&exlimit=1&format=json&origin=*`;
  const contentRes = await fetch(contentUrl);

  if (!contentRes.ok) {
    throw new Error(
      `Wikipedia content fetch failed: ${contentRes.status} ${contentRes.statusText}`
    );
  }

  const contentData = (await contentRes.json()) as {
    query?: { pages?: Record<string, { extract?: string }> };
  };

  const pages = contentData.query?.pages || {};
  const page = Object.values(pages)[0];
  const content = page?.extract || "";

  if (!content) throw new Error(`Empty content for: ${query}`);

  const truncated =
    content.length > 4000 ? content.slice(0, 4000) + "..." : content;

  const entry: WikipediaEntry = { title: pageTitle, content: truncated };
  cache.set(key, entry);
  return entry;
}

/**
 * Wikipedia Search Tool
 * Fetches Wikipedia content with caching and returns structured results
 */
export const wikipediaSearchTool = tool(
  async (input: { query: string; maxResults?: number }) => {
    const { query, maxResults = 1 } = input;

    try {
      const { title, content } = await fetchWikipediaWithCache(query);

      return JSON.stringify({
        success: true,
        query,
        results: [
          {
            source: "wikipedia",
            title,
            content, // Already truncated to 4000 chars by fetchWikipediaWithCache
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
            relevance: 1.0,
            contentLength: content.length,
          },
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return JSON.stringify({
        success: false,
        query,
        error: errorMessage,
        results: [],
        timestamp: new Date().toISOString(),
      });
    }
  },
  {
    name: "wikipedia_search",
    description:
      "Search Wikipedia for information about an entity. Returns article content with metadata.",
    schema: z.object({
      query: z.string().describe("Search query (entity name)"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum results to return (default: 1)"),
    }),
  }
);
