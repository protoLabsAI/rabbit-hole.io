/**
 * LangExtract Wrapper Tool
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

import { RESEARCH_FILE_PATHS } from "../constants/file-paths";

const LANGEXTRACT_URL = process.env.LANGEXTRACT_URL || "http://localhost:8090";

export const langextractWrapperTool = tool(
  async (
    input: { entityType: string; promptDescription?: string },
    config: ToolRunnableConfig
  ) => {
    const state = getCurrentTaskInput() as { files?: Record<string, string> };

    try {
      const wikipediaContent =
        state?.files?.[RESEARCH_FILE_PATHS.WIKIPEDIA_CONTENT];

      if (!wikipediaContent) {
        throw new Error(
          `No Wikipedia content at ${RESEARCH_FILE_PATHS.WIKIPEDIA_CONTENT}`
        );
      }

      const prompt =
        input.promptDescription ||
        `Extract entity properties for a ${input.entityType} including: name, aliases, notable facts, key attributes`;

      const response = await fetch(`${LANGEXTRACT_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_or_documents: [wikipediaContent],
          prompt_description: prompt,
          model_id: "gemini-2.5-flash",
          include_source_grounding: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`LangExtract error: ${response.status}`);
      }

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: unknown;
        source_grounding?: unknown;
      };

      if (!result.success) {
        throw new Error(`Extraction failed: ${result.error || "Unknown"}`);
      }

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({ success: true, data: result.data, source_grounding: result.source_grounding }),
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
              content: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }
  },
  {
    name: "langextract_wrapper",
    description: `Extract entity properties using LangExtract service.`,
    schema: z.object({
      entityType: z.string(),
      promptDescription: z.string().optional(),
    }),
  }
);
