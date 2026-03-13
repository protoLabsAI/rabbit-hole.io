/**
 * Entity Research Types - Extended support for all entity types
 *
 * Builds on existing person research patterns to support:
 * - Organization, Platform, Movement, Event research
 * - Rabbit Hole Schema compatibility
 * - Bundle generation for /api/ingest-bundle
 */

import { z } from "zod";

import type { EntityType } from "./entity-schema-registry";
import type {
  Entity,
  Relationship,
  Evidence,
  RelationshipType,
  Content,
} from "./validation-schemas-modular";

// ==================== Base Entity Research Types ====================

export type EntityResearchDepth = "basic" | "detailed" | "comprehensive";

export type EntityResearchFocus =
  | "biographical" // Personal/organizational history
  | "financial" // Funding, revenue, investments
  | "political" // Political affiliations, positions
  | "business" // Corporate relationships, partnerships
  | "social" // Social media, public communications
  | "legal" // Court cases, regulatory issues
  | "technological" // Technical capabilities, platforms
  | "relationships" // Network connections, associations
  | "events" // Participation in events, activities
  | "content"; // Published content, media presence

// ==================== Entity-Specific Research Types ====================

/**
 * Organization Research Input/Output
 */
export interface OrganizationResearchInput {
  targetOrganizationName: string;
  researchDepth?: EntityResearchDepth;
  focusAreas?: EntityResearchFocus[];
  existingEntities?: Entity[];
  existingRelationships?: Relationship[];
  rawData?: EntityResearchSource[];
  dataSourceConfig?: OrganizationDataSourceConfig;
}

export interface OrganizationDataSourceConfig {
  sec?: {
    enabled: boolean;
    maxFilings?: number;
  };
  corporateWebsite?: {
    enabled: boolean;
    includePress?: boolean;
  };
  businessRegistration?: {
    enabled: boolean;
    jurisdictions?: string[];
  };
  userProvided?: {
    enabled: boolean;
  };
}

/**
 * Platform Research Input/Output
 */
export interface PlatformResearchInput {
  targetPlatformName: string;
  researchDepth?: EntityResearchDepth;
  focusAreas?: EntityResearchFocus[];
  existingEntities?: Entity[];
  existingRelationships?: Relationship[];
  rawData?: EntityResearchSource[];
  dataSourceConfig?: PlatformDataSourceConfig;
}

export interface PlatformDataSourceConfig {
  termsOfService?: {
    enabled: boolean;
    includeHistory?: boolean;
  };
  privacyPolicy?: {
    enabled: boolean;
    includeHistory?: boolean;
  };
  appStores?: {
    enabled: boolean;
    stores?: ("apple" | "google" | "microsoft")[];
  };
  transparencyReports?: {
    enabled: boolean;
  };
  userProvided?: {
    enabled: boolean;
  };
}

/**
 * Movement Research Input/Output
 */
export interface MovementResearchInput {
  targetMovementName: string;
  researchDepth?: EntityResearchDepth;
  focusAreas?: EntityResearchFocus[];
  existingEntities?: Entity[];
  existingRelationships?: Relationship[];
  rawData?: EntityResearchSource[];
  dataSourceConfig?: MovementDataSourceConfig;
}

export interface MovementDataSourceConfig {
  academicSources?: {
    enabled: boolean;
    maxResults?: number;
  };
  governmentReports?: {
    enabled: boolean;
    agencies?: string[];
  };
  historicalArchives?: {
    enabled: boolean;
  };
  userProvided?: {
    enabled: boolean;
  };
}

/**
 * Event Research Input/Output
 */
export interface EventResearchInput {
  targetEventName: string;
  researchDepth?: EntityResearchDepth;
  focusAreas?: EntityResearchFocus[];
  existingEntities?: Entity[];
  existingRelationships?: Relationship[];
  rawData?: EntityResearchSource[];
  dataSourceConfig?: EventDataSourceConfig;
}

export interface EventDataSourceConfig {
  newsArchives?: {
    enabled: boolean;
    sources?: string[];
  };
  officialDocumentation?: {
    enabled: boolean;
  };
  socialMediaHistory?: {
    enabled: boolean;
    platforms?: string[];
  };
  userProvided?: {
    enabled: boolean;
  };
}

// ==================== Universal Entity Research ====================

/**
 * Researchable entity types supported by the entity research workflow
 */
export type ResearchableEntityType =
  | "Person"
  | "Organization"
  | "Platform"
  | "Movement"
  | "Event";

/**
 * Universal Entity Research Input - works with any entity type
 */
