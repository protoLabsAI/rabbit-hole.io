/**
 * Custom Domains Export
 *
 * This module loads and exports all custom domain configurations
 * for use in validation and other build-time operations.
 *
 * Note: For runtime usage in the app, use .generated/custom-domains/registry.ts instead
 */

import { readFileSync } from "fs";
import { resolve } from "path";

import type { DomainConfig } from "../domain-system/domain-config.interface";
import {
  convertJSONDomainToZod,
  validateJSONDomain,
} from "../domain-system/domain-json-schema";

/**
 * Load and convert a JSON domain config to DomainConfig
 */
function loadJSONDomain(jsonPath: string): DomainConfig {
  const json = JSON.parse(readFileSync(jsonPath, "utf-8"));

  // Validate JSON schema
  const validation = validateJSONDomain(json);
  if (!validation.success) {
    throw new Error(
      `Invalid JSON domain config at ${jsonPath}: ${validation.error.message}`
    );
  }

  const jsonDomain = validation.data;

  // Convert to runtime Zod schemas
  const { entities, uidPrefixes, validators } =
    convertJSONDomainToZod(jsonDomain);

  // Build DomainConfig
  return {
    name: jsonDomain.name,
    displayName: jsonDomain.displayName,
    description: jsonDomain.description,
    category: "custom",
    entities,
    uidPrefixes,
    validators,
    relationships: jsonDomain.relationships || [],
    ui: jsonDomain.ui,
    extendsFrom: jsonDomain.extendsFrom,
    version: jsonDomain.version,
    author: jsonDomain.author,
    tags: jsonDomain.tags,
  };
}

// Load custom domains from custom-domains/ directory
// Note: Paths are relative to the compiled dist/ directory in packages/types
const customDomainsDir = resolve(__dirname, "../../../../custom-domains");

/**
 * All custom domain configurations
 * Auto-discovered from custom-domains/ directory
 */
export const allCustomDomainConfigs: DomainConfig[] = [];

// Load automotive domain
try {
  allCustomDomainConfigs.push(
    loadJSONDomain(resolve(customDomainsDir, "automotive/domain.config.json"))
  );
} catch (error) {
  console.warn("⚠️  Failed to load automotive domain:", error);
}

// Load langchain domain
try {
  allCustomDomainConfigs.push(
    loadJSONDomain(resolve(customDomainsDir, "langchain/domain.config.json"))
  );
} catch (error) {
  console.warn("⚠️  Failed to load langchain domain:", error);
}

/**
 * Custom domain names
 */
export const customDomainNames = allCustomDomainConfigs.map((c) => c.name);
