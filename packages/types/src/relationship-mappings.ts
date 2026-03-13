/**
 * Relationship Type Mappings
 *
 * Centralized relationship type mappings for consistent relationship
 * handling across the knowledge graph.
 */

/**
 * Relationship type to Neo4j relationship type mapping
 *
 * Maps user-friendly relationship types to Neo4j relationship types
 * for consistent storage and querying.
 */
export const RELATIONSHIP_TYPE_MAPPINGS = {
  ownership: "OWNS",
  employment: "HOLDS_ROLE",
  partnership: "ENDORSES",
  platforming: "PLATFORMS",
  funding: "FUNDS",
  endorsement: "ENDORSES",
  speech_act: "SPEECH_ACT",
  generic: "ENDORSES",
} as const;

/**
 * Default relationship type for unknown relationships
 */
export const DEFAULT_RELATIONSHIP_TYPE = "ENDORSES";

/**
 * Get Neo4j relationship type for a given relationship type
 *
 * @param relationshipType The user-friendly relationship type
 * @returns The corresponding Neo4j relationship type or default type
 */
export function getRelationshipType(relationshipType: string): string {
  return (
    RELATIONSHIP_TYPE_MAPPINGS[
      relationshipType as keyof typeof RELATIONSHIP_TYPE_MAPPINGS
    ] || DEFAULT_RELATIONSHIP_TYPE
  );
}

/**
 * Generate simple time-based relationship UID
 *
 * @param relationshipType The relationship type
 * @param timestamp Optional timestamp (defaults to current time)
 * @returns Generated relationship UID
 */
export function generateSimpleRelationshipUID(
  relationshipType: string,
  timestamp?: number
): string {
  const safeType = relationshipType || "generic";
  const time = timestamp || Date.now();
  return `rel:${safeType}_${time}`;
}

/**
 * All valid Neo4j relationship types
 */
export const ALL_NEO4J_RELATIONSHIP_TYPES = Object.values(
  RELATIONSHIP_TYPE_MAPPINGS
) as readonly string[];

/**
 * All valid user-friendly relationship types from the simple mapping
 */
export const SIMPLE_RELATIONSHIP_TYPES = Object.keys(
  RELATIONSHIP_TYPE_MAPPINGS
) as readonly string[];
