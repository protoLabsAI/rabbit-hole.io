/**
 * Social Domain - Index
 *
 * Exports all social entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

export * from "./person.schema";
export * from "./organization.schema";
export * from "./platform.schema";
export * from "./movement.schema";
export * from "./event.schema";
export * from "./media.schema";

import type { DomainMetadata } from "../../domain-metadata";

import {
  EventEntitySchema,
  validateEventUID,
  EVENT_UID_PREFIX,
} from "./event.schema";
import {
  MediaEntitySchema,
  validateMediaUID,
  MEDIA_UID_PREFIX,
} from "./media.schema";
import {
  MovementEntitySchema,
  validateMovementUID,
  MOVEMENT_UID_PREFIX,
} from "./movement.schema";
import {
  OrganizationEntitySchema,
  validateOrganizationUID,
  ORGANIZATION_UID_PREFIX,
} from "./organization.schema";
import {
  PersonEntitySchema,
  validatePersonUID,
  PERSON_UID_PREFIX,
} from "./person.schema";
import {
  PlatformEntitySchema,
  validatePlatformUID,
  PLATFORM_UID_PREFIX,
} from "./platform.schema";

// ==================== Domain Registry ====================

/**
 * All social entity schemas mapped by type name
 */
export const SOCIAL_ENTITY_SCHEMAS = {
  Person: PersonEntitySchema,
  Organization: OrganizationEntitySchema,
  Platform: PlatformEntitySchema,
  Movement: MovementEntitySchema,
  Event: EventEntitySchema,
  Media: MediaEntitySchema,
} as const;

/**
 * All social entity types
 */
export const SOCIAL_ENTITY_TYPES = Object.keys(SOCIAL_ENTITY_SCHEMAS) as Array<
  keyof typeof SOCIAL_ENTITY_SCHEMAS
>;

/**
 * UID prefix mappings for social entities
 */
export const SOCIAL_UID_PREFIXES = {
  [PERSON_UID_PREFIX]: "Person",
  [ORGANIZATION_UID_PREFIX]: "Organization",
  [PLATFORM_UID_PREFIX]: "Platform",
  [MOVEMENT_UID_PREFIX]: "Movement",
  [EVENT_UID_PREFIX]: "Event",
  [MEDIA_UID_PREFIX]: "Media",
} as const;

/**
 * UID validators for social entities
 */
export const SOCIAL_UID_VALIDATORS = {
  [PERSON_UID_PREFIX]: validatePersonUID,
  [ORGANIZATION_UID_PREFIX]: validateOrganizationUID,
  [PLATFORM_UID_PREFIX]: validatePlatformUID,
  [MOVEMENT_UID_PREFIX]: validateMovementUID,
  [EVENT_UID_PREFIX]: validateEventUID,
  [MEDIA_UID_PREFIX]: validateMediaUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the social domain
 */
export function isSocialUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in SOCIAL_UID_VALIDATORS;
}

/**
 * Get entity type from social UID
 */
export function getSocialEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return (
    SOCIAL_UID_PREFIXES[prefix as keyof typeof SOCIAL_UID_PREFIXES] || null
  );
}

/**
 * Validate social UID format
 */
export function validateSocialUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    SOCIAL_UID_VALIDATORS[prefix as keyof typeof SOCIAL_UID_VALIDATORS];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { socialDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use socialDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const SOCIAL_DOMAIN_INFO: DomainMetadata = {
  name: "social",
  description:
    "Social entities - people, organizations, platforms, movements, events, media",
  entityCount: Object.keys(SOCIAL_ENTITY_SCHEMAS).length,
  relationships: [
    "SPEECH_ACT",
    "FUNDS",
    "PLATFORMS",
    "ENDORSES",
    "ATTACKS",
    "BADMOUTHS", // Political criticism/condemnation
    "AMPLIFIES",
    "OWNS",
    "HOLDS_ROLE",
    "BELONGS_TO",
    "AFFILIATED_WITH",
    "PARTICIPATES_IN",
    "MENTIONS",
    "MARRIED_TO",
    "DIVORCED_FROM",
    "PARENT_OF",
    "CHILD_OF",
    "SIBLING_OF",
    "CONTROLS",
    "APPEARS_AT",
    "EVIDENCES", // Evidence support relationships
    "EXPERIENCES_EVENT", // Event participation/experience
  ],
  ui: {
    color: "#3B82F6", // Blue - people/society
    icon: "👥", // People/groups
    entityIcons: {
      Person: "👤",
      Organization: "🏢",
      Platform: "💻",
      Movement: "🌊",
      Event: "📅",
      Media: "📺",
      Athlete: "🏃",
      Character: "🎭",
      Location: "📍",
    },
  },
} as const;
