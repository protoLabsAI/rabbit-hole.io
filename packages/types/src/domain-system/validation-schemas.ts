/**
 * Domain Configuration Validation Schemas
 *
 * Zod schemas for validating domain configurations at runtime.
 */

import { z } from "zod";

/**
 * UI configuration schema
 */
export const DomainUIConfigSchema = z.object({
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be hex format"),
  icon: z.string().min(1),
  entityIcons: z.record(z.string(), z.string()).optional(),
  entityColors: z
    .record(
      z.string(),
      z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be hex format")
    )
    .optional(),
  card: z.any().optional(),
  legend: z.any().optional(),
});

/**
 * Theme bindings schema
 */
export const DomainThemeBindingsSchema = z
  .object({
    useThemeColors: z.boolean().optional(),
    primaryColor: z.string().optional(),
    allowIconOverride: z.boolean().optional(),
  })
  .optional();

/**
 * Complete domain configuration schema
 */
export const DomainConfigSchema = z.object({
  // Identity
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(["core", "custom", "extended"]),

  // Schema system
  entities: z.record(
    z.string(),
    z.custom<z.ZodTypeAny>((val) => val instanceof z.ZodType)
  ), // ZodSchema types
  uidPrefixes: z.record(z.string(), z.string()),
  validators: z.record(z.string(), z.function()),

  // Metadata
  relationships: z.array(z.string()),
  ui: DomainUIConfigSchema,

  // Extension
  extendsFrom: z.string().optional(),
  overrides: z.any().optional(),

  // Theme integration
  themeBindings: DomainThemeBindingsSchema,

  // Metadata
  version: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Validate domain configuration
 */
export function validateDomainConfig(
  config: unknown
):
  | { success: true; data: z.infer<typeof DomainConfigSchema> }
  | { success: false; error: z.ZodError } {
  return DomainConfigSchema.safeParse(config);
}
