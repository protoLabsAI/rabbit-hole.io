/**
 * Submit Output Tool for Search Subagent
 *
 * Schema-validated output submission
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

/**
 * Search Results Output Schema
 */
export const SearchResultsSchema = z.object({
  entityName: z.string().describe("Entity that was searched"),
  searchResults: z
    .array(
      z.object({
        source: z.literal("wikipedia").describe("Source of the result"),
        content: z.string().describe("Search result content"),
        url: z.string().url().describe("Wikipedia URL"),
        relevance: z.number().min(0).max(1).describe("Relevance score 0-1"),
      })
    )
    .describe("Array of search results"),
  confidence: z.number().min(0).max(1).describe("Overall confidence score"),
  summary: z.string().describe("Brief summary of search results"),
});

export type SearchResults = z.infer<typeof SearchResultsSchema>;

/**
 * Submit Search Results Tool
 * Validates and writes search results to /research/search_results.json
 */
export const submitSearchResults = tool(
  async (input: { output: any }, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput() as any;

    // Validate output against schema
    const result = SearchResultsSchema.safeParse(input.output);

    if (!result.success) {
      const errorMessage = `Validation failed: ${result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`;

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: errorMessage,
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    // Write validated output to file
    const filePath = "/research/search_results.json";
    const fileContent = JSON.stringify(result.data, null, 2);

    return new Command({
      update: {
        files: {
          ...(state?.files || {}),
          [filePath]: fileContent,
        },
        messages: [
          new ToolMessage({
            content: `Search results validated and written to ${filePath}`,
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "submit_search_results",
    description:
      "Submit validated search results. Use this to complete the search task.",
    schema: z.object({
      output: z
        .any()
        .describe(
          "Search results object matching SearchResultsSchema (entityName, searchResults[], confidence, summary)"
        ),
    }),
  }
);
