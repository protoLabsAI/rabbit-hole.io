#!/usr/bin/env tsx
/**
 * Validate configured models against provider APIs
 *
 * Checks if models in default-config.ts actually exist in provider catalogs
 * and suggests corrections for mismatches.
 */

import { defaultConfig } from "../src/server/config/default-config.js";
import { LLMProviderFactory } from "../src/server/factory/provider-factory.js";
import {
  validateProviderModels,
  formatValidationResults,
} from "../src/utils/model-validator";

async function main() {
  console.log("🔍 Validating LLM Provider Models...\n");

  const factory = LLMProviderFactory.getInstance();
  const providersToValidate = [
    "openai",
    "anthropic",
    "google",
    "groq",
    "ollama",
  ];

  let hasErrors = false;

  for (const providerName of providersToValidate) {
    const providerConfig = defaultConfig.providers[providerName];

    if (!providerConfig || !providerConfig.enabled) {
      console.log(`⏭️  Skipping ${providerName} (disabled)`);
      continue;
    }

    console.log(`\n📦 Validating ${providerName}...`);

    try {
      const provider = factory.getProvider(providerName);
      const result = await validateProviderModels(
        provider,
        providerConfig.models
      );

      console.log(formatValidationResults(result));

      if (!result.valid) {
        hasErrors = true;
      }
    } catch (error) {
      console.log(`❌ Failed to validate ${providerName}:`);
      console.log(
        `   ${error instanceof Error ? error.message : "Unknown error"}`
      );

      if (error instanceof Error && error.message.includes("API key")) {
        console.log(
          `   → Set ${providerName.toUpperCase()}_API_KEY environment variable`
        );
      }
    }
  }

  console.log("\n" + "=".repeat(60));

  if (hasErrors) {
    console.log("❌ Validation completed with errors");
    console.log("\nTo fix:");
    console.log(
      "1. Update packages/llm-providers/src/server/config/default-config.ts"
    );
    console.log("2. Use suggested model names from errors above");
    console.log("3. Run 'pnpm run validate-models' again");
    process.exit(1);
  } else {
    console.log("✅ All validations passed");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
