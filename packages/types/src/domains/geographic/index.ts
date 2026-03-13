/**
 * Geographic Domain - Index
 *
 * Exports all geographic entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Type Imports ====================

import type { DomainMetadata } from "../../domain-metadata";

// ==================== Schema Imports ====================

export * from "./country.schema";
export * from "./city.schema";
export * from "./region.schema";
export * from "./materials-schemas";
export * from "./continent.schema";
export * from "./location.schema";

import {
  CityEntitySchema,
  validateCityUID,
  CITY_UID_PREFIX,
} from "./city.schema";
import {
  ContinentEntitySchema,
  validateContinentUID,
  CONTINENT_UID_PREFIX,
} from "./continent.schema";
import {
  CountryEntitySchema,
  validateCountryUID,
  COUNTRY_UID_PREFIX,
} from "./country.schema";
import {
  LocationEntitySchema,
  validateLocationUID,
  LOCATION_UID_PREFIX,
} from "./location.schema";
import {
  MaterialEntitySchema,
  MineralEntitySchema,
  ResourceEntitySchema,
  SubstanceEntitySchema,
  CompositeEntitySchema,
  AlloyEntitySchema,
  CrystalEntitySchema,
  WeatherEventEntitySchema,
  ClimateZoneEntitySchema,
  NaturalDisasterEntitySchema,
  EnvironmentalProcessEntitySchema,
  CarbonCycleEntitySchema,
  RenewableEnergyEntitySchema,
} from "./materials-schemas";
import {
  RegionEntitySchema,
  validateRegionUID,
  REGION_UID_PREFIX,
} from "./region.schema";

// ==================== Domain Registry ====================

/**
 * All geographic entity schemas mapped by type name
 */
export const GEOGRAPHIC_ENTITY_SCHEMAS = {
  Country: CountryEntitySchema,
  City: CityEntitySchema,
  Region: RegionEntitySchema,
  Continent: ContinentEntitySchema,
  Location: LocationEntitySchema,
  Material: MaterialEntitySchema,
  Mineral: MineralEntitySchema,
  Resource: ResourceEntitySchema,
  Substance: SubstanceEntitySchema,
  Composite: CompositeEntitySchema,
  Alloy: AlloyEntitySchema,
  Crystal: CrystalEntitySchema,
  Weather_Event: WeatherEventEntitySchema,
  Climate_Zone: ClimateZoneEntitySchema,
  Natural_Disaster: NaturalDisasterEntitySchema,
  Environmental_Process: EnvironmentalProcessEntitySchema,
  Carbon_Cycle: CarbonCycleEntitySchema,
  Renewable_Energy: RenewableEnergyEntitySchema,
} as const;

/**
 * All geographic entity types
 */
export const GEOGRAPHIC_ENTITY_TYPES = Object.keys(
  GEOGRAPHIC_ENTITY_SCHEMAS
) as Array<keyof typeof GEOGRAPHIC_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for geographic entities
 */
export const GEOGRAPHIC_UID_PREFIXES = {
  [COUNTRY_UID_PREFIX]: "Country",
  [CITY_UID_PREFIX]: "City",
  [REGION_UID_PREFIX]: "Region",
  [CONTINENT_UID_PREFIX]: "Continent",
  [LOCATION_UID_PREFIX]: "Location",
} as const;

/**
 * UID validators for geographic entities
 */
export const GEOGRAPHIC_UID_VALIDATORS = {
  [COUNTRY_UID_PREFIX]: validateCountryUID,
  [CITY_UID_PREFIX]: validateCityUID,
  [REGION_UID_PREFIX]: validateRegionUID,
  [CONTINENT_UID_PREFIX]: validateContinentUID,
  [LOCATION_UID_PREFIX]: validateLocationUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the geographic domain
 */
export function isGeographicUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in GEOGRAPHIC_UID_VALIDATORS;
}

/**
 * Get entity type from geographic UID
 */
export function getGeographicEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    GEOGRAPHIC_UID_PREFIXES[prefix as keyof typeof GEOGRAPHIC_UID_PREFIXES] ||
    null
  );
}

/**
 * Validate geographic UID format
 */
export function validateGeographicUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    GEOGRAPHIC_UID_VALIDATORS[prefix as keyof typeof GEOGRAPHIC_UID_VALIDATORS];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { geographicDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use geographicDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const GEOGRAPHIC_DOMAIN_INFO: DomainMetadata = {
  name: "geographic",
  description: "Geographic entities - countries, cities, regions, continents",
  entityCount: Object.keys(GEOGRAPHIC_ENTITY_SCHEMAS).length,
  relationships: [
    "BORDERS",
    "CAPITAL_OF",
    "LOCATED_IN",
    "TRADES_WITH",
    "DIPLOMATIC_RELATIONS",
    "MEMBER_OF",
    "GOVERNS",
    "COLONIZED_BY",
    "INDEPENDENT_FROM",
    "ANNEXED_BY",
    "AFFECTS_CLIMATE", // Environmental climate impact
    "CYCLES_THROUGH", // Environmental cycles
  ],
  ui: {
    color: "#8B5CF6", // Purple - places/geography
    icon: "🌍", // Earth/globe
    entityIcons: {
      Country: "🏴",
      City: "🏙️",
      Region: "📍",
      Continent: "🌍",
      Natural_Disaster: "🌪️",
      Weather_Event: "⛈️",
      Climate_Zone: "🌡️",
    },
  },
} as const;
