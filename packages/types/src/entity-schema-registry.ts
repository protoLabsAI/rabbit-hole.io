/**
 * Entity Schema Registry
 *
 * Central registry that combines all domain schemas into a unified system.
 * Provides dynamic entity type discovery and UID validation.
 */

import { z } from "zod";

import { domainRegistry } from "./domain-system";
import {
  ACADEMIC_ENTITY_SCHEMAS,
  ACADEMIC_UID_VALIDATORS,
  ACADEMIC_ENTITY_TYPES,
} from "./domains/academic";
import { academicDomainConfig } from "./domains/academic/domain.config";
import {
  ASTRONOMICAL_ENTITY_SCHEMAS,
  ASTRONOMICAL_UID_VALIDATORS,
  ASTRONOMICAL_ENTITY_TYPES,
} from "./domains/astronomical";
import { astronomicalDomainConfig } from "./domains/astronomical/domain.config";
import {
  BIOLOGICAL_ENTITY_SCHEMAS,
  BIOLOGICAL_UID_VALIDATORS,
  BIOLOGICAL_ENTITY_TYPES,
} from "./domains/biological";
import { biologicalDomainConfig } from "./domains/biological/domain.config";
import { EntitySchema, coreDomainConfig } from "./domains/core";
import {
  CULTURAL_ENTITY_SCHEMAS,
  CULTURAL_UID_VALIDATORS,
  CULTURAL_ENTITY_TYPES,
} from "./domains/cultural";
import { culturalDomainConfig } from "./domains/cultural/domain.config";
import {
  ECONOMIC_ENTITY_SCHEMAS,
  ECONOMIC_UID_VALIDATORS,
  ECONOMIC_ENTITY_TYPES,
} from "./domains/economic";
import { economicDomainConfig } from "./domains/economic/domain.config";
import {
  GEOGRAPHIC_ENTITY_SCHEMAS,
  GEOGRAPHIC_UID_VALIDATORS,
  GEOGRAPHIC_ENTITY_TYPES,
} from "./domains/geographic";
import { geographicDomainConfig } from "./domains/geographic/domain.config";
import {
  INFRASTRUCTURE_ENTITY_SCHEMAS,
  INFRASTRUCTURE_UID_VALIDATORS,
  INFRASTRUCTURE_ENTITY_TYPES,
} from "./domains/infrastructure";
import { infrastructureDomainConfig } from "./domains/infrastructure/domain.config";
import {
  LEGAL_ENTITY_SCHEMAS,
  LEGAL_UID_VALIDATORS,
  LEGAL_ENTITY_TYPES,
} from "./domains/legal";
import { legalDomainConfig } from "./domains/legal/domain.config";
import {
  MEDICAL_ENTITY_SCHEMAS,
  MEDICAL_UID_VALIDATORS,
  MEDICAL_ENTITY_TYPES,
} from "./domains/medical";
import { medicalDomainConfig } from "./domains/medical/domain.config";
import {
  SOCIAL_ENTITY_SCHEMAS,
  SOCIAL_UID_VALIDATORS,
  SOCIAL_ENTITY_TYPES,
} from "./domains/social";
import { socialDomainConfig } from "./domains/social/domain.config";
import {
  TECHNOLOGY_ENTITY_SCHEMAS,
  TECHNOLOGY_UID_VALIDATORS,
  TECHNOLOGY_ENTITY_TYPES,
} from "./domains/technology";
import { technologyDomainConfig } from "./domains/technology/domain.config";
import {
  TRANSPORTATION_ENTITY_SCHEMAS,
  TRANSPORTATION_UID_VALIDATORS,
  TRANSPORTATION_ENTITY_TYPES,
} from "./domains/transportation";
import { transportationDomainConfig } from "./domains/transportation/domain.config";

// All entity types have been successfully migrated to modular domains!
// No legacy entity types remain - all 77 entities now have domain-specific schemas
const LEGACY_ENTITY_TYPES = [] as const;

