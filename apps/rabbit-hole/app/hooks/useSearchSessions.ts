"use client";

import { useState, useCallback, useEffect } from "react";

export interface SearchSession {
  id: string;
  title: string;
  messages: any[]; // UIMessage[] serialized
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "rabbit-hole:search-sessions";
const MAX_SESSIONS = 50;

function generateSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadSessions(): SearchSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SearchSession[];
  } catch {
    return [];
  }
}

function saveSessions(sessions: SearchSession[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep only the most recent sessions
    const trimmed = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full — drop oldest
    try {
      const trimmed = sessions.slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Give up silently
    }
  }
}

export function useSearchSessions() {
  const [sessions, setSessions] = useState<SearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setSessions(loadSessions());
    setLoaded(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (loaded) saveSessions(sessions);
  }, [sessions, loaded]);

  // Sync URL with active session
  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get("s");

    if (activeSessionId && activeSessionId !== urlSessionId) {
      params.set("s", activeSessionId);
      window.history.replaceState(null, "", `?${params.toString()}`);
    } else if (!activeSessionId && urlSessionId) {
      // Restore session from URL
      const found = sessions.find((s) => s.id === urlSessionId);
      if (found) setActiveSessionId(found.id);
    }
  }, [activeSessionId, sessions, loaded]);

  // Load session from URL on mount
  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get("s");
    if (urlSessionId) {
      const found = sessions.find((s) => s.id === urlSessionId);
      if (found) setActiveSessionId(found.id);
    }
  }, [loaded]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const createSession = useCallback((firstQuery: string): string => {
    const id = generateSessionId();
    const session: SearchSession = {
      id,
      title: firstQuery,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(id);
    return id;
  }, []);

  const updateSession = useCallback((sessionId: string, messages: any[]) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages,
              updatedAt: Date.now(),
              // Update title from first query if it changed
              title: messages[0]?.query || s.title,
            }
          : s
      )
    );
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const newSession = useCallback(() => {
    setActiveSessionId(null);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        window.history.replaceState(null, "", window.location.pathname);
      }
    },
    [activeSessionId]
  );

  return {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    updateSession,
    selectSession,
    newSession,
    deleteSession,
    loaded,
  };
}
