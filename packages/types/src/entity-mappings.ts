/**
 * Entity Type Mappings
 *
 * Centralized entity type to UID prefix mappings used across the application.
 */

/**
 * Entity type to UID prefix mapping
 *
 * Maps entity types to their corresponding UID prefixes for consistent
 * entity identification across the knowledge graph.
 */
export const ENTITY_TYPE_PREFIXES = {
  person: "per",
  organization: "org",
  platform: "plt",
  movement: "mov",
  event: "evt",
  media: "org", // media entities are organizations
  legal_case: "leg",
  file: "file",
} as const;

/**
 * Default prefix for unknown entity types
 */
export const DEFAULT_ENTITY_PREFIX = "ent";

/**
 * Get entity type prefix for a given entity type
 *
 * @param entityType The entity type
 * @returns The corresponding UID prefix or default prefix
 */
export function getEntityTypePrefix(entityType: string): string {
  return (
    ENTITY_TYPE_PREFIXES[entityType as keyof typeof ENTITY_TYPE_PREFIXES] ||
    DEFAULT_ENTITY_PREFIX
  );
}

/**
 * Generate simple entity UID from type and name using type prefix mapping
 *
 * @param entityType The entity type (lowercase string)
 * @param name The entity name
 * @returns Generated UID with type prefix
 */
export function generateSimpleEntityUID(
  entityType: string,
  name: string
): string {
  const typePrefix = getEntityTypePrefix(entityType);

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  return `${typePrefix}:${slug}`;
}

/**
 * All valid entity type prefixes
 */
export const ALL_ENTITY_PREFIXES = Object.values(
  ENTITY_TYPE_PREFIXES
) as readonly string[];
