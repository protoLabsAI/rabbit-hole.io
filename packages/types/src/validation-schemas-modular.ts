/**
 * Rabbit Hole Schema - Modular Validation System
 *
 * Evidence-based knowledge graph validation using modular domain architecture.
 * This replaces the monolithic validation-schemas.ts with a clean, maintainable system.
 */

import { z } from "zod";

import { domainRegistry } from "./domain-system";
import {
  EntitySchema,
  RelationshipSchema,
  RelationshipTypeEnum,
  ALL_RELATIONSHIP_TYPES,
  EvidenceSchema,
  ContentSchema,
  FileSchema,
} from "./domains/core";
import {
  EntitySchemaRegistry,
  EntityTypeEnum,
  ALL_ENTITY_TYPES,
  EntityType,
} from "./entity-schema-registry";
import type { SourceGrounding } from "./search/source-grounding";

// Export all domain schemas for direct access
export * from "./domains/core";
export * from "./domains/biological";
export * from "./domains/social";
export * from "./domains/geographic";
export * from "./domains/technology";
export * from "./domains/economic";
export * from "./domains/medical";
export * from "./domains/infrastructure";
export * from "./domains/transportation";
export * from "./domains/astronomical";
export * from "./domains/legal";
export * from "./domains/academic";
export * from "./domains/cultural";

// Export domain metadata
export * from "./domain-metadata";

// Export registry and enums
export {
  EntitySchemaRegistry,
  EntityTypeEnum,
  RelationshipTypeEnum,
  ALL_ENTITY_TYPES,
  ALL_RELATIONSHIP_TYPES,
};
export type { EntityType };

// ==================== Bundle Schema ====================

/**
 * SourceGroundingSchema — Zod runtime validator mirroring the SourceGrounding interface.
 * Kept in sync with packages/types/src/search/source-grounding.ts.
 */
const SourceGroundingSchema = z.object({
  claimText: z.string(),
  sourceUrl: z.string().url(),
  excerpt: z.string(),
  confidence: z.number().min(0).max(1),
  sourceTitle: z.string().optional(),
  publishedAt: z.string().optional(),
}) satisfies z.ZodType<SourceGrounding>;

export const RabbitHoleBundleSchema = z.object({
  evidence: z.array(EvidenceSchema).optional().default([]),
  files: z.array(FileSchema).optional().default([]),
  content: z.array(ContentSchema).optional().default([]),
  entities: z.array(EntitySchema).optional().default([]),
  relationships: z.array(RelationshipSchema).optional().default([]),
  /**
   * Per-entity citations: maps each entity UID to the source groundings that
   * support claims made about that entity.
   */
  entityCitations: z
    .record(z.string(), z.array(SourceGroundingSchema))
    .optional()
    .default({}),
  /**
   * Per-relationship citations: maps each relationship UID to the source
   * groundings that support the asserted connection.
   */
  relationshipCitations: z
    .record(z.string(), z.array(SourceGroundingSchema))
    .optional()
    .default({}),
});

// ==================== Validation Types ====================

export interface ValidationError {
  type: "validation" | "missing_reference" | "orphaned_node";
  message: string;
  field?: string;
  itemId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: z.infer<typeof RabbitHoleBundleSchema>;
}

// ==================== Validation Functions ====================

