/**
 * Search API — Streaming search engine endpoint
 *
 * Pipeline:
 * 1. Graph search (instant, Neo4j full-text)
 * 2. Classify: is graph sufficient or do we need web research?
 * 3. Web research (Tavily + Wikipedia) if needed
 * 4. Stream AI answer citing all sources
 * 5. Generate follow-up suggestions
 */

import { NextRequest } from "next/server";
import { z } from "zod";

import { getGlobalNeo4jClient } from "@proto/database";
import { getModel } from "@proto/llm-providers/server";
import { safeValidate } from "@proto/types";
import { createNeo4jClientWithIntegerConversion } from "@proto/utils";

const RABBIT_HOLE_URL = process.env.RABBIT_HOLE_URL || "http://localhost:3000";

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
  files: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
        mediaType: z.string(),
        base64: z.string(),
      })
    )
    .optional(),
});

// ─── SSE Helpers ────────────────────────────────────────────────────

function sseEvent(
  type: string,
  data: unknown,
  controller: ReadableStreamDefaultController
) {
  const encoder = new TextEncoder();
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
  );
}

// ─── Lucene Query Builder ───────────────────────────────────────────

function buildLuceneQuery(rawQuery: string): string {
  const escaped = rawQuery
    .trim()
    .replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  if (!escaped) return escaped;
  const parts = escaped.split(/\s+/);
  parts[parts.length - 1] = parts[parts.length - 1] + "*";
  return parts.join(" ");
}

// ─── Graph Search ───────────────────────────────────────────────────

async function searchGraph(query: string) {
  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);
  const ftQuery = buildLuceneQuery(query);

  const result = await client.executeRead(
    `
    CALL db.index.fulltext.queryNodes('idx_entity_name_fulltext', $ftQuery)
    YIELD node AS e, score
    WHERE e.uid IS NOT NULL AND e.name IS NOT NULL
    WITH e, score
    OPTIONAL MATCH (e)-[r]-(connected)
    WHERE connected.name IS NOT NULL
    WITH e, score,
         count(r) as relCount,
         collect(DISTINCT {
           name: connected.name,
           type: labels(connected)[0],
           relationship: type(r)
         })[0..5] as connections
    RETURN
      e.uid as uid, e.name as name, labels(e)[0] as type,
      COALESCE(e.tags, []) as tags, COALESCE(e.aliases, []) as aliases,
      score, relCount, connections
    ORDER BY score DESC, e.name ASC
    LIMIT $limit
    `,
    { ftQuery, limit: 10 }
  );

  return result.records.map((r: any) => ({
    uid: r.get("uid"),
    name: r.get("name"),
    type: r.get("type"),
    tags: r.get("tags"),
    aliases: r.get("aliases"),
    score: r.get("score"),
    relationshipCount: r.get("relCount"),
    connectedEntities: r.get("connections"),
  }));
}

// ─── Evidence Fetch ─────────────────────────────────────────────────

async function fetchEvidence(entityUids: string[]) {
  if (entityUids.length === 0) return [];
  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);

  const result = await client.executeRead(
    `
    UNWIND $uids AS entityUid
    MATCH (e {uid: entityUid})-[:EVIDENCES|CITES|REFERENCES*1..2]-(ev:Evidence)
    WHERE ev.uid IS NOT NULL
    RETURN DISTINCT
      ev.uid as uid,
      ev.title as title,
      COALESCE(ev.kind, 'unknown') as kind,
      ev.publisher as publisher,
      ev.url as url,
      ev.date as date,
      COALESCE(ev.reliability, 0.5) as reliability,
      collect(DISTINCT e.name)[0..3] as relatedEntities
    ORDER BY ev.reliability DESC
    LIMIT 10
    `,
    { uids: entityUids }
  );

  return result.records.map((r: any) => ({
    uid: r.get("uid"),
    title: r.get("title"),
    kind: r.get("kind"),
    publisher: r.get("publisher"),
    url: r.get("url"),
    date: r.get("date"),
    reliability: r.get("reliability"),
    relatedEntities: r.get("relatedEntities"),
  }));
}

// ─── Web Search (Tavily) ───────────────────────────────────────────

