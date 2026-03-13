import { domainRegistry, ALL_RELATIONSHIP_TYPES } from "@proto/types";

/**
 * Get valid relationship types for an entity's domain
 * Returns domain-specific relationships first, then all cross-domain types
 */
export function getValidRelationshipsForDomain(entityType: string): string[] {
  const domainName = domainRegistry.getDomainFromEntityType(entityType);

  if (!domainName) {
    return [...ALL_RELATIONSHIP_TYPES].sort();
  }

  const domainConfig = domainRegistry.getDomainConfig(domainName);

  if (!domainConfig) {
    return [...ALL_RELATIONSHIP_TYPES].sort();
  }

  // Domain-specific relationships (prioritized)
  const domainRelationships = [...domainConfig.relationships];

  // Add all other relationship types (cross-domain)
  const allOthers = ALL_RELATIONSHIP_TYPES.filter(
    (type) => !domainRelationships.includes(type)
  );

  return [...domainRelationships.sort(), ...allOthers.sort()];
}

/**
 * Get valid relationship types between two entity types
 * Returns union of both domains' relationships
 */
export function getValidRelationshipsBetweenTypes(
  sourceType: string,
  targetType: string
): string[] {
  const sourceTypes = getValidRelationshipsForDomain(sourceType);
  const targetTypes = getValidRelationshipsForDomain(targetType);

  // Return union of both (deduplicated)
  const combined = new Set([...sourceTypes, ...targetTypes]);
  return Array.from(combined).sort();
}

/**
 * Format relationship type for display
 */
export function formatRelationshipType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