export function validateRabbitHoleBundle(data: unknown): ValidationResult {
  try {
    const result = RabbitHoleBundleSchema.parse(data);
    const registry = EntitySchemaRegistry.getInstance();
    const errors: ValidationError[] = [];

    // Cache supported entity types from BOTH registries (built-in + custom domains)
    const builtInTypes = new Set(registry.getAllEntityTypes());
    const customDomainTypes = new Set(
      Object.values(domainRegistry.getEntityTypesByDomain()).flat()
    );
    const supportedEntityTypes = new Set([
      ...builtInTypes,
      ...customDomainTypes,
    ]);

    // Validate entity types using both registries
    result.entities.forEach((entity, index) => {
      // Check if entity type is supported in either registry
      if (!supportedEntityTypes.has(entity.type)) {
        errors.push({
          type: "validation",
          message: `Unknown entity type: ${entity.type}`,
          field: `entities.${index}.type`,
          itemId: entity.uid,
        });
        return;
      }

      // Get domain-specific schema from built-in registry first
      let schema = registry.getSchema(entity.type);

      // If not found in built-in, try custom domainRegistry
      if (!schema) {
        schema = domainRegistry.getSchema(entity.type);
      }
      if (schema) {
        // Validate with domain-specific schema
        const entityResult = schema.safeParse(entity);
        if (!entityResult.success) {
          entityResult.error.issues.forEach((err: any) => {
            errors.push({
              type: "validation",
              message: `${err.message} for entity "${entity.name}" (${entity.uid})`,
              field: `entities.${index}.${err.path.join(".")}`,
              itemId: entity.uid,
            });
          });
        }
      } else {
        // Fall back to base EntitySchema for legacy entities
        const entityResult = EntitySchema.safeParse(entity);
        if (!entityResult.success) {
          entityResult.error.issues.forEach((err: any) => {
            errors.push({
              type: "validation",
              message: `${err.message} for entity "${entity.name}" (${entity.uid})`,
              field: `entities.${index}.${err.path.join(".")}`,
              itemId: entity.uid,
            });
          });
        }
      }

      // Validate UID format using both registries (built-in + custom)
      const isValidInBuiltIn = registry.validateUID(entity.uid);
      const isValidInCustom = domainRegistry.validateUID(entity.uid);

      if (!isValidInBuiltIn && !isValidInCustom) {
        errors.push({
          type: "validation",
          message: `Invalid UID format for entity "${entity.name}" (${entity.uid})`,
          field: `entities.${index}.uid`,
          itemId: entity.uid,
        });
      }
    });

    // Cache supported relationship types from BOTH built-in and custom domains
    const builtInRelationshipTypes = new Set(ALL_RELATIONSHIP_TYPES);
    const customDomainRelationshipTypes = new Set(
      Object.values(domainRegistry.getRelationshipTypesByDomain()).flat()
    );
    const supportedRelationshipTypes = new Set([
      ...builtInRelationshipTypes,
      ...customDomainRelationshipTypes,
    ]);

    // Validate UID references in relationships
    const entityUids = new Set(result.entities.map((e) => e.uid));
    const contentUids = new Set(result.content.map((c) => c.uid));
    const evidenceUids = new Set(result.evidence.map((e) => e.uid));
    const fileUids = new Set(result.files.map((f) => f.uid));

    const allValidUids = new Set([
      ...entityUids,
      ...contentUids,
      ...evidenceUids,
      ...fileUids,
    ]);

    result.relationships.forEach((rel, index) => {
      // Validate relationship type against both built-in and custom domains
      if (!supportedRelationshipTypes.has(rel.type)) {
        errors.push({
          type: "validation",
          message: `Unknown relationship type: ${rel.type}`,
          field: `relationships.${index}.type`,
          itemId: rel.uid,
        });
      }

      if (!allValidUids.has(rel.source)) {
        errors.push({
          type: "missing_reference",
          message: `Missing entity "${rel.source}" referenced as source in relationship "${rel.uid}"`,
          field: `relationships.${index}.source`,
          itemId: rel.uid,
        });
      }
      if (!allValidUids.has(rel.target)) {
        errors.push({
          type: "missing_reference",
          message: `Missing entity "${rel.target}" referenced as target in relationship "${rel.uid}"`,
          field: `relationships.${index}.target`,
          itemId: rel.uid,
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.issues.map((err: any) => {
          // Enhanced error handling for specific validation types
          let userMessage = err.message;
          const detailedMessage = err.message;

          // Special handling for relationship type validation errors
          if (
            err.path.some(
              (segment: any) =>
                typeof segment === "string" &&
                (segment.includes("relationships") || segment === "type")
            ) &&
            err.code === "invalid_enum_value"
          ) {
            const fieldPath = err.path.join(".");
            // For Zod enum errors, the invalid value is in the error context
            const invalidValue = (err as any).received || "unknown";

            // Clean user message
            userMessage = `Invalid relationship type "${invalidValue}" in field "${fieldPath}"`;

            // Log detailed error for debugging (includes some example relationship types)
            console.error(`🔍 Relationship validation error:`, {
              field: fieldPath,
              received: invalidValue,
              totalAvailableTypes: ALL_RELATIONSHIP_TYPES.length,
              exampleValidTypes: ALL_RELATIONSHIP_TYPES.slice(0, 10),
              allValidTypes: ALL_RELATIONSHIP_TYPES,
              fullErrorPath: err.path,
              zodErrorCode: err.code,
              helpMessage:
                "Check packages/types/src/domains/social/index.ts (or other domain files) to add missing relationship types",
            });
          }

          return {
            type: "validation" as const,
            message: userMessage,
            field: err.path.join("."),
            itemId:
              err.path[0] === "relationships" && typeof err.path[1] === "number"
                ? `relationship_${err.path[1]}`
                : undefined,
          };
        }),
      };
    }

    return {
      isValid: false,
      errors: [
        {
          type: "validation",
          message: `Validation error: ${error}`,
        },
      ],
    };
  }
}

// ==================== Legacy Exports ====================

// Re-export types for backward compatibility
export type Entity = z.infer<typeof EntitySchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type File = z.infer<typeof FileSchema>;
export type RabbitHoleBundleData = z.infer<typeof RabbitHoleBundleSchema>;
