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

import { generateObject, generateText, streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAIModel } from "@protolabsai/llm-providers/server";
import {
  createTracingContext,
  type TracingContext,
} from "@protolabsai/research-middleware";
import { safeValidate } from "@protolabsai/types";
import {
  upsertResearchChunks,
  searchResearchMemory,
} from "@protolabsai/vector";

import {
  searchCommunities,
  searchGraph,
  searchWeb,
  searchWikipedia,
  withRetry,
  type CommunitySearchResult,
  type GraphSearchResult,
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
  mode: z.enum(["deep-research", "due-diligence"]).default("deep-research"),
});

// ─── Abort Guard ──────────────────────────────────────────────────────

function checkAbort(researchId: string) {
  if (isAborted(researchId)) {
    throw new Error("CANCELLED");
  }
}

// ─── Token usage helper ───────────────────────────────────────────────

function toGenerationUsage(
  usage:
    | {
        inputTokens?: number;
        outputTokens?: number;
      }
    | undefined
) {
  if (!usage) return undefined;
  const { inputTokens, outputTokens } = usage;
  return {
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens:
      inputTokens !== undefined && outputTokens !== undefined
        ? inputTokens + outputTokens
        : undefined,
  };
}

// ─── Research Pipeline ───────────────────────────────────────────────

