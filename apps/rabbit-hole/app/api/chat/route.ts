/**
 * Chat API — AI SDK v6 Agentic Search Endpoint
 *
 * Uses streamText with tools for multi-step search:
 * - searchGraph: Neo4j full-text search
 * - searchWeb: Tavily advanced search
 * - searchWikipedia: Wikipedia article fetch
 * - ingestEntities: Extract + ingest entities into the knowledge graph
 *
 * The LLM decides which tools to call and in what order.
 * Results stream as UIMessage parts (text, tool calls, data).
 */

import {
  streamText,
  tool,
  convertToModelMessages,
  generateText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { getGlobalNeo4jClient } from "@proto/database";
import { getAIModel } from "@proto/llm-providers/server";
import { createNeo4jClientWithIntegerConversion } from "@proto/utils";

// ─── Tool Implementations ───────────────────────────────────────────

function buildLuceneQuery(rawQuery: string): string {
  const escaped = rawQuery
    .trim()
    .replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  if (!escaped) return escaped;
  const parts = escaped.split(/\s+/);
  parts[parts.length - 1] = parts[parts.length - 1] + "*";
  return parts.join(" ");
}

async function doSearchGraph(query: string) {
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
    LIMIT 10
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

async function doSearchWeb(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { results: [], note: "TAVILY_API_KEY not set" };

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
  if (!res.ok) return { results: [], note: `Tavily error: ${res.status}` };

  const data = (await res.json()) as {
    results?: Array<{
      title: string;
      url: string;
      content: string;
      score: number;
    }>;
  };

  return {
    results:
      data.results?.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 400),
        score: r.score,
      })) ?? [],
  };
}

async function doSearchWikipedia(query: string) {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=2`;
  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as {
    query?: { search?: Array<{ title: string }> };
  };

  const results = searchData?.query?.search;
  if (!results?.length) return { title: null, text: "", url: null };

  const title = results[0].title;
  const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&format=json&utf8=1`;
  const contentRes = await fetch(contentUrl);
  const contentData = (await contentRes.json()) as {
    query?: { pages?: Record<string, { extract?: string }> };
  };

  const page = Object.values(contentData?.query?.pages ?? {})[0];
  const text = page?.extract ?? "";

  return {
    title,
    text: text.slice(0, 4000),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

async function doIngestEntities(query: string, context: string) {
  const rabbitHoleUrl = process.env.RABBIT_HOLE_URL || "http://localhost:3000";

  // Use fast model for extraction
  const model = getAIModel("fast");
  const result = await generateText({
    model,
    prompt: `Extract entities and relationships from this text about "${query}".

Return ONLY valid JSON:
{
  "entities": [{"uid": "{type}:{snake_name}", "name": "...", "type": "Person|Organization|Technology|Concept|Event|Publication", "properties": {}, "tags": [], "aliases": []}],
  "relationships": [{"uid": "rel:{src}_{type}_{tgt}", "type": "RELATED_TO|AUTHORED|FOUNDED|WORKS_AT|PART_OF", "source": "entity_uid", "target": "entity_uid", "properties": {}}]
}

Text:\n${context.slice(0, 6000)}`,
  });

  const raw = result.text ?? "";
  let parsed: any;
  try {
    let jsonStr = raw.trim();
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    return { success: false, error: "Failed to parse extraction result" };
  }

  if (!parsed?.entities?.length) {
    return { success: false, error: "No entities extracted" };
  }

  const bundle = {
    entities: parsed.entities,
    relationships: parsed.relationships ?? [],
    evidence: [
      {
        uid: `evidence:search_${Date.now()}`,
        kind: "research",
        title: `Search: ${query}`,
        publisher: "Rabbit Hole Search",
        date: new Date().toISOString().slice(0, 10),
        reliability: 0.6,
      },
    ],
  };

  // Fire-and-forget ingest
  fetch(`${rabbitHoleUrl}/api/ingest-bundle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bundle),
  }).catch(() => {});

  return {
    success: true,
    entitiesIngested: parsed.entities.length,
    relationshipsIngested: (parsed.relationships ?? []).length,
  };
}

// ─── Tool Definitions ───────────────────────────────────────────────

const searchTools = {
  searchGraph: tool({
    description:
      "Search the knowledge graph for existing entities by name, alias, or tag. Always call this first to check what we already know.",
    inputSchema: z.object({
      query: z.string().describe("Search query for the knowledge graph"),
    }),
    execute: async (input: { query: string }) => doSearchGraph(input.query),
  }),

  searchWeb: tool({
    description:
      "Search the web via Tavily for recent, high-quality results. Use when the knowledge graph doesn't have enough information.",
    inputSchema: z.object({
      query: z.string().describe("Web search query"),
    }),
    execute: async (input: { query: string }) => doSearchWeb(input.query),
  }),

  searchWikipedia: tool({
    description:
      "Fetch a Wikipedia article for foundational context on well-known topics, people, or organizations.",
    inputSchema: z.object({
      query: z.string().describe("Wikipedia search query"),
    }),
    execute: async (input: { query: string }) => doSearchWikipedia(input.query),
  }),

  ingestEntities: tool({
    description:
      "Extract entities and relationships from research text and add them to the knowledge graph. Call this after gathering information to grow the graph.",
    inputSchema: z.object({
      query: z.string().describe("The topic being researched"),
      context: z.string().describe("The text to extract entities from"),
    }),
    execute: async (input: { query: string; context: string }) =>
      doIngestEntities(input.query, input.context),
  }),
};

// ─── System Prompt ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Rabbit Hole, an AI search engine powered by a living knowledge graph. You answer questions by searching the graph and the web.

## Workflow
1. ALWAYS call searchGraph first to check existing knowledge
2. If the graph has good results (3+ entities), use them to answer
3. If the graph is thin, call searchWeb and/or searchWikipedia for more context
4. After gathering web research, call ingestEntities to grow the knowledge graph — pass it the topic and a concatenation of the text you found
5. Synthesize all findings into a clear, well-cited answer

## Answer Format
- Answer directly and concisely
- Cite web sources as [Source Title](url) when referencing them
- Mention knowledge graph entities by name when relevant
- Use markdown for readability
- If information is uncertain, say so
- End with 2-3 follow-up questions the user might want to explore`;

// ─── Route Handler ──────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json();
  const messages: UIMessage[] = body.messages ?? [];

  const model = getAIModel("smart");

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: searchTools,
    stopWhen: stepCountIs(5),
    onStepFinish: ({ toolCalls }) => {
      if (toolCalls?.length) {
        console.log(
          `[search-agent] Step: ${toolCalls.map((t: any) => t.toolName).join(", ")}`
        );
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
