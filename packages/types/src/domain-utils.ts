/**
 * Domain-specific extraction utilities
 *
 * Get relationship types and other metadata based on selected domains
 */

import { academicDomainConfig } from "./domains/academic/domain.config";
import { astronomicalDomainConfig } from "./domains/astronomical/domain.config";
import { biologicalDomainConfig } from "./domains/biological/domain.config";
import { culturalDomainConfig } from "./domains/cultural/domain.config";
import { economicDomainConfig } from "./domains/economic/domain.config";
import { geographicDomainConfig } from "./domains/geographic/domain.config";
import { infrastructureDomainConfig } from "./domains/infrastructure/domain.config";
import { legalDomainConfig } from "./domains/legal/domain.config";
import { medicalDomainConfig } from "./domains/medical/domain.config";
import { socialDomainConfig } from "./domains/social/domain.config";
import { technologyDomainConfig } from "./domains/technology/domain.config";

const DOMAIN_CONFIGS = {
  social: socialDomainConfig,
  academic: academicDomainConfig,
  geographic: geographicDomainConfig,
  medical: medicalDomainConfig,
  technology: technologyDomainConfig,
  economic: economicDomainConfig,
  cultural: culturalDomainConfig,
  biological: biologicalDomainConfig,
  infrastructure: infrastructureDomainConfig,
  legal: legalDomainConfig,
  astronomical: astronomicalDomainConfig,
} as const;

export type DomainName = keyof typeof DOMAIN_CONFIGS;

/**
 * Get all valid relationship types for the given domains
 */
export function getRelationshipTypesForDomains(
  domainNames: ReadonlyArray<DomainName>
): string[] {
  const relationshipSet = new Set<string>();

  // Always include core relationship types
  const coreRelationships = [
    "EVIDENCES",
    "SUPPORTS",
    "ATTACHED_TO",
    "REFERENCES",
    "RELATED_TO",
  ];

  coreRelationships.forEach((rel) => relationshipSet.add(rel));

  // Add relationships from selected domains
  domainNames.forEach((domainName) => {
    const config = DOMAIN_CONFIGS[domainName];
    if (config?.relationships) {
      config.relationships.forEach((rel) => relationshipSet.add(rel));
    }
  });

  return Array.from(relationshipSet).sort();
}

/**
 * Format relationship types as human-readable list for prompts
 */
export function formatRelationshipTypesForPrompt(
  relationshipTypes: string[]
): string {
  // Group similar relationships for better prompt clarity
  const formatted = relationshipTypes.slice(0, 15).join(", ");
  const remaining = relationshipTypes.length - 15;

  if (remaining > 0) {
    return `${formatted}, and ${remaining} more`;
  }

  return formatted;
}

/**
 * Get all entity types from selected domains
 */
export function getEntityTypesForDomains(
  domainNames: ReadonlyArray<DomainName>
): string[] {
  const entityTypeSet = new Set<string>();

  domainNames.forEach((domainName) => {
    const config = DOMAIN_CONFIGS[domainName];
    if (config?.entities) {
      Object.keys(config.entities).forEach((type) => entityTypeSet.add(type));
    }
  });

  return Array.from(entityTypeSet).sort();
}

/**
 * Generate entity discovery example dynamically from domain entity types
 * Creates proper structure for LangExtract few-shot learning
 */
export function generateDiscoveryExample(
  domainNames: ReadonlyArray<DomainName>
): {
  input_text: string;
  expected_output: Record<string, string[]>;
} {
  const entityTypes = getEntityTypesForDomains(domainNames);

  // Build expected_output with all entity types (empty arrays)
  const expected_output: Record<string, string[]> = {};
  entityTypes.forEach((type) => {
    expected_output[type] = [];
  });

  // Populate with example entities based on domains
  const hasSocial = domainNames.includes("social");
  const hasGeographic = domainNames.includes("geographic");
  const hasAcademic = domainNames.includes("academic");
  const hasMedical = domainNames.includes("medical");
  const hasTechnology = domainNames.includes("technology");

  if (hasSocial && "Person" in expected_output) {
    expected_output.Person = ["Bernie Sanders"];
  }
  if (hasSocial && "Organization" in expected_output) {
    expected_output.Organization = ["U.S. Senate"];
  }

  if (hasGeographic && "Location" in expected_output) {
    expected_output.Location = ["Vermont"];
    if (!hasSocial) {
      // Add location as primary if social not selected
      expected_output.Location.push("Brooklyn");
    }
  }

  if (hasAcademic && "University" in expected_output) {
    expected_output.University = ["University of Chicago"];
  }

  if (hasMedical) {
    if ("Hospital" in expected_output) {
      expected_output.Hospital = [];
    }
    if ("Disease" in expected_output) {
      expected_output.Disease = [];
    }
  }

  if (hasTechnology) {
    if ("Software" in expected_output) {
      expected_output.Software = [];
    }
    if ("Database" in expected_output) {
      expected_output.Database = [];
    }
  }

  // Generic input text that covers multiple domains
  const input_text =
    "Bernie Sanders was born in Brooklyn and later served in the U.S. Senate representing Vermont since 2007. He ran for president in 2016 and 2020. Sanders studied at the University of Chicago.";

  return {
    input_text,
    expected_output,
  };
}
