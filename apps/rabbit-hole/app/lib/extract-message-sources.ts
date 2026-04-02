import type { UIMessage } from "ai";

import type { CommunitySummary } from "../components/search/CommunityCard";
import type { GraphEntity } from "../components/search/EntityCard";
import type { ResearchSource } from "../components/search/SourceCard";

export interface MessageSources {
  sources: ResearchSource[];
  graphEntities: GraphEntity[];
  communities: CommunitySummary[];
}

/**
 * Extract sources, graph entities, and community summaries from an assistant
 * UIMessage's tool-result parts. Used by both ChatMessage (mobile sheet trigger)
 * and page.tsx (page-level right panel).
 */
export function extractMessageSources(
  message: UIMessage | null | undefined
): MessageSources {
  if (!message || message.role !== "assistant") {
    return { sources: [], graphEntities: [], communities: [] };
  }

  const parts = (message.parts ?? []) as any[];

  const allTools = parts
    .filter(
      (p: any) =>
        p.type === "tool-invocation" ||
        (typeof p.type === "string" &&
          p.type.startsWith("tool-") &&
          p.type !== "tool-input")
    )
    .map((p: any) => ({
      ...p,
      toolName: p.toolName ?? p.type?.replace("tool-", ""),
      output: p.output ?? p.result ?? p.toolResult,
    }));

  const sources: ResearchSource[] = [];
  for (const t of allTools) {
    const output = t.output ?? t.result;
    if (!output) continue;
    if (t.toolName === "searchWeb" && Array.isArray(output.results)) {
      for (const r of output.results) {
        if (r.url && r.title) {
          sources.push({
            title: r.title,
            url: r.url,
            type: "web",
            snippet: r.snippet,
          });
        }
      }
    } else if (t.toolName === "searchWikipedia" && output.url && output.title) {
      sources.push({
        title: output.title,
        url: output.url,
        type: "wikipedia",
        snippet: output.text?.slice(0, 200),
      });
    }
  }

  const seen = new Set<string>();
  const graphEntities: GraphEntity[] = [];
  for (const t of allTools) {
    if (t.toolName === "searchGraph") {
      const output = t.output ?? t.result;
      if (Array.isArray(output)) {
        for (const entity of output) {
          if (entity?.uid && !seen.has(entity.uid)) {
            seen.add(entity.uid);
            graphEntities.push({
              uid: entity.uid,
              name: entity.name ?? entity.uid,
              type: entity.type ?? "",
              tags: Array.isArray(entity.tags) ? entity.tags : [],
              connectedEntities: Array.isArray(entity.connectedEntities)
                ? entity.connectedEntities
                : [],
            });
          }
        }
      }
    }
  }

  const communities: CommunitySummary[] = [];
  for (const t of allTools) {
    if (t.toolName === "searchCommunities") {
      const output = t.output ?? t.result;
      if (output && Array.isArray(output.results)) {
        for (const r of output.results) {
          if (r.communityId != null) {
            communities.push({
              communityId: r.communityId,
              summary: r.summary ?? "",
              topEntities: Array.isArray(r.topEntities) ? r.topEntities : [],
              entityCount: r.entityCount ?? 0,
            });
          }
        }
      }
    }
  }

  return { sources, graphEntities, communities };
}
