// ==================== Domain System ====================
export * from "./domain-system";

// Explicit re-export for JSON domain utilities (ensure they're included in dist build)
export {
  validateJSONDomain,
  convertJSONDomainToZod,
  generateTypeScriptTypes,
  propertyToZodSchema,
  type JSONDomainConfig,
  type JSONPropertyDefinition,
  type JSONEntityDefinition,
} from "./domain-system/domain-json-schema";

// Note: Custom domains loading (allCustomDomainConfigs) uses Node.js fs/path modules
// and is not exported from main index. Import directly from
// "@proto/types/src/custom-domains" in Node.js scripts only.

// Collaboration Sessions
export * from "./collaboration-session";

// Entity Enrichment Fields (client-safe)
export { getEnrichmentFieldsForEntity } from "./enrichment-fields";
export {
  getEnrichmentFieldsForEntityType,
  getAllEnrichmentFields,
} from "./domain-enrichment-fields";

// Domain utilities for extraction
export {
  getRelationshipTypesForDomains,
  getEntityTypesForDomains,
  generateDiscoveryExample,
  formatRelationshipTypesForPrompt,
} from "./domain-utils";
export type { DomainName } from "./domain-utils";

// Entity Schema Registry exports (explicit to avoid conflicts)
export {
  EntitySchemaRegistry,
  EntityTypeEnum,
  normalizeEntityType,
  isValidEntityType,
  getEntityTypeAliases,
  ALL_ENTITY_TYPES,
} from "./entity-schema-registry";
export type { EntityType } from "./entity-schema-registry";

// Basic shared state interface that both frontend and backend can use
export interface BaseAgentState {
  proverbs: string[];
}

// Re-export for convenience in frontend
export type FrontendAgentState = BaseAgentState;

// For backend use with LangGraph - will re-export from agent
export type { BaseAgentState as AgentState };

// Research types for CopilotKit shared state
export * from "./research";

// Atlas types for UI state management (import explicitly to avoid naming conflicts)
import * as AtlasTypes from "./atlas";

export { AtlasTypes };

// Dynamic Library Configuration Types
export interface ComponentLibraryConfig {
  libraries: Record<string, LibraryDefinition>;
  defaults: GlobalDefaults;
  schemas: SchemaSettings;
  agents: AgentConfiguration;
}

export interface LibraryDefinition {
  name: string;
  package: string;
  importPath: string;
  schemasPath: string;
  prefix: string;
  theme: ThemeSupport;
  components: string[];
  componentMap?: Record<string, string>; // Override specific component imports
  version?: string;
  dependencies?: string[];
}

export interface ThemeSupport {
  cssVarPrefix: string;
  supports: ThemeCapability[];
  themeFile?: string; // Optional theme configuration file
  customProperties?: Record<string, string>; // CSS custom property mappings
}

export type ThemeCapability =
  | "dynamic-css-vars"
  | "accessibility-first"
  | "css-variables"
  | "tailwind"
  | "chakra-tokens"
  | "emotion"
  | "styled-components";

export interface GlobalDefaults {
  preferredLibrary: string;
  fallbackLibrary: string;
  enableAI: boolean;
  themeMode: "unified" | "per-library" | "isolated";
}

export interface SchemaSettings {
  autoDiscovery: boolean;
  cacheLocation: string;
  validationMode: "strict" | "loose" | "disabled";
}

export interface AgentConfiguration {
  componentRenderer: ComponentRendererConfig;
}

export interface ComponentRendererConfig {
  libraries: string[];
  defaultLibrary: string;
  fallbackStrategy: "proto-first" | "library-order" | "user-choice";
}

// Dynamic Component Schema Types
export interface ComponentSchema {
  name: string;
  library: string;
  description: string;
  category: ComponentCategory;
  props: PropDefinition[];
  examples: ComponentExample[];
  accessibility: AccessibilityInfo;
  theme: ComponentThemeInfo;
}