async function runResearch(
  researchId: string,
  query: string,
  mode: "deep-research" | "due-diligence" = "deep-research"
) {
  const tracing = createTracingContext({
    agentId: researchId,
    query,
    sessionId: researchId,
    metadata: { mode },
  });

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

    const scopePrompt =
      mode === "due-diligence"
        ? `You are planning a due diligence investigation on: "${query}"

Write a brief and identify 3-6 evaluation dimensions. Focus on:
- Performance and scalability evidence
- Compatibility and integration risks
- Community support and maintenance trajectory
- Alternatives and trade-offs
- Real-world case studies and production usage`
        : `You are planning a deep research investigation on: "${query}"

Write a research brief and identify 3-6 specific research dimensions to investigate.
Each dimension should be a focused sub-topic that, combined, gives comprehensive coverage.`;

    const scopeSpan = tracing.createSpan("scope", { mode, query });
    const scopeGeneration = tracing.createGeneration(
      "scope:plan",
      "fast",
      scopePrompt,
      { mode }
    );

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
      prompt: scopePrompt,
    });

    scopeGeneration.end(
      scopeResult.object,
      toGenerationUsage(scopeResult.usage)
    );

    const { dimensions, brief } = scopeResult.object;

    updateResearch(researchId, { dimensions, brief });
    emit("scope.completed", { dimensions, brief });
    emit("phase.completed", { phase: "scope" });
    scopeSpan.end({ dimensionsCount: dimensions.length });

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

      const researchIterationSpan = tracing.createSpan("research:iteration", {
        iteration,
        dimensionCount: dimensionsToResearch.length,
      });

      // Search knowledge graph first (only on first iteration)
      if (iteration === 1) {
        checkAbort(researchId);
        emit("search.started", { query, source: "graph" });
        const graphSearchSpan = tracing.createSpan("search:graph", {
          query,
          source: "initial",
        });
        try {
          const graphResults = await withRetry(() => searchGraph(query, 15));
          trackSearch();
          graphSearchSpan.end({ resultCount: graphResults.length });
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
          graphSearchSpan.end({ resultCount: 0, error: true });
          emit("search.completed", {
            query,
            source: "graph",
            resultCount: 0,
          });
        }

        // Search community summaries for thematic context
        checkAbort(researchId);
        emit("search.started", { query, source: "communities" });
        const communitySearchSpan = tracing.createSpan("search:communities", {
          query,
        });
        let communityResults: CommunitySearchResult[] = [];
        try {
          communityResults = await withRetry(() => searchCommunities(query, 5));
          trackSearch();
          communitySearchSpan.end({ resultCount: communityResults.length });
          emit("search.completed", {
            query,
            source: "communities",
            resultCount: communityResults.length,
          });
          if (communityResults.length > 0) {
            const communityNote = `Community themes: ${communityResults
              .map(
                (c) =>
                  `Community ${c.communityId} (${c.entityCount} entities — ${c.topEntities.slice(0, 3).join(", ")}): ${c.summary}`
              )
              .join("\n")}`;
            allNotes.push(communityNote);
            const finding = `Found ${communityResults.length} relevant community clusters with thematic context`;
            allFindings.push(finding);
            updateResearch(researchId, { findings: allFindings });
            emit("research.finding", { text: finding });
          }
        } catch {
          communitySearchSpan.end({ resultCount: 0, error: true });
          emit("search.completed", {
            query,
            source: "communities",
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

        const dimensionSpan = tracing.createSpan("research:dimension", {
          dimension,
          iteration,
          index: i,
        });

        // Check vector memory for prior findings from this session
        let memoryNote = "";
        try {
          const memoryResults = await searchResearchMemory(
            dimension,
            researchId,
            5
          );
          if (memoryResults.length > 0) {
            memoryNote = `Prior session findings for "${dimension}":\n${memoryResults
              .map((r) => `- ${r.content} (${r.source})`)
              .join("\n")}`;
          }
        } catch {
          // Vector memory unavailable — continue without it
        }

        // Graph search per dimension (all iterations — hybrid BM25+vector via shared searchGraph)
        checkAbort(researchId);
        emit("search.started", { query: dimension, source: "graph" });
        const dimGraphSpan = tracing.createSpan("search:graph", {
          query: dimension,
          iteration,
        });
        let dimGraphResults: GraphSearchResult[] = [];
        try {
          dimGraphResults = await withRetry(() => searchGraph(dimension, 5));
          trackSearch();
          dimGraphSpan.end({ resultCount: dimGraphResults.length });
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
          dimGraphSpan.end({ resultCount: 0, error: true });
          emit("search.completed", {
            query: dimension,
            source: "graph",
            resultCount: 0,
          });
          /* continue without graph results */
        }

        // Web search with retry
        checkAbort(researchId);
        emit("search.started", { query: dimension, source: "web" });
        const webSearchSpan = tracing.createSpan("search:web", {
          query: dimension,
          iteration,
        });
        let webResults: WebSearchResult[] = [];
        try {
          webResults = await withRetry(() => searchWeb(dimension, 5));
        } catch {
          /* continue without web results */
        }
        trackSearch();
        webSearchSpan.end({ resultCount: webResults.length });
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
        const wikiSearchSpan = tracing.createSpan("search:wikipedia", {
          query: dimension,
          iteration,
        });
        let wiki: WikiSearchResult | null = null;
        try {
          wiki = await withRetry(() => searchWikipedia(dimension));
        } catch {
          /* continue without wiki */
        }
        trackSearch();
        wikiSearchSpan.end({ resultCount: wiki ? 1 : 0 });
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

        // Compress dimension findings
        const graphNote =
          dimGraphResults.length > 0
            ? `Knowledge graph entities for "${dimension}": ${dimGraphResults
                .map(
                  (e) =>
                    `${e.name} (${e.type})${
                      e.connectedEntities.length > 0
                        ? ` — related: ${e.connectedEntities.map((c) => c.name).join(", ")}`
                        : ""
                    }`
                )
                .join("; ")}`
            : "";

        const corpus = [
          memoryNote,
          graphNote,
          wiki?.text ?? "",
          ...webResults.map((r) => `${r.title}: ${r.snippet ?? ""}`),
        ]
          .filter(Boolean)
          .join("\n\n");

        if (corpus) {
          checkAbort(researchId);
          emit("research.compressing", { dimension });
          const compressPrompt = `Summarize the key findings about "${dimension}" from the following research.
Be concise but include all important facts, names, dates, and relationships.
Also provide the single most important finding in one sentence.

${corpus.slice(0, 8000)}`;

          const compressGeneration = tracing.createGeneration(
            "research:compress",
            "fast",
            compressPrompt,
            { dimension, iteration, corpusLength: corpus.length }
          );

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
              prompt: compressPrompt,
            });

            compressGeneration.end(
              compressed.object,
              toGenerationUsage(compressed.usage)
            );

            allNotes.push(`## ${dimension}\n\n${compressed.object.summary}`);

            // Upsert findings to vector memory for subsequent dimension lookups
            upsertResearchChunks([
              {
                sessionId: researchId,
                content: compressed.object.summary,
                source: `dimension:${dimension}`,
                hopIndex: iteration,
              },
            ]).catch(() => {
              // Vector memory upsert is best-effort — don't fail the pipeline
            });

            // Surface key finding
            allFindings.push(compressed.object.keyFinding);
            updateResearch(researchId, { findings: allFindings });
            emit("research.finding", { text: compressed.object.keyFinding });

            emit("research.compressed", {
              dimension,
              noteLength: compressed.object.summary.length,
            });
          } catch {
            compressGeneration.end(undefined);
            // Fallback: store raw corpus excerpt
            allNotes.push(`## ${dimension}\n\n${corpus.slice(0, 2000)}`);
          }
        }

        dimensionSpan.end({ notesCount: allNotes.length });

        updateResearch(researchId, {
          notes: allNotes,
          sources: allSources,
        });
      }

      emit("phase.completed", { phase: "research" });
      researchIterationSpan.end({
        sourcesCount: allSources.length,
        notesCount: allNotes.length,
      });

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

        const evaluateSpan = tracing.createSpan("evaluate", { iteration });

        try {
          const evalPrompt = `You are evaluating research coverage on: "${query}"

Research brief: ${brief}

Planned dimensions: ${dimensions.join(", ")}

Research notes so far:
${allNotes.map((n) => n.slice(0, 500)).join("\n---\n")}

Sources found: ${allSources.length}

Is this research comprehensive enough for a quality, well-cited report?
If not, identify 1-3 specific gaps that should be investigated.
Be conservative — only flag genuine gaps, not minor tangents.`;

          const evalGeneration = tracing.createGeneration(
            "evaluate:gaps",
            "fast",
            evalPrompt,
            { iteration, sourcesCount: allSources.length }
          );

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
            prompt: evalPrompt,
          });

          evalGeneration.end(
            evalResult.object,
            toGenerationUsage(evalResult.usage)
          );

          emit("phase.completed", { phase: "evaluating" });
          evaluateSpan.end({
            complete: evalResult.object.complete,
            gapsCount: evalResult.object.gaps.length,
          });

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
          evaluateSpan.end({ error: true });
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

    const synthesisInstructions =
      mode === "due-diligence"
        ? `## Instructions
Write a structured due diligence report with these sections:
1. **Executive Summary** — What was evaluated and the top-level recommendation
2. **Analysis** — Evidence-based evaluation of each dimension
3. **Strengths** — What works well, with specific evidence
4. **Risks & Concerns** — What could go wrong, with specific evidence
5. **Alternatives Considered** — Other approaches and why they were ranked lower
6. **Recommendation** — Clear recommendation with confidence level and caveats

## Format
- Use markdown with clear ## headings
- Be evidence-driven — every claim needs a citation
- Include specific metrics, benchmarks, or case studies where available
- Be honest about uncertainty
- End with 3-5 "Related Topics" as short search phrases`
        : `## Instructions
Write a well-structured, comprehensive research report with these sections:
1. **Executive Summary** — 2-3 paragraph overview
2. **Key Findings** — organized by theme with specific facts
3. **Detailed Analysis** — deep dive into the most important aspects
4. **Connections & Relationships** — how entities and concepts relate
5. **Conclusions** — implications and significance

## Format
- Use markdown with clear ## headings
- Be thorough but readable (aim for 1500-3000 words)
- End with 3-5 "Related Topics" as short search phrases (not questions)`;

    const synthesisPrompt = `You are writing a ${mode === "due-diligence" ? "due diligence report" : "comprehensive research report"} on: "${query}"

Research brief: ${brief}

Accumulated research notes:
${allNotes.join("\n\n---\n\n")}

## Available Sources
${sourceList}

${synthesisInstructions}

## Citation Rules
- Use inline citations like [1], [2], etc. referring to the numbered sources above
- Cite specific claims — don't just cite generally
- Every major fact should have at least one citation
- Use multiple citations where evidence converges: [1][3]`;

    const synthesisSpan = tracing.createSpan("synthesis", {
      sourcesCount: uniqueSources.length,
      notesCount: allNotes.length,
      mode,
    });
    const synthesisGeneration = tracing.createGeneration(
      "synthesis:report",
      "smart",
      synthesisPrompt,
      { mode, sourcesCount: uniqueSources.length, notesCount: allNotes.length }
    );

    const reportStream = streamText({
      model: reportModel,
      prompt: synthesisPrompt,
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

    // Capture token usage after stream completes (AI SDK v6: inputTokens/outputTokens)
    const synthesisUsage = await reportStream.usage;
    synthesisGeneration.end(fullReport, toGenerationUsage(synthesisUsage));
    synthesisSpan.end({ reportLength: fullReport.length });

    emit("report.completed", { length: fullReport.length });
    emit("phase.completed", { phase: "synthesis" });

    // ── Auto-Ingest: fire-and-forget entity extraction ────────────
    autoIngestEntities(researchId, query, fullReport, emit, tracing).catch(
      () => {
        // Swallow — ingest failure must never block research completion
      }
    );

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
  } finally {
    // Flush Langfuse events — never blocks or throws
    tracing.flush().catch(() => undefined);
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

// ─── Auto-Ingest ─────────────────────────────────────────────────────

async function autoIngestEntities(
  researchId: string,
  query: string,
  report: string,
  emit: (type: string, data: unknown) => void,
  tracing: TracingContext
) {
  emit("ingest.started", { researchId });

  const ingestSpan = tracing.createSpan("auto-ingest", { researchId, query });

  const extractPrompt = `Extract entities and relationships from this research report about "${query}".

Return ONLY valid JSON:
{
  "entities": [{"uid": "{type}:{snake_name}", "name": "...", "type": "Person|Organization|Technology|Concept|Event|Publication", "properties": {}, "tags": [], "aliases": []}],
  "relationships": [{"uid": "rel:{src}_{type}_{tgt}", "type": "RELATED_TO|AUTHORED|FOUNDED|WORKS_AT|PART_OF", "source": "entity_uid", "target": "entity_uid", "properties": {}}]
}

Rules:
- Entity UIDs: {type_prefix}:{snake_case_name}
- Extract 5-20 entities and their relationships
- Only include entities clearly mentioned in the text

Text:\n${report.slice(0, 8000)}`;

  const extractGeneration = tracing.createGeneration(
    "auto-ingest:extract",
    "fast",
    extractPrompt,
    { reportLength: report.length }
  );

  const model = getAIModel("fast");
  const result = await generateText({
    model,
    prompt: extractPrompt,
  });

  extractGeneration.end(result.text, {
    promptTokens: result.usage?.inputTokens,
    completionTokens: result.usage?.outputTokens,
    totalTokens:
      result.usage?.inputTokens !== undefined &&
      result.usage?.outputTokens !== undefined
        ? result.usage.inputTokens + result.usage.outputTokens
        : undefined,
  });

  const raw = result.text?.trim() ?? "";
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fence ? fence[1].trim() : raw;
  const parsed = JSON.parse(jsonStr);

  if (!parsed?.entities?.length) {
    ingestSpan.end({ error: "No entities extracted" });
    emit("ingest.failed", { researchId, reason: "No entities extracted" });
    return;
  }

  const bundle = {
    entities: parsed.entities,
    relationships: parsed.relationships ?? [],
    evidence: [
      {
        uid: `evidence:deep_research_${Date.now()}`,
        kind: "research",
        title: `Deep Research: ${query}`,
        publisher: "Rabbit Hole Deep Research",
        date: new Date().toISOString().slice(0, 10),
        reliability: 0.8,
        notes: `Auto-extracted from deep research for "${query}"`,
      },
    ],
  };

  const rabbitHoleUrl = process.env.RABBIT_HOLE_URL || "http://localhost:3000";
  const ingestRes = await fetch(`${rabbitHoleUrl}/api/ingest-bundle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: bundle,
      mergeOptions: { strategy: "merge_smart" },
    }),
  });

  if (!ingestRes.ok) {
    const err = await ingestRes.text();
    ingestSpan.end({ error: err });
    emit("ingest.failed", { researchId, reason: err });
    return;
  }

  const ingestData = await ingestRes.json();
  ingestSpan.end({
    entitiesCount: parsed.entities.length,
    relationshipsCount: (parsed.relationships ?? []).length,
  });
  emit("ingest.completed", {
    researchId,
    entitiesCount: parsed.entities.length,
    relationshipsCount: (parsed.relationships ?? []).length,
    summary: ingestData.data?.summary,
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

  const { query, mode } = validation.data;
  const researchId = `research_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  createResearch(researchId, query);

  // Run research in background (don't await)
  runResearch(researchId, query, mode).catch((err) => {
    console.error(`[deep-research] Fatal error for ${researchId}:`, err);
    updateResearch(researchId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Fatal error",
    });
  });

  return NextResponse.json({ success: true, researchId });
}
