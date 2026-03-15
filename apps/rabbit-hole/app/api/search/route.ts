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

const SearchRequestSchema = z.object({
  query: z.string().min(2).max(200),
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
    RETURN
      e.uid as uid, e.name as name, labels(e)[0] as type,
      COALESCE(e.tags, []) as tags, COALESCE(e.aliases, []) as aliases,
      score
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

  const { query } = validation.data;

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

        // ─── Phase 4: Stream AI Answer ───────────────────────────
        sseEvent("answer_start", null, controller);

        const context = buildAnswerPrompt(
          query,
          graphEntities,
          webSources,
          wikiText
        );

        const userMessage = context
          ? `Question: ${query}\n\n---\n\nContext:\n${context}`
          : `Question: ${query}`;

        try {
          const model = getModel("smart");
          const answerStream = await model.stream([
            ["system", SYSTEM_PROMPT],
            ["human", userMessage],
          ]);

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
