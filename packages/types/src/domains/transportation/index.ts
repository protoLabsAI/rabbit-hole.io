/**
 * Transportation Domain - Index
 *
 * Exports all transportation entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

export * from "./vehicle.schema";
export * from "./aircraft.schema";
export * from "./ship.schema";
export * from "./train.schema";
export * from "./route.schema";
export * from "./station.schema";

import type { DomainMetadata } from "../../domain-metadata";

import {
  AircraftEntitySchema,
  validateAircraftUID,
  AIRCRAFT_UID_PREFIX,
} from "./aircraft.schema";
import {
  RouteEntitySchema,
  validateRouteUID,
  ROUTE_UID_PREFIX,
} from "./route.schema";
import {
  ShipEntitySchema,
  validateShipUID,
  SHIP_UID_PREFIX,
} from "./ship.schema";
import {
  StationEntitySchema,
  validateStationUID,
  STATION_UID_PREFIX,
} from "./station.schema";
import {
  TrainEntitySchema,
  validateTrainUID,
  TRAIN_UID_PREFIX,
} from "./train.schema";
import {
  VehicleEntitySchema,
  validateVehicleUID,
  VEHICLE_UID_PREFIX,
} from "./vehicle.schema";

// ==================== Domain Registry ====================

/**
 * All transportation entity schemas mapped by type name
 */
export const TRANSPORTATION_ENTITY_SCHEMAS = {
  Vehicle: VehicleEntitySchema,
  Aircraft: AircraftEntitySchema,
  Ship: ShipEntitySchema,
  Train: TrainEntitySchema,
  Route: RouteEntitySchema,
  Station: StationEntitySchema,
} as const;

/**
 * All transportation entity types
 */
export const TRANSPORTATION_ENTITY_TYPES = Object.keys(
  TRANSPORTATION_ENTITY_SCHEMAS
) as Array<keyof typeof TRANSPORTATION_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for transportation entities
 */
export const TRANSPORTATION_UID_PREFIXES = {
  [VEHICLE_UID_PREFIX]: "Vehicle",
  [AIRCRAFT_UID_PREFIX]: "Aircraft",
  [SHIP_UID_PREFIX]: "Ship",
  [TRAIN_UID_PREFIX]: "Train",
  [ROUTE_UID_PREFIX]: "Route",
  [STATION_UID_PREFIX]: "Station",
} as const;

/**
 * UID validators for transportation entities
 */
export const TRANSPORTATION_UID_VALIDATORS = {
  [VEHICLE_UID_PREFIX]: validateVehicleUID,
  [AIRCRAFT_UID_PREFIX]: validateAircraftUID,
  [SHIP_UID_PREFIX]: validateShipUID,
  [TRAIN_UID_PREFIX]: validateTrainUID,
  [ROUTE_UID_PREFIX]: validateRouteUID,
  [STATION_UID_PREFIX]: validateStationUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the transportation domain
 */
export function isTransportationUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in TRANSPORTATION_UID_VALIDATORS;
}

/**
 * Get entity type from transportation UID
 */
export function getTransportationEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    TRANSPORTATION_UID_PREFIXES[
      prefix as keyof typeof TRANSPORTATION_UID_PREFIXES
    ] || null
  );
}

/**
 * Validate transportation UID format
 */
export function validateTransportationUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    TRANSPORTATION_UID_VALIDATORS[
      prefix as keyof typeof TRANSPORTATION_UID_VALIDATORS
    ];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { transportationDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use transportationDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const TRANSPORTATION_DOMAIN_INFO: DomainMetadata = {
  name: "transportation",
  description:
    "Transportation entities - vehicles, aircraft, ships, trains, routes, stations",
  entityCount: Object.keys(TRANSPORTATION_ENTITY_SCHEMAS).length,
  relationships: [
    "OPERATES",
    "SERVICES",
    "CONNECTS_TO",
    "TRAVELS_ON",
    "DOCKS_AT",
    "LANDS_AT",
    "STOPS_AT",
    "MANUFACTURED_BY",
    "OWNED_BY",
    "USES_ROUTE",
  ],
  ui: {
    color: "#DC2626", // Dark red - movement/transportation
    icon: "🚗", // Vehicle/transportation
    entityIcons: {
      Vehicle: "🚗",
      Aircraft: "✈️",
      Ship: "🚢",
      Train: "🚂",
      Route: "🗺️",
      Station: "🚉",
    },
  },
} as const;
