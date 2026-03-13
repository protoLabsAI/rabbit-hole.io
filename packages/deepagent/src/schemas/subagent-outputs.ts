/**
 * Subagent Output Schemas
 */

import { z } from "zod";

import { EntitySchema, RelationshipSchema, EvidenceSchema } from "@proto/types";
import type { SourceGrounding } from "@proto/types";

const SourceGroundingSchema: z.ZodType<SourceGrounding> = z.object({
  claimText: z.string(),
  sourceUrl: z.string().url(),
  excerpt: z.string(),
  confidence: z.number().min(0).max(1),
  sourceTitle: z.string().optional(),
  publishedAt: z.string().optional(),
});

export const EvidenceGathererOutputSchema = z.object({
  evidence: z
    .array(EvidenceSchema.extend({ grounding: z.array(SourceGroundingSchema).optional() }))
    .min(1, "Must create at least one evidence node"),
  summary: z.string().describe("Brief summary of gathered evidence"),
});

export type EvidenceGathererOutput = z.infer<
  typeof EvidenceGathererOutputSchema
>;

export const EntityExtractorOutputSchema = z.object({
  entity: EntitySchema,
  extractedProperties: z
    .record(z.string(), z.any())
    .describe("Raw properties before field mapping"),
});

export type EntityExtractorOutput = z.infer<typeof EntityExtractorOutputSchema>;

export const FieldAnalyzerOutputSchema = z.object({
  entityWorthyFields: z.array(
    z.object({
      fieldName: z.string(),
      fieldValue: z.any(),
      suggestedEntityType: z.string(),
      reasoning: z.string().optional(),
    })
  ),
  shouldCreateEntities: z.boolean(),
});

export type FieldAnalyzerOutput = z.infer<typeof FieldAnalyzerOutputSchema>;

export const EntityCreatorOutputSchema = z.object({
  createdEntities: z.array(EntitySchema),
  skippedFields: z
    .array(z.object({ fieldName: z.string(), reason: z.string() }))
    .optional(),
});

export type EntityCreatorOutput = z.infer<typeof EntityCreatorOutputSchema>;

export const RelationshipMapperOutputSchema = z.object({
  relationships: z.array(RelationshipSchema),
  summary: z.string().describe("Summary of relationships created"),
});

export type RelationshipMapperOutput = z.infer<
  typeof RelationshipMapperOutputSchema
>;

export const BundleAssemblerOutputSchema = z.object({
  bundle: z.object({
    evidence: z.array(EvidenceSchema),
    entities: z.array(EntitySchema).min(1, "Must have at least primary entity"),
    relationships: z.array(RelationshipSchema),
    files: z.array(z.any()).default([]),
    content: z.array(z.any()).default([]),
  }),
  validationErrors: z.array(z.string()).optional(),
  metrics: z.object({
    confidence: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1),
  }),
});

export type BundleAssemblerOutput = z.infer<typeof BundleAssemblerOutputSchema>;
