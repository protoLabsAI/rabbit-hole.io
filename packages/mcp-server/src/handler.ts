/**
 * Tool Call Handler
 *
 * Routes MCP tool calls to actual implementations.
 * Tools call external services (job-processor, search APIs) directly.
 */

import {
  evaluateQuality,
  BudgetTracker,
  DEFAULT_BUDGET,
} from "./lib/research-quality.js";
import type { ResearchBudget } from "./lib/research-quality.js";

// ─── Langfuse (optional tracing) ────────────────────────────────────
// Imported lazily so the server starts fine without LANGFUSE_* env vars.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _langfuseClient: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLangfuse(): any | null {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return null;
  }
  if (!_langfuseClient) {
    try {
      // Dynamic require so the module is optional at startup.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Langfuse } = require("langfuse");
      _langfuseClient = new Langfuse({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL,
      });
    } catch {
      console.warn("[MCP] langfuse package not available — tracing disabled");
      return null;
    }
  }
  return _langfuseClient;
}

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

    case "extract_entities":
      return await extractEntities(
        args.text as string,
        args.entityTypes as string[] | undefined,
        args.focusEntity as string | undefined,
        config.anthropicApiKey
      );

    case "validate_bundle":
      return validateBundle(args.bundle as Record<string, unknown>);

    case "ingest_bundle":
      return await ingestBundle(args.bundle as Record<string, unknown>);

    case "graph_search":
      return await graphSearch(
        args.query as string,
        args.entityTypes as string[] | undefined,
        (args.limit as number) ?? 10
      );

    case "research_entity":
      return await researchEntity(
        args.query as string,
        (args.depth as string) ?? "detailed",
        args.entityType as string | undefined,
        config,
        (args.persist as boolean) ?? true,
        args.budget as ResearchBudget | undefined
      );

    case "check_knowledge_freshness":
      return await checkKnowledgeFreshness(
        args.topic as string,
        (args.maxAgeDays as number) ?? 7
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

// ─── Entity Extraction ──────────────────────────────────────────────

async function extractEntities(
  text: string,
  entityTypes?: string[],
  focusEntity?: string,
  apiKey?: string
): Promise<unknown> {
  if (!apiKey) {
    return {
      error:
        "ANTHROPIC_API_KEY not set. Required for LLM-based entity extraction.",
    };
  }

  const prompt = `Extract entities and relationships from the following text.
${focusEntity ? `Focus on entities related to: ${focusEntity}` : ""}
${entityTypes ? `Look for these entity types: ${entityTypes.join(", ")}` : "Extract all entity types."}

CRITICAL UID FORMAT RULES:
1. Entity UIDs MUST use format: {type_prefix}:{snake_case_name}
   - Use the lowercase snake_case version of the entity name after the colon
   - The prefix must match the entity type:
     * Person → "person:{name}" (e.g., person:nicole_forsgren)
     * Organization → "org:{name}" (e.g., org:google)
     * Technology/Software → "software:{name}" (e.g., software:kubernetes)
     * Framework → "framework:{name}" (e.g., framework:dora_metrics)
     * Concept/Research → "research:{name}" (e.g., research:change_lead_time)
     * Platform → "platform:{name}" (e.g., platform:github)
     * Event → "event:{name}" (e.g., event:devops_enterprise_summit)
     * Country → "country:{name}" (e.g., country:united_states)
     * Company → "company:{name}" (e.g., company:google)
     * Publication → "publication:{name}" (e.g., publication:accelerate_book)
     * Other types → "{type}:{snake_case_name}"
2. Relationship UIDs MUST use format: rel:{source_name}_{type}_{target_name}
   - Use snake_case for all parts
   - Example: rel:dora_metrics_includes_change_lead_time
   - Example: rel:nicole_forsgren_authored_accelerate

Return a JSON object with:
- entities: array of {uid, name, type, properties: {}, tags: [], aliases: []}
- relationships: array of {uid, type, source, target, properties: {}}

Where:
- entity uid: MUST be "{type_prefix}:{snake_case_name}" format
- relationship uid: MUST start with "rel:" prefix
- relationship source and target: MUST be valid entity UIDs from the entities array
- relationship type: use UPPERCASE verb like "INCLUDES", "AUTHORED", "FOUNDED", "WORKS_AT", "PART_OF", "RELATED_TO"

Text:
${text.slice(0, 12000)}

Respond with ONLY valid JSON, no markdown fences.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    return { error: `Anthropic API error: ${res.status}` };
  }

  const data = (await res.json()) as {
    content?: Array<{ text?: string }>;
  };
  const content = data.content?.[0]?.text ?? "";

  try {
    // Strip markdown fences if present
    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    return JSON.parse(jsonStr);
  } catch {
    return { error: "Failed to parse extraction result", raw: content };
  }
}

// ─── Bundle Validation ──────────────────────────────────────────────

function validateBundle(bundle: Record<string, unknown>): unknown {
  const errors: string[] = [];
  const entities = (bundle.entities as Array<Record<string, unknown>>) ?? [];
  const relationships =
    (bundle.relationships as Array<Record<string, unknown>>) ?? [];

  const entityUids = new Set(
    entities.map((e) => e.uid as string).filter(Boolean)
  );

  // Check entities
  for (const entity of entities) {
    if (!entity.uid) errors.push("Entity missing uid");
    if (!entity.name) errors.push(`Entity ${entity.uid}: missing name`);
    if (!entity.type) errors.push(`Entity ${entity.uid}: missing type`);
  }

  // Check relationships
  for (const rel of relationships) {
    if (!rel.uid) errors.push("Relationship missing uid");
    if (!entityUids.has(rel.source as string)) {
      errors.push(
        `Relationship ${rel.uid}: source "${rel.source}" not found in entities`
      );
    }
    if (!entityUids.has(rel.target as string)) {
      errors.push(
        `Relationship ${rel.uid}: target "${rel.target}" not found in entities`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    metrics: {
      entityCount: entities.length,
      relationshipCount: relationships.length,
      entityTypes: [
        ...new Set(entities.map((e) => e.type as string).filter(Boolean)),
      ],
    },
  };
}

// ─── Full Research Pipeline ─────────────────────────────────────────

/**
 * Convert a query string to a URL-safe slug for use in evidence UIDs.
 */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get current ISO datetime string.
 */
function nowIso(): string {
  return new Date().toISOString().replace(/(\.\d{3})Z$/, ".000Z");
}

async function researchEntity(
  query: string,
  depth: string,
  entityType: string | undefined,
  config: HandlerConfig,
  persist: boolean = true,
  budgetConfig?: ResearchBudget
): Promise<unknown> {
  const pipelineStart = Date.now();
  const results: Record<string, unknown> = { query, depth };
  const evidenceNodes: Array<Record<string, unknown>> = [];
  const entityCitations: Record<string, Array<Record<string, unknown>>> = {};
  const budget = new BudgetTracker(budgetConfig ?? DEFAULT_BUDGET);

  // ── Langfuse trace ──────────────────────────────────────────────────
  const langfuse = getLangfuse();

  const trace = langfuse?.trace({
    name: "research_entity",
    input: { query, depth, entityType },
    metadata: { persist },
  });

  // ── Step 1–3 (parallel): Wikipedia, DuckDuckGo, Tavily ──────────────
  const wikiEnabled = isSourceEnabled("wikipedia");
  const ddgEnabled = isSourceEnabled("duckduckgo");
  const tavilyEnabled = isSourceEnabled("tavily") && !!config.tavilyApiKey;

  const wikiStart = Date.now();
  const ddgStart = Date.now();
  const tavilyStart = Date.now();

  const [wikiSettled, webSettled, tavilySettled] = await Promise.allSettled([
    wikiEnabled
      ? withTimeout(wikipediaSearch(query), SOURCE_TIMEOUT_MS, "wikipedia")
      : Promise.reject(new Error("wikipedia source disabled")),
    ddgEnabled
      ? withTimeout(duckduckgoSearch(query), SOURCE_TIMEOUT_MS, "duckduckgo")
      : Promise.reject(new Error("duckduckgo source disabled")),
    tavilyEnabled
      ? withTimeout(
          tavilySearch(query, 5, config.tavilyApiKey),
          SOURCE_TIMEOUT_MS,
          "tavily"
        )
      : Promise.reject(
          new Error(
            config.tavilyApiKey
              ? "tavily source disabled"
              : "tavily not configured"
          )
        ),
  ]);

  const wikiLatency = Date.now() - wikiStart;
  const ddgLatency = Date.now() - ddgStart;
  const tavilyLatency = Date.now() - tavilyStart;

  // ── Process Wikipedia result ────────────────────────────────────────
  let wiki: Record<string, unknown> = {};
  if (wikiSettled.status === "fulfilled") {
    wiki = wikiSettled.value as Record<string, unknown>;
    results.wikipedia = wiki;
    if (!wiki.error) {
      recordSourceSuccess("wikipedia");
    } else {
      recordSourceFailure("wikipedia");
    }
  } else {
    if (wikiEnabled) recordSourceFailure("wikipedia");
    results.wikipedia = {
      error:
        wikiSettled.reason instanceof Error
          ? wikiSettled.reason.message
          : "Wikipedia search failed",
    };
  }
  const wikiResultCount = wiki && !wiki.error && wiki.text ? 1 : 0;

  // Build Wikipedia evidence node
  if (wiki && !wiki.error && wiki.url) {
    const querySlug = toSlug(query);
    const wikiEvidenceUid = `evidence:wikipedia_${querySlug}`;
    evidenceNodes.push({
      uid: wikiEvidenceUid,
      kind: "research",
      title: (wiki.title as string) ?? `Wikipedia: ${query}`,
      publisher: "Wikipedia",
      date: todayDate(),
      url: wiki.url as string,
      retrieved_at: nowIso(),
      reliability: 0.7,
      notes: `Wikipedia article on "${query}"`,
    });
    results._wikiEvidenceUid = wikiEvidenceUid;
  }

  // Langfuse span: wikipedia
  trace?.span({
    name: "wikipedia",
    startTime: new Date(pipelineStart),
    endTime: new Date(pipelineStart + wikiLatency),
    metadata: {
      source: "wikipedia",
      latencyMs: wikiLatency,
      success: wikiSettled.status === "fulfilled" && !wiki.error,
      resultCount: wikiResultCount,
      error:
        wikiSettled.status === "rejected"
          ? (wikiSettled.reason as Error)?.message
          : (wiki.error as string | undefined),
    },
  });

  // ── Process DuckDuckGo result ───────────────────────────────────────
  let webResults: Record<string, unknown> = {};
  if (webSettled.status === "fulfilled") {
    webResults = webSettled.value as Record<string, unknown>;
    results.webSearch = webResults;
    if (!webResults.error) {
      recordSourceSuccess("duckduckgo");
    } else {
      recordSourceFailure("duckduckgo");
    }
  } else {
    if (ddgEnabled) recordSourceFailure("duckduckgo");
    results.webSearch = {
      error:
        webSettled.reason instanceof Error
          ? webSettled.reason.message
          : "DuckDuckGo search failed",
    };
  }

  const webResultItems =
    (webResults?.results as Array<Record<string, unknown>>) ?? [];
  const ddgResultCount = webResultItems.length;

  // Build web search evidence nodes from DuckDuckGo results
  for (let i = 0; i < Math.min(webResultItems.length, 3); i++) {
    const item = webResultItems[i];
    if (
      item?.url &&
      typeof item.url === "string" &&
      item.url.startsWith("http")
    ) {
      const slug = toSlug((item.title as string) ?? `web_result_${i}`);
      evidenceNodes.push({
        uid: `evidence:web_${slug}_${i}`,
        kind: "major_media",
        title: (item.title as string) ?? `Web result ${i + 1}`,
        publisher: new URL(item.url).hostname.replace(/^www\./, ""),
        date: todayDate(),
        url: item.url,
        retrieved_at: nowIso(),
        reliability: 0.5,
      });
    }
  }

  // Langfuse span: duckduckgo
  trace?.span({
    name: "duckduckgo",
    startTime: new Date(pipelineStart),
    endTime: new Date(pipelineStart + ddgLatency),
    metadata: {
      source: "duckduckgo",
      latencyMs: ddgLatency,
      success: webSettled.status === "fulfilled" && !webResults.error,
      resultCount: ddgResultCount,
      error:
        webSettled.status === "rejected"
          ? (webSettled.reason as Error)?.message
          : (webResults.error as string | undefined),
    },
  });

  // ── Process Tavily result ───────────────────────────────────────────
  let tavilyResults: Array<Record<string, unknown>> = [];
  if (tavilySettled.status === "fulfilled") {
    const tavily = tavilySettled.value as Record<string, unknown>;
    results.tavilySearch = tavily;
    if (!tavily.error) {
      recordSourceSuccess("tavily");
    } else {
      recordSourceFailure("tavily");
    }

    // Build Tavily evidence nodes
    tavilyResults = (tavily?.results as Array<Record<string, unknown>>) ?? [];
    for (let i = 0; i < tavilyResults.length; i++) {
      const item = tavilyResults[i];
      if (
        item?.url &&
        typeof item.url === "string" &&
        item.url.startsWith("http")
      ) {
        const slug = toSlug((item.title as string) ?? `tavily_result_${i}`);
        evidenceNodes.push({
          uid: `evidence:tavily_${slug}_${i}`,
          kind: "major_media",
          title: (item.title as string) ?? `Tavily result ${i + 1}`,
          publisher: new URL(item.url).hostname.replace(/^www\./, ""),
          date: todayDate(),
          url: item.url,
          retrieved_at: nowIso(),
          reliability:
            typeof item.score === "number" ? Math.min(item.score, 1) : 0.6,
        });
      }
    }
  } else {
    if (tavilyEnabled) recordSourceFailure("tavily");
    if (config.tavilyApiKey) {
      results.tavilySearch = {
        error:
          tavilySettled.reason instanceof Error
            ? tavilySettled.reason.message
            : "Tavily search failed",
      };
    }
  }

  const tavilyResultCount = tavilyResults.length;

  // Langfuse span: tavily
  if (config.tavilyApiKey) {
    trace?.span({
      name: "tavily",
      startTime: new Date(pipelineStart),
      endTime: new Date(pipelineStart + tavilyLatency),
      metadata: {
        source: "tavily",
        latencyMs: tavilyLatency,
        success:
          tavilySettled.status === "fulfilled" &&
          !(tavilySettled.value as Record<string, unknown>)?.error,
        resultCount: tavilyResultCount,
        error:
          tavilySettled.status === "rejected"
            ? (tavilySettled.reason as Error)?.message
            : undefined,
      },
    });
  }

  // ── Fail fast if ALL sources failed ────────────────────────────────
  const allFailed =
    wikiSettled.status === "rejected" &&
    webSettled.status === "rejected" &&
    tavilySettled.status === "rejected" &&
    !wikiEnabled &&
    !ddgEnabled &&
    !tavilyEnabled;

  if (allFailed) {
    results.error = "All search sources failed or are disabled";
    results.evidence = evidenceNodes;
    results.entityCitations = entityCitations;
    trace?.update({ output: results });
    return results;
  }

  // ── Adaptive Depth: Quality evaluation and targeted follow-up rounds ─
  // After the initial parallel search, evaluate quality against the requested
  // depth threshold. If insufficient and budget allows, run targeted follow-up
  // searches using gap-analysis queries to improve evidence quality.

  const initialQuality = evaluateQuality(results, depth);
  results._qualityAfterRound0 = {
    metrics: initialQuality.metrics,
    sufficient: initialQuality.sufficient,
    gapDescriptions: initialQuality.gaps.descriptions,
  };

  // Track initial sources in budget (wikipedia, duckduckgo, tavily = up to 3)
  const initialSourcesUsed =
    (wikiSettled.status === "fulfilled" ? 1 : 0) +
    (webSettled.status === "fulfilled" ? 1 : 0) +
    (tavilySettled.status === "fulfilled" ? 1 : 0);
  budget.recordSources(initialSourcesUsed);

  // Langfuse span: quality evaluation round 0
  trace?.span({
    name: "quality_eval_round_0",
    startTime: new Date(),
    endTime: new Date(),
    metadata: {
      depth,
      round: 0,
      metrics: initialQuality.metrics,
      sufficient: initialQuality.sufficient,
      gapDescriptions: initialQuality.gaps.descriptions,
      sourcesUsed: initialSourcesUsed,
      budgetExhausted: budget.isExhausted(),
    },
  });

  if (!initialQuality.sufficient && !budget.isExhausted()) {
    const additionalRoundResults: Array<Record<string, unknown>> = [];

    for (const followUpQuery of initialQuality.gaps.suggestedQueries) {
      if (budget.isExhausted()) break;

      const roundStart = Date.now();
      budget.recordRound();
      budget.recordSources(1);

      // Prefer Tavily for follow-up rounds (highest signal), fall back to DDG
      let followUpResult: Record<string, unknown> = {};
      let followUpSource = "duckduckgo";

      if (isSourceEnabled("tavily") && config.tavilyApiKey) {
        followUpSource = "tavily";
        const tavilyFollowUp = await withTimeout(
          tavilySearch(`${query} ${followUpQuery}`, 3, config.tavilyApiKey),
          SOURCE_TIMEOUT_MS,
          "tavily"
        ).catch((err: unknown) => {
          recordSourceFailure("tavily");
          return {
            error:
              err instanceof Error ? err.message : "Tavily follow-up failed",
          };
        });
        followUpResult = tavilyFollowUp as Record<string, unknown>;
        if (!followUpResult.error) recordSourceSuccess("tavily");
      } else if (isSourceEnabled("duckduckgo")) {
        const ddgFollowUp = await withTimeout(
          duckduckgoSearch(`${query} ${followUpQuery}`),
          SOURCE_TIMEOUT_MS,
          "duckduckgo"
        ).catch((err: unknown) => {
          recordSourceFailure("duckduckgo");
          return {
            error:
              err instanceof Error
                ? err.message
                : "DuckDuckGo follow-up failed",
          };
        });
        followUpResult = ddgFollowUp as Record<string, unknown>;
        if (!followUpResult.error) recordSourceSuccess("duckduckgo");
      } else {
        // No sources available for follow-up — stop early
        break;
      }

      const roundLatencyMs = Date.now() - roundStart;
      const roundNum = budget.getRoundsUsed();

      // Merge follow-up Tavily results into the existing tavily result set
      // so entity extraction will incorporate the additional data
      if (followUpSource === "tavily" && !followUpResult.error) {
        const existing =
          (results.tavilySearch as Record<string, unknown>) ?? {};
        const existingItems =
          (existing.results as Array<Record<string, unknown>>) ?? [];
        const newItems =
          (followUpResult.results as Array<Record<string, unknown>>) ?? [];
        // Append new items to existing tavily results (de-dup by URL)
        const existingUrls = new Set(existingItems.map((r) => r.url as string));
        const uniqueNew = newItems.filter(
          (r) => !existingUrls.has(r.url as string)
        );
        results.tavilySearch = {
          ...existing,
          results: [...existingItems, ...uniqueNew],
        };

        // Build evidence nodes for new Tavily items
        for (let i = 0; i < uniqueNew.length; i++) {
          const item = uniqueNew[i];
          if (
            item?.url &&
            typeof item.url === "string" &&
            item.url.startsWith("http")
          ) {
            const slug = toSlug(
              (item.title as string) ?? `tavily_followup_${roundNum}_${i}`
            );
            evidenceNodes.push({
              uid: `evidence:tavily_followup_${slug}_r${roundNum}_${i}`,
              kind: "major_media",
              title: (item.title as string) ?? `Tavily follow-up ${i + 1}`,
              publisher: new URL(item.url).hostname.replace(/^www\./, ""),
              date: todayDate(),
              url: item.url,
              retrieved_at: nowIso(),
              reliability:
                typeof item.score === "number" ? Math.min(item.score, 1) : 0.6,
            });
          }
        }
      } else if (followUpSource === "duckduckgo" && !followUpResult.error) {
        // Append DDG follow-up results to webSearch
        const existing = (results.webSearch as Record<string, unknown>) ?? {};
        const existingItems =
          (existing.results as Array<Record<string, unknown>>) ?? [];
        const newItems =
          (followUpResult.results as Array<Record<string, unknown>>) ?? [];
        const existingUrls = new Set(existingItems.map((r) => r.url as string));
        const uniqueNew = newItems.filter(
          (r) => !existingUrls.has(r.url as string)
        );
        results.webSearch = {
          ...existing,
          results: [...existingItems, ...uniqueNew],
        };

        // Build evidence nodes for new DDG items
        for (let i = 0; i < Math.min(uniqueNew.length, 2); i++) {
          const item = uniqueNew[i];
          if (
            item?.url &&
            typeof item.url === "string" &&
            item.url.startsWith("http")
          ) {
            const slug = toSlug(
              (item.title as string) ?? `web_followup_${roundNum}_${i}`
            );
            evidenceNodes.push({
              uid: `evidence:web_followup_${slug}_r${roundNum}_${i}`,
              kind: "major_media",
              title: (item.title as string) ?? `Web follow-up ${i + 1}`,
              publisher: new URL(item.url).hostname.replace(/^www\./, ""),
              date: todayDate(),
              url: item.url,
              retrieved_at: nowIso(),
              reliability: 0.5,
            });
          }
        }
      }

      additionalRoundResults.push({
        round: roundNum,
        query: `${query} ${followUpQuery}`,
        source: followUpSource,
        latencyMs: roundLatencyMs,
        error: followUpResult.error ?? null,
      });

      // Langfuse span: follow-up round
      trace?.span({
        name: `adaptive_round_${roundNum}`,
        startTime: new Date(roundStart),
        endTime: new Date(roundStart + roundLatencyMs),
        metadata: {
          depth,
          round: roundNum,
          followUpQuery: `${query} ${followUpQuery}`,
          source: followUpSource,
          latencyMs: roundLatencyMs,
          success: !followUpResult.error,
          roundsUsed: budget.getRoundsUsed(),
          sourcesQueried: budget.getSourcesQueried(),
          budgetExhausted: budget.isExhausted(),
        },
      });
    }

    results._adaptiveRounds = additionalRoundResults;
    results._budgetUsed = {
      roundsUsed: budget.getRoundsUsed(),
      sourcesQueried: budget.getSourcesQueried(),
      exhausted: budget.isExhausted(),
    };
  } else {
    results._adaptiveRounds = [];
    results._budgetUsed = {
      roundsUsed: budget.getRoundsUsed(),
      sourcesQueried: budget.getSourcesQueried(),
      exhausted: budget.isExhausted(),
    };
  }

  // ── Step 4: Extract entities from Wikipedia text ────────────────────
  if (config.anthropicApiKey && wiki.text) {
    const extraction = await extractEntities(
      wiki.text as string,
      entityType ? [entityType] : undefined,
      query,
      config.anthropicApiKey
    );
    results.extraction = extraction;

    // Step 5: Build entity citations mapping entities to evidence sources
    if (
      extraction &&
      typeof extraction === "object" &&
      "entities" in extraction
    ) {
      const extractedEntities = (extraction as Record<string, unknown>)
        .entities as Array<Record<string, unknown>>;

      if (Array.isArray(extractedEntities)) {
        for (const entity of extractedEntities) {
          const entityUid = entity.uid as string;
          if (!entityUid) continue;

          const citations: Array<Record<string, unknown>> = [];

          // Cite Wikipedia as source for every extracted entity
          if (results._wikiEvidenceUid && wiki.url) {
            citations.push({
              claimText: `Entity "${entity.name}" extracted from Wikipedia article on "${query}"`,
              sourceUrl: wiki.url as string,
              excerpt: (wiki.text as string).slice(0, 200),
              confidence: 0.7,
              sourceTitle: (wiki.title as string) ?? `Wikipedia: ${query}`,
            });
          }

          // Cite Tavily results that mention the entity name
          if (entity.name && typeof entity.name === "string") {
            const entityNameLower = (entity.name as string).toLowerCase();
            for (let i = 0; i < tavilyResults.length; i++) {
              const item = tavilyResults[i];
              const content = ((item.content as string) ?? "").toLowerCase();
              if (content.includes(entityNameLower) && item.url) {
                citations.push({
                  claimText: `Entity "${entity.name}" mentioned in Tavily search result`,
                  sourceUrl: item.url as string,
                  excerpt: (item.content as string)?.slice(0, 200) ?? "",
                  confidence:
                    typeof item.score === "number"
                      ? Math.min(item.score, 1)
                      : 0.6,
                  sourceTitle: (item.title as string) ?? "",
                });
              }
            }
          }

          if (citations.length > 0) {
            entityCitations[entityUid] = citations;
          }
        }
      }

      results.bundle = {
        evidence: evidenceNodes,
        entities: extractedEntities ?? [],
        relationships:
          (extraction as Record<string, unknown>).relationships ?? [],
        entityCitations,
      };

      const validation = validateBundle(
        results.bundle as Record<string, unknown>
      );
      results.validation = validation;

      // Step 6: Persist bundle if requested and validation passed
      if (persist && (validation as Record<string, unknown>).valid === true) {
        try {
          const ingestResult = await ingestBundle(
            results.bundle as Record<string, unknown>
          );
          results.persistence = ingestResult;
        } catch (err) {
          results.persistence = {
            error:
              err instanceof Error
                ? err.message
                : "Unknown error during persistence",
          };
        }
      }
    }
  }

  // Always include evidence and entityCitations in results
  results.evidence = evidenceNodes;
  results.entityCitations = entityCitations;
  results._pipelineLatencyMs = Date.now() - pipelineStart;

  // Finalise Langfuse trace
  trace?.update({
    output: {
      evidenceCount: evidenceNodes.length,
      pipelineLatencyMs: results._pipelineLatencyMs,
    },
  });

  return results;
}

// ─── Graph Search ───────────────────────────────────────────────────

async function graphSearch(
  query: string,
  entityTypes?: string[],
  limit: number = 10
): Promise<unknown> {
  const rabbitHoleUrl = process.env.RABBIT_HOLE_URL || "http://localhost:3000";

  const body: Record<string, unknown> = { searchQuery: query, limit };
  if (entityTypes?.length) body.entityTypes = entityTypes;

  const res = await fetch(`${rabbitHoleUrl}/api/entity-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { error: `Search API error: ${res.status} ${res.statusText}` };
  }

  const data = (await res.json()) as {
    success: boolean;
    data?: {
      results?: Array<{
        entity: { uid: string; name: string; type: string };
        similarity: number;
        matchReasons: string[];
      }>;
      totalResults?: number;
      searchTime?: number;
    };
    error?: string;
  };

  if (!data.success) {
    return { error: data.error ?? "Search failed" };
  }

  return {
    query,
    totalResults: data.data?.totalResults ?? 0,
    searchTime: data.data?.searchTime,
    results:
      data.data?.results?.map((r) => ({
        uid: r.entity.uid,
        name: r.entity.name,
        type: r.entity.type,
        score: r.similarity,
        matchReasons: r.matchReasons,
      })) ?? [],
  };
}