export interface EntityResearchInput {
  targetEntityName: string;
  entityType?: ResearchableEntityType; // Auto-detected if not provided
  researchDepth?: EntityResearchDepth;
  focusAreas?: EntityResearchFocus[];
  existingEntities?: Entity[];
  existingRelationships?: Relationship[];
  rawData?: EntityResearchSource[];
  dataSourceConfig?: UniversalDataSourceConfig;
}

export interface UniversalDataSourceConfig {
  // Auto-configured based on detected entity type
  autoDetectSources?: boolean;
  // Universal sources
  wikipedia?: {
    enabled: boolean;
    maxResults?: number;
  };
  userProvided?: {
    enabled: boolean;
  };
  // Entity-specific sources (conditionally used)
  sec?: OrganizationDataSourceConfig["sec"];
  termsOfService?: PlatformDataSourceConfig["termsOfService"];
  academicSources?: MovementDataSourceConfig["academicSources"];
  newsArchives?: EventDataSourceConfig["newsArchives"];
  // Allow additional properties (matches Zod schema with .passthrough())
  [key: string]: unknown;
}

// ==================== Research Output Types ====================

/**
 * Entity Research Output - Rabbit Hole Bundle Format
 */
export interface EntityResearchOutput {
  success: boolean;
  targetEntityName: string;
  detectedEntityType: ResearchableEntityType;
  // Rabbit Hole Bundle components
  entities: Entity[];
  relationships: Relationship[];
  evidence: Evidence[];
  content?: Content[]; // Content items if any
  // Research metadata
  metadata: EntityResearchMetadata;
}

export interface EntityResearchMetadata {
  researchMethod: "ai_extraction" | "fallback_parsing" | "manual_input";
  confidenceScore: number; // 0-1
  sourcesConsulted: string[];
  processingTime: number; // milliseconds
  entityTypeDetectionConfidence: number; // 0-1
  propertiesExtracted: string[];
  relationshipsDiscovered: number;
  dataGaps: string[]; // Fields that couldn't be populated
  warnings: string[]; // Any issues during research
}

// ==================== Research Source Types ====================

export interface EntityResearchSource {
  content: string;
  source: string;
  sourceType:
    | "user_provided"
    | "wikipedia"
    | "sec_filing"
    | "terms_of_service"
    | "news_archive"
    | "academic"
    | "government"
    | "corporate_website"
    | "other";
  sourceUrl?: string;
  retrievedAt?: string; // ISO timestamp
  reliability?: number; // 0-1
  metadata?: {
    documentType?: string;
    publishDate?: string;
    author?: string;
    [key: string]: unknown;
  };
}

// ==================== Entity-Specific Property Schemas ====================

/**
 * Entity-specific properties that should be extracted
 */
export const OrganizationPropertiesSchema = z
  .object({
    orgType: z.string().optional(),
    founded: z.string().optional(),
    headquarters: z.string().optional(),
    industry: z.string().optional(),
    revenue: z.number().optional(),
    employees: z.number().optional(),
    ceo: z.string().optional(),
    website: z.string().url().optional(),
  })
  .partial();

export const PlatformPropertiesSchema = z
  .object({
    platformType: z.string().optional(),
    launched: z.string().optional(),
    userBase: z.number().optional(),
    parentCompany: z.string().optional(),
    headquarters: z.string().optional(),
    ceo: z.string().optional(),
    website: z.string().url().optional(),
  })
  .partial();

export const MovementPropertiesSchema = z
  .object({
    ideology: z.string().optional(),
    founded: z.string().optional(),
    keyFigures: z.array(z.string()).optional(),
    geography: z.string().optional(),
    topic: z.string().optional(),
    status: z.enum(["active", "dormant", "defunct"]).optional(),
  })
  .partial();

export const EventPropertiesSchema = z
  .object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    location: z.string().optional(),
    participants: z.array(z.string()).optional(),
    impact: z.string().optional(),
    duration: z.string().optional(),
    eventType: z.string().optional(),
  })
  .partial();

// ==================== Validation & Quality Control ====================

export interface EntityResearchValidation {
  isValid: boolean;
  schemaCompliance: boolean;
  confidenceThreshold: number;
  errors: EntityValidationError[];
  warnings: string[];
  suggestions: EntityQualityImprovement[];
}

export interface EntityValidationError {
  field: string;
  error: string;
  severity: "critical" | "warning" | "info";
}

export interface EntityQualityImprovement {
  area: string;
  suggestion: string;
  impact: "high" | "medium" | "low";
}

// ==================== UID Generation Helpers ====================

/**
 * Generate proper UIDs for different entity types
 */
