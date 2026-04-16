/**
 * Domain Schema Field Extractor
 *
 * Server-side utilities for entity enrichment with domain-specific examples.
 * Field extraction now delegated to @protolabsai/types for consistency.
 */

import {
  getEnrichmentFieldsForEntity as getEnrichmentFieldsClient,
  socialDomainConfig,
  academicDomainConfig,
  geographicDomainConfig,
  economicDomainConfig,
  medicalDomainConfig,
} from "@protolabsai/types";

const DOMAIN_CONFIGS = [
  socialDomainConfig,
  academicDomainConfig,
  geographicDomainConfig,
  economicDomainConfig,
  medicalDomainConfig,
];

/**
 * Get enrichment fields for an entity type
 * Delegates to schema-based extraction from @protolabsai/types
 */
export function getEnrichmentFieldsForEntity(
  entityType: string,
  domainName: string
): string[] {
  return getEnrichmentFieldsClient(entityType, domainName);
}

/**
 * Generate enrichment example from domain configs
 * Returns flat structure for LangExtract (no array wrapping)
 */
export function generateEnrichmentExample(entityType: string): {
  input_text: string;
  expected_output: Record<string, any>;
} {
  // Check domain configs for entity-specific examples
  for (const config of DOMAIN_CONFIGS) {
    if (config.enrichmentExamples?.[entityType]) {
      return config.enrichmentExamples[entityType];
    }
  }

  // Fallback generic example
  return {
    input_text: `Information about a ${entityType} entity with relevant details.`,
    expected_output: {
      description: `Details about the ${entityType}`,
    },
  };
}
