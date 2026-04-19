/**
 * GraphitiClient — research episode tracking via Graphiti temporal KG.
 *
 * Adapted from protoworkstacean/lib/memory/graphiti-client.ts.
 * Key differences:
 *   - group_id is topic-scoped (not user-scoped)
 *   - Episodes are single-message research reports (not conversation pairs)
 *   - checkFreshness() drives the skip-if-fresh gate before deep_research
 *   - searchFacts() merges with Neo4j results in kg_facts producer
 *
 * API reference: POST /messages, POST /get-memory, POST /search,
 *                DELETE /group/{group_id}, GET /healthcheck
 *
 * Env:
 *   GRAPHITI_URL          — base URL (default: http://graphiti:8000)
 *   GRAPHITI_GROUP_PREFIX — namespace prefix (default: rh-research)
 */

import { createHash } from "node:crypto";

export interface GraphitiFact {
  uuid: string;
  name: string;
  fact: string;
  valid_at: string | null;
  invalid_at: string | null;
  created_at: string;
  expired_at: string | null;
}

export interface FreshnessResult {
  /** True if facts exist and none are older than maxAgeDays. */
  fresh: boolean;
  /** ISO-8601 of the most recent fact, or null if no facts found. */
  lastResearched: string | null;
  /** Age of the most recent fact in days. */
  ageDays: number;
  /** Active (not expired/invalidated) facts for the topic. */
  facts: GraphitiFact[];
}

export class GraphitiClient {
  private readonly baseUrl: string;
  private readonly prefix: string;

  constructor() {
    this.baseUrl = (
      process.env["GRAPHITI_URL"] ?? "http://graphiti:8000"
    ).replace(/\/$/, "");
    this.prefix = process.env["GRAPHITI_GROUP_PREFIX"] ?? "rh-research";
  }

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Store a completed research report as a Graphiti episode.
   * Fire-and-forget — the caller should not await this if latency matters.
   * Graphiti handles dedup, temporal validity, and contradiction resolution.
   */
  async addResearchEpisode(query: string, report: string): Promise<void> {
    const groupId = this.groupId(query);
    await this._post("/messages", {
      group_id: groupId,
      messages: [
        {
          content: `Research query: ${query}`,
          role_type: "user",
          role: "researcher",
          source_description: `rabbit-hole deep-research: ${query}`,
        },
        {
          content: report,
          role_type: "assistant",
          role: "rabbit-hole",
          source_description: `rabbit-hole deep-research report: ${query}`,
        },
      ],
    });
  }

  /**
   * Check whether a topic has fresh knowledge in Graphiti.
   * "Fresh" means at least one active fact exists and its age ≤ maxAgeDays.
   */
  async checkFreshness(
    query: string,
    maxAgeDays = 7
  ): Promise<FreshnessResult> {
    const groupId = this.groupId(query);
    let facts: GraphitiFact[] = [];

    try {
      facts = await this.searchFacts(query, 20);
    } catch {
      // Graphiti unavailable — treat as not fresh (run full pipeline)
      return {
        fresh: false,
        lastResearched: null,
        ageDays: Infinity,
        facts: [],
      };
    }

    if (facts.length === 0) {
      return {
        fresh: false,
        lastResearched: null,
        ageDays: Infinity,
        facts: [],
      };
    }

    // Filter out expired / invalidated facts
    const now = Date.now();
    const active = facts.filter((f) => {
      if (f.invalid_at && new Date(f.invalid_at).getTime() <= now) return false;
      if (f.expired_at && new Date(f.expired_at).getTime() <= now) return false;
      return true;
    });

    if (active.length === 0) {
      return {
        fresh: false,
        lastResearched: null,
        ageDays: Infinity,
        facts: [],
      };
    }

    // Most recent created_at among active facts
    const latest = active.reduce(
      (max, f) => (f.created_at > max ? f.created_at : max),
      active[0]!.created_at
    );
    const ageDays = (now - new Date(latest).getTime()) / 86_400_000;

    return {
      fresh: ageDays <= maxAgeDays,
      lastResearched: latest,
      ageDays: Math.round(ageDays * 10) / 10,
      facts: active,
    };
  }

  /**
   * Search Graphiti facts for a topic.
   * Uses /search with the topic's group_id for namespace isolation.
   */
  async searchFacts(query: string, maxFacts = 15): Promise<GraphitiFact[]> {
    const groupId = this.groupId(query);
    const result = await this._post<{ facts: GraphitiFact[] }>("/search", {
      query,
      group_ids: [groupId],
      max_facts: maxFacts,
    });
    return result?.facts ?? [];
  }

  /** Delete all research memory for a topic (admin / re-research). */
  async clearTopic(query: string): Promise<void> {
    const groupId = this.groupId(query);
    await this._delete(`/group/${encodeURIComponent(groupId)}`);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/healthcheck`, {
        signal: AbortSignal.timeout(3_000),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  // ── Group ID ──────────────────────────────────────────────────────────

  /**
   * Deterministic group_id for a research topic.
   * Same query always hashes to the same group, enabling cross-session dedup.
   */
  groupId(query: string): string {
    const hash = createHash("sha256")
      .update(query.toLowerCase().trim())
      .digest("hex")
      .slice(0, 16);
    return `${this.prefix}:${hash}`;
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────

  private async _post<T>(path: string, body: unknown): Promise<T | null> {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Graphiti ${path} → ${resp.status}: ${text}`);
    }

    // /messages returns 202 with no body worth parsing
    if (resp.status === 202) return null;
    return resp.json() as Promise<T>;
  }

  private async _delete(path: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(8_000),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Graphiti DELETE ${path} → ${resp.status}: ${text}`);
    }
  }
}
