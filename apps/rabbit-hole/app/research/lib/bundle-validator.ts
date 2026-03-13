/**
 * Bundle Validator
 *
 * Validates research bundles before merge:
 * - Schema compliance
 * - Reference integrity
 * - UID uniqueness
 * - Required fields
 */

import type { Entity, Relationship } from "@proto/types";

export interface ValidationError {
  type: "error" | "warning";
  field: string;
  message: string;
  entityId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    entities: number;
    relationships: number;
    uniqueTypes: number;
  };
}

export interface ResearchBundle {
  entities: Entity[];
  relationships: Relationship[];
  metadata: {
    version: string;
    sessionId: string;
    sessionName?: string;
    createdAt: string;
    userId?: string;
  };
}

/**
 * Validate a research bundle
 */
export function validateBundle(bundle: ResearchBundle): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate metadata
  if (!bundle.metadata.version) {
    errors.push({
      type: "error",
      field: "metadata.version",
      message: "Version is required",
    });
  }

  if (!bundle.metadata.sessionId) {
    errors.push({
      type: "error",
      field: "metadata.sessionId",
      message: "Session ID is required",
    });
  }

  // Track entity UIDs for reference checking
  const entityUids = new Set<string>();
  const typeSet = new Set<string>();

  // Validate entities
  bundle.entities.forEach((entity, index) => {
    // Check required fields
    if (!entity.uid) {
      errors.push({
        type: "error",
        field: `entities[${index}].uid`,
        message: "Entity UID is required",
        entityId: entity.uid,
      });
    }

    if (!entity.name) {
      errors.push({
        type: "error",
        field: `entities[${index}].name`,
        message: "Entity name is required",
        entityId: entity.uid,
      });
    }

    if (!entity.type) {
      errors.push({
        type: "error",
        field: `entities[${index}].type`,
        message: "Entity type is required",
        entityId: entity.uid,
      });
    }

    // Check UID uniqueness
    if (entity.uid) {
      if (entityUids.has(entity.uid)) {
        errors.push({
          type: "error",
          field: `entities[${index}].uid`,
          message: `Duplicate UID: ${entity.uid}`,
          entityId: entity.uid,
        });
      }
      entityUids.add(entity.uid);
    }

    // Track types
    if (entity.type) {
      typeSet.add(entity.type);
    }

    // Warn about temp UIDs
    if (entity.uid?.startsWith("temp-")) {
      warnings.push({
        type: "warning",
        field: `entities[${index}].uid`,
        message: "Temporary UID will be replaced on merge",
        entityId: entity.uid,
      });
    }
  });

  // Validate relationships
  bundle.relationships.forEach((rel, index) => {
    // Check required fields
    if (!rel.uid) {
      errors.push({
        type: "error",
        field: `relationships[${index}].uid`,
        message: "Relationship UID is required",
      });
    }

    if (!rel.source) {
      errors.push({
        type: "error",
        field: `relationships[${index}].source`,
        message: "Relationship source is required",
      });
    }

    if (!rel.target) {
      errors.push({
        type: "error",
        field: `relationships[${index}].target`,
        message: "Relationship target is required",
      });
    }

    if (!rel.type) {
      errors.push({
        type: "error",
        field: `relationships[${index}].type`,
        message: "Relationship type is required",
      });
    }

    // Check reference integrity
    if (rel.source && !entityUids.has(rel.source)) {
      errors.push({
        type: "error",
        field: `relationships[${index}].source`,
        message: `Source entity not found: ${rel.source}`,
      });
    }

    if (rel.target && !entityUids.has(rel.target)) {
      errors.push({
        type: "error",
        field: `relationships[${index}].target`,
        message: `Target entity not found: ${rel.target}`,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      entities: bundle.entities.length,
      relationships: bundle.relationships.length,
      uniqueTypes: typeSet.size,
    },
  };
}

/**
 * Generate bundle diff summary
 */
export function generateBundleSummary(bundle: ResearchBundle): string {
  const entityTypes = bundle.entities.reduce(
    (acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const relTypes = bundle.relationships.reduce(
    (acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  let summary = `# Bundle Summary\n\n`;
  summary += `**Session**: ${bundle.metadata.sessionName || bundle.metadata.sessionId}\n\n`;
  summary += `## Entities (${bundle.entities.length})\n`;
  Object.entries(entityTypes).forEach(([type, count]) => {
    summary += `- ${type}: ${count}\n`;
  });
  summary += `\n## Relationships (${bundle.relationships.length})\n`;
  Object.entries(relTypes).forEach(([type, count]) => {
    summary += `- ${type}: ${count}\n`;
  });

  return summary;
}