async function searchTavily(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 6,
      search_depth: "advanced",
      include_answer: false,
    }),
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: Array<{
      title: string;
      url: string;
      content: string;
      score: number;
    }>;
  };

  return (
    data.results?.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 300),
      score: r.score,
    })) ?? []
  );
}

// ─── Wikipedia Search ───────────────────────────────────────────────

async function searchWikipedia(query: string) {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=2`;
  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as {
    query?: { search?: Array<{ title: string; pageid: number }> };
  };

  const results = searchData?.query?.search;
  if (!results?.length) return { articles: [], text: "" };

  const title = results[0].title;
  const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&format=json&utf8=1`;
  const contentRes = await fetch(contentUrl);
  const contentData = (await contentRes.json()) as {
    query?: { pages?: Record<string, { extract?: string; title?: string }> };
  };

  const page = Object.values(contentData?.query?.pages ?? {})[0];
  const text = page?.extract ?? "";

  return {
    articles: results.map((r) => ({
      title: r.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
    })),
    text: text.slice(0, 4000),
  };
}

// ─── File Processing via Job Processor ──────────────────────────────

const JOB_PROCESSOR_URL =
  process.env.JOB_PROCESSOR_URL || "http://localhost:8680";

async function processFiles(
  files: Array<{
    name: string;
    size: number;
    mediaType: string;
    base64: string;
  }>,
  controller: ReadableStreamDefaultController
): Promise<string> {
  if (files.length === 0) return "";

  sseEvent(
    "research_step",
    {
      step: "processing_files",
      message: `Processing ${files.length} file(s)...`,
    },
    controller
  );

  let extractedText = "";

  for (const file of files) {
    const jobId = `search-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      // Submit to job processor
      const submitRes = await fetch(`${JOB_PROCESSOR_URL}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          request: {
            source: {
              type: "file",
              bufferBase64: file.base64,
              mediaType: file.mediaType,
              fileName: file.name,
            },
          },
        }),
      });

      if (!submitRes.ok) {
        sseEvent(
          "research_step",
          { step: "file_error", message: `Failed to process ${file.name}` },
          controller
        );
        continue;
      }

      // Poll for completion (max 30s)
      const maxWait = 30000;
      const pollInterval = 1000;
      const start = Date.now();

      while (Date.now() - start < maxWait) {
        await new Promise((r) => setTimeout(r, pollInterval));
        const statusRes = await fetch(
          `${JOB_PROCESSOR_URL}/ingest/${jobId}/status`
        );
        if (!statusRes.ok) continue;

        const status = (await statusRes.json()) as {
          status: string;
          result?: { text: string };
          error?: string;
        };

        if (status.status === "completed" && status.result?.text) {
          extractedText += `\n\n## File: ${file.name}\n\n${status.result.text.slice(0, 8000)}`;
          sseEvent(
            "research_step",
            {
              step: "file_processed",
              message: `Extracted text from ${file.name}`,
            },
            controller
          );
          break;
        }

        if (status.status === "failed") {
          sseEvent(
            "research_step",
            {
              step: "file_error",
              message: `Failed: ${file.name} — ${status.error || "unknown error"}`,
            },
            controller
          );
          break;
        }
      }
    } catch {
      sseEvent(
        "research_step",
        { step: "file_error", message: `Error processing ${file.name}` },
        controller
      );
    }
  }

  return extractedText;
}

// ─── Auto-Ingest Research into Graph ────────────────────────────────

const EXTRACTION_PROMPT = `Extract entities and relationships from this text.

Return ONLY valid JSON:
{
  "entities": [{"uid": "{type}:{snake_name}", "name": "...", "type": "Person|Organization|Technology|Concept|Event|Publication", "properties": {}, "tags": [], "aliases": []}],
  "relationships": [{"uid": "rel:{src}_{type}_{tgt}", "type": "RELATED_TO|AUTHORED|FOUNDED|WORKS_AT|PART_OF", "source": "entity_uid", "target": "entity_uid", "properties": {}}]
}

Rules:
- Entity UIDs: {type_prefix}:{snake_case_name} (e.g. person:elon_musk, org:spacex)
- Relationship UIDs: rel:{source}_{type}_{target}
- Extract 5-15 entities and their relationships
- Only include entities clearly mentioned in the text`;

