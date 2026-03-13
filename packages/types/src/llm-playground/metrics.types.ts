/**
 * LLM Playground - Metrics Types
 *
 * Shared types for LLM usage metrics tracking
 */

export interface LLMMetrics {
  totalTokens: number;
  avgResponseTime: number;
  messageCount: number;
}
