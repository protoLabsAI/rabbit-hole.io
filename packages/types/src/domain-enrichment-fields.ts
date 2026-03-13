/**
 * Domain Enrichment Fields Utility
 *
 * Dynamically extracts available enrichment fields from domain configs
 * ensuring consistency with actual domain definitions.
 */

import { domainRegistry } from "./domain-system/domain-registry";

/**
 * Get available enrichment fields for a specific entity type
 * Extracts field names from both the entity schema and enrichment examples
 */
export function getEnrichmentFieldsForEntityType(entityType: string): string[] {
  try {
    // Find the domain that contains this entity type
    const allDomains = domainRegistry.getAllDomains();

    for (const domain of allDomains) {
      if (domain.entities && entityType in domain.entities) {
        const fieldsSet = new Set<string>();

        // First, get fields from enrichment examples (these are validated)
        if (
          domain.enrichmentExamples &&
          entityType in domain.enrichmentExamples
        ) {
          const example = domain.enrichmentExamples[entityType];
          if (example && "expected_output" in example) {
            Object.keys(example.expected_output).forEach((field) =>
              fieldsSet.add(field)
            );
          }
        }

        // Then, try to extract fields from the Zod schema
        const entitySchema = domain.entities[entityType];
        if (entitySchema && typeof entitySchema === "object") {
          try {
            // Zod schemas have a _def property with shape information
            const def = (entitySchema as any)._def;
            if (def?.schema?._def?.shape?.()?.properties?._def?.shape) {
              const propertiesShape = def.schema._def
                .shape()
                .properties._def.shape();
              Object.keys(propertiesShape).forEach((field) =>
                fieldsSet.add(field)
              );
            }
          } catch (schemaError) {
            // If we can't parse the schema, that's okay - we have example fields
            console.debug(
              `Could not extract schema fields for ${entityType}:`,
              schemaError
            );
          }
        }

        // Return fields as array, with enrichment example fields first (prioritized)
        return Array.from(fieldsSet);
      }
    }

    return [];
  } catch (error) {
    console.error(`Error getting enrichment fields for ${entityType}:`, error);
    return [];
  }
}

/**
 * Get enrichment fields for all entity types
 * Returns a mapping of entity type -> available fields
 */
export function getAllEnrichmentFields(): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  try {
    const allDomains = domainRegistry.getAllDomains();

    for (const domain of allDomains) {
      if (domain.entities) {
        // Iterate all entity types from the domain schema
        for (const entityType of Object.keys(domain.entities)) {
          // Reuse single-source logic via getEnrichmentFieldsForEntityType
          const fields = getEnrichmentFieldsForEntityType(entityType);
          if (fields.length > 0) {
            result[entityType] = fields;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error getting all enrichment fields:", error);
  }

  return result;
}