export function generateEntityUID(
  entityType: EntityType,
  name: string
): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") // Remove leading and trailing underscores
    .substring(0, 50);

  switch (entityType) {
    case "Person":
      return `person:${normalized}`;
    case "Organization":
      return `org:${normalized}`;
    case "Platform":
      return `platform:${normalized}`;
    case "Movement":
      return `movement:${normalized}`;
    case "Event":
      return `event:${normalized}`;
    case "Media":
      return `media:${normalized}`;
    // Biological entities
    case "Animal":
      return `animal:${normalized}`;
    case "Plant":
      return `plant:${normalized}`;
    case "Fungi":
      return `fungi:${normalized}`;
    case "Species":
      return `species:${normalized}`;
    case "Insect":
      return `insect:${normalized}`;
    case "Ecosystem":
      return `ecosystem:${normalized}`;
    // Astronomical entities
    case "Planet":
      return `planet:${normalized}`;
    case "Star":
      return `star:${normalized}`;
    case "Galaxy":
      return `galaxy:${normalized}`;
    case "Solar_System":
      return `solar_system:${normalized}`;
    // Geographic entities
    case "Country":
      return `country:${normalized}`;
    case "City":
      return `city:${normalized}`;
    case "Region":
      return `region:${normalized}`;
    case "Continent":
      return `continent:${normalized}`;
    // Technology entities
    case "Software":
      return `software:${normalized}`;
    case "Hardware":
      return `hardware:${normalized}`;
    case "Database":
      return `database:${normalized}`;
    case "API":
      return `api:${normalized}`;
    case "Protocol":
      return `protocol:${normalized}`;
    case "Framework":
      return `framework:${normalized}`;
    case "Library":
      return `library:${normalized}`;
    // Economic entities
    case "Currency":
      return `currency:${normalized}`;
    case "Market":
      return `market:${normalized}`;
    case "Industry":
      return `industry:${normalized}`;
    case "Commodity":
      return `commodity:${normalized}`;
    case "Investment":
      return `investment:${normalized}`;
    case "Company":
      return `company:${normalized}`;
    // Legal entities
    case "Law":
      return `law:${normalized}`;
    case "Court":
      return `court:${normalized}`;
    case "Case":
      return `case:${normalized}`;
    case "Regulation":
      return `regulation:${normalized}`;
    case "Patent":
      return `patent:${normalized}`;
    case "License":
      return `license:${normalized}`;
    case "Contract":
      return `contract:${normalized}`;
    // Academic entities
    case "University":
      return `university:${normalized}`;
    case "Research":
      return `research:${normalized}`;
    case "Publication":
      return `publication:${normalized}`;
    case "Journal":
      return `journal:${normalized}`;
    case "Course":
      return `course:${normalized}`;
    case "Degree":
      return `degree:${normalized}`;
    // Cultural entities
    case "Book":
      return `book:${normalized}`;
    case "Film":
      return `film:${normalized}`;
    case "Song":
      return `song:${normalized}`;
    case "Art":
      return `art:${normalized}`;
    case "Language":
      return `language:${normalized}`;
    case "Religion":
      return `religion:${normalized}`;
    case "Tradition":
      return `tradition:${normalized}`;
    // Medical entities
    case "Disease":
      return `disease:${normalized}`;
    case "Drug":
      return `drug:${normalized}`;
    case "Treatment":
      return `treatment:${normalized}`;
    case "Symptom":
      return `symptom:${normalized}`;
    case "Condition":
      return `condition:${normalized}`;
    case "Medical_Device":
      return `medical_device:${normalized}`;
    // Health system entities
    case "Hospital":
      return `hospital:${normalized}`;
    case "Clinic":
      return `clinic:${normalized}`;
    case "Pharmacy":
      return `pharmacy:${normalized}`;
    case "Insurance":
      return `insurance:${normalized}`;
    case "Clinical_Trial":
      return `clinical_trial:${normalized}`;
    // Infrastructure entities
    case "Building":
      return `building:${normalized}`;
    case "Bridge":
      return `bridge:${normalized}`;
    case "Road":
      return `road:${normalized}`;
    case "Airport":
      return `airport:${normalized}`;
    case "Port":
      return `port:${normalized}`;
    case "Utility":
      return `utility:${normalized}`;
    case "Pipeline":
      return `pipeline:${normalized}`;
    // Transportation entities
    case "Vehicle":
      return `vehicle:${normalized}`;
    case "Aircraft":
      return `aircraft:${normalized}`;
    case "Ship":
      return `ship:${normalized}`;
    case "Train":
      return `train:${normalized}`;
    case "Route":
      return `route:${normalized}`;
    case "Station":
      return `station:${normalized}`;
    // Physics entities
    case "Particle":
      return `particle:${normalized}`;
    case "Force":
      return `force:${normalized}`;
    case "Field":
      return `field:${normalized}`;
    case "Energy_Type":
      return `energy_type:${normalized}`;
    case "Physical_Process":
      return `physical_process:${normalized}`;
    case "Wave":
      return `wave:${normalized}`;
    case "Quantum_State":
      return `quantum_state:${normalized}`;
    // Chemistry entities
    case "Element":
      return `element:${normalized}`;
    case "Compound":
      return `compound:${normalized}`;
    case "Reaction":
      return `reaction:${normalized}`;
    case "Molecule":
      return `molecule:${normalized}`;
    case "Ion":
      return `ion:${normalized}`;
    case "Chemical_Bond":
      return `chemical_bond:${normalized}`;
    case "Catalyst":
      return `catalyst:${normalized}`;
    // Mathematics entities
    case "Mathematical_Concept":
      return `mathematical_concept:${normalized}`;
    case "Formula":
      return `formula:${normalized}`;
    case "Theorem":
      return `theorem:${normalized}`;
    case "Proof":
      return `proof:${normalized}`;
    case "Statistical_Model":
      return `statistical_model:${normalized}`;
    case "Algorithm":
      return `algorithm:${normalized}`;
    case "Function":
      return `function:${normalized}`;
    // Materials entities
    case "Material":
      return `material:${normalized}`;
    case "Mineral":
      return `mineral:${normalized}`;
    case "Resource":
      return `resource:${normalized}`;
    case "Substance":
      return `substance:${normalized}`;
    case "Composite":
      return `composite:${normalized}`;
    case "Alloy":
      return `alloy:${normalized}`;
    case "Crystal":
      return `crystal:${normalized}`;
    // Environmental entities
    case "Weather_Event":
      return `weather_event:${normalized}`;
    case "Climate_Zone":
      return `climate_zone:${normalized}`;
    case "Natural_Disaster":
      return `natural_disaster:${normalized}`;
    case "Environmental_Process":
      return `environmental_process:${normalized}`;
    case "Carbon_Cycle":
      return `carbon_cycle:${normalized}`;
    case "Renewable_Energy":
      return `renewable_energy:${normalized}`;
    // Sports entities
    case "Sport":
      return `sport:${normalized}`;
    case "Team":
      return `team:${normalized}`;
    case "Athlete":
      return `athlete:${normalized}`;
    case "Competition":
      return `competition:${normalized}`;
    case "Stadium":
      return `stadium:${normalized}`;
    case "League":
      return `league:${normalized}`;
    case "Tournament":
      return `tournament:${normalized}`;
    case "Sports_Event":
      return `sports_event:${normalized}`;
    // Entertainment entities
    case "Game":
      return `game:${normalized}`;
    case "TV_Show":
      return `tv_show:${normalized}`;
    case "Podcast":
      return `podcast:${normalized}`;
    case "Theater":
      return `theater:${normalized}`;
    case "Concert_Venue":
      return `concert_venue:${normalized}`;
    case "Entertainment_Event":
      return `entertainment_event:${normalized}`;
    // Food entities
    case "Food":
      return `food:${normalized}`;
    case "Recipe":
      return `recipe:${normalized}`;
    case "Ingredient":
      return `ingredient:${normalized}`;
    case "Nutrition":
      return `nutrition:${normalized}`;
    case "Diet":
      return `diet:${normalized}`;
    case "Food_Product":
      return `food_product:${normalized}`;
    case "Cuisine":
      return `cuisine:${normalized}`;
    // Agriculture entities
    case "Farm":
      return `farm:${normalized}`;
    case "Crop":
      return `crop:${normalized}`;
    case "Livestock":
      return `livestock:${normalized}`;
    case "Agricultural_Equipment":
      return `agricultural_equipment:${normalized}`;
    case "Soil":
      return `soil:${normalized}`;
    case "Irrigation_System":
      return `irrigation_system:${normalized}`;
    default:
      // Return fallback UID pattern for unknown entity types
      return `unknown:${normalized}`;
  }
}

/**
 * Generate relationship UID
 */
export function generateRelationshipUID(
  sourceUID: string,
  targetUID: string,
  relationshipType: RelationshipType,
  timestamp?: string
): string {
  const suffix = timestamp
    ? `_${timestamp.replace(/[^0-9]/g, "").substring(0, 8)}`
    : "";
  return `rel:${sourceUID.split(":")[1]}_${relationshipType.toLowerCase()}_${
    targetUID.split(":")[1]
  }${suffix}`;
}

// ==================== Type Exports ====================

export type OrganizationProperties = z.infer<
  typeof OrganizationPropertiesSchema
>;
export type PlatformProperties = z.infer<typeof PlatformPropertiesSchema>;
export type MovementProperties = z.infer<typeof MovementPropertiesSchema>;
export type EventProperties = z.infer<typeof EventPropertiesSchema>;
