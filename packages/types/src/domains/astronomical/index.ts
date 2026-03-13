/**
 * Astronomical Domain - Index
 *
 * Exports all astronomical entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

import type { DomainMetadata } from "../../domain-metadata";

export * from "./planet.schema";
export * from "./star.schema";
export * from "./galaxy.schema";
export * from "./solar-system.schema";

import {
  GalaxyEntitySchema,
  validateGalaxyUID,
  GALAXY_UID_PREFIX,
} from "./galaxy.schema";
import {
  PlanetEntitySchema,
  validatePlanetUID,
  PLANET_UID_PREFIX,
} from "./planet.schema";
import {
  SolarSystemEntitySchema,
  validateSolarSystemUID,
  SOLAR_SYSTEM_UID_PREFIX,
} from "./solar-system.schema";
import {
  StarEntitySchema,
  validateStarUID,
  STAR_UID_PREFIX,
} from "./star.schema";

// ==================== Domain Registry ====================

/**
 * All astronomical entity schemas mapped by type name
 */
export const ASTRONOMICAL_ENTITY_SCHEMAS = {
  Planet: PlanetEntitySchema,
  Star: StarEntitySchema,
  Galaxy: GalaxyEntitySchema,
  Solar_System: SolarSystemEntitySchema,
} as const;

/**
 * All astronomical entity types
 */
export const ASTRONOMICAL_ENTITY_TYPES = Object.keys(
  ASTRONOMICAL_ENTITY_SCHEMAS
) as Array<keyof typeof ASTRONOMICAL_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for astronomical entities
 */
export const ASTRONOMICAL_UID_PREFIXES = {
  [PLANET_UID_PREFIX]: "Planet",
  [STAR_UID_PREFIX]: "Star",
  [GALAXY_UID_PREFIX]: "Galaxy",
  [SOLAR_SYSTEM_UID_PREFIX]: "Solar_System",
} as const;

/**
 * UID validators for astronomical entities
 */
export const ASTRONOMICAL_UID_VALIDATORS = {
  [PLANET_UID_PREFIX]: validatePlanetUID,
  [STAR_UID_PREFIX]: validateStarUID,
  [GALAXY_UID_PREFIX]: validateGalaxyUID,
  [SOLAR_SYSTEM_UID_PREFIX]: validateSolarSystemUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the astronomical domain
 */
export function isAstronomicalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in ASTRONOMICAL_UID_VALIDATORS;
}

/**
 * Get entity type from astronomical UID
 */
export function getAstronomicalEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    ASTRONOMICAL_UID_PREFIXES[
      prefix as keyof typeof ASTRONOMICAL_UID_PREFIXES
    ] || null
  );
}

/**
 * Validate astronomical UID format
 */
export function validateAstronomicalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    ASTRONOMICAL_UID_VALIDATORS[
      prefix as keyof typeof ASTRONOMICAL_UID_VALIDATORS
    ];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { astronomicalDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use astronomicalDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const ASTRONOMICAL_DOMAIN_INFO: DomainMetadata = {
  name: "astronomical",
  description: "Space objects - planets, stars, galaxies, solar systems",
  entityCount: Object.keys(ASTRONOMICAL_ENTITY_SCHEMAS).length,
  relationships: [
    "ORBITS",
    "PART_OF",
    "GRAVITATIONALLY_BOUND_TO",
    "ILLUMINATES",
    "INFLUENCES",
    "DISCOVERED_BY",
    "OBSERVED_BY",
    "CONTAINS",
    "MEMBER_OF",
  ],
  ui: {
    color: "#4F46E5", // Indigo - space/cosmic
    icon: "🌌", // Galaxy/cosmos
    entityIcons: {
      Planet: "🪐",
      Star: "⭐",
      Galaxy: "🌌",
      Solar_System: "🌞",
    },
  },
} as const;