async function extractAndIngest(
  query: string,
  wikiText: string,
  webSources: any[],
  controller: ReadableStreamDefaultController
) {
  if (!wikiText && webSources.length === 0) return;

  sseEvent(
    "research_step",
    {
      step: "ingesting",
      message: "Extracting entities to enrich the knowledge graph...",
    },
    controller
  );

  let corpus = "";
  if (wikiText) corpus += wikiText + "\n\n";
  for (const s of webSources.slice(0, 3)) {
    if (s.snippet) corpus += `${s.title}: ${s.snippet}\n\n`;
  }
  if (!corpus.trim()) return;

  try {
    const model = getModel("fast");
    const result = await model.invoke([
      ["system", EXTRACTION_PROMPT],
      ["human", `Topic: "${query}"\n\nText:\n${corpus.slice(0, 6000)}`],
    ]);

    const raw =
      typeof result.content === "string"
        ? result.content
        : Array.isArray(result.content)
          ? result.content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("")
          : "";

    let parsed: any;
    try {
      let jsonStr = raw.trim();
      const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) jsonStr = fence[1].trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return;
    }

    if (!parsed?.entities?.length || !Array.isArray(parsed.entities)) return;

    const evidenceUid = `evidence:search_${Date.now()}`;
    const bundle = {
      entities: parsed.entities,
      relationships: parsed.relationships ?? [],
      evidence: [
        {
          uid: evidenceUid,
          kind: "research",
          title: `Search: ${query}`,
          publisher: "Rabbit Hole Search",
          date: new Date().toISOString().slice(0, 10),
          reliability: 0.6,
          notes: `Auto-extracted from search for "${query}"`,
        },
      ],
    };

    fetch(`${RABBIT_HOLE_URL}/api/ingest-bundle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
    }).catch(() => {});

    sseEvent(
      "research_step",
      {
        step: "ingested",
        message: `Added ${parsed.entities.length} entities to the knowledge graph`,
      },
      controller
    );
  } catch {
    // Extraction failed — non-critical
  }
}

// ─── Answer Generation ──────────────────────────────────────────────

function buildAnswerPrompt(
  query: string,
  graphEntities: any[],
  webSources: any[],
  wikiText: string
) {
  let context = "";

  if (graphEntities.length > 0) {
    context += "## Knowledge Graph Entities\n\n";
    for (const e of graphEntities) {
      context += `- **${e.name}** (${e.type})`;
      if (e.tags?.length) context += ` — tags: ${e.tags.join(", ")}`;
      if (e.aliases?.length) context += ` — aliases: ${e.aliases.join(", ")}`;
      context += "\n";
    }
    context += "\n";
  }

  if (wikiText) {
    context += "## Wikipedia\n\n" + wikiText + "\n\n";
  }

  if (webSources.length > 0) {
    context += "## Web Sources\n\n";
    for (let i = 0; i < webSources.length; i++) {
      context += `[${i + 1}] ${webSources[i].title}\n${webSources[i].snippet}\n\n`;
    }
  }

  return context;
}

const SYSTEM_PROMPT = `You are Rabbit Hole, an AI search engine powered by a living knowledge graph. You provide accurate, well-sourced answers.

Rules:
- Answer the user's question directly and concisely
- Cite sources using [1], [2], etc. when referencing web sources
- Mention knowledge graph entities by name when relevant
- Use markdown formatting for readability
- If the knowledge graph has relevant entities, highlight the connections between them
- If information is uncertain, say so
- Keep answers focused — typically 2-4 paragraphs unless the topic demands more`;

// ─── Route Handler ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = safeValidate(SearchRequestSchema, body);
  if (!validation.success) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { query, history, files } = validation.data;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ─── Phase 1: Graph Search (instant) ─────────────────────
        let graphEntities: any[] = [];
        try {
          graphEntities = await searchGraph(query);
          sseEvent(
            "graph_results",
            {
              entities: graphEntities,
              searchTime: Date.now(),
            },
            controller
          );
        } catch {
          // Graph search failed — continue without it
          sseEvent(
            "graph_results",
            { entities: [], searchTime: 0 },
            controller
          );
        }

        // ─── Phase 1b: Fetch Evidence ──────────────────────────
        try {
          const entityUids = graphEntities.map((e: any) => e.uid);
          const evidence = await fetchEvidence(entityUids);
          if (evidence.length > 0) {
            sseEvent("evidence", evidence, controller);
          }
        } catch {
          // Evidence fetch is optional
        }

        // ─── Phase 2: Classify — need web research? ─────────────
        const needsWebResearch = graphEntities.length < 3;

        let webSources: any[] = [];
        let wikiText = "";
        let wikiArticles: any[] = [];

        if (needsWebResearch) {
          // ─── Phase 3: Web Research ─────────────────────────────
          sseEvent("research_start", { query }, controller);

          // Tavily search
          sseEvent(
            "research_step",
            {
              step: "searching_web",
              message: "Searching the web...",
            },
            controller
          );

          const [tavilyResults, wikiResults] = await Promise.all([
            searchTavily(query),
            searchWikipedia(query),
          ]);

          webSources = tavilyResults;
          wikiText = wikiResults.text;
          wikiArticles = wikiResults.articles;

          sseEvent(
            "research_step",
            {
              step: "sources_found",
              message: `Found ${webSources.length} web sources and ${wikiArticles.length} Wikipedia articles`,
            },
            controller
          );

          // Emit sources
          const allSources = [
            ...wikiArticles.map((a) => ({
              title: a.title,
              url: a.url,
              type: "wikipedia" as const,
            })),
            ...webSources.map((s) => ({
              title: s.title,
              url: s.url,
              type: "web" as const,
            })),
          ];
          sseEvent("sources", allSources, controller);
        }

        // ─── Phase 3c: Process Attached Files ─────────────────────
        let fileText = "";
        if (files?.length) {
          fileText = await processFiles(files, controller);
        }

        // ─── Phase 4: Stream AI Answer ───────────────────────────
        sseEvent("answer_start", null, controller);

        let context = buildAnswerPrompt(
          query,
          graphEntities,
          webSources,
          wikiText
        );
        if (fileText) {
          context += "\n## Attached Files\n" + fileText + "\n";
        }

        const userMessage = context
          ? `Question: ${query}\n\n---\n\nContext:\n${context}`
          : `Question: ${query}`;

        try {
          const model = getModel("smart");

          // Build message array with conversation history
          const llmMessages: Array<[string, string]> = [
            ["system", SYSTEM_PROMPT],
          ];
          if (history?.length) {
            for (const h of history.slice(-6)) {
              llmMessages.push([h.role === "user" ? "human" : "ai", h.content]);
            }
          }
          llmMessages.push(["human", userMessage]);

          const answerStream = await model.stream(llmMessages);

          for await (const chunk of answerStream) {
            const text =
              typeof chunk.content === "string"
                ? chunk.content
                : Array.isArray(chunk.content)
                  ? chunk.content
                      .filter((c: any) => c.type === "text")
                      .map((c: any) => c.text)
                      .join("")
                  : "";
            if (text) {
              sseEvent("answer_delta", { text }, controller);
            }
          }
        } catch (llmError) {
          // If LLM fails, provide a fallback
          const fallback =
            graphEntities.length > 0
              ? `Found ${graphEntities.length} entities in the knowledge graph: ${graphEntities.map((e) => `**${e.name}** (${e.type})`).join(", ")}.`
              : "I couldn't generate an answer at this time. Please try again.";
          sseEvent("answer_delta", { text: fallback }, controller);
        }

        sseEvent("answer_done", null, controller);

        // ─── Phase 5: Follow-up Suggestions ──────────────────────
        try {
          const suggestModel = getModel("fast");
          const suggestResult = await suggestModel.invoke([
            [
              "system",
              "Generate 3 follow-up search queries based on the user's question. Return ONLY a JSON array of 3 strings, no other text.",
            ],
            ["human", query],
          ]);
          const suggestText =
            typeof suggestResult.content === "string"
              ? suggestResult.content
              : "";
          const jsonMatch = suggestText.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            const suggestions = JSON.parse(jsonMatch[0]) as string[];
            sseEvent("suggestions", suggestions.slice(0, 3), controller);
          }
        } catch {
          // Suggestions are optional — ignore failures
        }

        sseEvent("done", null, controller);
      } catch (error) {
        sseEvent(
          "error",
          {
            message: error instanceof Error ? error.message : "Search failed",
          },
          controller
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
