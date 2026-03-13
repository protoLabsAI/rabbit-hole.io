/**
 * Batch Field Mapping Lookup Tool
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod";

import { log } from "../utils/logger";

const FIELD_MAPPINGS: Record<
  string,
  { entityType: string; confidence: number }
> = {
  occupation: { entityType: "Person", confidence: 0.7 },
  founder: { entityType: "Person", confidence: 0.85 },
  ceo: { entityType: "Person", confidence: 0.85 },
  author: { entityType: "Person", confidence: 0.8 },
  director: { entityType: "Person", confidence: 0.8 },
  company: { entityType: "Company", confidence: 0.9 },
  employer: { entityType: "Company", confidence: 0.85 },
  organization: { entityType: "Organization", confidence: 0.8 },
  city: { entityType: "City", confidence: 0.9 },
  birthplace: { entityType: "City", confidence: 0.85 },
  location: { entityType: "City", confidence: 0.7 },
  headquarters: { entityType: "City", confidence: 0.8 },
  education: { entityType: "Educational_Institution", confidence: 0.75 },
  university: { entityType: "Educational_Institution", confidence: 0.9 },
  school: { entityType: "Educational_Institution", confidence: 0.85 },
  movement: { entityType: "Movement", confidence: 0.85 },
};

function analyzeField(fieldName: string, fieldValue: string) {
  const normalized = fieldName.toLowerCase().trim();

  if (FIELD_MAPPINGS[normalized]) {
    const mapping = FIELD_MAPPINGS[normalized];
    return {
      fieldName,
      fieldValue,
      shouldCreateEntity: true,
      suggestedEntityType: mapping.entityType,
      confidence: mapping.confidence,
      matchType: "exact",
    };
  }

  for (const [key, mapping] of Object.entries(FIELD_MAPPINGS)) {
    if (normalized.includes(key)) {
      return {
        fieldName,
        fieldValue,
        shouldCreateEntity: true,
        suggestedEntityType: mapping.entityType,
        confidence: mapping.confidence * 0.8,
        matchType: "partial",
      };
    }
  }

  return {
    fieldName,
    fieldValue,
    shouldCreateEntity: false,
    suggestedEntityType: null,
    confidence: 0,
    matchType: "none",
  };
}

export const batchFieldMappingLookupTool = tool(
  async (
    input: { fields: Array<{ fieldName: string; fieldValue: string }> },
    config: ToolRunnableConfig
  ) => {
    log.debug(`Batch analyzing ${input.fields.length} fields`);

    const results = input.fields.map((f) =>
      analyzeField(f.fieldName, f.fieldValue)
    );
    const matched = results.filter((r) => r.shouldCreateEntity).length;

    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: JSON.stringify({
              results,
              summary: `Analyzed ${input.fields.length} fields, ${matched} entity-worthy`,
            }),
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "batch_field_mapping_lookup",
    description: "Analyze multiple fields for entity-worthiness.",
    schema: z.object({
      fields: z
        .array(
          z.object({
            fieldName: z.string(),
            fieldValue: z.string(),
          })
        )
        .min(1),
    }),
  }
);
