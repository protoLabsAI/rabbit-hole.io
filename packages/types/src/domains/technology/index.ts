/**
 * Technology Domain - Index
 *
 * Exports all technology entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

export * from "./software.schema";
export * from "./hardware.schema";
export * from "./database.schema";
export * from "./api.schema";
export * from "./protocol.schema";
export * from "./framework.schema";
export * from "./library.schema";

import type { DomainMetadata } from "../../domain-metadata";

import { APIEntitySchema, validateAPIUID, API_UID_PREFIX } from "./api.schema";
import {
  DatabaseEntitySchema,
  validateDatabaseUID,
  DATABASE_UID_PREFIX,
} from "./database.schema";
import {
  FrameworkEntitySchema,
  validateFrameworkUID,
  FRAMEWORK_UID_PREFIX,
} from "./framework.schema";
import {
  HardwareEntitySchema,
  validateHardwareUID,
  HARDWARE_UID_PREFIX,
} from "./hardware.schema";
import {
  LibraryEntitySchema,
  validateLibraryUID,
  LIBRARY_UID_PREFIX,
} from "./library.schema";
import {
  ProtocolEntitySchema,
  validateProtocolUID,
  PROTOCOL_UID_PREFIX,
} from "./protocol.schema";
import {
  SoftwareEntitySchema,
  validateSoftwareUID,
  SOFTWARE_UID_PREFIX,
} from "./software.schema";

// ==================== Domain Registry ====================

/**
 * All technology entity schemas mapped by type name
 */
export const TECHNOLOGY_ENTITY_SCHEMAS = {
  Software: SoftwareEntitySchema,
  Hardware: HardwareEntitySchema,
  Database: DatabaseEntitySchema,
  API: APIEntitySchema,
  Protocol: ProtocolEntitySchema,
  Framework: FrameworkEntitySchema,
  Library: LibraryEntitySchema,
} as const;

/**
 * All technology entity types
 */
export const TECHNOLOGY_ENTITY_TYPES = Object.keys(
  TECHNOLOGY_ENTITY_SCHEMAS
) as Array<keyof typeof TECHNOLOGY_ENTITY_SCHEMAS>;

/**
 * UID prefix mappings for technology entities
 */
export const TECHNOLOGY_UID_PREFIXES = {
  [SOFTWARE_UID_PREFIX]: "Software",
  [HARDWARE_UID_PREFIX]: "Hardware",
  [DATABASE_UID_PREFIX]: "Database",
  [API_UID_PREFIX]: "API",
  [PROTOCOL_UID_PREFIX]: "Protocol",
  [FRAMEWORK_UID_PREFIX]: "Framework",
  [LIBRARY_UID_PREFIX]: "Library",
} as const;

/**
 * UID validators for technology entities
 */
export const TECHNOLOGY_UID_VALIDATORS = {
  [SOFTWARE_UID_PREFIX]: validateSoftwareUID,
  [HARDWARE_UID_PREFIX]: validateHardwareUID,
  [DATABASE_UID_PREFIX]: validateDatabaseUID,
  [API_UID_PREFIX]: validateAPIUID,
  [PROTOCOL_UID_PREFIX]: validateProtocolUID,
  [FRAMEWORK_UID_PREFIX]: validateFrameworkUID,
  [LIBRARY_UID_PREFIX]: validateLibraryUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the technology domain
 */
export function isTechnologyUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in TECHNOLOGY_UID_VALIDATORS;
}

/**
 * Get entity type from technology UID
 */
export function getTechnologyEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    TECHNOLOGY_UID_PREFIXES[prefix as keyof typeof TECHNOLOGY_UID_PREFIXES] ||
    null
  );
}

/**
 * Validate technology UID format
 */
export function validateTechnologyUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    TECHNOLOGY_UID_VALIDATORS[prefix as keyof typeof TECHNOLOGY_UID_VALIDATORS];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { technologyDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use technologyDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const TECHNOLOGY_DOMAIN_INFO: DomainMetadata = {
  name: "technology",
  description:
    "Technology entities - software, hardware, databases, APIs, protocols, frameworks, libraries",
  entityCount: Object.keys(TECHNOLOGY_ENTITY_SCHEMAS).length,
  relationships: [
    "USES",
    "POWERS",
    "INTEGRATES_WITH",
    "DEPENDS_ON",
    "REPLACES",
    "COMPATIBLE_WITH",
    "RUNS_ON",
    "CONNECTS_TO",
    "IMPLEMENTS",
    "EXTENDS",
  ],
  ui: {
    color: "#06B6D4", // Cyan - tech/digital
    icon: "💻", // Computer/technology
    entityIcons: {
      Software: "💾",
      Hardware: "🖥️",
      Database: "🗃️",
      API: "🔌",
      Protocol: "📡",
      Framework: "🏗️",
      Library: "📚",
    },
  },
} as const;
