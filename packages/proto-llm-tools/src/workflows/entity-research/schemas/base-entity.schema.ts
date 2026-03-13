import { z } from "zod";

/**
 * Base Entity Research Schema
 * Core entity identification and research parameters
 */
export const EntityBaseSchema = z.object({
  targetEntityName: z
    .string()
    .min(1)
    .describe("Name of the entity to research"),

  entityType: z
    .enum(["Person", "Organization", "Platform", "Movement", "Event"])
    .optional()
    .describe(
      "Type of entity to research - if not provided, will be auto-detected"
    ),

  researchDepth: z
    .enum(["basic", "detailed", "comprehensive"])
    .optional()
    .describe("Depth of research to perform"),

  focusAreas: z
    .array(z.string())
    .optional()
    .describe(
      "Areas to focus research on (biographical, financial, political, business, social, legal, technological, relationships, events, content)"
    ),
});

export type EntityBase = z.infer<typeof EntityBaseSchema>;
