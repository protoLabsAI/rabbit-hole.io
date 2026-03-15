/**
 * Deep Research API — Start a long-running research job
 *
 * POST /api/research/deep
 * Body: { query: string }
 * Returns: { researchId: string }
 *
 * The research runs in the background. Stream progress via:
 * GET /api/research/deep/:id (SSE)
 * GET /api/research/deep/:id/status (polling)
 */

import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getGlobalNeo4jClient } from "@proto/database";
import { getAIModel } from "@proto/llm-providers/server";
import { safeValidate } from "@proto/types";
import { createNeo4jClientWithIntegerConversion } from "@proto/utils";

import {
  createResearch,
  getResearch,
  addEvent,
  updateResearch,
  type ResearchSource,
} from "./research-store";

const RequestSchema = z.object({
  query: z.string().min(2).max(500),
});

// ─── Tool Implementations (shared with /api/chat) ───────────────────

function buildLuceneQuery(rawQuery: string): string {
  const escaped = rawQuery
    .trim()
    .replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  if (!escaped) return escaped;
  const parts = escaped.split(/\s+/);
  parts[parts.length - 1] = parts[parts.length - 1] + "*";
  return parts.join(" ");
}

async function searchGraph(query: string) {
  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);
  const ftQuery = buildLuceneQuery(query);
  const result = await client.executeRead(
    `
    CALL db.index.fulltext.queryNodes('idx_entity_name_fulltext', $ftQuery)
    YIELD node AS e, score
    WHERE e.uid IS NOT NULL AND e.name IS NOT NULL
    RETURN e.uid as uid, e.name as name, labels(e)[0] as type, score
    ORDER BY score DESC LIMIT 15
    `,
    { ftQuery, limit: 15 }
  );
  return result.records.map((r: any) => ({
    uid: r.get("uid"),
    name: r.get("name"),
    type: r.get("type"),
    score: r.get("score"),
  }));
}

async function searchWeb(query: string): Promise<ResearchSource[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      search_depth: "advanced",
      include_answer: false,
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{ title: string; url: string; content: string }>;
  };
  return (
    data.results?.map((r) => ({
      title: r.title,
      url: r.url,
      type: "web" as const,
      snippet: r.content?.slice(0, 500),
    })) ?? []
  );
}

async function searchWikipedia(
  query: string
): Promise<{ text: string; source: ResearchSource | null }> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=1`;
  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as {
    query?: { search?: Array<{ title: string }> };
  };
  const results = searchData?.query?.search;
  if (!results?.length) return { text: "", source: null };

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
    text: text.slice(0, 5000),
    source: { title, url, type: "wikipedia", snippet: text.slice(0, 300) },
  };
}

// ─── Research Pipeline ──────────────────────────────────────────────

async function runResearch(researchId: string, query: string) {
  const emit = (type: string, data: unknown) =>
    addEvent(researchId, type, data);

  try {
    // ── Phase 1: SCOPE ──────────────────────────────────────────
    emit("phase.started", { phase: "scope", label: "Planning research" });
    updateResearch(researchId, {
      phase: "scope",
      phaseDetail: "Writing research brief...",
    });

    const scopeModel = getAIModel("fast");
    const scopeResult = await generateText({
      model: scopeModel,
      prompt: `You are planning a deep research investigation on: "${query}"

