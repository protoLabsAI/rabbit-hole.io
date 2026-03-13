/**
 * Validate Bundle Tool
 */

import { ToolMessage } from "@langchain/core/messages";
import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";

const EvidenceSchema = z.object({
  uid: z.string().refine((s) => s.startsWith("evidence:"), {
    message: "Evidence uid must start with 'evidence:'",
  }),
  kind: z.string(),
  title: z.string(),
  content: z.string().optional(),
  url: z.string().optional(),
});

const EntitySchema = z.object({
  uid: z.string().min(1),
  type: z.string(),
  name: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
});

const RelationshipSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
});

const BundleSchema = z.object({
  evidence: z.array(EvidenceSchema).min(1),
  entities: z.array(EntitySchema).min(1),
  relationships: z.array(RelationshipSchema),
  files: z.array(z.any()).optional().default([]),
  content: z.array(z.any()).optional().default([]),
});

export const validateBundleTool = tool(
  async (_input: Record<string, never>, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput() as { files?: Record<string, string> };
    const files = state?.files;

    if (!files) throw new Error("state.files is undefined");

    const bundleContent = files["/research/bundle.json"];
    if (!bundleContent) {
      throw new Error(
        `/research/bundle.json not found. Files: ${Object.keys(files).join(", ")}`
      );
    }

    const raw = JSON.parse(bundleContent);
    const bundleData = raw.bundle ?? raw;
    const parseResult = BundleSchema.safeParse(bundleData);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: JSON.stringify({ valid: false, errors, metrics: {} }),
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    const bundle = parseResult.data;
    const errors: string[] = [];
    const entityUids = new Set(bundle.entities.map((e) => e.uid));
    const evidenceUids = new Set(bundle.evidence.map((e) => e.uid));

    bundle.relationships.forEach((rel, idx) => {
      if (!entityUids.has(rel.source)) {
        errors.push(
          `relationships[${idx}].source "${rel.source}" not in entities`
        );
      }
      if (!entityUids.has(rel.target)) {
        errors.push(
          `relationships[${idx}].target "${rel.target}" not in entities`
        );
      }
    });

    const metrics = {
      entities: bundle.entities.length,
      relationships: bundle.relationships.length,
      evidence: bundle.evidence.length,
      completeness:
        bundle.entities.length > 0 && bundle.evidence.length > 0 ? 1.0 : 0.5,
      confidence:
        errors.length === 0 ? 0.9 : Math.max(0.3, 0.9 - errors.length * 0.1),
    };

    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: JSON.stringify({
              valid: errors.length === 0,
              errors,
              metrics,
            }),
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "validate_bundle",
    description: "Validate /research/bundle.json",
    schema: z.object({}),
  }
);
