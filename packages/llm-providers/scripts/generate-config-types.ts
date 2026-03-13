#!/usr/bin/env tsx
/**
 * Generate TypeScript types from LLM provider configuration
 *
 * Creates type-safe exports for:
 * - Provider names
 * - Model categories
 * - Model names per provider
 * - Provider metadata
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { defaultConfig } from "../src/server/config/default-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProviderInfo {
  name: string;
  enabled: boolean;
  categories: string[];
  models: string[];
  priority?: number;
  timeout?: number;
  maxRetries?: number;
}

async function generateConfigTypes() {
  console.log("🔍 Generating types from LLM provider config...");

  // Extract provider information
  const providers: ProviderInfo[] = [];
  const allCategories = new Set<string>();
  const allModels = new Set<string>();

  for (const [providerName, providerConfig] of Object.entries(
    defaultConfig.providers
  )) {
    const categories = Object.keys(providerConfig.models);
    const models: string[] = [];

    for (const categoryModels of Object.values(providerConfig.models)) {
      for (const model of categoryModels) {
        models.push(model.name);
        allModels.add(model.name);
      }
    }

    categories.forEach((cat) => allCategories.add(cat));

    providers.push({
      name: providerName,
      enabled: providerConfig.enabled,
      categories,
      models,
      priority: providerConfig.metadata?.priority,
      timeout: providerConfig.metadata?.timeout,
      maxRetries: providerConfig.metadata?.maxRetries,
    });
  }

  // Generate TypeScript code
  const code = generateTypeScriptCode(
    providers,
    Array.from(allCategories),
    Array.from(allModels)
  );

  // Write to file
  const outputPath = resolve(__dirname, "../src/generated/config-types.ts");
  const outputDir = dirname(outputPath);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, code, "utf-8");

  console.log(`✓ Generated types at src/generated/config-types.ts`);
  console.log(`  - ${providers.length} providers`);
  console.log(`  - ${allCategories.size} model categories`);
  console.log(`  - ${allModels.size} unique models`);
}

function generateTypeScriptCode(
  providers: ProviderInfo[],
  categories: string[],
  models: string[]
): string {
  const timestamp = new Date().toISOString();

  // Provider name union type
  const providerNameUnion = providers.map((p) => `"${p.name}"`).join(" | ");

  // Provider name array
  const providerNameArray = providers.map((p) => `  "${p.name}",`).join("\n");

  // Category union type
  const categoryUnion = categories.map((c) => `"${c}"`).join(" | ");

  // Category array
  const categoryArray = categories.map((c) => `  "${c}",`).join("\n");

  // Per-provider model types
  const perProviderModelTypes = providers
    .map((p) => {
      const typeName = toPascalCase(p.name) + "ModelName";
      const union = p.models.map((m) => `  | "${m}"`).join("\n");
      return `export type ${typeName} =\n${union};`;
    })
    .join("\n\n");

  // Combined model union
  const modelUnion = providers
    .map((p) => `${toPascalCase(p.name)}ModelName`)
    .join(" | ");

  // Provider metadata object
  const metadataEntries = providers
    .map((p) => {
      const categoriesStr = `[${p.categories.map((c) => `"${c}"`).join(", ")}]`;
      const modelsStr = `[${p.models.map((m) => `"${m}"`).join(", ")}]`;
      return `  "${p.name}": {
    enabled: ${p.enabled},
    categories: ${categoriesStr},
    models: ${modelsStr},${p.priority !== undefined ? `\n    priority: ${p.priority},` : ""}${p.timeout !== undefined ? `\n    timeout: ${p.timeout},` : ""}${p.maxRetries !== undefined ? `\n    maxRetries: ${p.maxRetries},` : ""}
  },`;
    })
    .join("\n");

  return `/**
 * Auto-generated from LLM provider configuration
 * Generated at: ${timestamp}
 *
 * DO NOT EDIT MANUALLY
 * Run 'pnpm run codegen' to regenerate
 */

/**
 * Type-safe union of all provider names
 */
export type ProviderName = ${providerNameUnion};

/**
 * Array of all provider names for runtime use
 */
export const PROVIDER_NAMES = [
${providerNameArray}
] as const;

/**
 * Type-safe union of all model categories
 */
export type ModelCategory = ${categoryUnion};

/**
 * Array of all model categories for runtime use
 */
export const MODEL_CATEGORIES = [
${categoryArray}
] as const;

${perProviderModelTypes}

/**
 * Union of all model names across all providers
 */
export type ModelName = ${modelUnion};

/**
 * Metadata for each provider
 */
export interface ProviderMetadata {
  enabled: boolean;
  categories: ModelCategory[];
  models: string[];
  priority?: number;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Provider metadata lookup
 */
export const PROVIDER_METADATA: Record<ProviderName, ProviderMetadata> = {
${metadataEntries}
} as const;

/**
 * Get metadata for a specific provider
 */
export function getProviderInfo(name: ProviderName): ProviderMetadata {
  return PROVIDER_METADATA[name];
}

/**
 * Check if a string is a valid provider name
 */
export function isValidProviderName(name: string): name is ProviderName {
  return name in PROVIDER_METADATA;
}

/**
 * Check if a string is a valid model category
 */
export function isValidModelCategory(
  category: string
): category is ModelCategory {
  return MODEL_CATEGORIES.includes(category as ModelCategory);
}

/**
 * Get all model names for a provider that supports a given category
 *
 * Note: Returns all models for the provider if it supports the category.
 * Current metadata structure doesn't track per-model category support.
 * Assumes all models from a provider support all of the provider's categories.
 */
export function getModelsForProviderCategory(
  provider: ProviderName,
  category: ModelCategory
): string[] {
  const metadata = PROVIDER_METADATA[provider];
  if (!metadata.categories.includes(category)) {
    return [];
  }
  return metadata.models;
}
`;
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateConfigTypes().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
