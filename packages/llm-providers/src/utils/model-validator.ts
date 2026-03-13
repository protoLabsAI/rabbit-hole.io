import { ModelConfig } from "../types/model";
import { LLMProvider } from "../types/provider";

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  provider: string;
  category: string;
  configuredModel: string;
  message: string;
  suggestion?: string;
}

interface ValidationWarning {
  provider: string;
  category: string;
  message: string;
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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find the closest matching model name
 */
function findClosestMatch(
  target: string,
  candidates: string[]
): { match: string; distance: number } | null {
  if (candidates.length === 0) return null;

  let closestMatch = candidates[0];
  let minDistance = levenshteinDistance(
    target.toLowerCase(),
    closestMatch.toLowerCase()
  );

  for (let i = 1; i < candidates.length; i++) {
    const distance = levenshteinDistance(
      target.toLowerCase(),
      candidates[i].toLowerCase()
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = candidates[i];
    }
  }

  // Only suggest if similarity is reasonable (distance <= 40% of target length)
  const threshold = Math.max(3, Math.floor(target.length * 0.4));
  if (minDistance <= threshold) {
    return { match: closestMatch, distance: minDistance };
  }

  return null;
}

/**
 * Validate configured models against provider's available models
 */
export async function validateProviderModels(
  provider: LLMProvider,
  configuredModels: Record<string, ModelConfig[]>
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Fetch available models from provider
    const availableModels = await provider.listAvailableModels();
    const availableModelIds = availableModels.map((m) => m.id);
    const availableIdsSet = new Set(availableModelIds);

    if (availableModelIds.length === 0) {
      warnings.push({
        provider: provider.name,
        category: "all",
        message: "Could not fetch available models from provider API",
      });
      return { valid: true, errors, warnings };
    }

    // Check each configured model
    for (const [category, models] of Object.entries(configuredModels)) {
      for (const model of models) {
        const isValid = availableIdsSet.has(model.name);

        if (!isValid) {
          // Find closest match
          const closest = findClosestMatch(model.name, availableModelIds);

          errors.push({
            provider: provider.name,
            category,
            configuredModel: model.name,
            message: `Model "${model.name}" not found in ${provider.name} available models`,
            suggestion: closest
              ? `Did you mean "${closest.match}"? (similarity: ${((1 - closest.distance / model.name.length) * 100).toFixed(0)}%)`
              : `Available models: ${availableModelIds.slice(0, 5).join(", ")}${availableModelIds.length > 5 ? "..." : ""}`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    warnings.push({
      provider: provider.name,
      category: "all",
      message: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });

    return { valid: true, errors, warnings };
  }
}

/**
 * Format validation results for display
 */
export function formatValidationResults(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid && result.warnings.length === 0) {
    lines.push("✅ All models validated successfully");
    return lines.join("\n");
  }

  if (result.errors.length > 0) {
    lines.push("❌ Validation Errors:");
    for (const error of result.errors) {
      lines.push(`  [${error.provider}/${error.category}] ${error.message}`);
      if (error.suggestion) {
        lines.push(`    → ${error.suggestion}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    lines.push("\n⚠️  Warnings:");
    for (const warning of result.warnings) {
      lines.push(`  [${warning.provider}] ${warning.message}`);
    }
  }

  return lines.join("\n");
}
