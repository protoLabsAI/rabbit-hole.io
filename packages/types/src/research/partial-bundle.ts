/**
 * Partial Bundle Types
 *
 * Represents progressive bundle construction during deep research.
 * As each subagent completes, the partial bundle grows until complete.
 */

import { z } from "zod";

import { EntitySchema } from "../domains/core/base-entity.schema";
import { EvidenceSchema } from "../domains/core/evidence.schema";
import { RelationshipSchema } from "../domains/core/relationship.schema";

export const ResearchPhaseSchema = z.enum([
  "scoping",
  "evidence-gathering",
  "entity-extraction",
  "field-analysis",
  "entity-creation",
  "relationship-mapping",
  "bundle-assembly",
  "complete",
]);

export type ResearchPhase = z.infer<typeof ResearchPhaseSchema>;

export const PartialBundleSchema = z.object({
  entities: z.array(EntitySchema).default([]),
  relationships: z.array(RelationshipSchema).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  phase: ResearchPhaseSchema,
  isComplete: z.boolean().default(false),
  entityCount: z.number().default(0),
  relationshipCount: z.number().default(0),
  evidenceCount: z.number().default(0),
});

export type PartialBundle = z.infer<typeof PartialBundleSchema>;

/**
 * Create an empty partial bundle at a given phase.
 */
export function createEmptyPartialBundle(
  phase: ResearchPhase = "scoping"
): PartialBundle {
  return {
    entities: [],
    relationships: [],
    evidence: [],
    phase,
    isComplete: false,
    entityCount: 0,
    relationshipCount: 0,
    evidenceCount: 0,
  };
}

/**
 * Merge new data into an existing partial bundle.
 * Returns a new object (immutable).
 */
export function mergePartialBundle(
  existing: PartialBundle,
  update: {
    entities?: z.infer<typeof EntitySchema>[];
    relationships?: z.infer<typeof RelationshipSchema>[];
    evidence?: z.infer<typeof EvidenceSchema>[];
    phase?: ResearchPhase;
    isComplete?: boolean;
  }
): PartialBundle {
  const entities = [...existing.entities, ...(update.entities ?? [])];
  const relationships = [
    ...existing.relationships,
    ...(update.relationships ?? []),
  ];
  const evidence = [...existing.evidence, ...(update.evidence ?? [])];

  return {
    entities,
    relationships,
    evidence,
    phase: update.phase ?? existing.phase,
    isComplete: update.isComplete ?? existing.isComplete,
    entityCount: entities.length,
    relationshipCount: relationships.length,
    evidenceCount: evidence.length,
  };
}
