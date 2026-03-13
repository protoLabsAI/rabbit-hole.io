/**
 * Legal Domain - Index
 *
 * Exports all legal entity schemas and provides domain-specific
 * UID validation and entity type mappings.
 */

// ==================== Schema Imports ====================

export * from "./law.schema";
export * from "./court.schema";
export * from "./case.schema";
export * from "./regulation.schema";
export * from "./patent.schema";
export * from "./license.schema";
export * from "./contract.schema";

import type { DomainMetadata } from "../../domain-metadata";

import {
  CaseEntitySchema,
  validateCaseUID,
  CASE_UID_PREFIX,
} from "./case.schema";
import {
  ContractEntitySchema,
  validateContractUID,
  CONTRACT_UID_PREFIX,
} from "./contract.schema";
import {
  CourtEntitySchema,
  validateCourtUID,
  COURT_UID_PREFIX,
} from "./court.schema";
import { LawEntitySchema, validateLawUID, LAW_UID_PREFIX } from "./law.schema";
import {
  LicenseEntitySchema,
  validateLicenseUID,
  LICENSE_UID_PREFIX,
} from "./license.schema";
import {
  PatentEntitySchema,
  validatePatentUID,
  PATENT_UID_PREFIX,
} from "./patent.schema";
import {
  RegulationEntitySchema,
  validateRegulationUID,
  REGULATION_UID_PREFIX,
} from "./regulation.schema";

// ==================== Domain Registry ====================

/**
 * All legal entity schemas mapped by type name
 */
export const LEGAL_ENTITY_SCHEMAS = {
  Law: LawEntitySchema,
  Court: CourtEntitySchema,
  Case: CaseEntitySchema,
  Regulation: RegulationEntitySchema,
  Patent: PatentEntitySchema,
  License: LicenseEntitySchema,
  Contract: ContractEntitySchema,
} as const;

/**
 * All legal entity types
 */
export const LEGAL_ENTITY_TYPES = Object.keys(LEGAL_ENTITY_SCHEMAS) as Array<
  keyof typeof LEGAL_ENTITY_SCHEMAS
>;

/**
 * UID prefix mappings for legal entities
 */
export const LEGAL_UID_PREFIXES = {
  [LAW_UID_PREFIX]: "Law",
  [COURT_UID_PREFIX]: "Court",
  [CASE_UID_PREFIX]: "Case",
  [REGULATION_UID_PREFIX]: "Regulation",
  [PATENT_UID_PREFIX]: "Patent",
  [LICENSE_UID_PREFIX]: "License",
  [CONTRACT_UID_PREFIX]: "Contract",
} as const;

/**
 * UID validators for legal entities
 */
export const LEGAL_UID_VALIDATORS = {
  [LAW_UID_PREFIX]: validateLawUID,
  [COURT_UID_PREFIX]: validateCourtUID,
  [CASE_UID_PREFIX]: validateCaseUID,
  [REGULATION_UID_PREFIX]: validateRegulationUID,
  [PATENT_UID_PREFIX]: validatePatentUID,
  [LICENSE_UID_PREFIX]: validateLicenseUID,
  [CONTRACT_UID_PREFIX]: validateContractUID,
} as const;

// ==================== Domain Helper Functions ====================

/**
 * Validate if a UID belongs to the legal domain
 */
export function isLegalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  return prefix in LEGAL_UID_VALIDATORS;
}

/**
 * Get entity type from legal UID
 */
export function getLegalEntityType(uid: string): string | null {
  const prefix = uid.split(":")[0];
  return LEGAL_UID_PREFIXES[prefix as keyof typeof LEGAL_UID_PREFIXES] || null;
}

/**
 * Validate legal UID format
 */
export function validateLegalUID(uid: string): boolean {
  const prefix = uid.split(":")[0];
  const validator =
    LEGAL_UID_VALIDATORS[prefix as keyof typeof LEGAL_UID_VALIDATORS];
  return validator ? validator(uid) : false;
}

// ==================== Domain Configuration (New) ====================

export * from "./domain.config";
export { legalDomainConfig } from "./domain.config";

// ==================== Domain Metadata (Deprecated) ====================

/**
 * @deprecated Use legalDomainConfig from domain-system instead.
 * Will be removed in v2.0.0
 */
export const LEGAL_DOMAIN_INFO: DomainMetadata = {
  name: "legal",
  description:
    "Legal system - laws, courts, cases, regulations, patents, licenses, contracts",
  entityCount: Object.keys(LEGAL_ENTITY_SCHEMAS).length,
  relationships: [
    "ADJUDICATES",
    "ENFORCES",
    "VIOLATES",
    "COMPLIES_WITH",
    "APPEALS",
    "CITES",
    "SUPERSEDES",
    "AMENDS",
    "GOVERNS",
    "AUTHORIZES",
    "LICENSES",
    "CONTRACTS_WITH",
    "REPRESENTS",
    "PRESIDES_OVER",
  ],
  ui: {
    color: "#DC2626", // Red - law/justice
    icon: "⚖️", // Scales of justice
    entityIcons: {
      Law: "📜",
      Court: "🏛️",
      Case: "⚖️",
      Regulation: "📋",
      Patent: "📋",
      License: "📄",
      Contract: "📝",
    },
  },
} as const;
