"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";

import type {
  UserAction,
  EntityMerge,
  ReviewData,
} from "../workflows/human-loop-extraction-graph";

export interface ExtractionConfig {
  text: string;
  mode?: "discover" | "structure" | "enrich" | "deep_dive";
  domains?: string[];
  includeEntityTypes?: string[];
  excludeEntityTypes?: string[];
  confidenceThresholds?: {
    discover: number;
    structure: number;
    enrich: number;
    relate: number;
  };
}

export interface ResumeDecisions {
  userActions?: UserAction[];
  merges?: EntityMerge[];
  corrections?: Record<string, any>;
  approvals?: Record<string, boolean>;
}

export interface ExtractionState {
  threadId?: string;
  currentPhase?: string;
  reviewData?: ReviewData;
  discoveredEntities?: [string, string[]][];
  structuredEntities?: [string, any][];
  enrichedEntities?: [string, any][];
  relationships?: any[];
  processingTime?: Record<string, number>;
  errorLog?: string[];
  userActions?: UserAction[];
}

export interface ExtractionSession {
  threadId: string;
  currentPhase: string;
  stats: {
    entities: number;
    relationships: number;
    userActions: number;
  };
}

// Export input/result types for hook usage
export type HumanLoopExtractionInput = ExtractionConfig;
export type HumanLoopExtractionResult = ExtractionState;

/**
 * React hook for human-in-the-loop extraction workflow
 *
 * Usage:
 * ```tsx
 * const {
 *   startExtraction,
 *   resumeExtraction,
 *   currentState,
 *   isStarting,
 *   isResuming,
 * } = useHumanLoopExtraction();
 *
 * // Start extraction
 * await startExtraction({
 *   text: "...",
 *   domains: ["social", "academic"],
 * });
 *
 * // User reviews, then resume
 * await resumeExtraction({
 *   merges: [{ sourceUids: [...], targetUid: "..." }],
 *   approvals: { discover: true },
 * });
 * ```
 */
