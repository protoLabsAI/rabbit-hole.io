/**
 * Domain Configuration System - Core Interfaces
 *
 * Defines the structure for configurable, extensible domain system.
 * Replaces scattered domain metadata with single source of truth.
 */

import { z } from "zod";

import type { DomainUIConfig, DomainMetadata } from "../domain-metadata";

import type { DomainFeatureConfig } from "./feature-config.interface";

// Avoid importing from themes/ - define locally to prevent circular deps
type ColorScale = Record<string, string>;
interface ThemeColors {
  primary: ColorScale;
  secondary?: ColorScale;
  accent?: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;
  gray: ColorScale;
  [key: string]: ColorScale | undefined;
}

// Re-export from domain-metadata to maintain compatibility
export type { DomainUIConfig, DomainMetadata };

/**
 * Single relationship in relationship extraction example
 */
export interface DomainRelationship {
  source_entity: string;
  target_entity: string;
  relationship_type: string;
  start_date?: string;
  end_date?: string;
  confidence?: number;
}

/**
 * Example for relationship extraction with input text and expected relationships
 */
export interface RelationshipExample {
  input_text: string;
  expected_output: {
    relationships: DomainRelationship[];
  };
}

/**
 * Theme integration bindings for domain
 */
export interface DomainThemeBindings {
  /** Derive colors from active theme */
  useThemeColors?: boolean;

  /** Which theme color to use as primary */
  primaryColor?: keyof ThemeColors;

  /** Allow theme to override icons */
  allowIconOverride?: boolean;
}

/**
 * Unified Domain Configuration
 *
 * Single source of truth for all domain metadata, schemas, and UI configuration.
 * Supports inheritance, overrides, and theme integration.
 */
export interface DomainConfig {
  // ==================== Identity ====================
  /** Machine name: "medical", "automotive" */
  name: string;

  /** Human-readable name: "Medical", "Automotive" */
  displayName: string;

  /** Full description of domain scope */
  description: string;

  /** Domain category */
  category: "core" | "custom" | "extended";

  // ==================== Schema System ====================
  /** Entity type → Zod schema mapping */
  entities: Record<string, z.ZodTypeAny>;

  /** Entity type → UID prefix mapping */
  uidPrefixes: Record<string, string>;

  /** UID prefix → validation function mapping */
  validators: Record<string, (uid: string) => boolean>;

  // ==================== Metadata ====================
  /** Valid relationship types for this domain */
  relationships: readonly string[];

  /** UI configuration (colors, icons) */
  ui: DomainUIConfig;

  // ==================== Extension ====================
  /** Parent domain for inheritance */
  extendsFrom?: string;

  /** Theme-specific overrides */
  overrides?: Partial<DomainConfig>;

  // ==================== Theme Integration ====================
  /** Theme integration configuration */
  themeBindings?: DomainThemeBindings;

  // ==================== Features ====================
  /** Feature flags and permissions */
  features?: DomainFeatureConfig;

  // ==================== Metadata ====================
  /** Domain config version */
  version?: string;

  /** Author/maintainer */
  author?: string;

  /** Tags for categorization */
  tags?: string[];

  // ==================== Enrichment ====================
  /** Entity type → enrichment example mapping for LangExtract */
  enrichmentExamples?: Record<string, EnrichmentExample>;

  /** Relationship extraction example for LangExtract */
  relationshipExample?: RelationshipExample;
}

/**
 * Enrichment Example
 *
 * Example structure for entity enrichment in LangExtract prompts.
 * Used to guide the LLM in extracting structured data from text.
 */
export interface EnrichmentExample {
  /** Sample text containing the entity information */
  input_text: string;
  /** Expected structured output fields */
  expected_output: Record<string, any>;
}

// ==================== Type Guards ====================

export function isDomainConfig(obj: unknown): obj is DomainConfig {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "displayName" in obj &&
    "description" in obj &&
    "category" in obj &&
    "entities" in obj &&
    "uidPrefixes" in obj &&
    "validators" in obj &&
    "relationships" in obj &&
    "ui" in obj
  );
}
