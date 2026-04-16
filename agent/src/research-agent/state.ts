/**
 * Research Agent - State Management
 *
 * CopilotKit-enabled state for real-time streaming to frontend
 * Uses supervisor + subagent architecture for entity research
 */

import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";
import { Annotation } from "@langchain/langgraph";

import type { ResearchSessionConfig } from "@protolabsai/types";

/**
 * CopilotKit Shared Graph State
 */
export interface CopilotKitSharedGraphState {
  sessionId?: string;
}

export type TodoStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Todo {
  content: string;
  status: TodoStatus;
}

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
  return right != null ? right : left || [];
}

export function stringsReducer(
  left: string[] | null | undefined,
  right: string[] | null | undefined
): string[] {
  if (right == null) return left ?? [];
  return [...(left ?? []), ...right];
}

/**
 * Research Agent State Annotation
 * Real-time streaming via CopilotKit
 */
export const ResearchAgentStateAnnotation = Annotation.Root({
  // Input
  entityName: Annotation<string>,
  entityType: Annotation<string>,
  researchDepth: Annotation<"basic" | "detailed" | "comprehensive">(),

  // Session configuration
  sessionConfig: Annotation<ResearchSessionConfig | undefined>(),

  // Scoping phase output
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

  // Progress tracking (streams to frontend)
  todos: Annotation<Todo[]>({
    reducer: todoReducer,
    default: () => [],
  }),
  files: Annotation<Record<string, string>>({
    reducer: fileReducer,
    default: () => ({}),
  }),

  // Quality metrics (streams to frontend)
  confidence: Annotation<number>(),
  completeness: Annotation<number>(),

  // Research output
  relationships: Annotation<any[]>(),
  bundle: Annotation<any | undefined>(),

  // CopilotKit integration - enables AG-UI (includes messages)
  ...CopilotKitStateAnnotation.spec,
});

export type ResearchAgentState = typeof ResearchAgentStateAnnotation.State & {
  sharedGraphState?: CopilotKitSharedGraphState;
};

// Legacy aliases
export const DeepAgentStateAnnotation = ResearchAgentStateAnnotation;
export type DeepAgentState = ResearchAgentState;
