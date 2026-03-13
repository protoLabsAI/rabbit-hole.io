import { NextResponse } from "next/server";

import { getConfig, type ProviderConfig } from "@proto/llm-providers/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ModelMappings {
  [provider: string]: {
    [category: string]: string | null;
  };
}

/**
 * GET /api/llm-playground/config
 *
 * Returns the default model mappings for each provider/category combination
 * from the LLM providers configuration.
 *
 * This allows the frontend to display correct default models without hardcoding them.
 */
export async function GET() {
  try {
    const config = getConfig();
    const modelMappings: ModelMappings = {};

    // Extract default models for each provider/category
    for (const [providerName, providerConfig] of Object.entries(
      config.providers
    )) {
      const typedProviderConfig = providerConfig as ProviderConfig;

      if (!typedProviderConfig.enabled) continue;

      modelMappings[providerName] = {};

      for (const [category, models] of Object.entries(
        typedProviderConfig.models || {}
      )) {
        // Get the first model in the category as the default
        const typedModels = models as Array<{ name: string }>;
        const defaultModel = typedModels[0]?.name || null;
        modelMappings[providerName][category] = defaultModel;
      }
    }

    return NextResponse.json({
      modelMappings,
      defaultProvider: config.defaultProvider,
      defaultCategory: config.defaultCategory,
    });
  } catch (error) {
    console.error("Failed to load LLM config:", error);

    return NextResponse.json(
      {
        error: "Failed to load LLM configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
