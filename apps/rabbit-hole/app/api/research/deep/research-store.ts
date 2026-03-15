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
  status: "running" | "completed" | "failed" | "cancelled";
  phase:
    | "scope"
    | "plan-review"
    | "research"
    | "evaluating"
    | "synthesis"
    | "complete";
  phaseDetail: string;
  supervisorIteration: number;
  maxIterations: number;
  notes: string[];
  sources: ResearchSource[];
  findings: string[];
  dimensions: string[];
  brief: string;
  searchCount: number;
  reportChunks: string[];
  finalReport: string;
  error: string | null;
  events: ResearchEvent[];
  startedAt: number;
  completedAt: number | null;
  abortController: AbortController | null;
}

// Use globalThis to survive Turbopack module isolation
// (POST route and GET route may load this module as separate instances)
const globalStore = globalThis as unknown as {
  __researchStore?: Map<string, ResearchState>;
};
if (!globalStore.__researchStore) {
  globalStore.__researchStore = new Map();
}
const store = globalStore.__researchStore;

export function createResearch(id: string, query: string): ResearchState {
  const state: ResearchState = {
    id,
    query,
    status: "running",
    phase: "scope",
    phaseDetail: "Planning research dimensions...",
    supervisorIteration: 0,
    maxIterations: 3,
    notes: [],
    sources: [],
    findings: [],
    dimensions: [],
    brief: "",
    searchCount: 0,
    reportChunks: [],
    finalReport: "",
    error: null,
    events: [],
    startedAt: Date.now(),
    completedAt: null,
    abortController: new AbortController(),
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
  update: Partial<Omit<ResearchState, "abortController">>
): void {
  const state = store.get(id);
  if (!state) return;
  Object.assign(state, update);
}

export function cancelResearch(id: string): boolean {
  const state = store.get(id);
  if (!state || state.status !== "running") return false;
  state.abortController?.abort();
  state.status = "cancelled";
  state.phaseDetail = "Cancelled by user";
  state.completedAt = Date.now();
  addEvent(id, "research.cancelled", { phase: state.phase });
  return true;
}

export function isAborted(id: string): boolean {
  const state = store.get(id);
  return state?.abortController?.signal.aborted ?? false;
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
