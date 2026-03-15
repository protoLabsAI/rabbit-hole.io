"use client";

import { useState, useCallback, useRef } from "react";

export interface GraphEntity {
  uid: string;
  name: string;
  type: string;
  tags: string[];
  aliases: string[];
  score: number;
  relationshipCount?: number;
  connectedEntities?: Array<{
    name: string;
    type: string;
    relationship: string;
  }>;
}

export interface Source {
  title: string;
  url: string;
  type: "wikipedia" | "web";
}

export interface ResearchStep {
  step: string;
  message: string;
}

export type SearchPhase =
  | "idle"
  | "searching_graph"
  | "researching"
  | "answering"
  | "done"
  | "error";

export interface SearchMessage {
  id: string;
  query: string;
  phase: SearchPhase;
  graphEntities: GraphEntity[];
  sources: Source[];
  researchSteps: ResearchStep[];
  answer: string;
  suggestions: string[];
  error: string | null;
  timestamp: number;
}

function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyMessage(query: string): SearchMessage {
  return {
    id: createMessageId(),
    query,
    phase: "searching_graph",
    graphEntities: [],
    sources: [],
    researchSteps: [],
    answer: "",
    suggestions: [],
    error: null,
    timestamp: Date.now(),
  };
}

export function useSearch() {
  const [messages, setMessages] = useState<SearchMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Build conversation history for the API
  const buildHistory = useCallback(
    (excludeId?: string) =>
      messages
        .filter((m) => m.phase === "done" && m.id !== excludeId)
        .map((m) => [
          { role: "user" as const, content: m.query },
          { role: "assistant" as const, content: m.answer },
        ])
        .flat(),
    [messages]
  );

  const search = useCallback(
    async (query: string) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      const msg = emptyMessage(query);
      setActiveId(msg.id);
      setMessages((prev) => [...prev, msg]);

      const history = buildHistory();

      const updateActive = (
        updater: (m: SearchMessage) => Partial<SearchMessage>
      ) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, ...updater(m) } : m))
        );
      };

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, history }),
          signal: abort.signal,
        });

        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as {
                type: string;
                data: any;
              };

              switch (event.type) {
                case "graph_results":
                  updateActive(() => ({
                    graphEntities: event.data.entities ?? [],
                    phase:
                      (event.data.entities?.length ?? 0) >= 3
                        ? "answering"
                        : "researching",
                  }));
                  break;
                case "research_start":
                  updateActive(() => ({ phase: "researching" }));
                  break;
                case "research_step":
                  updateActive((m) => ({
                    researchSteps: [...m.researchSteps, event.data],
                  }));
                  break;
                case "sources":
                  updateActive(() => ({ sources: event.data }));
                  break;
                case "answer_start":
                  updateActive(() => ({ phase: "answering" }));
                  break;
                case "answer_delta":
                  updateActive((m) => ({
                    answer: m.answer + (event.data.text ?? ""),
                  }));
                  break;
                case "suggestions":
                  updateActive(() => ({
                    suggestions: event.data ?? [],
                  }));
                  break;
                case "done":
                  updateActive(() => ({ phase: "done" }));
                  break;
                case "error":
                  updateActive(() => ({
                    phase: "error",
                    error: event.data.message,
                  }));
                  break;
              }
            } catch {
              /* skip */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        updateActive(() => ({
          phase: "error",
          error: err instanceof Error ? err.message : "Search failed",
        }));
      }
    },
    [buildHistory]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveId(null);
  }, []);

  const activeMessage = messages.find((m) => m.id === activeId) ?? null;
  const isIdle = messages.length === 0;

  return { messages, activeMessage, isIdle, search, reset };
}
