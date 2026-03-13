/**
 * LLM Provider Playground - Model Helper Utilities
 */

/**
 * Get default model from server config
 */
export function getDefaultModel(
  configMappings: Record<string, Record<string, string | null>>,
  provider: string,
  category: string
): string {
  const model = configMappings[provider]?.[category];

  if (!model) {
    console.warn(
      `⚠️  No default model configured for provider="${provider}" category="${category}". ` +
        `Please add a model to the config at: packages/llm-providers/src/config/default-config.ts`
    );
    return "No model configured";
  }

  return model;
}

/**
 * Get expected model (checks session storage overrides first, then defaults)
 */
export function getExpectedModel(
  configMappings: Record<string, Record<string, string | null>>,
  modelOverrides: Record<string, Record<string, string>>,
  provider: string,
  category: string
): string {
  return (
    modelOverrides[provider]?.[category] ||
    getDefaultModel(configMappings, provider, category)
  );
}

/**
 * Get categories that a model is assigned to
 */
export function getModelCategories(
  configMappings: Record<string, Record<string, string | null>>,
  modelOverrides: Record<string, Record<string, string>>,
  provider: string,
  modelId: string
): string[] {
  const categories: string[] = [];
  const providerOverrides = modelOverrides[provider] || {};

  // Check overrides
  for (const [category, assignedModel] of Object.entries(providerOverrides)) {
    if (assignedModel === modelId) {
      categories.push(category);
    }
  }

  // Check defaults
  const allCategories = [
    "fast",
    "smart",
    "reasoning",
    "vision",
    "coding",
    "long",
  ];
  for (const category of allCategories) {
    if (
      getDefaultModel(configMappings, provider, category) === modelId &&
      !categories.includes(category)
    ) {
      categories.push(category);
    }
  }

  return categories;
}
