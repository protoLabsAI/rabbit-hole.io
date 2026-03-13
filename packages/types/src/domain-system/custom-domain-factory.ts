/**
 * Custom Domain Factory
 *
 * Provides createCustomDomain() function for type-safe custom domain creation.
 */

import { z } from "zod";

import type { DomainConfig, DomainUIConfig } from "./domain-config.interface";
import { DomainConfigSchema } from "./validation-schemas";

/**
 * Create custom domain with full type safety
 *
 * @example
 * const automotiveDomain = createCustomDomain({
 *   name: "automotive",
 *   displayName: "Automotive",
 *   description: "Automotive industry entities",
 *   entities: {
 *     Car_Model: CarModelSchema,
 *     Manufacturer: ManufacturerSchema,
 *   },
 *   uidPrefixes: {
 *     Car_Model: "car_model",
 *     Manufacturer: "auto_manufacturer",
 *   },
 *   ui: {
 *     color: "#DC2626",
 *     icon: "🚗",
 *     entityIcons: {
 *       Car_Model: "🚙",
 *       Manufacturer: "🏭",
 *     },
 *   },
 * });
 */
export function createCustomDomain<
  TName extends string,
  TEntities extends Record<string, z.ZodSchema>,
>(spec: {
  name: TName;
  displayName: string;
  description: string;

  // Entity definitions with type inference
  entities: TEntities;

  // UID prefixes (required for all entities)
  uidPrefixes: {
    [K in keyof TEntities]: string;
  };

  // Optional configuration
  relationships?: string[];
  ui?: Partial<DomainUIConfig>;
  extendsFrom?: string;
  themeBindings?: DomainConfig["themeBindings"];
  version?: string;
  author?: string;
  tags?: string[];
}): DomainConfig {
  // Validate entity schemas extend EntitySchema
  Object.entries(spec.entities).forEach(([_entityType, schema]) => {
    if (!isValidEntitySchema(schema)) {
      throw new Error(
        `Entity schema must extend EntitySchema from @proto/types/domains/core`
      );
    }
  });

  // Generate validators automatically
  const validators: Record<string, (uid: string) => boolean> = {};
  Object.entries(spec.uidPrefixes).forEach(([_entityType, prefix]) => {
    validators[prefix as string] = (uid: string) =>
      uid.startsWith(`${prefix}:`);
  });

  // Build config
  const config: DomainConfig = {
    name: spec.name,
    displayName: spec.displayName,
    description: spec.description,
    category: "custom",

    entities: spec.entities as Record<string, z.ZodSchema>,
    uidPrefixes: spec.uidPrefixes as Record<string, string>,
    validators,

    relationships: spec.relationships || [],
    ui: {
      color: spec.ui?.color || "#6B7280",
      icon: spec.ui?.icon || "📦",
      entityIcons: spec.ui?.entityIcons || {},
    },

    extendsFrom: spec.extendsFrom,
    themeBindings: spec.themeBindings,
    version: spec.version,
    author: spec.author,
    tags: spec.tags,
  };

  // Validate complete config
  const validation = DomainConfigSchema.safeParse(config);
  if (!validation.success) {
    throw new Error(
      `Invalid domain configuration: ${validation.error.message}`
    );
  }

  return config;
}

/**
 * Helper to validate schema extends EntitySchema
 */
function isValidEntitySchema(schema: z.ZodSchema): boolean {
  // Check if schema is a ZodObject with the required base fields
  // We can't easily test at runtime with specific type literals,
  // so we just check if it looks like a ZodObject (extends will create one)

  // Check if it's a ZodObject or wrapped ZodObject
  let innerSchema = schema;

  // In Zod v4, effects/transforms use _def.schema
  if ((schema as any)._def?.schema) {
    innerSchema = (schema as any)._def.schema;
  }

  // If it's a ZodObject, assume it's valid (EntitySchema.extend() creates ZodObject)
  if (innerSchema instanceof z.ZodObject) {
    return true;
  }

  return false;
}
