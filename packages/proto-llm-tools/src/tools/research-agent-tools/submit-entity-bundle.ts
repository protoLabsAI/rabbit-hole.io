/**
 * Submit Entity Bundle Tool
 * Schema-validated output tool for entity-builder subagent
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod";

/**
 * Entity Bundle Schema
 * Complete RabbitHole bundle structure
 */
export const EntityBundleSchema = z.object({
  evidence: z.array(z.any()).min(1).describe("Evidence nodes (min 1 required)"),
  entities: z.array(z.any()).min(1).describe("Entities (min 1 required)"),
  relationships: z.array(z.any()).describe("Relationships between entities"),
  files: z.array(z.any()).default([]).describe("File attachments"),
  content: z.array(z.any()).default([]).describe("Content items"),
});

export type EntityBundle = z.infer<typeof EntityBundleSchema>;

/**
 * Submit Entity Bundle Tool
 * Validates and writes complete RabbitHole bundle
 */
export const submitEntityBundleTool = tool(
  async (input: { bundle: unknown }, config: ToolRunnableConfig) => {
    const result = EntityBundleSchema.safeParse(input.bundle);

    if (!result.success) {
      const errors = result.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: `Bundle validation failed: ${errors}. Please fix and try again.`,
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    const bundle = result.data;
    const filePath = "/research/bundle.json";

    console.log(
      `✅ Entity bundle validated: ${bundle.entities.length} entities, ${bundle.relationships.length} relationships, ${bundle.evidence.length} evidence`
    );

    return new Command({
      update: {
        files: {
          [filePath]: JSON.stringify(bundle, null, 2),
        },
        messages: [
          new ToolMessage({
            content: `Entity bundle validated and saved to ${filePath}. Contains ${bundle.entities.length} entities, ${bundle.relationships.length} relationships, ${bundle.evidence.length} evidence.`,
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "submit_entity_bundle",
    description:
      "Submit validated RabbitHole bundle. Must include evidence (min 1), entities (min 1), and relationships arrays.",
    schema: z.object({
      bundle: z.any().describe("Complete RabbitHole bundle object"),
    }),
  }
);
