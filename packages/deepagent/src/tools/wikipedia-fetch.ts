/**
 * Wikipedia Fetch Tool
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

import { RESEARCH_FILE_PATHS } from "../constants/file-paths";

// Simple in-memory cache
const cache = new Map<string, string>();

async function fetchWikipedia(entityName: string): Promise<string> {
  const cacheKey = entityName.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Use Wikipedia API directly
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(entityName)}&srlimit=1&format=json&origin=*`;
  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as {
    query?: { search?: Array<{ title?: string }> };
  };

  const pageTitle = searchData.query?.search?.[0]?.title;
  if (!pageTitle) throw new Error(`No Wikipedia page found for: ${entityName}`);

  const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&explaintext=true&exlimit=1&format=json&origin=*`;
  const contentRes = await fetch(contentUrl);
  const contentData = (await contentRes.json()) as {
    query?: { pages?: Record<string, { extract?: string }> };
  };

  const pages = contentData.query?.pages || {};
  const page = Object.values(pages)[0];
  const content = page?.extract || "";

  if (!content) throw new Error(`Empty content for: ${entityName}`);

  // Truncate to 4000 chars
  const truncated =
    content.length > 4000 ? content.slice(0, 4000) + "..." : content;
  cache.set(cacheKey, truncated);
  return truncated;
}

export const wikipediaFetchTool = tool(
  async (input: { entityName: string }, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput() as { files?: Record<string, string> };

    try {
      const content = await fetchWikipedia(input.entityName);

      return new Command({
        update: {
          files: {
            ...(state?.files || {}),
            [RESEARCH_FILE_PATHS.WIKIPEDIA_CONTENT]: content,
          },
          messages: [
            new ToolMessage({
              content: `Wikipedia retrieved for "${input.entityName}" (${content.length} chars)`,
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
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }
  },
  {
    name: "wikipedia_fetch",
    description: `Fetch Wikipedia article. Writes to ${RESEARCH_FILE_PATHS.WIKIPEDIA_CONTENT}`,
    schema: z.object({
      entityName: z.string(),
    }),
  }
);
