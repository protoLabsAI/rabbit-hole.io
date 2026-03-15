/**
 * In-memory research state store.
 * Keyed by researchId. Persists across SSE reconnections.
 */

export interface ResearchSource {
  title: string;
  url: string;
  type: "web" | "wikipedia" | "graph";
  snippet?: string;
}

export interface ResearchEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
}

export interface ResearchState {
  id: string;
  query: string;
  status: "running" | "completed" | "failed";
  phase: "scope" | "research" | "synthesis" | "complete";
  phaseDetail: string;
  supervisorIteration: number;
  maxIterations: number;
  notes: string[];
  sources: ResearchSource[];
  reportSections: string[];
  finalReport: string;
  error: string | null;
  events: ResearchEvent[];
  startedAt: number;
  completedAt: number | null;
}

const store = new Map<string, ResearchState>();

export function createResearch(id: string, query: string): ResearchState {
  const state: ResearchState = {
    id,
    query,
    status: "running",
    phase: "scope",
    phaseDetail: "Planning research dimensions...",
    supervisorIteration: 0,
    maxIterations: 6,
    notes: [],
    sources: [],
    reportSections: [],
    finalReport: "",
    error: null,
    events: [],
    startedAt: Date.now(),
    completedAt: null,
  };
  store.set(id, state);
  return state;
}

export function getResearch(id: string): ResearchState | undefined {
  return store.get(id);
}

export function addEvent(
  id: string,
  type: string,
  data: unknown
): ResearchEvent | null {
  const state = store.get(id);
  if (!state) return null;
  const event: ResearchEvent = {
    id: `evt_${state.events.length}_${Date.now()}`,
    type,
    data,
    timestamp: Date.now(),
  };
  state.events.push(event);
  return event;
}

export function updateResearch(
  id: string,
  update: Partial<ResearchState>
): void {
  const state = store.get(id);
  if (!state) return;
  Object.assign(state, update);
}

// Cleanup old research after 2 hours
setInterval(
  () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    for (const [id, state] of store) {
      if (state.startedAt < twoHoursAgo) store.delete(id);
    }
  },
  15 * 60 * 1000
);
