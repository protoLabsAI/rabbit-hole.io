#!/usr/bin/env tsx
/**
 * Validate LLM provider configuration files
 *
 * Run: pnpm validate-config [path/to/config.json]
 */

import { readFileSync } from "fs";
import { join } from "path";

import { validateConfig } from "../src/config/schema";

const configPath =
  process.argv[2] || join(__dirname, "../config/llm-providers.config.json");

try {
  const content = readFileSync(configPath, "utf-8");
  const config = JSON.parse(content);

  // Validate using Zod schema
  validateConfig(config);

  console.log("✅ Configuration valid:", configPath);
} catch (error) {
  console.error("❌ Configuration validation failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
