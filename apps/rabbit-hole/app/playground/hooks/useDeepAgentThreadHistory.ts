/**
 * Deep Agent Thread History Hook
 *
 * Manages persistent thread history for time-travel debugging
 * Uses Zustand + persist middleware for localStorage persistence
 *
 * Pattern: Matches useCollaborationSettings.ts and useWorkspaceStore.ts
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ThreadHistoryEntry {
  // Thread identification
  threadId: string;
  checkpointId?: string;

  // Research context
  entityName: string;
  entityType: string;
  researchDepth: "quick" | "detailed" | "comprehensive";

  // Metadata
  createdAt: string; // ISO timestamp
  lastUsedAt: string; // ISO timestamp
  status: "running" | "completed" | "failed" | "error";

  // Results summary
  finalStep?: number;
  totalTodos?: number;
  confidence?: number;
  completeness?: number;
  errorMessage?: string;

  // Performance metrics
  durationMs?: number;
  bundleCreated?: boolean;
}

interface ThreadHistoryStore {
  // State
  threads: ThreadHistoryEntry[];
  maxThreads: number; // Auto-prune when exceeded

  // Actions
  addThread: (
    entry: Omit<ThreadHistoryEntry, "createdAt" | "lastUsedAt">
  ) => void;
  updateThread: (
    threadId: string,
    updates: Partial<Omit<ThreadHistoryEntry, "threadId" | "createdAt">>
  ) => void;
  getThread: (threadId: string) => ThreadHistoryEntry | undefined;
  deleteThread: (threadId: string) => void;
  clearAll: () => void;

  // Queries
  getRecentThreads: (limit?: number) => ThreadHistoryEntry[];
  getThreadsByEntity: (entityName: string) => ThreadHistoryEntry[];
  getThreadsByStatus: (
    status: ThreadHistoryEntry["status"]
  ) => ThreadHistoryEntry[];

  // Maintenance
  pruneOldThreads: (maxAge?: number) => void; // maxAge in days
  setMaxThreads: (max: number) => void;
}

const DEFAULT_MAX_THREADS = 100;
const DEFAULT_PRUNE_AGE_DAYS = 30;

export const useDeepAgentThreadHistory = create<ThreadHistoryStore>()(
  persist(
    (set, get) => ({
      // Initial state
      threads: [],
      maxThreads: DEFAULT_MAX_THREADS,

      // Add new thread
      addThread: (entry) => {
        const now = new Date().toISOString();
        const newThread: ThreadHistoryEntry = {
          ...entry,
          createdAt: now,
          lastUsedAt: now,
        };

        set((state) => {
          let threads = [newThread, ...state.threads];

          // Auto-prune if exceeds maxThreads
          if (threads.length > state.maxThreads) {
            // Sort by lastUsedAt, keep most recent
            threads = threads
              .sort(
                (a, b) =>
                  new Date(b.lastUsedAt).getTime() -
                  new Date(a.lastUsedAt).getTime()
              )
              .slice(0, state.maxThreads);
          }

          return { threads };
        });
      },

      // Update existing thread
      updateThread: (threadId, updates) => {
        set((state) => ({
          threads: state.threads.map((t) =>
            t.threadId === threadId
              ? {
                  ...t,
                  ...updates,
                  lastUsedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      },

      // Get thread by ID
      getThread: (threadId) => {
        return get().threads.find((t) => t.threadId === threadId);
      },

      // Delete thread
      deleteThread: (threadId) => {
        set((state) => ({
          threads: state.threads.filter((t) => t.threadId !== threadId),
        }));
      },

      // Clear all threads
      clearAll: () => {
        set({ threads: [] });
      },

      // Get recent threads (sorted by lastUsedAt)
      getRecentThreads: (limit = 10) => {
        return get()
          .threads.sort(
            (a, b) =>
              new Date(b.lastUsedAt).getTime() -
              new Date(a.lastUsedAt).getTime()
          )
          .slice(0, limit);
      },

      // Get threads for specific entity
      getThreadsByEntity: (entityName) => {
        return get()
          .threads.filter(
            (t) => t.entityName.toLowerCase() === entityName.toLowerCase()
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      },

      // Get threads by status
      getThreadsByStatus: (status) => {
        return get()
          .threads.filter((t) => t.status === status)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      },

      // Prune old threads
      pruneOldThreads: (maxAgeDays = DEFAULT_PRUNE_AGE_DAYS) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

        set((state) => ({
          threads: state.threads.filter(
            (t) => new Date(t.lastUsedAt) > cutoffDate
          ),
        }));
      },

      // Update max threads limit
      setMaxThreads: (max) => {
        set({ maxThreads: Math.max(10, Math.min(500, max)) });

        // Auto-prune if current count exceeds new max
        const current = get().threads;
        if (current.length > max) {
          set((state) => ({
            threads: state.threads
              .sort(
                (a, b) =>
                  new Date(b.lastUsedAt).getTime() -
                  new Date(a.lastUsedAt).getTime()
              )
              .slice(0, max),
          }));
        }
      },
    }),
    {
      name: "deep-agent-thread-history",
      version: 1,
      // Migrate function for future schema changes
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          // Handle migration from older versions
          return { threads: [], maxThreads: DEFAULT_MAX_THREADS };
        }
        return persistedState;
      },
      // Only persist threads and settings (not derived state)
      partialize: (state) => ({
        threads: state.threads,
        maxThreads: state.maxThreads,
      }),
    }
  )
);

/**
 * Utility: Format thread for display
 */
export function formatThreadDisplay(thread: ThreadHistoryEntry): string {
  const date = new Date(thread.createdAt).toLocaleString();
  const status =
    thread.status === "completed"
      ? "✅"
      : thread.status === "failed"
        ? "❌"
        : thread.status === "error"
          ? "⚠️"
          : "🔄";

  return `${status} ${thread.entityName} (${thread.entityType}) - ${date}`;
}

/**
 * Utility: Get thread status emoji
 */
export function getThreadStatusEmoji(
  status: ThreadHistoryEntry["status"]
): string {
  switch (status) {
    case "completed":
      return "✅";
    case "failed":
      return "❌";
    case "error":
      return "⚠️";
    case "running":
      return "🔄";
    default:
      return "❓";
  }
}

/**
 * Utility: Format duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
