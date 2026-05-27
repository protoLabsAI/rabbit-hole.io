/**
 * Minimal Tavily client. Wraps POST /search.
 *
 * Tavily docs: https://docs.tavily.com/sdk/python/reference (REST schema
 * is the same as the Python SDK reference; just the transport is different).
 * Returns top URLs + AI-extracted answer.
 */

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export type TavilyResponse = {
  query: string;
  answer?: string;
  results: TavilyResult[];
};

export class TavilyClient {
  constructor(private apiKey: string) {}

  async search(
    query: string,
    opts: { maxResults?: number; includeAnswer?: boolean } = {}
  ): Promise<TavilyResponse> {
    if (!this.apiKey) throw new Error("RH_TAVILY_API_KEY not set");
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: opts.maxResults ?? 5,
        include_answer: opts.includeAnswer ?? true,
        search_depth: "advanced",
      }),
    });
    if (!r.ok)
      throw new Error(`tavily search failed: ${r.status} ${await r.text()}`);
    return (await r.json()) as TavilyResponse;
  }
}
