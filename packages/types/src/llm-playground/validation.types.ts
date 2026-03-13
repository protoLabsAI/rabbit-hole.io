/**
 * LLM Playground - Validation Types
 *
 * Shared types for model validation and fuzzy matching
 */

export interface LLMValidationResult {
  category: string;
  model: string;
  valid: boolean;
  suggestion?: string;
  similarity?: number;
}
