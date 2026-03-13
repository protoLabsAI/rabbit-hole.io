/**
 * Deep Agent - State Management
 */

import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
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
  messages: BaseMessage[];
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

export const EntityResearchAgentStateAnnotation = Annotation.Root({
  ...CopilotKitStateAnnotation.spec,

  files: Annotation<Record<string, string>>({
    reducer: fileReducer,
    default: () => ({}),
  }),

  todos: Annotation<Todo[]>({
    reducer: todoReducer,
    default: () => [],
  }),

  entityName: Annotation<string>,
  entityType: Annotation<string>,
  researchDepth: Annotation<"basic" | "detailed" | "comprehensive">(),

  sessionConfig: Annotation<ResearchSessionConfig | undefined>(),

  researchBrief: Annotation<string | undefined>(),

  subQuestions: Annotation<string[]>({
    reducer: stringsReducer,
    default: () => [],
  }),

  iterationCount: Annotation<number>({
    reducer: (left, right) => right ?? left ?? 0,
    default: () => 0,
  }),

  gaps: Annotation<string[]>({
    reducer: stringsReducer,
    default: () => [],
  }),

  relationships: Annotation<unknown[]>(),
  confidence: Annotation<number>(),
  completeness: Annotation<number>(),
  bundle: Annotation<unknown | undefined>,
  partialBundle: Annotation<PartialBundle | undefined>({
    reducer: partialBundleReducer,
    default: () => undefined,
  }),
});

export type EntityResearchAgentStateType =
  typeof EntityResearchAgentStateAnnotation.State;