Write a research brief with 3-5 research dimensions to investigate.
Return as JSON: { "dimensions": ["dimension 1", "dimension 2", ...], "brief": "one paragraph overview" }`,
    });

    let dimensions: string[] = [];
    let brief = "";
    try {
      const parsed = JSON.parse(
        scopeResult.text.replace(/```json?\n?/g, "").replace(/```/g, "")
      );
      dimensions = parsed.dimensions ?? [];
      brief = parsed.brief ?? "";
    } catch {
      dimensions = [query];
      brief = `Research on ${query}`;
    }

    emit("scope.completed", { dimensions, brief });
    emit("phase.completed", { phase: "scope" });

    // ── Phase 2: RESEARCH LOOP ──────────────────────────────────
    emit("phase.started", { phase: "research", label: "Researching" });
    updateResearch(researchId, {
      phase: "research",
      phaseDetail: "Searching and analyzing...",
    });

    const allSources: ResearchSource[] = [];
    const allNotes: string[] = [];

    // Check existing knowledge first
    emit("search.started", { query, source: "graph" });
    const graphResults = await searchGraph(query);
    emit("search.completed", {
      query,
      source: "graph",
      resultCount: graphResults.length,
    });
    if (graphResults.length > 0) {
      allNotes.push(
        `Knowledge graph entities: ${graphResults.map((e) => `${e.name} (${e.type})`).join(", ")}`
      );
      for (const e of graphResults) {
        allSources.push({
          title: e.name,
          url: `#entity:${e.uid}`,
          type: "graph",
        });
      }
    }

    // Research each dimension
    for (let i = 0; i < Math.min(dimensions.length, 5); i++) {
      const dimension = dimensions[i];
      updateResearch(researchId, {
        supervisorIteration: i + 1,
        phaseDetail: `Researching: ${dimension}`,
      });

      emit("research.dimension", {
        index: i,
        total: dimensions.length,
        dimension,
      });

      // Web search
      emit("search.started", { query: dimension, source: "web" });
      const webResults = await searchWeb(dimension);
      emit("search.completed", {
        query: dimension,
        source: "web",
        resultCount: webResults.length,
      });
      allSources.push(...webResults);

      // Wikipedia
      emit("search.started", { query: dimension, source: "wikipedia" });
      const wiki = await searchWikipedia(dimension);
      emit("search.completed", {
        query: dimension,
        source: "wikipedia",
        resultCount: wiki.source ? 1 : 0,
      });
      if (wiki.source) allSources.push(wiki.source);

      // Compress this dimension's findings
      const corpus = [
        wiki.text,
        ...webResults.map((r) => `${r.title}: ${r.snippet ?? ""}`),
      ]
        .filter(Boolean)
        .join("\n\n");

      if (corpus) {
        emit("research.compressing", { dimension });
        const compressModel = getAIModel("fast");
        const compressed = await generateText({
          model: compressModel,
          prompt: `Summarize the key findings about "${dimension}" from the following research. Be concise but include all important facts, names, dates, and relationships.\n\n${corpus.slice(0, 8000)}`,
        });
        allNotes.push(`## ${dimension}\n\n${compressed.text}`);
        emit("research.compressed", {
          dimension,
          noteLength: compressed.text.length,
        });
      }

      updateResearch(researchId, { notes: allNotes, sources: allSources });
    }

    emit("phase.completed", { phase: "research" });

    // ── Phase 3: SYNTHESIS ──────────────────────────────────────
    emit("phase.started", { phase: "synthesis", label: "Writing report" });
    updateResearch(researchId, {
      phase: "synthesis",
      phaseDetail: "Generating final report...",
    });

    const reportModel = getAIModel("smart");
    const reportResult = await generateText({
      model: reportModel,
      prompt: `You are writing a comprehensive research report on: "${query}"

Research brief: ${brief}

Accumulated research notes:
${allNotes.join("\n\n---\n\n")}

Sources found: ${allSources.length}

Write a well-structured, comprehensive research report with:
1. Executive summary
2. Key findings organized by theme
3. Detailed analysis
4. Connections and relationships between entities
5. Conclusions and implications

Use markdown formatting. Cite sources where relevant.
End with 3-5 related search queries for further exploration.`,
    });

    const finalReport = reportResult.text;

    emit("report.completed", { length: finalReport.length });
    emit("phase.completed", { phase: "synthesis" });

    // ── Complete ────────────────────────────────────────────────
    updateResearch(researchId, {
      status: "completed",
      phase: "complete",
      phaseDetail: "Research complete",
      finalReport,
      completedAt: Date.now(),
    });

    emit("research.completed", {
      reportLength: finalReport.length,
      sourcesCount: allSources.length,
      notesCount: allNotes.length,
      duration: Date.now() - (getResearchStartTime(researchId) ?? Date.now()),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Research failed";
    updateResearch(researchId, {
      status: "failed",
      error: msg,
      phaseDetail: `Error: ${msg}`,
    });
    emit("research.error", { message: msg });
  }
}

function getResearchStartTime(id: string): number | null {
  const state = getResearch(id);
  return state?.startedAt ?? null;
}

// ─── Route Handler ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = safeValidate(RequestSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  const { query } = validation.data;
  const researchId = `research_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  createResearch(researchId, query);

  // Run research in background (don't await)
  runResearch(researchId, query).catch((err) => {
    console.error(`[deep-research] Fatal error for ${researchId}:`, err);
    updateResearch(researchId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Fatal error",
    });
  });

  return NextResponse.json({ success: true, researchId });
}
