import { LLMProvidersConfig } from "../../types/config";
import { mergeConfigs } from "../../utils/config-merger";

import { defaultConfig } from "./default-config";
import { validateConfig } from "./schema";

/**
 * Load and merge LLM provider configuration
 *
 * Priority (highest to lowest):
 * 1. Custom config passed as parameter
 * 2. Custom config file (LLM_CONFIG_PATH env var)
 * 3. Default config
 *
 * Environment variables override config values:
 * - OPENAI_API_KEY -> providers.openai.apiKey
 * - ANTHROPIC_API_KEY -> providers.anthropic.apiKey
 * - LLM_DEFAULT_PROVIDER -> defaultProvider
 * - LLM_DEFAULT_CATEGORY -> defaultCategory
 */
export function loadConfig(
  customConfig?: Partial<LLMProvidersConfig>
): LLMProvidersConfig {
  let config = { ...defaultConfig };

  // Load from file if specified (server-side only)
  const configPath = process.env.LLM_CONFIG_PATH;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isServer = typeof (globalThis as any).window === "undefined";

  if (configPath && isServer) {
    try {
      // Dynamic import to prevent bundling in client code
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      const fileConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      config = mergeConfigs(config, fileConfig);
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error);
    }
  }

  // Merge custom config
  if (customConfig) {
    config = mergeConfigs(config, customConfig);
  }

  // Override with environment variables
  config = applyEnvironmentOverrides(config);

  // Validate final configuration
  validateConfig(config);

  return config;
}

/**
 * Apply environment variable overrides
 */
function applyEnvironmentOverrides(
  config: LLMProvidersConfig
): LLMProvidersConfig {
  // Override default provider
  if (process.env.LLM_DEFAULT_PROVIDER) {
    config.defaultProvider = process.env.LLM_DEFAULT_PROVIDER as any;
  }

  // Override default category
  if (process.env.LLM_DEFAULT_CATEGORY) {
    config.defaultCategory = process.env.LLM_DEFAULT_CATEGORY as any;
  }

  // Override API keys
  const envMappings: Record<string, string> = {
    OPENAI_API_KEY: "openai",
    ANTHROPIC_API_KEY: "anthropic",
    GOOGLE_API_KEY: "google",
    GROQ_API_KEY: "groq",
    BEDROCK_AWS_ACCESS_KEY_ID: "bedrock",
    CUSTOM_OPENAI_API_KEY: "custom-openai",
  };

  for (const [envVar, providerName] of Object.entries(envMappings)) {
    const value = process.env[envVar];
    if (value && config.providers[providerName]) {
      config.providers[providerName].apiKey = value;
    }
  }

  // Override base URLs
  if (process.env.OLLAMA_BASE_URL) {
    config.providers.ollama.baseURL = process.env.OLLAMA_BASE_URL;
  }

  if (process.env.CUSTOM_OPENAI_BASE_URL) {
    config.providers["custom-openai"].baseURL =
      process.env.CUSTOM_OPENAI_BASE_URL;
  }

  return config;
}

/**
 * Get the current configuration (useful for debugging)
 */
export function getConfig(): LLMProvidersConfig {
  return loadConfig();
}
