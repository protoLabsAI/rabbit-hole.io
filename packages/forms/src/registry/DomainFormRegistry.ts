/**
 * Domain Form Registry
 *
 * Central registry that maps entity types to their Zod schemas and form configurations.
 * Provides dynamic form generation capabilities for all 77 entity types across 12 domains.
 */

import { z } from "zod";

import {
  EntitySchemaRegistry,
  EntityType,
  ACADEMIC_ENTITY_SCHEMAS,
  ASTRONOMICAL_ENTITY_SCHEMAS,
  BIOLOGICAL_ENTITY_SCHEMAS,
  CULTURAL_ENTITY_SCHEMAS,
  ECONOMIC_ENTITY_SCHEMAS,
  GEOGRAPHIC_ENTITY_SCHEMAS,
  INFRASTRUCTURE_ENTITY_SCHEMAS,
  LEGAL_ENTITY_SCHEMAS,
  MEDICAL_ENTITY_SCHEMAS,
  SOCIAL_ENTITY_SCHEMAS,
  TECHNOLOGY_ENTITY_SCHEMAS,
  TRANSPORTATION_ENTITY_SCHEMAS,
  EvidenceSchema,
  ContentSchema,
  FileSchema,
  getEnrichmentFieldsForEntity,
} from "@protolabsai/types";

// Use the existing registry system
const registry = EntitySchemaRegistry.getInstance();

// Combine all domain schemas into unified registry
export const ALL_ENTITY_SCHEMAS = {
  ...ACADEMIC_ENTITY_SCHEMAS,
  ...ASTRONOMICAL_ENTITY_SCHEMAS,
  ...BIOLOGICAL_ENTITY_SCHEMAS,
  ...CULTURAL_ENTITY_SCHEMAS,
  ...ECONOMIC_ENTITY_SCHEMAS,
  ...GEOGRAPHIC_ENTITY_SCHEMAS,
  ...INFRASTRUCTURE_ENTITY_SCHEMAS,
  ...LEGAL_ENTITY_SCHEMAS,
  ...MEDICAL_ENTITY_SCHEMAS,
  ...SOCIAL_ENTITY_SCHEMAS,
  ...TECHNOLOGY_ENTITY_SCHEMAS,
  ...TRANSPORTATION_ENTITY_SCHEMAS,
  // Core types
  Evidence: EvidenceSchema,
  Content: ContentSchema,
  File: FileSchema,
} as const;

// Re-export type
export type { EntityType };
export type EntitySchema = z.ZodType<any>;

// Field configuration for dynamic form generation
export interface FieldConfig {
  type: "string" | "number" | "boolean" | "enum" | "array" | "object" | "date";
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: string[] | readonly string[]; // For enum fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

export interface FormConfig {
  title: string;
  description: string;
  fields: Record<string, FieldConfig>;
  sections?: {
    [sectionName: string]: string[]; // field names grouped by section
  };
}

/**
 * Extract field configuration from Zod schema
 *
 * Handles flattening of entity 'properties' fields so that domain-specific
 * properties (like Software.dependencies, Software.repository) are accessible
 * at the top level for form generation and validation.
 */
export function extractFieldConfig(
  schema: z.ZodType
): Record<string, FieldConfig> {
  const fields: Record<string, FieldConfig> = {};

  // Handle ZodObject schemas
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;

    Object.entries(shape).forEach(([key, value]) => {
      // Special handling for 'properties' field - flatten nested fields
      if (key === "properties") {
        let propertiesSchema: any = value;

        // Unwrap optional/nullable wrappers
        if (propertiesSchema instanceof z.ZodOptional) {
          propertiesSchema = propertiesSchema.unwrap();
        } else if (propertiesSchema instanceof z.ZodNullable) {
          propertiesSchema = propertiesSchema.unwrap();
        }

        // Extract fields from the properties object and flatten them
        if (propertiesSchema instanceof z.ZodObject) {
          Object.entries(propertiesSchema.shape).forEach(
            ([propKey, propValue]) => {
              fields[propKey] = analyzeZodField(
                propKey,
                propValue as z.ZodType
              );
            }
          );
        }
      } else {
        fields[key] = analyzeZodField(key, value as z.ZodType);
      }
    });
  }

  return fields;
}

/**
 * Analyze individual Zod field to determine form configuration
 */
