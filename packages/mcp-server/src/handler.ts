/**
 * Tool Call Handler
 *
 * Routes MCP tool calls to actual implementations.
 * Tools call external services (job-processor, search APIs) directly.
 */

// ─── Source Health Tracking ──────────────────────────────────────────

const HEALTH_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILURES = 3;
const SOURCE_TIMEOUT_MS = 10_000; // 10 seconds per source

interface SourceHealthState {
  failures: number;
  lastFailure: number | null;
  disabled: boolean;
}

const sourceHealth = new Map<string, SourceHealthState>([
  ["wikipedia", { failures: 0, lastFailure: null, disabled: false }],
  ["duckduckgo", { failures: 0, lastFailure: null, disabled: false }],
  ["tavily", { failures: 0, lastFailure: null, disabled: false }],
]);

export function isSourceEnabled(source: string): boolean {
  const health = sourceHealth.get(source);
  if (!health) return true;
  if (!health.disabled) return true;
  // Auto-recover after the health window elapses
  if (
    health.lastFailure !== null &&
    Date.now() - health.lastFailure > HEALTH_WINDOW_MS
  ) {
    health.failures = 0;
    health.disabled = false;
    return true;
  }
  return false;
}

export function recordSourceFailure(source: string): void {
  const existing = sourceHealth.get(source);
  const health: SourceHealthState = existing ?? {
    failures: 0,
    lastFailure: null,
    disabled: false,
  };
  const now = Date.now();

  // Reset counter if the previous failure is outside the tracking window
  if (
    health.lastFailure !== null &&
    now - health.lastFailure > HEALTH_WINDOW_MS
  ) {
    health.failures = 0;
    health.disabled = false;
  }

  health.failures++;
  health.lastFailure = now;

  if (health.failures >= MAX_FAILURES) {
    health.disabled = true;
    console.warn(
      `[MCP] Source "${source}" temporarily disabled after ${health.failures} failures within ${HEALTH_WINDOW_MS / 60_000} minutes`
    );
  }

  sourceHealth.set(source, health);
}

export function recordSourceSuccess(source: string): void {
  const health = sourceHealth.get(source);
  if (health) {
    health.failures = 0;
    health.disabled = false;
  }
}

/** Reset health state — used in tests. */
export function resetSourceHealth(): void {
  for (const [key] of sourceHealth) {
    sourceHealth.set(key, { failures: 0, lastFailure: null, disabled: false });
  }
}

/** Expose health state for tests. */
export function getSourceHealthState(
  source: string
): SourceHealthState | undefined {
  return sourceHealth.get(source);
}

// ─── Timeout Wrapper ────────────────────────────────────────────────

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  source: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${source} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── Handler Config ──────────────────────────────────────────────────

interface HandlerConfig {
  jobProcessorUrl: string;
  tavilyApiKey?: string;
  groqApiKey?: string;
  anthropicApiKey?: string;
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  config: HandlerConfig
): Promise<unknown> {
  switch (name) {
    // ─── Research Tools ────────────────────────────────────────────

    case "wikipedia_search":
      return await wikipediaSearch(args.query as string);

    case "web_search":
      return await duckduckgoSearch(args.query as string);

    case "tavily_search":
      return await tavilySearch(
        args.query as string,
        (args.maxResults as number) ?? 5,
        config.tavilyApiKey
      );

    // ─── Media Tools ───────────────────────────────────────────────

    case "ingest_url":
      return await ingestUrl(args.url as string, config.jobProcessorUrl);

    case "ingest_file":
      return await ingestFile(args.filePath as string, config.jobProcessorUrl);

    case "transcribe_audio":
      return await ingestUrl(args.source as string, config.jobProcessorUrl);

    case "extract_pdf":
      return await ingestUrl(args.source as string, config.jobProcessorUrl);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Wikipedia ──────────────────────────────────────────────────────

async function wikipediaSearch(query: string): Promise<unknown> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=3`;
  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as {
    query?: { search?: Array<{ title: string; pageid: number }> };
  };

  const results = searchData?.query?.search;
  if (!results || results.length === 0) {
    return { error: `No Wikipedia articles found for "${query}"` };
  }

  // Fetch the top result's full text
  const title = results[0].title;
  const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&format=json&utf8=1`;
  const contentRes = await fetch(contentUrl);
  const contentData = (await contentRes.json()) as {
    query?: { pages?: Record<string, { extract?: string; title?: string }> };
  };
  const pages = contentData?.query?.pages;
  if (!pages) return { error: "Failed to fetch article content" };

  const page = Object.values(pages)[0];
  const text = page?.extract ?? "";
  const truncated = text.length > 8000 ? text.slice(0, 8000) + "..." : text;

  return {
    title: page?.title ?? title,
    text: truncated,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    charCount: text.length,
    truncated: text.length > 8000,
    otherResults: results.slice(1).map((r) => r.title),
  };
}

// ─── DuckDuckGo ─────────────────────────────────────────────────────

async function duckduckgoSearch(query: string): Promise<unknown> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    Abstract?: string;
    AbstractSource?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<{
      Text?: string;
      FirstURL?: string;
      Result?: string;
    }>;
    Results?: Array<{
      Text?: string;
      FirstURL?: string;
    }>;
  };

  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // Main abstract
  if (data.Abstract) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL || "",
      snippet: data.Abstract,
    });
  }

  // Related topics
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 7)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(" - ")[0] || topic.Text.slice(0, 80),
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
    }
  }

  // Direct results
  if (data.Results) {
    for (const r of data.Results) {
      if (r.Text && r.FirstURL) {
        results.push({
          title: r.Text.slice(0, 80),
          url: r.FirstURL,
          snippet: r.Text,
        });
      }
    }
  }

  return {
    query,
    resultCount: results.length,
    results: results.slice(0, 8),
  };
}

