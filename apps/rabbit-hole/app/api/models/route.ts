import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "@protolabsai/llm-providers/server";

/**
 * GET /api/models
 *
 * Returns available models from LLM provider configuration
 *
 * Query params:
 * - provider: Filter to specific provider (optional)
 * - category: Filter to specific category (optional)
 *
 * Returns: { models: ModelOption[], defaultModel: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const category = searchParams.get("category");

    const config = getConfig();
    const models: Array<{
      id: string;
      name: string;
      provider: string;
      category: string;
      metadata: {
        isFree?: boolean;
        speed?: "fast" | "balanced" | "slow";
        temperature: number;
        maxTokens: number;
      };
    }> = [];

    // Filter providers
    const providers = provider
      ? { [provider]: config.providers[provider] }
      : config.providers;

    for (const [providerId, providerConfig] of Object.entries(providers)) {
      if (!providerConfig?.enabled) continue;

      // Filter categories
      const categories = category
        ? { [category]: providerConfig.models[category] }
        : providerConfig.models;

      for (const [categoryId, modelConfigs] of Object.entries(categories)) {
        if (!modelConfigs) continue;

        for (const modelConfig of modelConfigs) {
          models.push({
            id: `${providerId}/${modelConfig.name}`,
            name: modelConfig.name,
            provider: providerId,
            category: categoryId,
            metadata: {
              isFree: providerId === "groq" || providerId === "ollama",
              speed:
                categoryId === "fast"
                  ? "fast"
                  : categoryId === "reasoning"
                    ? "slow"
                    : "balanced",
              temperature: modelConfig.temperature ?? 0.7,
              maxTokens: modelConfig.maxTokens ?? 4096,
            },
          });
        }
      }
    }

    // Default model from config
    const defaultProvider = config.defaultProvider || "anthropic";
    const defaultCategory = config.defaultCategory || "smart";
    const providerConfig = config.providers[defaultProvider];
    const defaultModelConfig = providerConfig?.models?.[defaultCategory]?.[0];
    const defaultModel = defaultModelConfig
      ? `${defaultProvider}/${defaultModelConfig.name}`
      : models[0]?.id || "";

    return NextResponse.json({ models, defaultModel });
  } catch (error) {
    console.error("Models API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