function analyzeZodField(fieldName: string, zodField: z.ZodType): FieldConfig {
  // Handle optional fields
  if (zodField instanceof z.ZodOptional) {
    const innerField = analyzeZodField(
      fieldName,
      zodField.unwrap() as z.ZodType
    );
    return { ...innerField, required: false };
  }

  // Handle nullable fields
  if (zodField instanceof z.ZodNullable) {
    const innerField = analyzeZodField(
      fieldName,
      zodField.unwrap() as z.ZodType
    );
    return { ...innerField, required: false };
  }

  // Handle effects/refinements by analyzing inner schema
  if ("_def" in zodField && (zodField._def as any).schema) {
    return analyzeZodField(
      fieldName,
      (zodField._def as any).schema as z.ZodType
    );
  }

  // Handle defaults (treat as not required; analyze inner)
  if ("_def" in zodField && (zodField._def as any).innerType) {
    const innerField = analyzeZodField(
      fieldName,
      (zodField._def as any).innerType as z.ZodType
    );
    return { ...innerField, required: false };
  }

  // Handle literal types (enum-like)
  if (zodField instanceof z.ZodLiteral) {
    return {
      type: "string",
      label: formatFieldLabel(fieldName),
      required: true,
    };
  }

  // Handle date fields explicitly
  if (zodField instanceof z.ZodDate) {
    return {
      type: "date",
      label: formatFieldLabel(fieldName),
      required: true,
      validation: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
    };
  }

  // Handle enum types
  if (zodField instanceof z.ZodEnum) {
    return {
      type: "enum",
      label: formatFieldLabel(fieldName),
      options: zodField.options as readonly string[],
      required: true,
    };
  }

  // Handle string fields
  if (zodField instanceof z.ZodString) {
    const config: FieldConfig = {
      type: fieldName.toLowerCase().includes("date") ? "date" : "string",
      label: formatFieldLabel(fieldName),
      required: true,
    };

    // If inferred as date by name, enforce YYYY-MM-DD
    if (config.type === "date") {
      config.validation = {
        ...(config.validation ?? {}),
        pattern: /^\d{4}-\d{2}-\d{2}$/,
      };
    }

    // Add email validation
    if (fieldName.toLowerCase().includes("email")) {
      config.validation = {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Invalid email format",
      };
    }

    return config;
  }

  // Handle number fields
  if (zodField instanceof z.ZodNumber) {
    const config: FieldConfig = {
      type: "number",
      label: formatFieldLabel(fieldName),
      required: true,
    };

    // Extract min/max from Zod constraints
    zodField._def.checks?.forEach((check) => {
      if ((check as any).kind === "min") {
        config.validation = { ...config.validation, min: (check as any).value };
      }
      if ((check as any).kind === "max") {
        config.validation = { ...config.validation, max: (check as any).value };
      }
    });

    return config;
  }

  // Handle boolean fields
  if (zodField instanceof z.ZodBoolean) {
    return {
      type: "boolean",
      label: formatFieldLabel(fieldName),
      required: false,
    };
  }

  // Handle array fields
  if (zodField instanceof z.ZodArray) {
    return {
      type: "array",
      label: formatFieldLabel(fieldName),
      required: false,
    };
  }

  // Handle object fields
  if (zodField instanceof z.ZodObject) {
    return {
      type: "object",
      label: formatFieldLabel(fieldName),
      required: false,
    };
  }

  // Default fallback
  return {
    type: "string",
    label: formatFieldLabel(fieldName),
    required: false,
  };
}

/**
 * Format field name into human-readable label
 */
function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .trim();
}

/**
 * Get form configuration for specific entity type
 */
export function getFormConfig(
  entityType: EntityType,
  blacklistFields: string[] = []
): FormConfig {
  const schema = registry.getSchema(entityType);
  if (!schema) {
    throw new Error(`No schema found for entity type: ${entityType}`);
  }

  const allFields = extractFieldConfig(schema);

  // Validate blacklisted fields exist in schema
  const allFieldNames = Object.keys(allFields);
  const allFieldNamesSet = new Set(allFieldNames); // O(1) lookups
  const invalidBlacklistFields = blacklistFields.filter(
    (field) => !allFieldNamesSet.has(field)
  );
  if (invalidBlacklistFields.length > 0) {
    throw new Error(
      `Invalid blacklist fields for ${entityType}: ${invalidBlacklistFields.join(", ")}. ` +
        `Available fields: ${allFieldNames.join(", ")}`
    );
  }

  // Filter out auto-generated, system fields, and blacklisted fields
  const systemFields = new Set(["uid", "type"]); // O(1) lookups
  const blacklistFieldsSet = new Set(blacklistFields); // O(1) lookups
  const editableFields = Object.fromEntries(
    Object.entries(allFields).filter(
      ([key]) =>
        !systemFields.has(key) && // Remove UID (auto-generated) and type (pre-determined)
        !blacklistFieldsSet.has(key) // Remove user-specified blacklisted fields
    )
  );

  // Define common sections for better UX (using editable fields only)
  const commonFields = new Set(["name", "aliases", "tags"]); // O(1) lookups
  const sections = {
    "Basic Information": ["name", "aliases", "tags"],
    Properties: Object.keys(editableFields).filter(
      (key: string) =>
        !commonFields.has(key) &&
        !key.startsWith("location") &&
        !key.startsWith("created") &&
        !key.startsWith("updated")
    ),
    "Location & Time": Object.keys(editableFields).filter(
      (key: string) =>
        key.startsWith("location") ||
        key.startsWith("created") ||
        key.startsWith("updated")
    ),
  };

  return {
    title: `${String(entityType)} Form`,
    description: `Create or edit ${String(entityType).toLowerCase()} entity`,
    fields: editableFields, // Use filtered fields
    sections,
  };
}

