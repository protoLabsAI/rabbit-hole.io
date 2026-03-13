import { z } from "zod";

/**
 * Research Source Schema
 * Defines the structure for raw data sources
 */
export const EntityResearchSourceSchema = z.object({
  content: z.string().min(1).describe("Raw text content from the source"),

  source: z.string().min(1).describe("Name of the data source"),

  sourceType: z
    .string()
    .describe("Type of source (user_provided, wikipedia, sec_filing, etc.)"),

  sourceUrl: z.string().optional().describe("URL of the source if available"),

  retrievedAt: z
    .string()
    .optional()
    .describe("ISO timestamp when data was retrieved"),

  reliability: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Reliability score of the source (0-1)"),

  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe("Additional metadata about the source"),
});

export const RawDataSchema = z
  .array(EntityResearchSourceSchema)
  .optional()
  .describe(
    "Raw data sources to analyze - if empty, will automatically fetch from Wikipedia"
  );

export type EntityResearchSource = z.infer<typeof EntityResearchSourceSchema>;
export type RawData = z.infer<typeof RawDataSchema>;
