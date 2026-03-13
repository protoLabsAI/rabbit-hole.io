import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

import type {
  ExtractionMode,
  TiptapAnnotation,
  Entity,
  Relationship,
} from "../workflows/multi-phase-extraction";

export interface ExtractionWorkflowInput {
  text: string;
  domains: string[];
  mode: ExtractionMode;
  modelId?: string; // LangExtract model to use (e.g., "gemini-2.5-flash", "gpt-4o-mini")
  temperature?: number; // Model temperature (0.0 - 1.0), default uses service config
  confidenceThreshold?: number;
  includeEntityTypes?: string[]; // Filter to only these entity types
  excludeEntityTypes?: string[]; // Exclude these entity types
}

export interface ExtractionWorkflowResult {
  discoveredEntities: Record<string, string[]>;
  structuredEntities: Record<string, Entity>;
  enrichedEntities: Record<string, Entity>;
  relationships: Relationship[];
  annotations: TiptapAnnotation[];
  processingTime: Record<string, number>;
  errorLog: string[];
}

export function useExtractionWorkflow(
  options?: Omit<
    UseMutationOptions<
      ExtractionWorkflowResult,
      Error,
      ExtractionWorkflowInput
    >,
    "mutationFn"
  >
) {
  return useMutation({
    mutationFn: async (
      input: ExtractionWorkflowInput
    ): Promise<ExtractionWorkflowResult> => {
      const response = await fetch("/api/extraction-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Extraction failed: ${response.statusText} - ${error}`);
      }

      const result = await response.json();

      // Convert Maps to plain objects for serialization
      return {
        discoveredEntities: Object.fromEntries(result.discoveredEntities || []),
        structuredEntities: Object.fromEntries(result.structuredEntities || []),
        enrichedEntities: Object.fromEntries(result.enrichedEntities || []),
        relationships: result.relationships || [],
        annotations: result.allAnnotations || [],
        processingTime: result.processingTime || {},
        errorLog: result.errorLog || [],
      };
    },
    ...options,
  });
}
