/**
 * Writing Agent State
 */

import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";
import { Annotation } from "@langchain/langgraph";

/**
 * CopilotKit Shared Graph State
 *
 * This interface documents the expected shape of CopilotKit's sharedGraphState.
 * Used for type-safe access to session IDs and other shared state from the frontend.
 */
export interface CopilotKitSharedGraphState {
  sessionId?: string;
  // Add other CopilotKit shared state properties as needed
}

export interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

/**
 * Todo Reducer - Replaces entire todo list
 */
export function todoReducer(
  left: Todo[] | null | undefined,
  right: Todo[] | null | undefined
): Todo[] {
  return right != null ? right : left || [];
}

/**
 * File Reducer - Merges file updates
 */
export function fileReducer(
  left: Record<string, string> | null | undefined,
  right: Record<string, string> | null | undefined
): Record<string, string> {
  return {
    ...(left || {}),
    ...(right || {}),
  };
}

/**
 * Writing Agent State
 *
 * Manages writing assistance context and enables real-time synchronization
 * between the agent and frontend application
 */
export const WritingAgentStateAnnotation = Annotation.Root({
  // User context (from frontend)
  userId: Annotation<string | null>,
  workspaceId: Annotation<string | null>,

  // Shared state from frontend (via useCoAgent)
  activeDocument: Annotation<{
    tabId: string;
    tabName: string;
    content: string | null;
    canWrite: boolean;
    wordCount: number;
    characterCount: number;
  } | null>,

  accessibleTabs: Annotation<
    Array<{
      id: string;
      name: string;
      content: string | undefined;
      canWrite: boolean;
      wordCount: number;
      characterCount: number;
    }>
  >,

  // Document context (legacy - kept for compatibility)
  documentContent: Annotation<string>,
  plainText: Annotation<string>,
  selection: Annotation<string>,
  wordCount: Annotation<number>,
  characterCount: Annotation<number>,

  // Writing task context
  taskType: Annotation<"edit" | "suggest" | "improve" | "generate">,
  targetSection: Annotation<string | null>,
  userRequest: Annotation<string>,

  // Agent output
  suggestions: Annotation<string[]>,
  explanation: Annotation<string>,

  // Progress tracking (streams via CopilotKit)
  todos: Annotation<Todo[]>({
    reducer: todoReducer,
    default: () => [],
  }),

  // File-based communication (for subagent handoffs)
  files: Annotation<Record<string, string>>({
    reducer: fileReducer,
    default: () => ({}),
  }),

  // CopilotKit integration
  ...CopilotKitStateAnnotation.spec,
});

export type WritingAgentState = typeof WritingAgentStateAnnotation.State & {
  sharedGraphState?: CopilotKitSharedGraphState;
};
