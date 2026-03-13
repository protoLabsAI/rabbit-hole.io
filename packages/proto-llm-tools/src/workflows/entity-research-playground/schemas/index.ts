import { z } from "zod";

import { ALL_ENTITY_TYPES } from "@proto/types";

/**
 * Entity Research Playground Input Schema
 *
 * Validates input parameters for the playground workflow.
 * Field selection defaults to 'basic' depth (required fields only).
 */
export const EntityResearchPlaygroundSchema = z.object({
  // Required: Entity to research
  entityName: z
    .string()
    .min(1, "Entity name is required")
    .max(200, "Entity name too long"),

  // Required: Entity type for schema selection
  entityType: z.enum(ALL_ENTITY_TYPES as [string, ...string[]]),

  // Optional: Specific fields to extract (defaults to required fields)
  selectedFields: z.array(z.string()).optional().default([]),

  // Optional: Research depth (defaults to 'basic')
  researchDepth: z
    .enum(["basic", "detailed", "comprehensive"])
    .optional()
    .default("basic"),

  // Optional: Skip human review step (defaults to false)
  skipReview: z.boolean().optional().default(false),
});

export type EntityResearchPlaygroundInput = z.infer<
  typeof EntityResearchPlaygroundSchema
>;

/**
 * Field Selection Configuration Schema
 */
export const FieldSelectionSchema = z.object({
  entityType: z.enum(ALL_ENTITY_TYPES as [string, ...string[]]),
  selectedFields: z.array(z.string()).min(1, "At least one field required"),
  includeRequired: z.boolean().default(true),
  includeOptional: z.boolean().default(false),
});

export type FieldSelectionInput = z.infer<typeof FieldSelectionSchema>;

/**
 * Entity Research Playground Output Schema
 */
export const EntityResearchPlaygroundOutputSchema = z.object({
  success: z.boolean(),
  entity: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(ALL_ENTITY_TYPES as [string, ...string[]]),
      metadata: z.record(z.string(), z.any()).optional(),
    })
    .partial()
    .optional(),
  entityName: z.string(),
  entityType: z.enum(ALL_ENTITY_TYPES as [string, ...string[]]),
  metrics: z.object({
    confidence: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    fieldsExtracted: z.number(),
    fieldsRequested: z.number(),
    processingTime: z.number(),
  }),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  dataGaps: z.array(z.string()),
});

export type EntityResearchPlaygroundOutput = z.infer<
  typeof EntityResearchPlaygroundOutputSchema
>;
