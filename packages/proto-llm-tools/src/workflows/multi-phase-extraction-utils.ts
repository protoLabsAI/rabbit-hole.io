/**
 * Multi-Phase Extraction Utilities
 *
 * Domain-aware extraction configuration using @proto/types domain system
 */

import {
  domainRegistry,
  type DomainConfig,
  EntitySchemaRegistry,
} from "@proto/types";

// ============================================================================
// Initialization
// ============================================================================

// Ensure domain registry is initialized by accessing EntitySchemaRegistry
// This triggers the constructor which registers all domains
let initialized = false;
function ensureInitialized() {
  if (!initialized) {
    // Access EntitySchemaRegistry to trigger domain registration
    EntitySchemaRegistry.getInstance();
    initialized = true;
  }
}

// ============================================================================
// Reverse-Lookup Cache for Entity Type to Domain Mapping
// ============================================================================

// Cache to map entity types to their owning domains (O(1) lookup instead of O(n) scan)
let entityTypeToDomainCache: Map<string, DomainConfig> | null = null;

/**
 * Build and cache the reverse lookup map from entity types to domains
 * Called on first access to avoid repeated linear scans of getAllDomains()
 */
function getEntityTypeToDomainMap(): Map<string, DomainConfig> {
  if (entityTypeToDomainCache) {
    return entityTypeToDomainCache;
  }

  ensureInitialized();
  entityTypeToDomainCache = new Map();

  // Iterate all domains and map each entity type to its domain
  for (const domain of getAllDomains()) {
    for (const entityType of Object.keys(domain.entities)) {
      entityTypeToDomainCache.set(entityType, domain);
    }
  }

  return entityTypeToDomainCache;
}

// ============================================================================
// Domain Configuration Access
// ============================================================================

/**
 * Get all available domains with their configurations
 */
export function getAllDomains(): DomainConfig[] {
  ensureInitialized();
  return domainRegistry.getAllDomains();
}

/**
 * Get domain configuration by name
 */
export function getDomainConfig(domainName: string): DomainConfig | undefined {
  ensureInitialized();
  return domainRegistry.getDomainConfig(domainName);
}

/**
 * Get entity types for specific domains
 */
export function getEntityTypesForDomains(domainNames: string[]): string[] {
  const entityTypes = new Set<string>();

  for (const domainName of domainNames) {
    const domain = getDomainConfig(domainName);

    if (domain) {
      Object.keys(domain.entities).forEach((entityType) => {
        entityTypes.add(entityType);
      });
    }
  }

  return Array.from(entityTypes);
}

/**
 * Get extraction classes (lowercase entity types) for LangExtract
 */
export function getExtractionClasses(
  domainNames: string[],
  includeEntityTypes?: string[]
): string[] {
  const allEntityTypes = getEntityTypesForDomains(domainNames);

  // Filter by included types if specified
  const filteredTypes = includeEntityTypes
    ? allEntityTypes.filter((type) => includeEntityTypes.includes(type))
    : allEntityTypes;

  // Convert to lowercase extraction class names
  return filteredTypes.map((type) => type.toLowerCase().replace(/_/g, ""));
}

/**
 * Get domain color for an entity type (O(1) lookup via cache)
 */
export function getDomainColorForEntity(entityType: string): string {
  const domainMap = getEntityTypeToDomainMap();
  const domain = domainMap.get(entityType);

  if (domain) {
    return domain.ui.color;
  }

  return "#64748b"; // Slate as fallback
}

/**
 * Get domain icon for an entity type (O(1) lookup via cache)
 */
export function getDomainIconForEntity(entityType: string): string {
  const domainMap = getEntityTypeToDomainMap();
  const domain = domainMap.get(entityType);

  if (domain) {
    return domain.ui.entityIcons?.[entityType] || domain.ui.icon;
  }

  return "📋"; // Document as fallback
}

/**
 * Get domain name for an entity type (O(1) lookup via cache)
 */
export function getDomainNameForEntity(entityType: string): string | null {
  const domainMap = getEntityTypeToDomainMap();
  const domain = domainMap.get(entityType);

  return domain ? domain.name : null;
}