// ─── Tavily ─────────────────────────────────────────────────────────

async function tavilySearch(
  query: string,
  maxResults: number,
  apiKey?: string
): Promise<unknown> {
  if (!apiKey) {
    return {
      error:
        "TAVILY_API_KEY not set. Set it in your environment to use Tavily search.",
    };
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "advanced",
      include_answer: true,
    }),
  });

  if (!res.ok) {
    return { error: `Tavily API error: ${res.status} ${res.statusText}` };
  }

  const data = (await res.json()) as {
    answer?: string;
    results?: Array<{
      title: string;
      url: string;
      content: string;
      score: number;
    }>;
  };

  return {
    query,
    answer: data.answer,
    resultCount: data.results?.length ?? 0,
    results: data.results?.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content?.slice(0, 500),
      score: r.score,
    })),
  };
}

// ─── Media Ingestion ────────────────────────────────────────────────

async function ingestUrl(
  url: string,
  jobProcessorUrl: string
): Promise<unknown> {
  const jobId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Submit ingestion job
  const submitRes = await fetch(`${jobProcessorUrl}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId,
      request: {
        source: { type: "url", url },
      },
    }),
  });

  if (!submitRes.ok) {
    return {
      error: `Job processor error: ${submitRes.status} ${submitRes.statusText}`,
    };
  }

  // Poll for completion (max 60s)
  const maxWait = 60_000;
  const pollInterval = 3_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(`${jobProcessorUrl}/ingest/${jobId}/status`);
    if (!statusRes.ok) continue;

    const status = (await statusRes.json()) as {
      status: string;
      result?: {
        text: string;
        metadata: Record<string, unknown>;
        category: string;
      };
      error?: string;
    };

    if (status.status === "completed" && status.result) {
      return {
        success: true,
        jobId,
        text: status.result.text?.slice(0, 16000),
        metadata: status.result.metadata,
        category: status.result.category,
        textLength: status.result.text?.length,
        truncated: (status.result.text?.length ?? 0) > 16000,
      };
    }

    if (status.status === "failed") {
      return { success: false, jobId, error: status.error };
    }
  }

  return { success: false, jobId, error: "Timed out after 60 seconds" };
}

async function ingestFile(
  filePath: string,
  jobProcessorUrl: string
): Promise<unknown> {
  const jobId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const submitRes = await fetch(`${jobProcessorUrl}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId,
      request: {
        source: { type: "file", path: filePath },
      },
    }),
  });

  if (!submitRes.ok) {
    return {
      error: `Job processor error: ${submitRes.status} ${submitRes.statusText}`,
    };
  }

  // Poll same as URL ingestion
  const maxWait = 60_000;
  const pollInterval = 3_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(`${jobProcessorUrl}/ingest/${jobId}/status`);
    if (!statusRes.ok) continue;

    const status = (await statusRes.json()) as {
      status: string;
      result?: {
        text: string;
        metadata: Record<string, unknown>;
        category: string;
      };
      error?: string;
    };

    if (status.status === "completed" && status.result) {
      return {
        success: true,
        jobId,
        text: status.result.text?.slice(0, 16000),
        metadata: status.result.metadata,
        category: status.result.category,
        textLength: status.result.text?.length,
        truncated: (status.result.text?.length ?? 0) > 16000,
      };
    }

    if (status.status === "failed") {
      return { success: false, jobId, error: status.error };
    }
  }

  return { success: false, jobId, error: "Timed out after 60 seconds" };
}
