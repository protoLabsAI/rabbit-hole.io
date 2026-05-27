/**
 * Unified web search. Prefers our in-house SearXNG; falls back to Tavily
 * only if SearXNG isn't configured/reachable and a Tavily key is present.
 *
 * Keeps a common result shape so `rh search` / `rh research` don't care
 * which backend answered.
 */

import type { Config } from "../config.js";

import { SearxngClient } from "./searxng.js";
import { TavilyClient } from "./tavily.js";

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export type WebSearchResponse = {
  query: string;
  results: WebSearchResult[];
  /** Some providers (Tavily) return an AI answer; SearXNG does not. */
  answer?: string;
  provider: "searxng" | "tavily";
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function webSearch(
  cfg: Config,
  query: string,
  opts: { maxResults?: number } = {}
): Promise<WebSearchResponse> {
  const hasSearxng = !!cfg.searxngEndpoint;
  const hasTavily = !!cfg.tavilyApiKey;

  if (hasSearxng) {
    const searxng = new SearxngClient(cfg.searxngEndpoint);
    try {
      let res = await searxng.search(query, opts);
      // SearXNG intermittently returns HTTP 200 with zero results when its
      // upstream engines time out / rate-limit on a query. That's transient —
      // retry once before giving up on it.
      if (res.results.length === 0) {
        await delay(500);
        res = await searxng.search(query, opts);
      }
      // Got results, or nothing else to try → return what we have.
      if (res.results.length > 0 || !hasTavily) return res;
      process.stderr.write(
        "rh: searxng returned no results; falling back to tavily\n"
      );
    } catch (err) {
      // Only fall back if Tavily is actually configured; otherwise surface
      // the SearXNG error so the operator knows their own search is down.
      if (!hasTavily) throw err;
      process.stderr.write(
        `rh: searxng failed (${(err as Error).message}); falling back to tavily\n`
      );
    }
  }

  if (hasTavily) {
    const t = await new TavilyClient(cfg.tavilyApiKey!).search(query, {
      maxResults: opts.maxResults,
      includeAnswer: true,
    });
    return {
      query: t.query,
      answer: t.answer,
      results: t.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })),
      provider: "tavily",
    };
  }

  throw new Error(
    "no web search backend configured: set RH_SEARXNG_ENDPOINT (preferred) or RH_TAVILY_API_KEY"
  );
}
