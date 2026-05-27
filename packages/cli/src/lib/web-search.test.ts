/**
 * webSearch retry/fallback behavior (#318): SearXNG sometimes returns HTTP 200
 * with zero results on transient engine timeouts. We retry once, then fall back
 * to Tavily when it's configured.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Config } from "../config.js";

const searxngSearch = vi.fn();
const tavilySearch = vi.fn();

vi.mock("./searxng.js", () => ({
  SearxngClient: class {
    search = searxngSearch;
  },
}));
vi.mock("./tavily.js", () => ({
  TavilyClient: class {
    search = tavilySearch;
  },
}));

import { webSearch } from "./web-search.js";

const cfg = (over: Partial<Config> = {}): Config => ({
  jobProcessorUrl: "http://jp",
  searxngEndpoint: "http://searxng:8080",
  llmBaseUrl: "http://gw/v1",
  llmModel: "protolabs/smart",
  ...over,
});

const sx = (results: number) => ({
  query: "q",
  results: Array.from({ length: results }, (_, i) => ({
    title: `t${i}`,
    url: `https://x/${i}`,
    content: "c",
  })),
  provider: "searxng" as const,
});

describe("webSearch — SearXNG empty-result handling (#318)", () => {
  beforeEach(() => {
    searxngSearch.mockReset();
    tavilySearch.mockReset();
  });

  it("returns SearXNG results without retrying when the first call succeeds", async () => {
    searxngSearch.mockResolvedValueOnce(sx(3));
    const res = await webSearch(cfg(), "q");
    expect(res.provider).toBe("searxng");
    expect(res.results).toHaveLength(3);
    expect(searxngSearch).toHaveBeenCalledTimes(1);
  });

  it("retries once on an empty result and returns the retry's hits", async () => {
    searxngSearch.mockResolvedValueOnce(sx(0)).mockResolvedValueOnce(sx(2));
    const res = await webSearch(cfg(), "q");
    expect(res.provider).toBe("searxng");
    expect(res.results).toHaveLength(2);
    expect(searxngSearch).toHaveBeenCalledTimes(2);
  });

  it("falls back to Tavily when SearXNG stays empty and a key is set", async () => {
    searxngSearch.mockResolvedValue(sx(0));
    tavilySearch.mockResolvedValue({
      query: "q",
      answer: "an answer",
      results: [{ title: "tav", url: "https://t", content: "c", score: 0.9 }],
    });
    const res = await webSearch(cfg({ tavilyApiKey: "tvly-x" }), "q");
    expect(res.provider).toBe("tavily");
    expect(res.results).toHaveLength(1);
    expect(searxngSearch).toHaveBeenCalledTimes(2); // initial + retry
  });

  it("returns the empty SearXNG result (no throw) when no Tavily fallback", async () => {
    searxngSearch.mockResolvedValue(sx(0));
    const res = await webSearch(cfg(), "q");
    expect(res.provider).toBe("searxng");
    expect(res.results).toHaveLength(0);
    expect(searxngSearch).toHaveBeenCalledTimes(2);
    expect(tavilySearch).not.toHaveBeenCalled();
  });
});
