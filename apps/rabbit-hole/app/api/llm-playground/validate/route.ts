import { NextRequest, NextResponse } from "next/server";

import type { ProviderName } from "@proto/llm-providers";
import { getProvider } from "@proto/llm-providers/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  provider: string;
  configuredModels: Record<string, Array<{ name: string }>>;
  apiKey?: string;
  useHosted?: boolean;
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find closest matching model name
 */
function findClosestMatch(
  target: string,
  candidates: string[]
): { match: string; similarity: number } | null {
  if (candidates.length === 0) return null;

  let closestMatch = candidates[0];
  let minDistance = levenshteinDistance(
    target.toLowerCase(),
    closestMatch.toLowerCase()
  );

  for (const candidate of candidates) {
    const distance = levenshteinDistance(
      target.toLowerCase(),
      candidate.toLowerCase()
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = candidate;
    }
  }

  const threshold = Math.max(3, Math.floor(target.length * 0.4));
  if (minDistance <= threshold) {
    const similarity = Math.round((1 - minDistance / target.length) * 100);
    return { match: closestMatch, similarity };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { provider, configuredModels, apiKey, useHosted = true } = body;

    // Set API key if in BYOK mode
    if (!useHosted && apiKey) {
      const envVar = `${provider.toUpperCase()}_API_KEY`;
      process.env[envVar] = apiKey;
    }

    const providerInstance = getProvider(provider as ProviderName);

    // Check availability
    const available = await providerInstance.isAvailable();
    if (!available) {
      return NextResponse.json(
        {
          valid: false,
          error: "Provider not available - API key required",
        },
        { status: 503 }
      );
    }

    // Fetch available models
    const availableModels = await providerInstance.listAvailableModels();
    const availableModelIds = availableModels.map((m) => m.id);
    const availableModelIdsSet = new Set(availableModelIds); // O(1) lookups

    const results: Array<{
      category: string;
      model: string;
      valid: boolean;
      suggestion?: string;
      similarity?: number;
    }> = [];

    // Validate each configured model
    for (const [category, models] of Object.entries(configuredModels)) {
      for (const model of models) {
        const isValid = availableModelIdsSet.has(model.name); // O(1) instead of O(n)

        if (!isValid) {
          const closest = findClosestMatch(model.name, availableModelIds);
          results.push({
            category,
            model: model.name,
            valid: false,
            suggestion: closest?.match,
            similarity: closest?.similarity,
          });
        } else {
          results.push({
            category,
            model: model.name,
            valid: true,
          });
        }
      }
    }

    const allValid = results.every((r) => r.valid);

    return NextResponse.json({
      valid: allValid,
      provider,
      results,
      availableModels: availableModels.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
      })),
    });
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
