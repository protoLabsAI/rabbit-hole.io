/**
 * Deep Research API — Agentic research pipeline
 *
 * POST /api/research/deep
 * Body: { query: string }
 * Returns: { researchId: string }
 *
 * Pipeline: SCOPE → RESEARCH (per dimension) → EVALUATE → [loop?] → SYNTHESIS (streamed)
 * Stream progress via GET /api/research/deep/:id (SSE)
 */

import { generateObject, streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAIModel } from "@proto/llm-providers/server";
import { safeValidate } from "@proto/types";

import {
  searchGraph,
  searchWeb,
  searchWikipedia,
  withRetry,
  type WebSearchResult,
  type WikiSearchResult,
} from "../../../lib/search";

import {
  createResearch,
  getResearch,
  addEvent,
  updateResearch,
  isAborted,
  type ResearchSource,
} from "./research-store";

const RequestSchema = z.object({
  query: z.string().min(2).max(500),
});

// ─── Abort Guard ──────────────────────────────────────────────────────

function checkAbort(researchId: string) {
  if (isAborted(researchId)) {
    throw new Error("CANCELLED");
  }
}

// ─── Research Pipeline ───────────────────────────────────────────────

async function runResearch(researchId: string, query: string) {
  const emit = (type: string, data: unknown) =>
    addEvent(researchId, type, data);

  const allSources: ResearchSource[] = [];
  const allNotes: string[] = [];
  const allFindings: string[] = [];
  let totalSearches = 0;

  const trackSearch = () => {
    totalSearches++;
    updateResearch(researchId, { searchCount: totalSearches });
    emit("counters.update", {
      searches: totalSearches,
      sources: allSources.length,
    });
  };

  try {
    // ── Phase 1: SCOPE — Structured output ───────────────────────
    emit("phase.started", { phase: "scope", label: "Planning research" });
    updateResearch(researchId, {
      phase: "scope",
      phaseDetail: "Writing research brief...",
    });

    checkAbort(researchId);

    const scopeModel = getAIModel("fast");
    const scopeResult = await generateObject({
      model: scopeModel,
      schema: z.object({
        brief: z
          .string()
          .describe("One paragraph overview of the research topic"),
        dimensions: z
          .array(z.string())
          .describe("3-6 specific research dimensions to investigate"),
      }),
      prompt: `You are planning a deep research investigation on: "${query}"

Write a research brief and identify 3-6 specific research dimensions to investigate.
Each dimension should be a focused sub-topic that, combined, gives comprehensive coverage.`,
    });

    const { dimensions, brief } = scopeResult.object;

    updateResearch(researchId, { dimensions, brief });
    emit("scope.completed", { dimensions, brief });
    emit("phase.completed", { phase: "scope" });

    // ── Phase 2: PLAN REVIEW — Show plan, continue automatically ─
    emit("phase.started", {
      phase: "plan-review",
      label: "Reviewing research plan",
    });
    updateResearch(researchId, {
      phase: "plan-review",
      phaseDetail: `${dimensions.length} dimensions planned`,
    });
    // Brief pause to let the UI show the plan
    await new Promise((r) => setTimeout(r, 1500));
    emit("phase.completed", { phase: "plan-review" });

    // ── Phase 3: RESEARCH LOOP (with agentic iteration) ──────────
    let iteration = 0;
    let dimensionsToResearch = [...dimensions];

    while (iteration < 3 && dimensionsToResearch.length > 0) {
      iteration++;
      updateResearch(researchId, { supervisorIteration: iteration });

      emit("phase.started", {
        phase: "research",
        label:
          iteration === 1 ? "Researching" : `Research iteration ${iteration}`,
      });
      updateResearch(researchId, {
        phase: "research",
        phaseDetail: `Iteration ${iteration}: ${dimensionsToResearch.length} dimensions`,
      });

      // Search knowledge graph first (only on first iteration)
      if (iteration === 1) {
        checkAbort(researchId);
        emit("search.started", { query, source: "graph" });
        try {
          const graphResults = await withRetry(() => searchGraph(query, 15));
          trackSearch();
          emit("search.completed", {
            query,
            source: "graph",
            resultCount: graphResults.length,
          });
          if (graphResults.length > 0) {
            const graphNote = `Knowledge graph entities: ${graphResults.map((e) => `${e.name} (${e.type})`).join(", ")}`;
            allNotes.push(graphNote);
            for (const e of graphResults) {
              allSources.push({
                title: e.name,
                url: `#entity:${e.uid}`,
                type: "graph",
              });
            }
            // Surface as a finding
            const finding = `Found ${graphResults.length} existing entities in the knowledge graph`;
            allFindings.push(finding);
            updateResearch(researchId, { findings: allFindings });
            emit("research.finding", { text: finding });
          }
        } catch {
          emit("search.completed", {
            query,
            source: "graph",
            resultCount: 0,
          });
        }
      }

      // Research each dimension
      for (let i = 0; i < Math.min(dimensionsToResearch.length, 6); i++) {
        const dimension = dimensionsToResearch[i];
        checkAbort(researchId);

        updateResearch(researchId, {
          phaseDetail: `Researching: ${dimension}`,
        });

        emit("research.dimension", {
          index: i,
          total: dimensionsToResearch.length,
          dimension,
          iteration,
        });

        // Web search with retry
        emit("search.started", { query: dimension, source: "web" });
        let webResults: WebSearchResult[] = [];
        try {
          webResults = await withRetry(() => searchWeb(dimension, 5));
        } catch {
          /* continue without web results */
        }
        trackSearch();
        emit("search.completed", {
          query: dimension,
          source: "web",
          resultCount: webResults.length,
        });

        for (const r of webResults) {
          allSources.push({
            title: r.title,
            url: r.url,
            type: "web",
            snippet: r.snippet,
          });
        }

        // Wikipedia with retry
        checkAbort(researchId);
        emit("search.started", { query: dimension, source: "wikipedia" });
        let wiki: WikiSearchResult | null = null;
        try {
          wiki = await withRetry(() => searchWikipedia(dimension));
        } catch {
          /* continue without wiki */
        }
        trackSearch();
        emit("search.completed", {
          query: dimension,
          source: "wikipedia",
          resultCount: wiki ? 1 : 0,
        });
        if (wiki) {
          allSources.push({
            title: wiki.title,
            url: wiki.url,
            type: "wikipedia",
            snippet: wiki.snippet,
          });
        }

        // Graph search per dimension (beyond first iteration)
        if (iteration > 1) {
          checkAbort(researchId);
          emit("search.started", { query: dimension, source: "graph" });
          try {
            const dimGraphResults = await withRetry(() =>
              searchGraph(dimension, 5)
            );
            trackSearch();
            emit("search.completed", {
              query: dimension,
              source: "graph",
              resultCount: dimGraphResults.length,
            });
            if (dimGraphResults.length > 0) {
              for (const e of dimGraphResults) {
                if (!allSources.find((s) => s.url === `#entity:${e.uid}`)) {
                  allSources.push({
                    title: e.name,
                    url: `#entity:${e.uid}`,
                    type: "graph",
                  });
                }
              }
            }
          } catch {
            /* continue */
          }
        }

        // Compress dimension findings
        const corpus = [
          wiki?.text ?? "",
          ...webResults.map((r) => `${r.title}: ${r.snippet ?? ""}`),
        ]
          .filter(Boolean)
          .join("\n\n");

        if (corpus) {
          checkAbort(researchId);
          emit("research.compressing", { dimension });
          try {
            const compressModel = getAIModel("fast");
            const compressed = await generateObject({
              model: compressModel,
              schema: z.object({
                summary: z.string().describe("Concise summary of key findings"),
                keyFinding: z
                  .string()
                  .describe("Single most important finding in one sentence"),
              }),
              prompt: `Summarize the key findings about "${dimension}" from the following research.
Be concise but include all important facts, names, dates, and relationships.
Also provide the single most important finding in one sentence.

${corpus.slice(0, 8000)}`,
            });

            allNotes.push(`## ${dimension}\n\n${compressed.object.summary}`);

            // Surface key finding
            allFindings.push(compressed.object.keyFinding);
            updateResearch(researchId, { findings: allFindings });
            emit("research.finding", { text: compressed.object.keyFinding });

            emit("research.compressed", {
              dimension,
              noteLength: compressed.object.summary.length,
            });
          } catch {
            // Fallback: store raw corpus excerpt
            allNotes.push(`## ${dimension}\n\n${corpus.slice(0, 2000)}`);
          }
        }

        updateResearch(researchId, {
          notes: allNotes,
          sources: allSources,
        });
      }

      emit("phase.completed", { phase: "research" });

      // ── EVALUATE — Should we research more? ────────────────────
      checkAbort(researchId);

      if (iteration < 3) {
        emit("phase.started", {
          phase: "evaluating",
          label: "Evaluating coverage",
        });
        updateResearch(researchId, {
          phase: "evaluating",
          phaseDetail: "Checking for gaps...",
        });

        try {
          const evalModel = getAIModel("fast");
          const evalResult = await generateObject({
            model: evalModel,
            schema: z.object({
              complete: z
                .boolean()
                .describe(
                  "Whether the research is comprehensive enough for a quality report"
                ),
              gaps: z
                .array(z.string())
                .describe(
                  "Specific topics or angles not yet covered, empty if complete"
                ),
            }),
            prompt: `You are evaluating research coverage on: "${query}"

Research brief: ${brief}

Planned dimensions: ${dimensions.join(", ")}

Research notes so far:
${allNotes.map((n) => n.slice(0, 500)).join("\n---\n")}

Sources found: ${allSources.length}

Is this research comprehensive enough for a quality, well-cited report?
If not, identify 1-3 specific gaps that should be investigated.
Be conservative — only flag genuine gaps, not minor tangents.`,
          });

          emit("phase.completed", { phase: "evaluating" });

          if (
            evalResult.object.complete ||
            evalResult.object.gaps.length === 0
          ) {
            emit("research.evaluation", {
              complete: true,
              iteration,
            });
            break; // Move to synthesis
          }

          // More research needed
          dimensionsToResearch = evalResult.object.gaps.slice(0, 3);
          emit("research.evaluation", {
            complete: false,
            gaps: dimensionsToResearch,
            iteration,
          });

          const finding = `Identified ${dimensionsToResearch.length} gap(s) — researching deeper`;
          allFindings.push(finding);
          updateResearch(researchId, { findings: allFindings });
          emit("research.finding", { text: finding });
        } catch {
          // If evaluation fails, just proceed to synthesis
          emit("phase.completed", { phase: "evaluating" });
          break;
        }
      }
    }

    // ── Phase 4: SYNTHESIS — Streamed with inline citations ──────
    checkAbort(researchId);

    emit("phase.started", { phase: "synthesis", label: "Writing report" });
    updateResearch(researchId, {
      phase: "synthesis",
      phaseDetail: "Generating report...",
    });

    // Build numbered source list for citations
    const uniqueSources = deduplicateSources(allSources);
    const sourceList = uniqueSources
      .map(
        (s, i) =>
          `[${i + 1}] ${s.title} (${s.type}) — ${s.url}${s.snippet ? `\n    "${s.snippet.slice(0, 200)}"` : ""}`
      )
      .join("\n");

    const reportModel = getAIModel("smart");
    const reportStream = streamText({
      model: reportModel,
      prompt: `You are writing a comprehensive research report on: "${query}"

Research brief: ${brief}

Accumulated research notes:
${allNotes.join("\n\n---\n\n")}

## Available Sources
${sourceList}

## Instructions
Write a well-structured, comprehensive research report with these sections:
1. **Executive Summary** — 2-3 paragraph overview
2. **Key Findings** — organized by theme with specific facts
3. **Detailed Analysis** — deep dive into the most important aspects
4. **Connections & Relationships** — how entities and concepts relate
5. **Conclusions** — implications and significance

## Citation Rules
- Use inline citations like [1], [2], etc. referring to the numbered sources above
- Cite specific claims — don't just cite generally
- Every major fact should have at least one citation
- Use multiple citations where evidence converges: [1][3]

## Format
- Use markdown with clear ## headings
- Be thorough but readable (aim for 1500-3000 words)
- End with 3-5 "Related Topics" as short search phrases (not questions)`,
    });

    // Stream report chunks as events
    let fullReport = "";
    const reportChunks: string[] = [];

    for await (const chunk of reportStream.textStream) {
      checkAbort(researchId);
      fullReport += chunk;
      reportChunks.push(chunk);
      updateResearch(researchId, { reportChunks });
      emit("report.chunk", { text: chunk });
    }

    emit("report.completed", { length: fullReport.length });
    emit("phase.completed", { phase: "synthesis" });

    // ── Complete ──────────────────────────────────────────────────
    updateResearch(researchId, {
      status: "completed",
      phase: "complete",
      phaseDetail: "Research complete",
      finalReport: fullReport,
      sources: uniqueSources,
      completedAt: Date.now(),
    });

    emit("research.completed", {
      reportLength: fullReport.length,
      sourcesCount: uniqueSources.length,
      notesCount: allNotes.length,
      findingsCount: allFindings.length,
      iterations: iteration,
      duration: Date.now() - (getResearchStartTime(researchId) ?? Date.now()),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "CANCELLED" || isAborted(researchId))
    ) {
      // Already handled by cancelResearch()
      return;
    }
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

function deduplicateSources(sources: ResearchSource[]): ResearchSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = s.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
