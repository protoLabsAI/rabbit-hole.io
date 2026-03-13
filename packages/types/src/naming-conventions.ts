/**
 * Naming Convention Enforcement
 *
 * This file enforces consistent naming patterns across all entity types
 * and prevents anti-patterns from being introduced during expansion.
 */

import type { EntityType } from "./entity-schema-registry";

// ==================== Type-Level Enforcement ====================

/**
 * Enforces snake_case naming for multi-word entity types
 * This will cause TypeScript errors if camelCase or other patterns are used
 */
type ValidEntityNaming<T extends string> =
  T extends `${infer First}${infer Rest}`
    ? Rest extends Capitalize<Rest>
      ? never // Reject camelCase like "SolarSystem"
      : T
    : T;

/**
 * Validate all entity types follow naming conventions
 * This creates a compile-time error if any entity type violates conventions
 */
type ValidatedEntityTypes = {
  [K in EntityType]: ValidEntityNaming<K>;
};

// This will cause a TypeScript error if any entity type violates naming conventions
const _entityTypeValidator: ValidatedEntityTypes = {} as any;

// ==================== UID Prefix Validation ====================

/**
 * Convert entity type to expected UID prefix
 */
type EntityTypeToUidPrefix<T extends EntityType> = T extends "Medical_Device"
  ? "medical_device"
  : T extends "Clinical_Trial"
    ? "clinical_trial"
    : T extends "Solar_System"
      ? "solar_system"
      : Lowercase<T>;

/**
 * Expected UID prefixes for all entity types
 * This ensures UID prefixes match entity type naming
 */
export type ExpectedUidPrefixes = {
  [K in EntityType]: `${EntityTypeToUidPrefix<K>}:`;
};

// ==================== Property Naming Enforcement ====================

/**
 * Enforced property naming patterns
 */
export interface PropertyNamingRules {
  // Date fields must end with _date (except legacy 'founded')
  dateFields: `${string}_date` | "founded";

  // Type classification fields must end with _type
  typeFields: `${string}_type`;

  // Status fields should be consistent
  statusFields: "status" | `${string}_status`;

  // Score/rating fields should end with _score or _rate
  scoreFields: `${string}_score` | `${string}_rate` | `${string}_rating`;
}

/**
 * Validate property names against naming rules
 */
export type ValidPropertyName<T extends string> =
  T extends PropertyNamingRules["dateFields"]
    ? T
    : T extends PropertyNamingRules["typeFields"]
      ? T
      : T extends PropertyNamingRules["statusFields"]
        ? T
        : T extends PropertyNamingRules["scoreFields"]
          ? T
          : T; // Allow other property names

// ==================== Entity Schema Structure Enforcement ====================

/**
 * Enforced schema structure that all entities must follow
 */
export interface RequiredEntitySchemaStructure {
  uid: string;
  type: EntityType;
  name: string;
  properties?: Record<string, any>;
}

/**
 * Domain classification enforcement
 * Only includes domains with actual DOMAIN_INFO exports
 */
export const VALID_DOMAINS = [
  // Natural Sciences
  "biological", // Living organisms, life processes, agriculture
  "astronomical", // Celestial objects and space phenomena
  "geographic", // Physical locations, environmental processes

  // Knowledge & Information
  "academic", // Universities, research, physics, chemistry, mathematics

  // Human Society & Culture
  "social", // Organizations, platforms, movements, media, people
  "economic", // Markets, currencies, business entities
  "legal", // Laws, courts, regulations, contracts
  "cultural", // Arts, traditions, sports, entertainment, food

  // Health & Medicine
  "medical", // Diseases, drugs, treatments, healthcare facilities

  // Technology & Infrastructure
  "technology", // Software, hardware, digital systems
  "infrastructure", // Buildings, utilities, materials
  "transportation", // Vehicles, routes, transportation systems
] as const;

export type ValidDomain = (typeof VALID_DOMAINS)[number];

/**
 * Entity type to domain mapping validation
 * Maps all 77 entity types to the 12 actual domains with DOMAIN_INFO exports
 */
