import { NextResponse } from "next/server";

import {
  loadConfig,
  PROVIDER_LABELS,
  CATEGORY_LABELS,
} from "@proto/llm-providers/server";

export async function GET() {
  try {
    // Load actual configuration
    const config = loadConfig();

    const modelsByProvider: Record<string, any> = {};

    // Iterate through all enabled providers
    for (const [providerId, providerConfig] of Object.entries(
      config.providers
    )) {
      // Skip disabled providers
      if (!providerConfig.enabled) {
        continue;
      }

      const models: Array<{ id: string; label: string }> = [];

      // Extract all models from all categories
      for (const [category, modelConfigs] of Object.entries(
        providerConfig.models
      )) {
        for (const modelConfig of modelConfigs) {
          // Skip duplicates (same model in multiple categories)
          if (!models.some((m) => m.id === modelConfig.name)) {
            models.push({
              id: modelConfig.name,
              label: `${modelConfig.name} (${CATEGORY_LABELS[category] || category})`,
            });
          }
        }
      }

      // Only add provider if it has models
      if (models.length > 0) {
        modelsByProvider[providerId] = {
          label: PROVIDER_LABELS[providerId] || providerId,
          models,
        };
      }
    }

    return NextResponse.json({ modelsByProvider });
  } catch (error: any) {
    console.error("Models API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
