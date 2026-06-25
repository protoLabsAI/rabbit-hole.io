/**
 * Shared search utilities — used by /api/chat and /api/research/deep.
 *
 * Web (SearXNG) + Wikipedia search, plus a retry wrapper.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
  publishedDate?: string;
  /** Which SearXNG engines surfaced this result — high overlap = higher confidence */
  engines?: string[];
}

/**
 * Optional parameters for searchWeb.
 *
 * categories — SearXNG category tab to query (comma-separated for multi):
 *   "general"      → Google, DDG, Brave, Startpage (default broad web)
 *   "social media" → Reddit, Hacker News (community discussion & real-world experience)
 *   "it"           → GitHub, Stack Overflow, Arch Wiki, Docker Hub (code & tech docs)
 *   "science"      → arXiv, Semantic Scholar, PubMed (academic papers)
 *   "news"         → Google News, Bing News, Reuters (recency-sensitive topics)
 *
 * engines — override categories entirely with specific engine names (comma-separated),
 *   e.g. "reddit,hackernews" or "github,stackoverflow"
 *
 * pageno — 1-based page number. Page 2+ fetches different results from engines
 *   that support pagination (Google, DDG, Brave, Startpage). Engines without
 *   paging support are silently skipped on page 2+.
 *
 * timeRange — filter by recency. Silently ignored by engines that don't support it
 *   (arXiv, Semantic Scholar, Wikipedia, Qwant).
 */
export interface WebSearchOptions {
  categories?: string;
  engines?: string;
  pageno?: number;
  timeRange?: "day" | "week" | "month" | "year";
}

export interface WikiSearchResult {
  title: string;
  text: string;
  url: string;
  snippet: string;
}

// ── Web Search (SearXNG) ─────────────────────────────────────────────

export async function searchWeb(
  query: string,
  maxResults = 6,
  options?: WebSearchOptions
): Promise<WebSearchResult[]> {
  const endpoint = process.env.SEARXNG_ENDPOINT;
  if (!endpoint) return [];

  const url = new URL("/search", endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "en");
  url.searchParams.set("pageno", String(options?.pageno ?? 1));

  if (options?.engines) {
    url.searchParams.set("engines", options.engines);
  } else if (options?.categories) {
    url.searchParams.set("categories", options.categories);
  }
  if (options?.timeRange) {
    url.searchParams.set("time_range", options.timeRange);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = process.env.SEARXNG_BASIC_AUTH;
  if (auth)
    headers.Authorization = `Basic ${Buffer.from(auth).toString("base64")}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: Array<{
      title: string;
      url: string;
      content: string;
      score?: number;
      publishedDate?: string;
      engines?: string[];
    }>;
  };

  return (
    data.results?.slice(0, maxResults).map((r) => ({
      title: r.title,
      url: r.url,
      // 800 chars — enough for meaningful compression without truncating key facts
      snippet: r.content?.slice(0, 800),
      score: r.score,
      publishedDate: r.publishedDate,
      engines: r.engines,
    })) ?? []
  );
}

// ── Wikipedia Search ─────────────────────────────────────────────────

export async function searchWikipedia(
  query: string
): Promise<WikiSearchResult | null> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=1`;
  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as {
    query?: { search?: Array<{ title: string }> };
  };

  const results = searchData?.query?.search;
  if (!results?.length) return null;

  const title = results[0].title;
  const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&format=json&utf8=1`;
  const contentRes = await fetch(contentUrl);
  const contentData = (await contentRes.json()) as {
    query?: { pages?: Record<string, { extract?: string }> };
  };

  const page = Object.values(contentData?.query?.pages ?? {})[0];
  const text = page?.extract ?? "";
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

  return {
    title,
    text: text.slice(0, 5000),
    url,
    snippet: text.slice(0, 300),
  };
}

// ── Retry Wrapper ────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError!;
}