// Legacy UID validation patterns
const LEGACY_UID_PATTERNS = {
  book: /^book:/,
  film: /^film:/,
  song: /^song:/,
  art: /^art:/,
  language: /^language:/,
  religion: /^religion:/,
  tradition: /^tradition:/,
  particle: /^particle:/,
  force: /^force:/,
  field: /^field:/,
  energy_type: /^energy_type:/,
  physical_process: /^physical_process:/,
  wave: /^wave:/,
  quantum_state: /^quantum_state:/,
  element: /^element:/,
  compound: /^compound:/,
  reaction: /^reaction:/,
  molecule: /^molecule:/,
  ion: /^ion:/,
  chemical_bond: /^chemical_bond:/,
  catalyst: /^catalyst:/,
  mathematical_concept: /^mathematical_concept:/,
  formula: /^formula:/,
  theorem: /^theorem:/,
  proof: /^proof:/,
  statistical_model: /^statistical_model:/,
  algorithm: /^algorithm:/,
  function: /^function:/,
  material: /^material:/,
  mineral: /^mineral:/,
  resource: /^resource:/,
  substance: /^substance:/,
  composite: /^composite:/,
  alloy: /^alloy:/,
  crystal: /^crystal:/,
  weather_event: /^weather_event:/,
  climate_zone: /^climate_zone:/,
  natural_disaster: /^natural_disaster:/,
  environmental_process: /^environmental_process:/,
  carbon_cycle: /^carbon_cycle:/,
  renewable_energy: /^renewable_energy:/,
  sport: /^sport:/,
  team: /^team:/,
  athlete: /^athlete:/,
  competition: /^competition:/,
  stadium: /^stadium:/,
  league: /^league:/,
  tournament: /^tournament:/,
  sports_event: /^sports_event:/,
  game: /^game:/,
  tv_show: /^tv_show:/,
  podcast: /^podcast:/,
  theater: /^theater:/,
  concert_venue: /^concert_venue:/,
  entertainment_event: /^entertainment_event:/,
  food: /^food:/,
  recipe: /^recipe:/,
  ingredient: /^ingredient:/,
  nutrition: /^nutrition:/,
  diet: /^diet:/,
  food_product: /^food_product:/,
  cuisine: /^cuisine:/,
  farm: /^farm:/,
  crop: /^crop:/,
  livestock: /^livestock:/,
  agricultural_equipment: /^agricultural_equipment:/,
  soil: /^soil:/,
  irrigation_system: /^irrigation_system:/,
};

// ==================== Entity Type Registry ====================

/**
 * All entity schemas combined from all domains
 */
const ALL_ENTITY_SCHEMAS = {
  ...BIOLOGICAL_ENTITY_SCHEMAS,
  ...SOCIAL_ENTITY_SCHEMAS,
  ...GEOGRAPHIC_ENTITY_SCHEMAS,
  ...TECHNOLOGY_ENTITY_SCHEMAS,
  ...ECONOMIC_ENTITY_SCHEMAS,
  ...MEDICAL_ENTITY_SCHEMAS,
  ...INFRASTRUCTURE_ENTITY_SCHEMAS,
  ...TRANSPORTATION_ENTITY_SCHEMAS,
  ...ASTRONOMICAL_ENTITY_SCHEMAS,
  ...LEGAL_ENTITY_SCHEMAS,
  ...ACADEMIC_ENTITY_SCHEMAS,
  ...CULTURAL_ENTITY_SCHEMAS,
  // Complete - all legacy entities migrated!
} as const;

/**
 * All UID validators combined from all domains
 */
const ALL_UID_VALIDATORS = {
  ...BIOLOGICAL_UID_VALIDATORS,
  ...SOCIAL_UID_VALIDATORS,
  ...GEOGRAPHIC_UID_VALIDATORS,
  ...TECHNOLOGY_UID_VALIDATORS,
  ...ECONOMIC_UID_VALIDATORS,
  ...MEDICAL_UID_VALIDATORS,
  ...INFRASTRUCTURE_UID_VALIDATORS,
  ...TRANSPORTATION_UID_VALIDATORS,
  ...ASTRONOMICAL_UID_VALIDATORS,
  ...LEGAL_UID_VALIDATORS,
  ...ACADEMIC_UID_VALIDATORS,
  ...CULTURAL_UID_VALIDATORS,
  // Complete - all legacy validators migrated!
} as const;

/**
 * All entity types from all domains
 */
export const ALL_ENTITY_TYPES = [
  ...BIOLOGICAL_ENTITY_TYPES,
  ...SOCIAL_ENTITY_TYPES,
  ...GEOGRAPHIC_ENTITY_TYPES,
  ...TECHNOLOGY_ENTITY_TYPES,
  ...ECONOMIC_ENTITY_TYPES,
  ...MEDICAL_ENTITY_TYPES,
  ...INFRASTRUCTURE_ENTITY_TYPES,
  ...TRANSPORTATION_ENTITY_TYPES,
  ...ASTRONOMICAL_ENTITY_TYPES,
  ...LEGAL_ENTITY_TYPES,
  ...ACADEMIC_ENTITY_TYPES,
  ...CULTURAL_ENTITY_TYPES,
  ...LEGACY_ENTITY_TYPES,
];

/**
 * Dynamic entity type enum based on registered domains
 */
