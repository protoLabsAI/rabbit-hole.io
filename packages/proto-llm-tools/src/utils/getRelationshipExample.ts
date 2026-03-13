/**
 * Get Relationship Example from Domain Configs
 *
 * Retrieves relationship extraction examples from domain configurations
 * to use in langextract prompts. Falls back to default if no examples found.
 */

import type { RelationshipExample } from "@proto/types";

import { getDomainConfig } from "../workflows/multi-phase-extraction-utils";

/**
 * Default relationship example (fallback)
 */
const DEFAULT_RELATIONSHIP_EXAMPLE: RelationshipExample = {
  input_text:
    "Einstein worked at Princeton University from 1933 to 1955. He collaborated with Niels Bohr on quantum mechanics research.",
  expected_output: {
    relationships: [
      {
        source_entity: "Einstein",
        target_entity: "Princeton University",
        relationship_type: "WORKED_AT",
        start_date: "1933",
        end_date: "1955",
        confidence: 0.95,
      },
      {
        source_entity: "Einstein",
        target_entity: "Niels Bohr",
        relationship_type: "COLLABORATED_WITH",
        confidence: 0.9,
      },
    ],
  },
};

/**
 * Get relationship extraction example for domains
 *
 * Returns example from the first domain that has one, or default if none found.
 *
 * @param domains - Array of domain names (e.g., ["social", "academic"])
 * @returns Relationship extraction example with input_text and expected_output
 */
export function getRelationshipExample(domains: string[]): RelationshipExample {
  // Try to get example from each domain in order
  for (const domainName of domains) {
    const config = getDomainConfig(domainName);
    if (config?.relationshipExample) {
      console.log(`   Using relationship example from ${domainName} domain`);
      return config.relationshipExample;
    }
  }

  // Fallback to default
  console.log(
    `   Using default relationship example (no domain examples found)`
  );
  return DEFAULT_RELATIONSHIP_EXAMPLE;
}

/**
 * Merge relationship examples from multiple domains
 *
 * Combines examples from multiple domains to provide richer context.
 *
 * @param domains - Array of domain names
 * @returns Array of relationship extraction examples
 */
export function getRelationshipExamples(
  domains: string[]
): RelationshipExample[] {
  const examples: RelationshipExample[] = [];

  // Collect examples from all domains
  for (const domainName of domains) {
    const config = getDomainConfig(domainName);
    if (config?.relationshipExample) {
      examples.push(config.relationshipExample);
    }
  }

  // If no domain examples, return default
  if (examples.length === 0) {
    return [DEFAULT_RELATIONSHIP_EXAMPLE];
  }

  return examples;
}
