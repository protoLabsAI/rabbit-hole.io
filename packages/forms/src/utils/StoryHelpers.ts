/**
 * Shared Story Configuration Helpers
 *
 * Common types and configurations for Storybook stories across the form system.
 * Promotes consistency and reduces duplication across story files.
 */

import { ALL_ENTITY_TYPES } from "@protolabsai/types";

import { getEntityTypesByDomain } from "../registry/DomainFormRegistry";

// Re-export EntityType for convenience
export type { EntityType } from "../registry/DomainFormRegistry";

// ==================== Common Story Types ====================

export type FormMode = "create" | "edit";
export type MockDataType = "minimal" | "complete" | "invalid";

// ==================== Story Configuration Constants ====================

/**
 * Form modes for story controls
 */
export const FORM_MODES: readonly FormMode[] = ["create", "edit"] as const;

/**
 * Mock data types for testing different scenarios
 */
export const MOCK_DATA_TYPES: readonly MockDataType[] = [
  "minimal",
  "complete",
  "invalid",
] as const;

/**
 * Supported domains for form stories
 */
export const STORY_DOMAINS = [
  "social",
  "medical",
  "technology",
  "biological",
  "geographic",
  "economic",
  "infrastructure",
  "transportation",
  "astronomical",
  "legal",
  "academic",
  "cultural",
] as const;

/**
 * All entity types sorted alphabetically for story controls
 */
export const STORY_ENTITY_TYPES = ALL_ENTITY_TYPES.sort();

/**
 * Entity types grouped by domain for dependent controls
 */
export const STORY_ENTITY_TYPES_BY_DOMAIN = getEntityTypesByDomain();

/**
 * Generate domain showcase configuration dynamically from type system
 * Picks the first entity from each domain as a representative example
 */
function generateDomainShowcase() {
  const entityTypesByDomain = getEntityTypesByDomain();

  return Object.entries(entityTypesByDomain).map(([domain, entityTypes]) => ({
    key: domain,
    entity: (entityTypes as string[])[0], // First entity as representative
    label: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain`,
  }));
}

/**
 * All domain showcase configurations (built dynamically from types)
 */
export const DOMAIN_SHOWCASE_CONFIG = generateDomainShowcase();

/**
 * Subset of domains for compact showcase examples (6 most common)
 */
export const COMPACT_DOMAIN_SHOWCASE = DOMAIN_SHOWCASE_CONFIG.slice(0, 6);

// ==================== Reusable ArgType Configurations ====================

/**
 * Standard form mode control configuration
 */
export const FORM_MODE_ARG = {
  control: { type: "select" as const },
  options: FORM_MODES,
  description: "Form mode - create new entity or edit existing",
};

/**
 * Standard loading state control configuration
 */
export const LOADING_STATE_ARG = {
  control: { type: "boolean" as const },
  description: "Loading state for form submission",
};

/**
 * Standard required only fields control configuration
 */
export const REQUIRED_ONLY_ARG = {
  control: { type: "boolean" as const },
  description: "Show only required fields for quick entity creation",
};

/**
 * Standard blacklist fields control configuration
 */
export const BLACKLIST_FIELDS_ARG = {
  control: { type: "object" as const },
  description: "Array of field names to exclude from the form",
};

/**
 * Domain selector control configuration
 */
export const DOMAIN_SELECTOR_ARG = {
  control: { type: "select" as const },
  options: STORY_DOMAINS,
  description: "Domain to select from the supported domains",
};

/**
 * Entity type selector control configuration
 */
export const ENTITY_TYPE_SELECTOR_ARG = {
  control: { type: "select" as const },
  options: STORY_ENTITY_TYPES,
  description: "Entity type to generate form for",
};

/**
 * Mock data type selector control configuration
 */
export const MOCK_DATA_TYPE_ARG = {
  control: { type: "select" as const },
  options: MOCK_DATA_TYPES,
  description: "Type of mock data to use for testing",
};

// ==================== Common Story Handlers ====================

/**
 * Standard mock form submission handler
 */
export const createMockSubmitHandler =
  (entityType?: string) => async (data: any) => {
    console.log(`${entityType || "Form"} submitted:`, data);

    const details = [
      `Entity Type: ${data.type || entityType || "Unknown"}`,
      `Name: ${data.name || "No name provided"}`,
      `UID: ${data.uid || "No UID provided"}`,
      `Fields: ${Object.keys(data).length}`,
      "",
      "Full data logged to console ↗️",
    ].join("\n");

    alert(`✅ ${entityType || "Entity"} Created Successfully!\n\n${details}`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));
  };

/**
 * Standard mock form cancellation handler
 */
export const createMockCancelHandler = (entityType?: string) => () => {
  console.log(`${entityType || "Form"} cancelled`);
  alert(`🚫 ${entityType || "Form"} cancelled - no entity created`);
};

/**
 * Create standard mock handlers object
 */
export const createMockHandlers = (entityType?: string) => ({
  onSubmit: createMockSubmitHandler(entityType),
  onCancel: createMockCancelHandler(entityType),
});

// ==================== Common Story Parameters ====================

/**
 * Standard docs configuration for form stories
 */
export const FORM_STORY_DOCS = {
  docs: {
    description: {
      component:
        "Form component with validation, dynamic field generation, and comprehensive type safety.",
    },
  },
};

/**
 * Standard layout configuration for form stories
 */
export const FORM_STORY_LAYOUT = {
  layout: "centered" as const,
};

/**
 * Standard parameters for form stories
 */
export const FORM_STORY_PARAMETERS = {
  ...FORM_STORY_LAYOUT,
  ...FORM_STORY_DOCS,
};
