/**
 * Core Relationship Schema - Dynamic Generation from Domain Metadata
 *
 * Relationship types are now dynamically collected from all domain metadata
 * to eliminate duplication and ensure single source of truth.
 */

import { z } from "zod";

// Import all domain metadata
import { ACADEMIC_DOMAIN_INFO } from "../academic";
import { ASTRONOMICAL_DOMAIN_INFO } from "../astronomical";
import { BIOLOGICAL_DOMAIN_INFO } from "../biological";
import { CULTURAL_DOMAIN_INFO } from "../cultural";
import { ECONOMIC_DOMAIN_INFO } from "../economic";
import { GEOGRAPHIC_DOMAIN_INFO } from "../geographic";
import { INFRASTRUCTURE_DOMAIN_INFO } from "../infrastructure";
import { LEGAL_DOMAIN_INFO } from "../legal";
import { MEDICAL_DOMAIN_INFO } from "../medical";
import { SOCIAL_DOMAIN_INFO } from "../social";
import { TECHNOLOGY_DOMAIN_INFO } from "../technology";

// ==================== Dynamic Relationship Type Generation ====================

/**
 * Collect all relationship types from domain metadata
 */
const getAllDomainRelationships = (): string[] => {
  const allDomains = [
    SOCIAL_DOMAIN_INFO,
    BIOLOGICAL_DOMAIN_INFO,
    CULTURAL_DOMAIN_INFO,
    GEOGRAPHIC_DOMAIN_INFO,
    ACADEMIC_DOMAIN_INFO,
    LEGAL_DOMAIN_INFO,
    ECONOMIC_DOMAIN_INFO,
    MEDICAL_DOMAIN_INFO,
    TECHNOLOGY_DOMAIN_INFO,
    INFRASTRUCTURE_DOMAIN_INFO,
    ASTRONOMICAL_DOMAIN_INFO,
  ];

  // Core domain relationship types (not in domain info structure)
  const coreRelationships = [
    "EVIDENCES",
    "SUPPORTS",
    "ATTACHED_TO",
    "REFERENCES",
  ];

  const allRelationships = new Set<string>(coreRelationships);

  allDomains.forEach((domain) => {
    domain.relationships.forEach((rel) => {
      allRelationships.add(rel);
    });
  });

  return Array.from(allRelationships).sort();
};

/**
 * All relationship types from domain metadata (exported for use in other modules)
 */
export const ALL_RELATIONSHIP_TYPES = getAllDomainRelationships();

/**
 * Dynamically generated relationship type enum from domain metadata
 */
export const RelationshipTypeEnum = z.enum(
  getAllDomainRelationships() as [string, ...string[]]
);

// ==================== Relationship Schema ====================

/**
 * UID validator for relationships
 */
const relationshipUidValidator = z
  .string()
  .min(1, "Relationship UID is required")
  .refine((uid) => uid.startsWith("rel:"), {
    message:
      "Relationship UIDs must use format 'rel:identifier' (colon required)",
  });

/**
 * Core relationship schema
 * Note: Uses string validation instead of enum to support custom domain relationships
 */
export const RelationshipSchema = z.object({
  uid: relationshipUidValidator,
  type: z.string().min(1, "Relationship type is required"),
  source: z.string().min(1, "Source entity UID is required"),
  target: z.string().min(1, "Target entity UID is required"),
  at: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
      "Must be ISO datetime"
    )
    .optional(),
  confidence: z
    .number()
    .min(0)
    .max(1, "Confidence must be between 0 and 1")
    .optional(),
  properties: z.record(z.string(), z.any()).optional(),
});

// ==================== Type Exports ====================

// Universal types are exported from base-entity.schema.ts
export type RelationshipType = z.infer<typeof RelationshipTypeEnum>;
export type Relationship = z.infer<typeof RelationshipSchema>;
