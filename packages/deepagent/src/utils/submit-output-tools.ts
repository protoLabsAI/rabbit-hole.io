/**
 * Submit Output Tools for Subagents
 */

import { ToolMessage } from "@langchain/core/messages";
import {
  tool,
  type ToolRunnableConfig,
  type StructuredTool,
} from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

import { SUBAGENT_OUTPUT_PATHS } from "../constants/file-paths";
import {
  EvidenceGathererOutputSchema,
  EntityExtractorOutputSchema,
  FieldAnalyzerOutputSchema,
  EntityCreatorOutputSchema,
  RelationshipMapperOutputSchema,
  BundleAssemblerOutputSchema,
} from "../schemas/subagent-outputs";

import { log } from "./logger";

const SCHEMA_MAP: Record<string, z.ZodSchema> = {
  "evidence-gatherer": EvidenceGathererOutputSchema,
  "entity-extractor": EntityExtractorOutputSchema,
  "field-analyzer": FieldAnalyzerOutputSchema,
  "entity-creator": EntityCreatorOutputSchema,
  "relationship-mapper": RelationshipMapperOutputSchema,
  "bundle-assembler": BundleAssemblerOutputSchema,
};

export function createSubmitOutputTools(): Record<string, StructuredTool> {
  const submitTools: Record<string, StructuredTool> = {};

  for (const [subagentName, schema] of Object.entries(SCHEMA_MAP)) {
    const outputPath = SUBAGENT_OUTPUT_PATHS[subagentName];

    submitTools[`submit_output_${subagentName.replace(/-/g, "_")}`] = tool(
      (input: { output: unknown }, config: ToolRunnableConfig) => {
        const result = schema.safeParse(input.output);

        if (!result.success) {
          const errors = result.error.issues
            .map((i) => `- ${i.path.join(".")}: ${i.message}`)
            .join("\n");

          return new Command({
            update: {
              messages: [
                new ToolMessage({
                  content: `Schema validation failed for ${subagentName}:\n${errors}\n\nFix these errors and try again.`,
                  tool_call_id:
                    (config.toolCall?.id as string) || `submit_${subagentName}`,
                }),
              ],
            },
          });
        }

        const state = getCurrentTaskInput() as {
          files?: Record<string, string>;
        };
        const files = { ...state?.files };
        files[outputPath] = JSON.stringify(result.data, null, 2);

        log.debug(`${subagentName} → ${outputPath}`);

        return new Command({
          update: {
            files,
            messages: [
              new ToolMessage({
                content: `Successfully submitted validated output to ${outputPath}`,
                tool_call_id:
                  (config.toolCall?.id as string) || `submit_${subagentName}`,
              }),
            ],
          },
        });
      },
      {
        name: `submit_output_${subagentName.replace(/-/g, "_")}`,
        description: `Submit ${subagentName} output. Validates and writes to ${outputPath}.`,
        schema: z.object({
          output: z.any().describe(`${subagentName} output`),
        }),
      }
    );
  }

  return submitTools;
}

const CACHED_SUBMIT_TOOLS = createSubmitOutputTools();

export function getSubmitOutputTool(subagentName: string): StructuredTool {
  const toolName = `submit_output_${subagentName.replace(/-/g, "_")}`;
  const submitTool = CACHED_SUBMIT_TOOLS[toolName];
  if (!submitTool) throw new Error(`No submit tool for: ${subagentName}`);
  return submitTool;
}

export function getAllSubmitOutputTools(): StructuredTool[] {
  return Object.values(CACHED_SUBMIT_TOOLS);
}
