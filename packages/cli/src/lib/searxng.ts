/**
 * SearXNG client — our in-house metasearch (stacks/ai). Default web-search
 * backend for the CLI, preferred over Tavily so search stays on our own
 * infra with no external API key.
 *
 * Uses the JSON output format: GET /search?q=<q>&format=json. SearXNG
 * returns ranked results but no AI "answer" (that's fine — `rh research`
 * synthesizes its own via the gateway).
 */

import type { WebSearchResponse, WebSearchResult } from "./web-search";

interface SearxngJsonResult {
  url: string;
  title: string;
  content?: string;
  score?: number;
}

interface SearxngJsonResponse {
  query: string;
  results: SearxngJsonResult[];
}

export class SearxngClient {
  constructor(private endpoint: string) {}

  async search(
    query: string,
    opts: { maxResults?: number } = {}
  ): Promise<WebSearchResponse> {
    const u = new URL(`${this.endpoint.replace(/\/$/, "")}/search`);
    u.searchParams.set("q", query);
    u.searchParams.set("format", "json");

    const r = await fetch(u, { headers: { accept: "application/json" } });
    if (!r.ok) {
      throw new Error(`searxng search failed: ${r.status} ${await r.text()}`);
    }
    const data = (await r.json()) as SearxngJsonResponse;
    const max = opts.maxResults ?? 5;
    const results: WebSearchResult[] = (data.results ?? [])
      .slice(0, max)
      .map((x) => ({
        title: x.title,
        url: x.url,
        content: x.content ?? "",
        score: x.score,
      }));
    return { query, results, provider: "searxng" };
  }
}
