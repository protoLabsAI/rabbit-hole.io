import type { ActivityEvent } from "./types";

// ─── Tool → source name mapping ──────────────────────────────────────

function getSourceFromToolName(toolName: string): string {
  switch (toolName) {
    case "searchGraph":
      return "graph";
    case "searchWeb":
      return "web";
    case "searchWikipedia":
      return "wikipedia";
    case "searchCommunities":
      return "communities";
    default:
      return toolName;
  }
}

// ─── Result count extraction ─────────────────────────────────────────

function getResultCount(toolName: string, output: any): number {
  if (!output) return 0;
  if (toolName === "searchGraph" && Array.isArray(output)) return output.length;
  if (toolName === "searchWeb" && Array.isArray(output?.results))
    return output.results.length;
  if (toolName === "searchWikipedia" && output?.title) return 1;
  if (toolName === "searchCommunities" && Array.isArray(output?.results))
    return output.results.length;
  return 0;
}

// ─── Tool state classifiers ──────────────────────────────────────────

function isRunningState(state: string): boolean {
  return (
    state === "call" ||
    state === "input-available" ||
    state === "partial-call" ||
    state === "input-streaming"
  );
}

function isDoneState(state: string): boolean {
  return state === "result" || state === "output-available";
}

// ─── Main adapter ────────────────────────────────────────────────────

/**
 * Converts an array of tool invocation parts (from UIMessage) into
 * ActivityEvent objects suitable for the ResearchLayout activity feed.
 *
 * Handles searchGraph, searchWeb, searchWikipedia, searchCommunities.
 * Each tool call produces a "search.started" event and, when complete,
 * a "search.completed" event.
 */
export function toolPartsToActivityEvents(
  toolParts: any[],
  baseTimestamp?: number
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const base = baseTimestamp ?? Date.now();

  toolParts.forEach((t, index) => {
    const toolName: string = t.toolName ?? "";
    const input = t.input ?? t.args ?? {};
    const output = t.output ?? t.result;
    const state: string = t.state ?? "result";
    const ts = base + index * 100;

    const running = isRunningState(state);
    const done = isDoneState(state);

    // Emit started event for active or completed tool calls
    if (running || done) {
      events.push({
        type: "search.started",
        data: {
          source: getSourceFromToolName(toolName),
          query: input?.query ?? "",
          toolName,
        },
        timestamp: ts,
      });
    }

    // Emit completed event for finished tool calls
    if (done && output) {
      events.push({
        type: "search.completed",
        data: {
          source: getSourceFromToolName(toolName),
          query: input?.query ?? "",
          resultCount: getResultCount(toolName, output),
          toolName,
        },
        timestamp: ts + 50,
      });
    }
  });

  return events;
}