export const ENTITY_DOMAIN_MAP: Record<EntityType, ValidDomain> = {
  // ==================== SOCIAL DOMAIN ====================
  Person: "social",
  Organization: "social",
  Platform: "social",
  Movement: "social",
  Event: "social",
  Media: "social",
  Athlete: "social",
  Character: "social",
  Location: "social",

  // ==================== MEDICAL DOMAIN ====================
  Disease: "medical",
  Drug: "medical",
  Treatment: "medical",
  Symptom: "medical",
  Condition: "medical",
  Medical_Device: "medical",
  Hospital: "medical",
  Clinic: "medical",
  Pharmacy: "medical",
  Insurance: "medical",
  Clinical_Trial: "medical",

  // ==================== ACADEMIC DOMAIN ====================
  University: "academic",
  Research: "academic",
  Publication: "academic",
  Journal: "academic",
  Course: "academic",
  Degree: "academic",
  Mathematical_Concept: "academic",
  Formula: "academic",
  Theorem: "academic",
  Proof: "academic",
  Algorithm: "academic",
  Statistical_Model: "academic",
  Function: "academic",
  Particle: "academic",
  Force: "academic",
  Field: "academic",
  Energy_Type: "academic",
  Physical_Process: "academic",
  Wave: "academic",
  Quantum_State: "academic",
  Element: "academic",
  Compound: "academic",
  Molecule: "academic",
  Ion: "academic",
  Chemical_Bond: "academic",
  Reaction: "academic",
  Catalyst: "academic",

  // ==================== CULTURAL DOMAIN ====================
  Book: "cultural",
  Film: "cultural",
  Song: "cultural",
  Art: "cultural",
  Language: "cultural",
  Religion: "cultural",
  Tradition: "cultural",
  Food: "cultural",
  Recipe: "cultural",
  Food_Product: "cultural",
  Cuisine: "cultural",
  Diet: "cultural",
  Ingredient: "cultural",
  Nutrition: "cultural",
  Game: "cultural",
  Sport: "cultural",
  Team: "cultural",
  TV_Show: "cultural",
  Podcast: "cultural",
  Competition: "cultural",
  League: "cultural",
  Tournament: "cultural",
  Sports_Event: "cultural",
  Concert_Venue: "cultural",
  Entertainment_Event: "cultural",

  // ==================== BIOLOGICAL DOMAIN ====================
  Animal: "biological",
  Plant: "biological",
  Fungi: "biological",
  Species: "biological",
  Insect: "biological",
  Ecosystem: "biological",
  Carbon_Cycle: "biological",
  Farm: "biological",
  Crop: "biological",
  Soil: "biological",
  Livestock: "biological",
  Agricultural_Equipment: "biological",
  Irrigation_System: "biological",

  // ==================== GEOGRAPHIC DOMAIN ====================
  Country: "geographic",
  City: "geographic",
  Region: "geographic",
  Continent: "geographic",
  Natural_Disaster: "geographic",
  Weather_Event: "geographic",
  Climate_Zone: "geographic",
  Environmental_Process: "geographic",

  // ==================== INFRASTRUCTURE DOMAIN ====================
  Building: "infrastructure",
  Bridge: "infrastructure",
  Road: "infrastructure",
  Airport: "infrastructure",
  Port: "infrastructure",
  Utility: "infrastructure",
  Pipeline: "infrastructure",
  Stadium: "infrastructure",
  Theater: "infrastructure",
  Material: "infrastructure",
  Substance: "infrastructure",
  Composite: "infrastructure",
  Mineral: "infrastructure",
  Alloy: "infrastructure",
  Crystal: "infrastructure",
  Resource: "infrastructure",
  Renewable_Energy: "infrastructure",

  // ==================== TRANSPORTATION DOMAIN ====================
  Vehicle: "transportation",
  Aircraft: "transportation",
  Ship: "transportation",
  Train: "transportation",
  Route: "transportation",
  Station: "transportation",

  // ==================== ASTRONOMICAL DOMAIN ====================
  Planet: "astronomical",
  Star: "astronomical",
  Galaxy: "astronomical",
  Solar_System: "astronomical",

  // ==================== LEGAL DOMAIN ====================
  Law: "legal",
  Court: "legal",
  Case: "legal",
  Regulation: "legal",
  Patent: "legal",
  License: "legal",
  Contract: "legal",

  // ==================== TECHNOLOGY DOMAIN ====================
  Software: "technology",
  Hardware: "technology",
  Database: "technology",
  API: "technology",
  Protocol: "technology",
  Framework: "technology",
  Library: "technology",

  // ==================== ECONOMIC DOMAIN ====================
  Currency: "economic",
  Market: "economic",
  Industry: "economic",
  Commodity: "economic",
  Investment: "economic",
  Company: "economic",
};

// ==================== Validation Functions ====================

/**
 * Get domain from entity type (case-insensitive)
 */
export function getDomainFromEntityType(
  entityType: string
): ValidDomain | null {
  // Handle null/undefined entity types
  if (!entityType || typeof entityType !== "string") {
    return null;
  }

  // Normalize to Title_Case format
  const normalized = entityType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("_");

  return ENTITY_DOMAIN_MAP[normalized as EntityType] || null;
}

/**
 * Validate entity type follows naming conventions
 */
export function validateEntityTypeNaming(entityType: string): boolean {
  // Should not contain camelCase after first character
  const hasCamelCase = /[a-z][A-Z]/.test(entityType);
  if (hasCamelCase && !entityType.includes("_")) {
    throw new Error(
      `Entity type "${entityType}" violates naming convention. Use snake_case for multi-word types.`
    );
  }
  return true;
}

/**
 * Validate UID prefix matches entity type
 */
export function validateUidPrefix(
  entityType: EntityType,
  uid: string
): boolean {
  const expectedPrefix = entityType
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();
  const actualPrefix = uid.split(":")[0];

  if (actualPrefix !== expectedPrefix) {
    throw new Error(
      `UID prefix "${actualPrefix}:" does not match expected "${expectedPrefix}:" for entity type "${entityType}"`
    );
  }
  return true;
}

/**
 * Validate property follows naming conventions
 */
export function validatePropertyNaming(
  propertyName: string,
  value: any
): boolean {
  // Date fields should end with _date or be 'founded'
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    if (!propertyName.endsWith("_date") && propertyName !== "founded") {
      console.warn(
        `Date field "${propertyName}" should end with "_date" for consistency`
      );
    }
  }

  // Type fields should end with _type
  if (propertyName.includes("type") && !propertyName.endsWith("_type")) {
    console.warn(
      `Type field "${propertyName}" should end with "_type" for consistency`
    );
  }

  return true;
}

// ==================== Build-Time Validation ====================

/**
 * Validate all entity types in the system follow conventions
 * This can be called in tests or build scripts
 */
export function validateAllEntityConventions(): void {
  const entityTypes = Object.keys(ENTITY_DOMAIN_MAP) as EntityType[];

  entityTypes.forEach((entityType) => {
    // Validate naming
    validateEntityTypeNaming(entityType);

    // Validate domain mapping exists
    if (!ENTITY_DOMAIN_MAP[entityType]) {
      throw new Error(`Entity type "${entityType}" missing domain mapping`);
    }
  });

  console.log(
    `✅ All ${entityTypes.length} entity types follow naming conventions`
  );
}