/**
 * Get form configuration with enrichment fields prioritized
 *
 * Organizes fields into:
 * 1. Basic Information (name, aliases, tags)
 * 2. Enrichable Properties (domain-specific fields that can be researched)
 * 3. Advanced Fields (collapsible section with technical/universal fields)
 */
export function getFormConfigWithEnrichmentPriority(
  entityType: EntityType,
  blacklistFields: string[] = []
): FormConfig & { enrichmentFields: string[]; advancedFields: string[] } {
  const schema = registry.getSchema(entityType);
  if (!schema) {
    throw new Error(`No schema found for entity type: ${entityType}`);
  }

  const allFields = extractFieldConfig(schema);

  // Get enrichment fields for this entity type
  const enrichableFieldNames = getEnrichmentFieldsForEntity(
    entityType,
    entityType
  );
  const enrichableFieldsSet = new Set(enrichableFieldNames);

  // Validate blacklisted fields exist in schema
  const allFieldNames = Object.keys(allFields);
  const allFieldNamesSet = new Set(allFieldNames); // O(1) lookups
  const invalidBlacklistFields = blacklistFields.filter(
    (field) => !allFieldNamesSet.has(field)
  );
  if (invalidBlacklistFields.length > 0) {
    throw new Error(
      `Invalid blacklist fields for ${entityType}: ${invalidBlacklistFields.join(", ")}. ` +
        `Available fields: ${allFieldNames.join(", ")}`
    );
  }

  // Filter out auto-generated, system fields, and blacklisted fields
  const systemFields = new Set(["uid", "type"]); // O(1) lookups
  const blacklistFieldsSet = new Set(blacklistFields); // O(1) lookups
  const editableFields = Object.fromEntries(
    Object.entries(allFields).filter(
      ([key]) =>
        !systemFields.has(key) && // Remove UID (auto-generated) and type (pre-determined)
        !blacklistFieldsSet.has(key) // Remove user-specified blacklisted fields
    )
  );

  // Separate fields into enrichable and advanced (universal/technical)
  const basicFields = ["name", "aliases", "tags"];
  const basicFieldsSet = new Set(basicFields);

  const enrichmentFields: string[] = [];
  const advancedFields: string[] = [];

  Object.keys(editableFields).forEach((field) => {
    if (basicFieldsSet.has(field)) {
      // Skip basic fields (handled separately)
      return;
    } else if (enrichableFieldsSet.has(field)) {
      enrichmentFields.push(field);
    } else {
      advancedFields.push(field);
    }
  });

  // Define sections with enrichment fields first
  const sections = {
    "Basic Information": basicFields,
    "Enrichable Properties": enrichmentFields,
    ...(advancedFields.length > 0 && {
      "Advanced Fields": advancedFields,
    }),
  };

  return {
    title: `${String(entityType)} Form`,
    description: `Create or edit ${String(entityType).toLowerCase()} entity`,
    fields: editableFields,
    sections,
    enrichmentFields,
    advancedFields,
  };
}

/**
 * Get available entity types grouped by domain
 */
export function getEntityTypesByDomain() {
  return {
    core: ["Evidence", "Content", "File"],
    academic: Object.keys(ACADEMIC_ENTITY_SCHEMAS) as string[],
    astronomical: Object.keys(ASTRONOMICAL_ENTITY_SCHEMAS) as string[],
    biological: Object.keys(BIOLOGICAL_ENTITY_SCHEMAS) as string[],
    cultural: Object.keys(CULTURAL_ENTITY_SCHEMAS) as string[],
    economic: Object.keys(ECONOMIC_ENTITY_SCHEMAS) as string[],
    geographic: Object.keys(GEOGRAPHIC_ENTITY_SCHEMAS) as string[],
    infrastructure: Object.keys(INFRASTRUCTURE_ENTITY_SCHEMAS) as string[],
    legal: Object.keys(LEGAL_ENTITY_SCHEMAS) as string[],
    medical: Object.keys(MEDICAL_ENTITY_SCHEMAS) as string[],
    social: Object.keys(SOCIAL_ENTITY_SCHEMAS) as string[],
    technology: Object.keys(TECHNOLOGY_ENTITY_SCHEMAS) as string[],
    transportation: Object.keys(TRANSPORTATION_ENTITY_SCHEMAS) as string[],
  };
}

/**
 * Get schema for entity type
 */
export function getSchema(entityType: EntityType) {
  const schema = registry.getSchema(entityType);
  if (!schema) {
    throw new Error(`No schema found for entity type: ${entityType}`);
  }
  return schema;
}

/**
 * Validate entity data against schema
 */
export function validateEntity(entityType: EntityType, data: unknown) {
  const schema = getSchema(entityType);
  return schema.safeParse(data);
}
