/**
 * Tool Call Handler
 *
 * Routes MCP tool calls to actual implementations.
 * Tools call external services (job-processor, search APIs) directly.
 */

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

    case "research_entity":
      return await researchEntity(
        args.query as string,
        (args.depth as string) ?? "detailed",
        args.entityType as string | undefined,
        config,
        (args.persist as boolean) ?? true
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
  persist: boolean = true
): Promise<unknown> {
  const results: Record<string, unknown> = { query, depth };
  const evidenceNodes: Array<Record<string, unknown>> = [];
  const entityCitations: Record<string, Array<Record<string, unknown>>> = {};

  // Step 1: Search Wikipedia
  const wiki = (await wikipediaSearch(query)) as Record<string, unknown>;
  results.wikipedia = wiki;

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

  // Step 2: Web search for additional context
  const webResults = (await duckduckgoSearch(query)) as Record<string, unknown>;
  results.webSearch = webResults;

  // Build web search evidence nodes from DuckDuckGo results
  const webResultItems =
    (webResults?.results as Array<Record<string, unknown>>) ?? [];
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

  // Step 3: Tavily search if available
  let tavilyResults: Array<Record<string, unknown>> = [];
  if (config.tavilyApiKey) {
    const tavily = (await tavilySearch(
      query,
      5,
      config.tavilyApiKey
    )) as Record<string, unknown>;
    results.tavilySearch = tavily;

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
  }

  // Step 4: Extract entities from Wikipedia text
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

  return results;
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
