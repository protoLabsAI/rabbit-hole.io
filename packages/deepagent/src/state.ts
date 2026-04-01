/**
 * Deep Agent - State Management
 *
 * Pure state types and reducers (no LangGraph dependencies).
 */

import { z } from "zod";

import type { ResearchSessionConfig, PartialBundle } from "@proto/types";

import type { Todo } from "./types";

export type { Todo } from "./types";

export const TodoSchema = z.object({
  content: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
});

export function fileReducer(
  left: Record<string, string> | null | undefined,
  right: Record<string, string> | null | undefined
): Record<string, string> {
  if (left == null) return right || {};
  if (right == null) return left;
  return { ...left, ...right };
}

export function todoReducer(
  left: Todo[] | null | undefined,
  right: Todo[] | null | undefined
): Todo[] {
  return right ?? left ?? [];
}

export function stringsReducer(
  left: string[] | null | undefined,
  right: string[] | null | undefined
): string[] {
  if (right == null) return left ?? [];
  return [...(left ?? []), ...right];
}

export interface EntityResearchAgentState {
  messages: unknown[];
  files: Record<string, string>;
  todos: Todo[];
  entityName: string;
  entityType: string;
  researchDepth: "basic" | "detailed" | "comprehensive";
  sessionConfig?: ResearchSessionConfig;
  researchBrief?: string;
  subQuestions: string[];
  iterationCount: number;
  gaps: string[];
  relationships: unknown[];
  confidence: number;
  completeness: number;
  bundle?: unknown;
  partialBundle?: PartialBundle;
}

export function partialBundleReducer(
  left: PartialBundle | undefined,
  right: PartialBundle | undefined
): PartialBundle | undefined {
  if (right == null) return left;
  if (left == null) return right;
  // Right always wins — callers are responsible for merging before emitting
  return right;
}