// ============================================================================
// Schema Generation for LangExtract
// ============================================================================

/**
 * Generate required fields schema from domain entity schema
 */
export function getRequiredFieldsForEntity(
  entityType: string,
  domainName: string
): Record<string, any> {
  const domain = getDomainConfig(domainName);
  if (!domain || !(entityType in domain.entities)) {
    return { uid: "string", type: "string", name: "string" };
  }

  const schema = domain.entities[entityType];

  // Always include base required fields
  const requiredFields: Record<string, any> = {
    uid: "string",
    type: "string",
    name: "string",
  };

  // Extract additional required fields from schema
  // This is a simplified approach - you may want to enhance based on Zod schema introspection
  return requiredFields;
}

/**
 * Generate optional fields schema from domain entity schema
 */
export function getOptionalFieldsForEntity(
  entityType: string,
  domainName: string
): Record<string, any> {
  const domain = getDomainConfig(domainName);
  if (!domain || !(entityType in domain.entities)) {
    return {};
  }

  // Return common optional fields
  // This can be enhanced with actual Zod schema introspection
  const commonOptionalFields: Record<string, any> = {
    aliases: "array",
    tags: "array",
    properties: "object",
  };

  return commonOptionalFields;
}

/**
 * Generate UID from entity name and type using domain prefix
 * Searches all domains if domainName not provided
 */
export function generateDomainUID(
  name: string,
  entityType: string,
  domainName?: string
): string {
  // Normalize the name
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 50); // Reasonable length limit

  // If domain specified, use its prefix
  if (domainName) {
    const domain = getDomainConfig(domainName);
    if (domain && domain.uidPrefixes[entityType]) {
      return `${domain.uidPrefixes[entityType]}:${sanitized}`;
    }
  }

  // Search all domains for this entity type
  for (const domain of getAllDomains()) {
    if (domain.uidPrefixes[entityType]) {
      return `${domain.uidPrefixes[entityType]}:${sanitized}`;
    }
  }

  // Fallback: use entity type as prefix
  const fallbackPrefix = entityType.toLowerCase().replace(/_/g, "");
  return `${fallbackPrefix}:${sanitized}`;
}

// ============================================================================
// Domain UI Helpers
// ============================================================================

/**
 * Get UI metadata for a domain
 */
export function getDomainUIMetadata(domainName: string) {
  const domain = getDomainConfig(domainName);
  if (!domain) {
    return { color: "#64748b", icon: "📋", displayName: domainName };
  }

  return {
    color: domain.ui.color,
    icon: domain.ui.icon,
    displayName: domain.displayName || domainName,
    entityIcons: domain.ui.entityIcons || {},
  };
}

/**
 * Get all domain UI metadata for rendering controls
 */
export function getAllDomainUIMetadata() {
  return getAllDomains().map((domain) => ({
    value: domain.name,
    label: domain.displayName || domain.name,
    icon: domain.ui.icon,
    color: domain.ui.color,
    description: domain.description,
    category: domain.category,
  }));
}

/**
 * Validate entity against domain schema
 */
export function validateEntityAgainstDomain(
  entity: any,
  entityType: string,
  domainName: string
): { valid: boolean; errors?: string[] } {
  const domain = getDomainConfig(domainName);
  if (!domain || !(entityType in domain.entities)) {
    return { valid: false, errors: ["Invalid domain or entity type"] };
  }

  try {
    const schema = domain.entities[entityType];
    const result = schema.safeParse(entity);

    if (result.success) {
      return { valid: true };
    } else {
      return {
        valid: false,
        errors: result.error.issues.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        ),
      };
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "Validation error"],
    };
  }
}

// ============================================================================
// Relationship Helpers
// ============================================================================

/**
 * Get valid relationship types for given domains
 */
export function getRelationshipTypesForDomains(
  domainNames: string[]
): string[] {
  const relationshipTypes = new Set<string>();

  for (const domainName of domainNames) {
    const domain = getDomainConfig(domainName);
    if (domain && domain.relationships) {
      domain.relationships.forEach((relType) => {
        relationshipTypes.add(relType);
      });
    }
  }

  return Array.from(relationshipTypes);
}
