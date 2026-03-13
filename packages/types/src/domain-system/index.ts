/**
 * Domain System - Public API
 *
 * Centralized, configurable domain management system.
 * Replaces hardcoded domain metadata with flexible configuration.
 */

// Core interfaces
export type {
  DomainConfig,
  DomainUIConfig,
  DomainThemeBindings,
  DomainMetadata,
  RelationshipExample,
  EnrichmentExample,
  DomainRelationship,
} from "./domain-config.interface";

export { isDomainConfig } from "./domain-config.interface";

// Card configuration
export type {
  DomainCardConfig,
  DomainCardFieldConfig,
  DomainCardSection,
  DomainCardLayout,
  DomainCardProps,
  DomainNodeData,
  FieldFormatter,
  DomainCardComponentRegistry,
} from "./domain-card-config.interface";

export { CardConfigBuilder, createCardConfig } from "./card-config-builder";

// Legend configuration
export type { DomainLegendConfig } from "./legend-config.interface";

// Feature configuration
export type { DomainFeatureConfig } from "./feature-config.interface";
export { DEFAULT_FEATURE_CONFIG } from "./feature-config.interface";

// Validation
export {
  DomainConfigSchema,
  DomainUIConfigSchema,
  DomainThemeBindingsSchema,
  validateDomainConfig,
} from "./validation-schemas";

// Builder pattern
export { DomainBuilder } from "./domain-builder";

// Registry
export { DomainRegistry, domainRegistry } from "./domain-registry";

// Metadata access
export {
  DomainMetadataRegistry,
  domainMetadata,
  getDomainColor,
  getDomainIcon,
  getEntityIcon,
  getDomainMetadata,
} from "./domain-metadata-registry";

// Custom domain factory
export { createCustomDomain } from "./custom-domain-factory";

// JSON domain configuration
export type {
  JSONDomainConfig,
  JSONPropertyDefinition,
  JSONEntityDefinition,
} from "./domain-json-schema";
export {
  validateJSONDomain,
  convertJSONDomainToZod,
  generateTypeScriptTypes,
  propertyToZodSchema,
} from "./domain-json-schema";

// Theme integration
export type { ThemeConfigWithDomains } from "./theme-integration";
export { applyThemeToDomains } from "./theme-integration";
export {
  resolveDomainColor,
  resolveDomainIcon,
  applyThemeToDomainUI,
} from "./theme-color-resolver";

// Stub exports for future implementation (Phase 3 & 4)
export type {
  RelationshipUIConfig,
  DomainRelationshipCategoryConfig,
} from "./relationship-config.interface";
export type { DomainNodeConfig } from "./node-config.interface";
