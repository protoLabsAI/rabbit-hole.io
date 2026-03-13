import { z } from "zod";

/**
 * Data Source Configuration Schema
 * Controls which data sources are enabled and their settings
 */
export const DataSourceConfigSchema = z
  .object({
    userProvided: z
      .object({
        enabled: z.boolean(),
      })
      .optional(),

    wikipedia: z
      .object({
        enabled: z.boolean(),
        maxResults: z.number().optional(),
      })
      .optional(),

    sec: z
      .object({
        enabled: z.boolean(),
        maxFilings: z.number().optional(),
      })
      .optional(),

    corporateWebsite: z
      .object({
        enabled: z.boolean(),
        includePress: z.boolean().optional(),
      })
      .optional(),

    termsOfService: z
      .object({
        enabled: z.boolean(),
        includeHistory: z.boolean().optional(),
      })
      .optional(),

    academicSources: z
      .object({
        enabled: z.boolean(),
        maxResults: z.number().optional(),
      })
      .optional(),

    newsArchives: z
      .object({
        enabled: z.boolean(),
        sources: z.array(z.string()).optional(),
      })
      .optional(),

    autoDetectSources: z.boolean().optional(),
  })
  .passthrough()
  .optional()
  .describe(
    "Configuration for different data sources - most are disabled by default"
  );

export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;
