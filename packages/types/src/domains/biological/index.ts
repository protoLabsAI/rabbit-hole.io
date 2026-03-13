/**
 * Biological Domain - Index
 *
 * Exports all biological entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

import type { DomainMetadata } from "../../domain-metadata";

export * from "./animal.schema";
export * from "./plant.schema";
export * from "./fungi.schema";
export * from "./species.schema";
export * from "./insect.schema";
export * from "./ecosystem.schema";
export * from "./farm.schema";
export * from "./crop.schema";
export * from "./soil.schema";

import {
  AnimalEntitySchema,
  validateAnimalUID,
  ANIMAL_UID_PREFIX,
} from "./animal.schema";
import {
  CropEntitySchema,
  validateCropUID,
  CROP_UID_PREFIX,
} from "./crop.schema";
import {
  EcosystemEntitySchema,
  validateEcosystemUID,
  ECOSYSTEM_UID_PREFIX,
} from "./ecosystem.schema";
import {
  FarmEntitySchema,
  validateFarmUID,
  FARM_UID_PREFIX,
} from "./farm.schema";
import {
  FungiEntitySchema,
  validateFungiUID,
  FUNGI_UID_PREFIX,
} from "./fungi.schema";
import {
  InsectEntitySchema,
  validateInsectUID,
  INSECT_UID_PREFIX,
} from "./insect.schema";
import {
  PlantEntitySchema,
  validatePlantUID,
  PLANT_UID_PREFIX,
} from "./plant.schema";
import {
  SoilEntitySchema,
  validateSoilUID,
  SOIL_UID_PREFIX,
} from "./soil.schema";
import {
  SpeciesEntitySchema,
  validateSpeciesUID,
  SPECIES_UID_PREFIX,
} from "./species.schema";

// ==================== Domain Registry ====================

/**
 * All biological entity schemas mapped by type name
 */
export const BIOLOGICAL_ENTITY_SCHEMAS = {
  Animal: AnimalEntitySchema,
  Plant: PlantEntitySchema,
  Fungi: FungiEntitySchema,
  Species: SpeciesEntitySchema,
  Insect: InsectEntitySchema,
  Ecosystem: EcosystemEntitySchema,
  Farm: FarmEntitySchema,
  Crop: CropEntitySchema,
  Soil: SoilEntitySchema,
} as const;

/**
 * All biological entity types
 */
export const BIOLOGICAL_ENTITY_TYPES = Object.keys(
  BIOLOGICAL_ENTITY_SCHEMAS
) as Array<keyof typeof BIOLOGICAL_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for biological entities
 */
export const BIOLOGICAL_UID_PREFIXES = {
  [ANIMAL_UID_PREFIX]: "Animal",
  [PLANT_UID_PREFIX]: "Plant",
  [FUNGI_UID_PREFIX]: "Fungi",
  [SPECIES_UID_PREFIX]: "Species",
  [INSECT_UID_PREFIX]: "Insect",
  [ECOSYSTEM_UID_PREFIX]: "Ecosystem",
  [FARM_UID_PREFIX]: "Farm",
  [CROP_UID_PREFIX]: "Crop",
  [SOIL_UID_PREFIX]: "Soil",
} as const;

/**
 * UID validators for biological entities
 */
export const BIOLOGICAL_UID_VALIDATORS = {
  [ANIMAL_UID_PREFIX]: validateAnimalUID,
  [PLANT_UID_PREFIX]: validatePlantUID,
  [FUNGI_UID_PREFIX]: validateFungiUID,
  [SPECIES_UID_PREFIX]: validateSpeciesUID,
  [INSECT_UID_PREFIX]: validateInsectUID,
  [ECOSYSTEM_UID_PREFIX]: validateEcosystemUID,
  [FARM_UID_PREFIX]: validateFarmUID,
  [CROP_UID_PREFIX]: validateCropUID,
  [SOIL_UID_PREFIX]: validateSoilUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the biological domain
 */
export function isBiologicalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in BIOLOGICAL_UID_VALIDATORS;
}

/**
 * Get entity type from biological UID
 */
export function getBiologicalEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    BIOLOGICAL_UID_PREFIXES[prefix as keyof typeof BIOLOGICAL_UID_PREFIXES] ||
    null
  );
}

/**
 * Validate biological UID format
 */
export function validateBiologicalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    BIOLOGICAL_UID_VALIDATORS[prefix as keyof typeof BIOLOGICAL_UID_VALIDATORS];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { biologicalDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use biologicalDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const BIOLOGICAL_DOMAIN_INFO: DomainMetadata = {
  name: "biological",
  description:
    "Life sciences - animals, plants, fungi, species, insects, ecosystems",
  entityCount: Object.keys(BIOLOGICAL_ENTITY_SCHEMAS).length,
  relationships: [
    "EATS",
    "HUNTS",
    "INHABITS",
    "FEEDS_ON",
    "PREYS_ON",
    "SYMBIOTIC_WITH",
    "POLLINATES",
    "DOMESTICATED_BY",
    "GROWS_IN",
    "DOMINATES",
    "EVOLVED_FROM",
    "CLASSIFIED_AS",
  ],
  ui: {
    color: "#22C55E", // Green - life/nature
    icon: "🧬", // DNA/life sciences
    entityIcons: {
      Animal: "🐾",
      Plant: "🌱",
      Fungi: "🍄",
      Species: "🧬",
      Insect: "🦗",
      Ecosystem: "🌿",
      Carbon_Cycle: "🌱",
      Farm: "🚜",
      Crop: "🌾",
      Soil: "🌰",
    },
  },
} as const;