export type ComponentCategory =
  | "actions"
  | "forms"
  | "layout"
  | "media"
  | "navigation"
  | "feedback"
  | "data-display"
  | "overlay";

export interface PropDefinition {
  name: string;
  type: PropType;
  required: boolean;
  default?: any;
  description: string;
  validation?: ValidationRule[];
  examples?: any[];
}

export type PropType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "function"
  | "enum"
  | "union"
  | "ReactNode";

export interface ValidationRule {
  type: "min" | "max" | "pattern" | "enum" | "custom";
  value: any;
  message?: string;
}

export interface ComponentExample {
  name: string;
  description: string;
  props: Record<string, any>;
  code?: string;
}

export interface AccessibilityInfo {
  ariaProps: string[];
  keyboardNav: boolean;
  screenReader: boolean;
  colorContrast: boolean;
  focusManagement: boolean;
}

export interface ComponentThemeInfo {
  cssVariables: string[];
  supportedModes: ("light" | "dark")[];
  customizableProps: string[];
}

// Dynamic Import Types
export interface DynamicComponent {
  component: React.ComponentType<any>;
  schema: ComponentSchema;
  library: LibraryDefinition;
}

export interface ComponentRegistry {
  register(library: LibraryDefinition): Promise<void>;
  getComponent(
    libraryId: string,
    componentName: string
  ): Promise<DynamicComponent | null>;
  listComponents(libraryId?: string): ComponentSchema[];
  searchComponents(query: string): ComponentSchema[];
}

// Agent Integration Types
export interface ComponentRenderRequest {
  description: string;
  preferredLibrary?: string;
  constraints?: RenderConstraints;
  context?: ComponentContext;
}

export interface RenderConstraints {
  accessibility?: boolean;
  theme?: string;
  maxComplexity?: "simple" | "moderate" | "complex";
  excludeLibraries?: string[];
}

export interface ComponentContext {
  page?: string;
  section?: string;
  userRole?: string;
  deviceType?: "desktop" | "tablet" | "mobile";
}

// Legacy domain metadata (deprecated - use domain-system instead)
// Avoid re-exporting to prevent conflicts with domain-system

// Export Rabbit Hole validation schemas and functions - MODULAR SYSTEM
export * from "./validation-schemas-modular";
export * from "./family-relationship-types";
export * from "./person-research-types";
export * from "./entity-research-types";
export * from "./file-schemas";
export * from "./llm-playground";
export * from "./merge-strategy.types";

// API Response Types
export * from "./api-responses";

// Entity and Relationship Mappings
export * from "./entity-mappings";
export * from "./relationship-mappings";
export * from "./naming-conventions";

// Application Constants
export * from "./constants";

// Timeline and Event Types
export * from "./domains/core/timeline.schema";

// LangExtract service types
export interface ExtractionExample {
  input_text: string;
  expected_output: Record<string, any>;
}

export interface LangExtractRequest {
  textOrDocuments: string[]; // Must be array - LangExtract API requires array of documents
  promptDescription: string;
  modelId?: string;
  serviceUrl?: string;
  includeSourceGrounding?: boolean;
  examples?: ExtractionExample[];
  customSchema?: Record<string, any>;
  modelParameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
  };
}

export interface LangExtractResponse {
  success: boolean;
  extractedData?: any;
  metadata?: {
    modelUsed?: string;
    provider?: string;
    processingTimeMs?: number;
    tokenCount?: number;
    outputTokenCount?: number;
    temperature?: number;
    maxTokens?: number;
    fenceOutput?: boolean;
    useSchemaConstraints?: boolean;
  };
  sourceGrounding?: any[];
  rawResponse?: any;
  error?: string;
}

// Share Token Types
export * from "./share-tokens";
// Media Ingestion Pipeline Types
export * from "./media-ingestion";
// Search Layer & Source Grounding Types
export * from "./search";
