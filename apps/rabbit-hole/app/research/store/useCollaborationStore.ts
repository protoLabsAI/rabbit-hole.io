/**
 * Collaboration Store
 *
 * Zustand store for managing active collaboration sessions.
 * Prevents re-render loops from useState dependencies.
 */

import { create } from "zustand";

interface CollaborationSession {
  sessionId: string;
  tabId: string;
  shareLink?: string;
  createdAt: number;
}

interface CollaborationStore {
  // State
  activeSessionsByTab: Record<string, string>; // tabId -> sessionId
  sessions: Record<string, CollaborationSession>; // sessionId -> session details
  loaded: boolean;

  // Actions
  setLoaded: (loaded: boolean) => void;
  addSession: (tabId: string, sessionId: string, shareLink?: string) => void;
  removeSession: (tabId: string) => void;
  clearAllSessions: () => void;
  loadSessions: (sessions: CollaborationSession[]) => void;

  // Selectors (computed)
  getSessionForTab: (tabId: string | undefined) => string | null;
  getActiveCount: () => number;
}

export const useCollaborationStore = create<CollaborationStore>((set, get) => ({
  // Initial state
  activeSessionsByTab: {},
  sessions: {},
  loaded: false,

  // Actions
  setLoaded: (loaded) => set({ loaded }),

  addSession: (tabId, sessionId, shareLink) =>
    set((state) => ({
      activeSessionsByTab: {
        ...state.activeSessionsByTab,
        [tabId]: sessionId,
      },
      sessions: {
        ...state.sessions,
        [sessionId]: {
          sessionId,
          tabId,
          shareLink,
          createdAt: Date.now(),
        },
      },
    })),

  removeSession: (tabId) =>
    set((state) => {
      const sessionId = state.activeSessionsByTab[tabId];
      const newSessionsByTab = { ...state.activeSessionsByTab };
      const newSessions = { ...state.sessions };

      delete newSessionsByTab[tabId];
      if (sessionId) {
        delete newSessions[sessionId];
      }

      return {
        activeSessionsByTab: newSessionsByTab,
        sessions: newSessions,
      };
    }),

  clearAllSessions: () =>
    set({
      activeSessionsByTab: {},
      sessions: {},
    }),

  loadSessions: (sessions) => {
    const byTab: Record<string, string> = {};
    const byId: Record<string, CollaborationSession> = {};

    sessions.forEach((session) => {
      byTab[session.tabId] = session.sessionId;
      byId[session.sessionId] = session;
    });

    set({
      activeSessionsByTab: byTab,
      sessions: byId,
      loaded: true,
    });
  },

  // Selectors
  getSessionForTab: (tabId) => {
    if (!tabId) return null;
    return get().activeSessionsByTab[tabId] || null;
  },

  getActiveCount: () => Object.keys(get().activeSessionsByTab).length,
}));
