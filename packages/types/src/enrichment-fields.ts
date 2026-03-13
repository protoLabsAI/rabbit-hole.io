/**
 * Entity Enrichment Field Definitions
 *
 * Client-safe utility for determining which fields to enrich for each entity type.
 * Dynamically extracts fields from domain schemas instead of hardcoding.
 */

import type { z } from "zod";

import { ACADEMIC_ENTITY_SCHEMAS } from "./domains/academic";
import { ASTRONOMICAL_ENTITY_SCHEMAS } from "./domains/astronomical";
import { BIOLOGICAL_ENTITY_SCHEMAS } from "./domains/biological";
import { CULTURAL_ENTITY_SCHEMAS } from "./domains/cultural";
import { ECONOMIC_ENTITY_SCHEMAS } from "./domains/economic";
import { GEOGRAPHIC_ENTITY_SCHEMAS } from "./domains/geographic";
import { INFRASTRUCTURE_ENTITY_SCHEMAS } from "./domains/infrastructure";
import { LEGAL_ENTITY_SCHEMAS } from "./domains/legal";
import { MEDICAL_ENTITY_SCHEMAS } from "./domains/medical";
import { SOCIAL_ENTITY_SCHEMAS } from "./domains/social";
import { TECHNOLOGY_ENTITY_SCHEMAS } from "./domains/technology";

// Combine all domain schemas
const ALL_ENTITY_SCHEMAS = {
  ...SOCIAL_ENTITY_SCHEMAS,
  ...ACADEMIC_ENTITY_SCHEMAS,
  ...GEOGRAPHIC_ENTITY_SCHEMAS,
  ...CULTURAL_ENTITY_SCHEMAS,
  ...ECONOMIC_ENTITY_SCHEMAS,
  ...MEDICAL_ENTITY_SCHEMAS,
  ...TECHNOLOGY_ENTITY_SCHEMAS,
  ...BIOLOGICAL_ENTITY_SCHEMAS,
  ...INFRASTRUCTURE_ENTITY_SCHEMAS,
  ...LEGAL_ENTITY_SCHEMAS,
  ...ASTRONOMICAL_ENTITY_SCHEMAS,
} as const;

// Fields that should never be enriched (system/identity fields)
const PROTECTED_FIELDS = new Set([
  "uid",
  "type",
  "name",
  "aliases",
  "tags",
  "canvas_x",
  "canvas_y",
  "id", // Legacy
  "subtype", // Legacy compatibility field
  "properties", // Generic properties object
]);

// Universal fields from base schema - not useful for Wikipedia enrichment
const UNIVERSAL_FIELDS = new Set([
  // Geospatial (technical data, not from Wikipedia)
  "latitude",
  "longitude",
  "altitude",
  "coordinate_accuracy",
  "altitude_accuracy",
  "geometry_type",
  "coordinates_verified",
  "address",
  "timezone",
  // Temporal (handled separately or too generic)
  "created_date",
  "destroyed_date",
  "active_from_date",
  "active_to_date",
  "first_observed_date",
  "last_observed_date",
  // Status (too generic)
  "status",
  "relatedEvents",
]);

/**
 * Extract enrichable fields from entity schema
 */
function extractFieldsFromSchema(schema: z.ZodObject<any>): string[] {
  const shape = schema.shape;
  const fields: string[] = [];

  // Get top-level optional fields (birthDate, nationality, etc.)
  Object.entries(shape).forEach(([key, value]) => {
    if (PROTECTED_FIELDS.has(key) || UNIVERSAL_FIELDS.has(key)) return;

    // Include simple optional fields
    if (
      (value as any).isOptional?.() ||
      (value as any)._def?.typeName === "ZodOptional"
    ) {
      fields.push(key);
    }
  });

  // Get fields from properties object if it exists
  if (shape.properties) {
    let propertiesSchema = shape.properties;

    // Unwrap ZodOptional - check both _def and def
    const def = (propertiesSchema as any)._def || (propertiesSchema as any).def;
    if (def?.type === "optional" || def?.typeName === "ZodOptional") {
      propertiesSchema = def.innerType;
    }

    // Access shape directly (getter auto-invoked)
    const propertiesShape = (propertiesSchema as any)?.shape;

    if (propertiesShape && typeof propertiesShape === "object") {
      Object.keys(propertiesShape).forEach((key) => {
        if (!PROTECTED_FIELDS.has(key) && !UNIVERSAL_FIELDS.has(key)) {
          fields.push(key);
        }
      });
    }
  }

  // Filter out duplicates and sort for consistent display
  return Array.from(new Set(fields)).sort();
}

/**
 * Get enrichment fields for an entity type
 * Returns a list of field names that should be extracted during enrichment
 */
export function getEnrichmentFieldsForEntity(
  entityType: string,
  _domainName: string
): string[] {
  const schema =
    ALL_ENTITY_SCHEMAS[entityType as keyof typeof ALL_ENTITY_SCHEMAS];

  if (!schema) {
    // Fallback for unknown types
    return ["description"];
  }

  return extractFieldsFromSchema(schema as z.ZodObject<any>);
}
