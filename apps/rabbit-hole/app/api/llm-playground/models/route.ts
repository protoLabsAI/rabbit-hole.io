import { NextRequest, NextResponse } from "next/server";

import { getProvider } from "@proto/llm-providers/server";
import type { ProviderName } from "@proto/llm-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  provider: string;
  apiKey?: string;
  useHosted?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { provider, apiKey, useHosted = true } = body;

    // Set API key based on mode
    if (!useHosted && apiKey) {
      // BYOK mode - use user-provided key
      const envVar = `${provider.toUpperCase()}_API_KEY`;
      process.env[envVar] = apiKey;
    }
    // Hosted mode uses server environment variables automatically

    const providerInstance = getProvider(provider as ProviderName);

    // Check if available first
    const available = await providerInstance.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error: "Provider not available",
          details: "API key not configured",
        },
        { status: 503 }
      );
    }

    // Fetch available models
    const models = await providerInstance.listAvailableModels();

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch models",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