// ─── Knowledge Freshness ────────────────────────────────────────────

async function checkKnowledgeFreshness(
  topic: string,
  maxAgeDays = 7
): Promise<unknown> {
  const graphitiUrl = process.env.GRAPHITI_URL;
  if (!graphitiUrl) {
    return {
      fresh: false,
      reason:
        "Graphiti not configured — set GRAPHITI_URL to enable freshness checks",
      lastResearched: null,
      ageDays: null,
      factCount: 0,
    };
  }

  const prefix = process.env.GRAPHITI_GROUP_PREFIX ?? "rh-research";
  const hash = (await import("node:crypto"))
    .createHash("sha256")
    .update(topic.toLowerCase().trim())
    .digest("hex")
    .slice(0, 16);
  const groupId = `${prefix}:${hash}`;

  let facts: Array<{
    created_at: string;
    invalid_at?: string | null;
    expired_at?: string | null;
  }> = [];
  try {
    const res = await fetch(`${graphitiUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: topic,
        group_ids: [groupId],
        max_facts: 20,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      const data = (await res.json()) as { facts?: typeof facts };
      facts = data.facts ?? [];
    }
  } catch {
    return {
      fresh: false,
      reason: "Graphiti unreachable",
      lastResearched: null,
      ageDays: null,
      factCount: 0,
    };
  }

  if (facts.length === 0) {
    return {
      fresh: false,
      reason: "No facts found",
      lastResearched: null,
      ageDays: null,
      factCount: 0,
    };
  }

  const now = Date.now();
  const active = facts.filter((f) => {
    if (f.invalid_at && new Date(f.invalid_at).getTime() <= now) return false;
    if (f.expired_at && new Date(f.expired_at).getTime() <= now) return false;
    return true;
  });

  if (active.length === 0) {
    return {
      fresh: false,
      reason: "All facts are expired or invalidated",
      lastResearched: null,
      ageDays: null,
      factCount: 0,
    };
  }

  const latest = active.reduce(
    (max, f) => (f.created_at > max ? f.created_at : max),
    active[0]!.created_at
  );
  const ageDays = (now - new Date(latest).getTime()) / 86_400_000;

  return {
    fresh: ageDays <= maxAgeDays,
    lastResearched: latest,
    ageDays: Math.round(ageDays * 10) / 10,
    factCount: active.length,
    ...(ageDays > maxAgeDays
      ? {
          reason: `Knowledge is ${Math.round(ageDays)} days old (max: ${maxAgeDays})`,
        }
      : {}),
  };
}

// ─── Bundle Ingest ──────────────────────────────────────────────────

async function ingestBundle(
  bundle: Record<string, unknown> | string
): Promise<unknown> {
  const rabbitHoleUrl = process.env.RABBIT_HOLE_URL || "http://localhost:3000";

  // The MCP SDK may pass the bundle as a pre-serialized JSON string.
  // Parse it back to an object so we can sanitize and re-serialize cleanly.
  let parsed: Record<string, unknown>;
  if (typeof bundle === "string") {
    try {
      parsed = JSON.parse(bundle) as Record<string, unknown>;
    } catch {
      return { error: "Invalid bundle: failed to parse JSON string" };
    }
  } else {
    parsed = { ...bundle };
  }

  // Strip entityCitations/relationshipCitations if they contain plain string
  // arrays (evidence UIDs) instead of SourceGrounding objects — the API schema
  // expects { claimText, sourceUrl, excerpt, confidence } objects.
  for (const key of ["entityCitations", "relationshipCitations"] as const) {
    const citations = parsed[key];
    if (citations && typeof citations === "object") {
      const values = Object.values(citations as Record<string, unknown>);
      const firstArr = values.find((v) => Array.isArray(v)) as
        | unknown[]
        | undefined;
      if (firstArr && firstArr.length > 0 && typeof firstArr[0] === "string") {
        delete parsed[key];
      }
    }
  }

  const res = await fetch(`${rabbitHoleUrl}/api/ingest-bundle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });

  if (!res.ok) {
    // Read the response body for detailed validation errors
    let detail = "";
    try {
      const body = (await res.json()) as Record<string, unknown>;
      detail = (body.error as string) || JSON.stringify(body);
    } catch {
      detail = res.statusText;
    }
    return {
      error: `Ingest bundle API error: ${res.status} — ${detail}`,
    };
  }

  const data = (await res.json()) as {
    success: boolean;
    data?: {
      summary?: {
        evidenceCreated?: number;
        evidenceKept?: number;
        filesCreated?: number;
        filesKept?: number;
        contentCreated?: number;
        contentKept?: number;
        entitiesCreated?: number;
        entitiesKept?: number;
        relationshipsCreated?: number;
        relationshipsKept?: number;
      };
      timing?: Record<string, unknown>;
    };
    error?: string;
  };

  if (!data.success) {
    return { error: data.error ?? "Bundle ingest failed" };
  }

  return {
    success: true,
    summary: data.data?.summary,
    timing: data.data?.timing,
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