export function useHumanLoopExtraction(options?: {
  apiEndpoint?: string;
  userId?: string;
  onPhaseChange?: (phase: string) => void;
  onError?: (error: Error) => void;
}) {
  const {
    apiEndpoint = "/api/extraction-workflow-interactive",
    userId,
    onPhaseChange,
    onError,
  } = options || {};

  const queryClient = useQueryClient();
  const [threadId, setThreadId] = useState<string>();
  const [currentPhase, setCurrentPhase] = useState<string>();

  // Helper to handle phase changes
  const handlePhaseChange = useCallback(
    (phase: string) => {
      setCurrentPhase(phase);
      onPhaseChange?.(phase);
    },
    [onPhaseChange]
  );

  // Helper to handle errors
  const handleError = useCallback(
    (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("[HITL Hook] Error:", err);
      onError?.(err);
    },
    [onError]
  );

  // Start extraction mutation
  const { mutateAsync: startExtraction, isPending: isStarting } = useMutation({
    mutationFn: async (config: ExtractionConfig) => {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          userId,
          ...config,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start extraction");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setThreadId(data.threadId);
      handlePhaseChange(data.currentPhase);
      // Invalidate queries for this thread
      queryClient.invalidateQueries({
        queryKey: ["extraction-state", data.threadId],
      });
    },
    onError: handleError,
  });

  // Resume extraction mutation
  const { mutateAsync: resumeExtraction, isPending: isResuming } = useMutation({
    mutationFn: async (decisions: ResumeDecisions) => {
      if (!threadId) {
        throw new Error("No active extraction session");
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resume",
          threadId,
          userId,
          ...decisions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resume extraction");
      }

      return response.json();
    },
    onSuccess: (data) => {
      handlePhaseChange(data.currentPhase);
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: ["extraction-state", threadId],
      });
    },
    onError: handleError,
  });

  // Get current state query
  const {
    data: currentState,
    refetch: refetchState,
    isLoading: isLoadingState,
  } = useQuery<ExtractionState>({
    queryKey: ["extraction-state", threadId],
    queryFn: async () => {
      if (!threadId) return {};

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getState",
          threadId,
          userId,
        }),
      });

      if (!response.ok) {
        try {
          const error = await response.json();
          throw new Error(error.message || "Failed to get state");
        } catch (parseError) {
          // Fallback if JSON parsing fails
          const fallbackMessage =
            parseError instanceof SyntaxError
              ? await response.text()
              : `${response.status} ${response.statusText}`;
          throw new Error(
            fallbackMessage || "Failed to get state (JSON parse error)"
          );
        }
      }

      try {
        return await response.json();
      } catch (parseError) {
        throw new Error(
          `Failed to parse state response: ${parseError instanceof Error ? parseError.message : "Invalid JSON"}`
        );
      }
    },
    enabled: !!threadId,
    refetchInterval: false,
    staleTime: 5000,
  });

  // Get session info
  const { data: sessionInfo } = useQuery<ExtractionSession>({
    queryKey: ["extraction-session", threadId],
    queryFn: async () => {
      if (!threadId) throw new Error("No thread ID");

      const response = await fetch(
        `${apiEndpoint}?threadId=${encodeURIComponent(threadId)}`
      );

      if (!response.ok) {
        try {
          const error = await response.json();
          throw new Error(error.message || "Failed to get session info");
        } catch (parseError) {
          // Fallback if JSON parsing fails
          const fallbackMessage =
            parseError instanceof SyntaxError
              ? await response.text()
              : `${response.status} ${response.statusText}`;
          throw new Error(
            fallbackMessage || "Failed to get session info (JSON parse error)"
          );
        }
      }

      try {
        return await response.json();
      } catch (parseError) {
        throw new Error(
          `Failed to parse session info response: ${parseError instanceof Error ? parseError.message : "Invalid JSON"}`
        );
      }
    },
    enabled: !!threadId,
    refetchInterval: false,
    staleTime: 10000,
  });

  // Reset session
  const resetSession = useCallback(() => {
    setThreadId(undefined);
    setCurrentPhase(undefined);
    queryClient.removeQueries({ queryKey: ["extraction-state"] });
    queryClient.removeQueries({ queryKey: ["extraction-session"] });
  }, [queryClient]);

  // Load existing session
  const loadSession = useCallback(
    (existingThreadId: string) => {
      setThreadId(existingThreadId);
      queryClient.invalidateQueries({
        queryKey: ["extraction-state", existingThreadId],
      });
      queryClient.invalidateQueries({
        queryKey: ["extraction-session", existingThreadId],
      });
    },
    [queryClient]
  );

  // Computed states
  const isWaitingForReview =
    currentPhase &&
    (currentPhase.includes("await") || currentPhase.includes("Review"));

  const isComplete = currentPhase === "complete";

  const canResume = !!threadId && isWaitingForReview;

  return {
    // Actions
    startExtraction,
    resumeExtraction,
    resetSession,
    loadSession,
    refetchState,

    // State
    threadId,
    currentPhase,
    currentState,
    sessionInfo,

    // Status flags
    isStarting,
    isResuming,
    isLoadingState,
    isWaitingForReview,
    isComplete,
    canResume,
    isActive: !!threadId,
  };
}

/**
 * Helper hook for managing multiple extraction sessions
 */
export function useExtractionSessions() {
  const [sessions, setSessions] = useState<
    Array<{
      threadId: string;
      timestamp: number;
      phase: string;
      name?: string;
    }>
  >([]);

  const addSession = useCallback(
    (threadId: string, phase: string, name?: string) => {
      setSessions((prev) => [
        { threadId, timestamp: Date.now(), phase, name },
        ...prev.slice(0, 19), // Keep last 20
      ]);
    },
    []
  );

  const removeSession = useCallback((threadId: string) => {
    setSessions((prev) => prev.filter((s) => s.threadId !== threadId));
  }, []);

  const updateSession = useCallback(
    (threadId: string, updates: Partial<{ phase: string; name: string }>) => {
      setSessions((prev) =>
        prev.map((s) => (s.threadId === threadId ? { ...s, ...updates } : s))
      );
    },
    []
  );

  return {
    sessions,
    addSession,
    removeSession,
    updateSession,
  };
}