export const EntityTypeEnum = z.enum(ALL_ENTITY_TYPES as [string, ...string[]]);

/**
 * Entity type for use in canonical graph data (exported at bottom of file)
 */

// ==================== Entity Type Normalization ====================

/**
 * Common variations and aliases for entity types
 * Maps user input variations to canonical entity types from ALL_ENTITY_TYPES
 */
const ENTITY_TYPE_ALIASES: Record<string, string> = {
  // Person variations
  person: "Person",
  people: "Person",
  individual: "Person",
  human: "Person",

  // Organization variations
  organization: "Organization",
  org: "Organization",
  corporation: "Organization",
  corp: "Organization",
  business: "Organization",
  enterprise: "Organization",

  // Platform variations
  platform: "Platform",
  site: "Platform",
  website: "Platform",
  service: "Platform",

  // Movement variations
  movement: "Movement",
  campaign: "Movement",
  cause: "Movement",

  // Event variations
  event: "Event",
  occurrence: "Event",
  happening: "Event",

  // Media variations
  media: "Media",
  publication: "Media",
  broadcast: "Media",
  channel: "Media",

  // Geographic variations
  country: "Country",
  nation: "Country",
  state: "Country",
  city: "City",
  town: "City",
  municipality: "City",
  region: "Region",
  area: "Region",
  continent: "Continent",

  // Technology variations
  software: "Software",
  application: "Software",
  app: "Software",
  program: "Software",
  hardware: "Hardware",
  device: "Hardware",
  api: "API",
  database: "Database",
  db: "Database",

  // Economic variations
  company: "Company", // Note: also maps to Organization above, but Company is more specific
  market: "Market",
  currency: "Currency",
  money: "Currency",
  industry: "Industry",
  sector: "Industry",
  commodity: "Commodity",
  investment: "Investment",

  // Medical variations
  hospital: "Hospital",
  clinic: "Clinic",
  disease: "Disease",
  illness: "Disease",
  condition: "Condition",
  drug: "Drug",
  medication: "Drug",
  medicine: "Drug",
  treatment: "Treatment",
  therapy: "Treatment",

  // Biological variations
  animal: "Animal",
  creature: "Animal",
  beast: "Animal",
  plant: "Plant",
  flora: "Plant",
  species: "Species",
  organism: "Species",
  ecosystem: "Ecosystem",
  habitat: "Ecosystem",
  environment: "Ecosystem",

  // Academic variations
  university: "University",
  college: "University",
  school: "University",
  course: "Course",
  class: "Course",
  paper: "Publication",
  research: "Research",
  study: "Research",

  // Legal variations
  law: "Law",
  legislation: "Law",
  statute: "Law",
  court: "Court",
  tribunal: "Court",
  case: "Case",
  lawsuit: "Case",
  contract: "Contract",
  agreement: "Contract",

  // Cultural variations
  art: "Art",
  artwork: "Art",
  book: "Book",
  novel: "Book",
  film: "Film",
  movie: "Film",
  song: "Song",
  music: "Song",
  track: "Song",
  language: "Language",
  religion: "Religion",
  faith: "Religion",
};

/**
 * Normalize entity type variations to canonical form
 *
 * @param input - Raw entity type string (case-insensitive)
 * @returns Canonical entity type from ALL_ENTITY_TYPES, or fallback
 */
export function normalizeEntityType(input: string): EntityType {
  if (!input || typeof input !== "string") {
    return "Organization"; // Safe fallback
  }

  const normalized = input.trim().toLowerCase();

  // Check aliases first
  const alias = ENTITY_TYPE_ALIASES[normalized];
  if (alias && ALL_ENTITY_TYPES.includes(alias as any)) {
    return alias;
  }

  // Check for exact match (case-insensitive)
  const exactMatch = ALL_ENTITY_TYPES.find(
    (type) => type.toLowerCase() === normalized
  );
  if (exactMatch) {
    return exactMatch as EntityType;
  }

  // Check for partial matches (starts with)
  const partialMatch = ALL_ENTITY_TYPES.find(
    (type) =>
      type.toLowerCase().startsWith(normalized) ||
      normalized.startsWith(type.toLowerCase())
  );
  if (partialMatch) {
    return partialMatch as EntityType;
  }

  // Fallback to Organization (most common/generic type)
  return "Organization";
}

/**
 * Validate if a string is a valid entity type
 */
export function isValidEntityType(type: string): boolean {
  return (ALL_ENTITY_TYPES as readonly string[]).includes(type);
}

/**
 * Get all possible aliases for an entity type
 */
