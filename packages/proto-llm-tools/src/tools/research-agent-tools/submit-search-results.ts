/**
 * Submit Search Results Tool
 * Schema-validated output tool for search subagent
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod";

/**
 * Search Result Schema
 * Individual Wikipedia search result
 */
const SearchResultSchema = z.object({
  source: z.literal("wikipedia"),
  title: z.string().describe("Wikipedia article title"),
  content: z
    .string()
    .max(6000)
    .describe("Extracted content (most relevant sections, max 6000 chars)"),
  url: z.string().url().describe("Full Wikipedia article URL"),
  relevance: z
    .number()
    .min(0)
    .max(1)
    .describe("Relevance score (1.0 for primary article)"),
  contentLength: z.number().int().positive().describe("Full article length"),
});

/**
 * Search Output Schema
 * Complete output from search subagent - matches prompt requirements
 */
export const SearchOutputSchema = z.object({
  entityName: z.string().describe("Entity being researched"),
  searchResults: z
    .array(SearchResultSchema)
    .min(1)
    .describe("Array of Wikipedia search results (at least 1 required)"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score (0.85 for Wikipedia articles)"),
  summary: z
    .string()
    .describe(
      "Brief summary: 'Retrieved Wikipedia article for {entity} ({chars} characters)'"
    ),
  timestamp: z.string().datetime().describe("ISO 8601 timestamp"),
});

export type SearchOutput = z.infer<typeof SearchOutputSchema>;

/**
 * Submit Search Results Tool
 * Validates and writes search results to workspace
 */
export const submitSearchResultsTool = tool(
  async (input: { output: unknown }, config: ToolRunnableConfig) => {
    const result = SearchOutputSchema.safeParse(input.output);

    if (!result.success) {
      const errors = result.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: `Validation failed: ${errors}. Please fix the output format and try again.`,
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    const validatedData = result.data;
    const filePath = "/research/search-results.json";

    return new Command({
      update: {
        files: {
          [filePath]: JSON.stringify(validatedData, null, 2),
        },
        confidence: validatedData.confidence,
        messages: [
          new ToolMessage({
            content: `Search results validated and saved to ${filePath}. Found ${validatedData.searchResults.length} result(s) for "${validatedData.entityName}".`,
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "submit_search_results",
    description:
      "Submit validated search results. Must include entityName, searchResults array, confidence score, and summary.",
    schema: z.object({
      output: z.any().describe("Search output object to validate and save"),
    }),
  }
);
