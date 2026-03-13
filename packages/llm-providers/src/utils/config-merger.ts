import { LLMProvidersConfig } from "../types/config";

/**
 * Deep merge two configuration objects
 */
export function mergeConfigs(
  base: LLMProvidersConfig,
  override: Partial<LLMProvidersConfig>
): LLMProvidersConfig {
  const result = { ...base };

  if (override.defaultProvider !== undefined) {
    result.defaultProvider = override.defaultProvider;
  }

  if (override.defaultCategory !== undefined) {
    result.defaultCategory = override.defaultCategory;
  }

  if (override.providers) {
    result.providers = { ...base.providers };
    for (const [name, config] of Object.entries(override.providers)) {
      if (result.providers[name]) {
        result.providers[name] = {
          ...result.providers[name],
          ...config,
          models: {
            ...result.providers[name].models,
            ...config.models,
          },
          metadata: {
            ...result.providers[name].metadata,
            ...config.metadata,
          },
        };
      } else {
        result.providers[name] = config;
      }
    }
  }

  return result;
}
