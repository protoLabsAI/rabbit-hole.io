/**
 * DomainEntityTypeSelector Helpers
 *
 * Validation and utility functions for entity type selection
 */

import { domainRegistry } from "@proto/types";

/**
 * Validation constraints for entity type selection
 */
export interface ValidationConstraints {
  min?: number;
  max?: number;
  requiredDomains?: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate entity type selection against constraints
 */
export function validateEntityTypeSelection(
  types: string[],
  constraints: ValidationConstraints
): ValidationResult {
  if (constraints.min && types.length < constraints.min) {
    return {
      valid: false,
      message: `Select at least ${constraints.min} entity ${constraints.min === 1 ? "type" : "types"}`,
    };
  }

  if (constraints.max && types.length > constraints.max) {
    return {
      valid: false,
      message: `Select at most ${constraints.max} entity ${constraints.max === 1 ? "type" : "types"}`,
    };
  }

  if (constraints.requiredDomains) {
    const selectedDomains = new Set(
      types
        .map((t) => domainRegistry.getDomainFromEntityType(t))
        .filter(Boolean)
    );

    const missingDomains = constraints.requiredDomains.filter(
      (d) => !selectedDomains.has(d)
    );

    if (missingDomains.length > 0) {
      return {
        valid: false,
        message: `Select at least one type from: ${missingDomains.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Generate LangExtract examples from selected entity types
 * Uses domain registry enrichment examples
 */
export function generateLangExtractExamples(
  selectedTypes: string[]
): Array<{ input_text: string; expected_output: Record<string, any> }> {
  const examples: Array<any> = [];

  // Get unique domains for selected types
  const domains = new Set<string>(
    selectedTypes
      .map((type) => domainRegistry.getDomainFromEntityType(type))
      .filter((d): d is string => d !== null)
  );

  // For each domain, generate representative examples
  for (const domain of domains) {
    const domainConfig = domainRegistry.getDomainConfig(domain);
    if (!domainConfig?.enrichmentExamples) continue;

    // Get example for first entity type in this domain
    const typesInDomain = selectedTypes.filter(
      (type) => domainRegistry.getDomainFromEntityType(type) === domain
    );

    for (const type of typesInDomain.slice(0, 2)) {
      // Max 2 examples per domain
      if (domainConfig.enrichmentExamples[type]) {
        examples.push(domainConfig.enrichmentExamples[type]);
      }
    }
  }

  return examples;
}

/**
 * Get all entity types from domains
 */
export function getEntityTypesForDomains(domains: string[]): string[] {
  const entityTypesByDomain = domainRegistry.getEntityTypesByDomain();
  return domains.flatMap((domain) => entityTypesByDomain[domain] || []);
}

/**
 * Group entity types by domain
 */
export function groupEntityTypesByDomain(
  types: string[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const type of types) {
    const domain = domainRegistry.getDomainFromEntityType(type);
    if (domain) {
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(type);
    }
  }

  return grouped;
}