export function getEntityTypeAliases(entityType: EntityType): string[] {
  const aliases: string[] = [];

  for (const [alias, canonical] of Object.entries(ENTITY_TYPE_ALIASES)) {
    if (canonical === entityType) {
      aliases.push(alias);
    }
  }

  return aliases;
}

// ==================== Registry Class ====================

export class EntitySchemaRegistry {
  private static instance: EntitySchemaRegistry;
  private schemas = new Map<string, z.ZodSchema>();
  private uidValidators = new Map<string, (uid: string) => boolean>();

  static getInstance(): EntitySchemaRegistry {
    if (!this.instance) {
      this.instance = new EntitySchemaRegistry();
    }
    return this.instance;
  }

  private constructor() {
    // Domain configs are now imported at top of file

    // Register all core domains via new domain system
    domainRegistry.registerBatch([
      coreDomainConfig,
      medicalDomainConfig,
      socialDomainConfig,
      biologicalDomainConfig,
      geographicDomainConfig,
      technologyDomainConfig,
      economicDomainConfig,
      infrastructureDomainConfig,
      transportationDomainConfig,
      astronomicalDomainConfig,
      legalDomainConfig,
      academicDomainConfig,
      culturalDomainConfig,
    ]);

    // Legacy registration - maintain backward compatibility
    // TODO: Remove in v2.0.0
    this.registerDomain(
      "biological",
      BIOLOGICAL_ENTITY_SCHEMAS,
      BIOLOGICAL_UID_VALIDATORS
    );
    this.registerDomain("social", SOCIAL_ENTITY_SCHEMAS, SOCIAL_UID_VALIDATORS);
    this.registerDomain(
      "geographic",
      GEOGRAPHIC_ENTITY_SCHEMAS,
      GEOGRAPHIC_UID_VALIDATORS
    );
    this.registerDomain(
      "technology",
      TECHNOLOGY_ENTITY_SCHEMAS,
      TECHNOLOGY_UID_VALIDATORS
    );
    this.registerDomain(
      "economic",
      ECONOMIC_ENTITY_SCHEMAS,
      ECONOMIC_UID_VALIDATORS
    );
    this.registerDomain(
      "medical",
      MEDICAL_ENTITY_SCHEMAS,
      MEDICAL_UID_VALIDATORS
    );
    this.registerDomain(
      "infrastructure",
      INFRASTRUCTURE_ENTITY_SCHEMAS,
      INFRASTRUCTURE_UID_VALIDATORS
    );
    this.registerDomain(
      "transportation",
      TRANSPORTATION_ENTITY_SCHEMAS,
      TRANSPORTATION_UID_VALIDATORS
    );
    this.registerDomain(
      "astronomical",
      ASTRONOMICAL_ENTITY_SCHEMAS,
      ASTRONOMICAL_UID_VALIDATORS
    );
    this.registerDomain("legal", LEGAL_ENTITY_SCHEMAS, LEGAL_UID_VALIDATORS);
    this.registerDomain(
      "academic",
      ACADEMIC_ENTITY_SCHEMAS,
      ACADEMIC_UID_VALIDATORS
    );
    this.registerDomain(
      "cultural",
      CULTURAL_ENTITY_SCHEMAS,
      CULTURAL_UID_VALIDATORS
    );
  }

  registerDomain(
    name: string,
    schemas: Record<string, z.ZodSchema>,
    validators: Record<string, (uid: string) => boolean>
  ): void {
    Object.entries(schemas).forEach(([type, schema]) => {
      this.schemas.set(type, schema);
    });
    Object.entries(validators).forEach(([prefix, validator]) => {
      this.uidValidators.set(prefix, validator);
    });
  }

  getSchema(entityType: string): z.ZodSchema | undefined {
    return this.schemas.get(entityType);
  }

  validateUID(uid: string): boolean {
    const prefix = uid.split(":")[0];

    // Try modular validators first
    const validator = this.uidValidators.get(prefix);
    if (validator) {
      return validator(uid);
    }

    // Fall back to legacy pattern matching
    const pattern =
      LEGACY_UID_PATTERNS[prefix as keyof typeof LEGACY_UID_PATTERNS];
    return pattern ? pattern.test(uid) : false;
  }

  getAllEntityTypes(): string[] {
    // Return all supported entity types (both modular and legacy)
    return ALL_ENTITY_TYPES as unknown as string[];
  }

  /**
   * Get domain from UID
   * @deprecated Internal implementation now delegates to DomainRegistry
   */
  getDomainFromUID(uid: string): string | null {
    // Delegate to new domain registry
    return domainRegistry.getDomainFromUID(uid);
  }
}

// ==================== Exports ====================

export type EntityType = z.infer<typeof EntityTypeEnum>;
export type Entity = z.infer<typeof EntitySchema>;
