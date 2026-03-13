/**
 * LLM Playground - Chat Types
 *
 * Shared types for LLM chat interactions across the monorepo
 */

export interface MessageMetadata {
  tokensUsed?: number;
  responseTime?: number;
  tokensPerSecond?: number;
  model?: string;
  provider?: string;
  traceUrl?: string;
  sessionUrl?: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}
