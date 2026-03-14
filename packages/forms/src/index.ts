/**
 * @proto/forms - Domain Entity Form System
 *
 * Dynamic form generation from Zod schemas for 77 entity types across 12 domains.
 */

// Core form components
export { EntityForm, QuickEntityForm } from "./components/EntityForm";
export { DynamicFormFields } from "./components/DynamicFormFields";
export {
  DomainFormSelector,
  QuickDomainFormSelector,
} from "./components/DomainFormSelector";

// Domain registry and configuration
export {
  ALL_ENTITY_SCHEMAS,
  getFormConfig,
  getSchema,
  getEntityTypesByDomain,
  validateEntity,
  extractFieldConfig,
  type EntityType,
  type EntitySchema,
  type FieldConfig,
  type FormConfig,
} from "./registry/DomainFormRegistry";

// UID generation utility (re-exported from @proto/types)
export { generateEntityUID } from "@proto/types";

// Mock data generation
export {
  generateMockData,
  generateMockEntities,
  generateAllScenarios,
  type MockDataScenario,
} from "./utils/MockDataGenerator";

// Storybook utilities
export {
  COMPACT_DOMAIN_SHOWCASE,
  ENTITY_TYPE_SELECTOR_ARG,
  DOMAIN_SELECTOR_ARG,
  FORM_MODE_ARG,
  LOADING_STATE_ARG,
  REQUIRED_ONLY_ARG,
  BLACKLIST_FIELDS_ARG,
  MOCK_DATA_TYPE_ARG,
  createMockHandlers,
  FORM_STORY_PARAMETERS,
  STORY_ENTITY_TYPES_BY_DOMAIN,
  STORY_DOMAINS,
  STORY_ENTITY_TYPES,
  FORM_MODES,
  MOCK_DATA_TYPES,
} from "./utils/StoryHelpers";
