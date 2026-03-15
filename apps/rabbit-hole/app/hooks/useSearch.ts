"use client";

import { useState, useCallback, useRef } from "react";

export interface GraphEntity {
  uid: string;
  name: string;
  type: string;
  tags: string[];
  aliases: string[];
  score: number;
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

export interface SearchState {
  phase: SearchPhase;
  query: string;
  graphEntities: GraphEntity[];
  sources: Source[];
  researchSteps: ResearchStep[];
  answer: string;
  suggestions: string[];
  error: string | null;
}

const initialState: SearchState = {
  phase: "idle",
  query: "",
  graphEntities: [],
  sources: [],
  researchSteps: [],
  answer: "",
  suggestions: [],
  error: null,
};

export function useSearch() {
  const [state, setState] = useState<SearchState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    // Abort any in-flight search
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setState({
      ...initialState,
      phase: "searching_graph",
      query,
    });

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: abort.signal,
      });

      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }

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
          const json = line.slice(6);
          if (!json) continue;

          try {
            const event = JSON.parse(json) as {
              type: string;
              data: any;
            };

            switch (event.type) {
              case "graph_results":
                setState((s) => ({
                  ...s,
                  graphEntities: event.data.entities ?? [],
                  phase:
                    (event.data.entities?.length ?? 0) >= 3
                      ? "answering"
                      : "researching",
                }));
                break;

              case "research_start":
                setState((s) => ({ ...s, phase: "researching" }));
                break;

              case "research_step":
                setState((s) => ({
                  ...s,
                  researchSteps: [...s.researchSteps, event.data],
                }));
                break;

              case "sources":
                setState((s) => ({ ...s, sources: event.data }));
                break;

              case "answer_start":
                setState((s) => ({ ...s, phase: "answering" }));
                break;

              case "answer_delta":
                setState((s) => ({
                  ...s,
                  answer: s.answer + (event.data.text ?? ""),
                }));
                break;

              case "answer_done":
                break;

              case "suggestions":
                setState((s) => ({
                  ...s,
                  suggestions: event.data ?? [],
                }));
                break;

              case "done":
                setState((s) => ({ ...s, phase: "done" }));
                break;

              case "error":
                setState((s) => ({
                  ...s,
                  phase: "error",
                  error: event.data.message,
                }));
                break;
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        phase: "error",
        error: err instanceof Error ? err.message : "Search failed",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return { ...state, search, reset };
}
