/**
 * Infrastructure Domain - Index
 *
 * Exports all infrastructure entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

export * from "./building.schema";
export * from "./bridge.schema";
export * from "./road.schema";
export * from "./airport.schema";
export * from "./port.schema";
export * from "./utility.schema";
export * from "./pipeline.schema";

import type { DomainMetadata } from "../../domain-metadata";

import {
  AirportEntitySchema,
  validateAirportUID,
  AIRPORT_UID_PREFIX,
} from "./airport.schema";
import {
  BridgeEntitySchema,
  validateBridgeUID,
  BRIDGE_UID_PREFIX,
} from "./bridge.schema";
import {
  BuildingEntitySchema,
  validateBuildingUID,
  BUILDING_UID_PREFIX,
} from "./building.schema";
import {
  PipelineEntitySchema,
  validatePipelineUID,
  PIPELINE_UID_PREFIX,
} from "./pipeline.schema";
import {
  PortEntitySchema,
  validatePortUID,
  PORT_UID_PREFIX,
} from "./port.schema";
import {
  RoadEntitySchema,
  validateRoadUID,
  ROAD_UID_PREFIX,
} from "./road.schema";
import {
  UtilityEntitySchema,
  validateUtilityUID,
  UTILITY_UID_PREFIX,
} from "./utility.schema";

// ==================== Domain Registry ====================

/**
 * All infrastructure entity schemas mapped by type name
 */
export const INFRASTRUCTURE_ENTITY_SCHEMAS = {
  Building: BuildingEntitySchema,
  Bridge: BridgeEntitySchema,
  Road: RoadEntitySchema,
  Airport: AirportEntitySchema,
  Port: PortEntitySchema,
  Utility: UtilityEntitySchema,
  Pipeline: PipelineEntitySchema,
} as const;

/**
 * All infrastructure entity types
 */
export const INFRASTRUCTURE_ENTITY_TYPES = Object.keys(
  INFRASTRUCTURE_ENTITY_SCHEMAS
) as Array<keyof typeof INFRASTRUCTURE_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for infrastructure entities
 */
export const INFRASTRUCTURE_UID_PREFIXES = {
  [BUILDING_UID_PREFIX]: "Building",
  [BRIDGE_UID_PREFIX]: "Bridge",
  [ROAD_UID_PREFIX]: "Road",
  [AIRPORT_UID_PREFIX]: "Airport",
  [PORT_UID_PREFIX]: "Port",
  [UTILITY_UID_PREFIX]: "Utility",
  [PIPELINE_UID_PREFIX]: "Pipeline",
} as const;

/**
 * UID validators for infrastructure entities
 */
export const INFRASTRUCTURE_UID_VALIDATORS = {
  [BUILDING_UID_PREFIX]: validateBuildingUID,
  [BRIDGE_UID_PREFIX]: validateBridgeUID,
  [ROAD_UID_PREFIX]: validateRoadUID,
  [AIRPORT_UID_PREFIX]: validateAirportUID,
  [PORT_UID_PREFIX]: validatePortUID,
  [UTILITY_UID_PREFIX]: validateUtilityUID,
  [PIPELINE_UID_PREFIX]: validatePipelineUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the infrastructure domain
 */
export function isInfrastructureUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in INFRASTRUCTURE_UID_VALIDATORS;
}

/**
 * Get entity type from infrastructure UID
 */
export function getInfrastructureEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    INFRASTRUCTURE_UID_PREFIXES[
      prefix as keyof typeof INFRASTRUCTURE_UID_PREFIXES
    ] || null
  );
}

/**
 * Validate infrastructure UID format
 */
export function validateInfrastructureUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    INFRASTRUCTURE_UID_VALIDATORS[
      prefix as keyof typeof INFRASTRUCTURE_UID_VALIDATORS
    ];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { infrastructureDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use infrastructureDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const INFRASTRUCTURE_DOMAIN_INFO: DomainMetadata = {
  name: "infrastructure",
  description:
    "Infrastructure entities - buildings, bridges, roads, airports, ports, utilities, pipelines",
  entityCount: Object.keys(INFRASTRUCTURE_ENTITY_SCHEMAS).length,
  relationships: [
    "CONNECTS_TO",
    "SERVICES",
    "MAINTAINS",
    "OPERATES",
    "OWNS",
    "BUILT_BY",
    "DESIGNED_BY",
    "CROSSES",
    "SERVES",
    "SUPPLIES",
    "LANDS_AT", // Transportation landing/arrival
    "USED_IN", // Materials usage
    "STRENGTHENS", // Materials strengthening
  ],
  ui: {
    color: "#78350F", // Brown - built environment
    icon: "🏗️", // Construction/infrastructure
    entityIcons: {
      Building: "🏢",
      Bridge: "🌉",
      Road: "🛣️",
      Airport: "✈️",
      Port: "⚓",
      Utility: "⚡",
      Pipeline: "🔧",
      Stadium: "🏟️",
      Theater: "🎭",
      Material: "🪨",
      Substance: "⚗️",
      Composite: "🧱",
    },
  },
} as const;
