/**
 * Get Enrichment Example from Domain Configs
 *
 * Retrieves entity enrichment examples from domain configurations
 * to use in langextract prompts. Falls back to default if no examples found.
 */

import type { EnrichmentExample } from "@proto/types";

import { getDomainConfig } from "../workflows/multi-phase-extraction-utils";

/**
 * Default enrichment example (fallback)
 */
const DEFAULT_ENRICHMENT_EXAMPLE: EnrichmentExample = {
  input_text:
    "Albert Einstein was born on March 14, 1879, in Ulm, Germany. He was a theoretical physicist who studied at ETH Zurich.",
  expected_output: {
    birthDate: "1879-03-14",
    birthPlace: "Ulm, Germany",
    occupation: "theoretical physicist",
    education: ["ETH Zurich"],
  },
};

/**
 * Get enrichment example for entity type from domain configs
 *
 * Returns example from domain config for the specified entity type,
 * or default if none found.
 *
 * @param entityType - Entity type (e.g., "Person", "Event", "Organization")
 * @param domainName - Domain name (e.g., "social", "academic")
 * @returns Enrichment example with input_text and expected_output
 */
export function getEnrichmentExample(
  entityType: string,
  domainName: string = "social"
): EnrichmentExample {
  const config = getDomainConfig(domainName);

  if (config?.enrichmentExamples?.[entityType]) {
    console.log(
      `   Using ${entityType} enrichment example from ${domainName} domain`
    );
    return config.enrichmentExamples[entityType];
  }

  // Fallback to default
  console.log(
    `   Using default enrichment example (no ${entityType} example found in ${domainName})`
  );
  return DEFAULT_ENRICHMENT_EXAMPLE;
}

/**
 * Get enrichment examples for multiple entity types
 *
 * Collects examples from domain config for specified entity types.
 *
 * @param entityTypes - Array of entity types
 * @param domainName - Domain name
 * @returns Array of enrichment examples
 */
export function getEnrichmentExamples(
  entityTypes: string[],
  domainName: string = "social"
): EnrichmentExample[] {
  const examples: EnrichmentExample[] = [];
  const config = getDomainConfig(domainName);

  if (config?.enrichmentExamples) {
    for (const entityType of entityTypes) {
      const example = config.enrichmentExamples[entityType];
      if (example) {
        examples.push(example);
      }
    }
  }

  // If no examples found, return default
  if (examples.length === 0) {
    return [DEFAULT_ENRICHMENT_EXAMPLE];
  }

  return examples;
}
