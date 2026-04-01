/**
 * Chat API — AI SDK v6 Agentic Search Endpoint
 *
 * Uses streamText with tools for multi-step search:
 * - searchGraph: Neo4j full-text search
 * - searchWeb: SearXNG self-hosted search
 * - searchWikipedia: Wikipedia article fetch
 *
 * The LLM decides which tools to call and in what order.
 * Results stream as UIMessage parts (text, tool calls, data).
 *
 * Middleware hooks fire at each lifecycle point:
 *   beforeAgent → [per step: prepareStep(beforeModel) → LLM → onStepFinish(afterModel)]
 *   → wrapToolCall (per tool execution) → onFinish(afterAgent + tracing flush)
 */

import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { getAIModel } from "@proto/llm-providers/server";
import {
  createTracingContext,
  DeferredToolLoadingMiddleware,
  type MiddlewareContext,
  type ToolExecutor,
  type ExtractionPreview,
} from "@proto/research-middleware";
import { generateSecureId } from "@proto/utils";

import { getMiddlewareRegistry } from "../../lib/middleware-config";
import {
  searchGraph,
  searchWeb,
  searchWikipedia,
  searchCommunities,
} from "../../lib/search";

// ─── Tool Definitions ───────────────────────────────────────────────

const SEARXNG_ENABLED = !!process.env.SEARXNG_ENDPOINT;

const searchWebTool = tool({
  description:
    "Search the web using SearXNG for recent results. Use when the knowledge graph doesn't have enough information.",
  inputSchema: z.object({
    query: z.string().describe("Web search query"),
  }),
  execute: async (input: { query: string }) => {
    const results = await searchWeb(input.query);
    return { results };
  },
});

const searchTools = {
  searchGraph: tool({
    description:
      "Search the knowledge graph for existing entities by name, alias, or tag. Always call this first to check what we already know.",
    inputSchema: z.object({
      query: z.string().describe("Search query for the knowledge graph"),
    }),
    execute: async (input: { query: string }) => searchGraph(input.query),
  }),

  ...(SEARXNG_ENABLED ? { searchWeb: searchWebTool } : {}),

  searchWikipedia: tool({
    description:
      "Fetch a Wikipedia article for foundational context on well-known topics, people, or organizations.",
    inputSchema: z.object({
      query: z.string().describe("Wikipedia search query"),
    }),
    execute: async (input: { query: string }) => {
      const result = await searchWikipedia(input.query);
      if (!result) return { title: null, text: "", url: null };
      return {
        title: result.title,
        text: result.text,
        url: result.url,
      };
    },
  }),

  searchCommunities: tool({
    description:
      "Search community summaries for broad thematic questions about the knowledge graph. Use this for questions like 'what are the main themes?', 'what topics are covered?', or 'how do these areas connect?' Returns community-level summaries rather than individual entities.",
    inputSchema: z.object({
      query: z.string().describe("Thematic or holistic search query"),
    }),
    execute: async (input: { query: string }) => {
      const results = await searchCommunities(input.query);
      if (results.length === 0) return { results: [] };
      return {
        results: results.map((r) => ({
          communityId: r.communityId,
          summary: r.summary,
          topEntities: r.topEntities,
          entityCount: r.entityCount,
        })),
      };
    },
  }),

  askClarification: tool({
    description:
      "Ask the user a clarifying question when their query has multiple valid interpretations, references ambiguous entities (e.g. 'Mercury' — planet or element?), or when intent is unclear. Use at most once per turn.",
    inputSchema: z.object({
      question: z
        .string()
        .describe("The specific clarifying question to ask the user"),
    }),
    // The ClarificationMiddleware intercepts this before execute runs.
    // This fallback only fires if the middleware chain is not configured.
    execute: async (input: { question: string }) => ({
      __type: "clarification_requested" as const,
      question: input.question,
    }),
  }),

  toolSearch: tool({
    description:
      "Activate a deferred tool by name so it becomes available for use. Call this when you see a tool listed in the 'Additional tools available' note in your context. Pass the exact tool name as the select argument.",
    inputSchema: z.object({
      select: z
        .string()
        .describe("The exact name of the deferred tool to activate"),
    }),
    // The DeferredToolLoadingMiddleware intercepts this before execute runs.
    // This fallback only fires if the middleware chain is not configured.
    execute: async (input: { select: string }) => ({
      __type: "tool_not_found" as const,
      requestedName: input.select,
      reason: "DeferredToolLoadingMiddleware is not configured.",
    }),
  }),
};

// ─── System Prompt ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Rabbit Hole, an AI search engine powered by a living knowledge graph. You answer questions by searching the graph and the web.

## Workflow
1. ALWAYS call searchGraph first to check existing knowledge
2. If the graph has good results (3+ entities), use them to answer
3. For broad or thematic questions ("what are the main themes?", "how do these connect?"), call searchCommunities
4. ${SEARXNG_ENABLED ? "If the graph is thin, call searchWeb for more context" : "If the graph is thin, rely on your training knowledge and say so — web search is not available"}
5. Synthesize all findings into a clear, well-cited answer

## Answer Format
- Answer directly and concisely
- Cite web sources as [Source Title](url) when referencing them
- Mention knowledge graph entities by name when relevant
- Use markdown for readability
- If information is uncertain, say so
- Do NOT use emojis in responses — the only exceptions are ✓ and ✗ when used to denote true/false or present/absent data in tables or lists
- At the very end of your response, include a RELATED_SEARCHES block in this exact format (one per line, no bullets, no backticks):
<RELATED_SEARCHES>
first related search phrase
second related search phrase
third related search phrase
</RELATED_SEARCHES>
These should be short phrases a user would type into a search engine (like "DORA four key metrics" or "Continuous Delivery by Jez Humble"), not questions.

## Clarification
- Use askClarification when the query has multiple valid interpretations or references ambiguous entities (e.g. "Mercury" — planet, element, or car brand?)
- Use askClarification when the user's intent is unclear and searching without clarification would likely miss the mark
- After calling askClarification, stop and wait for the user's response — do not call any other tools or emit a final answer
- Limit: 1 clarification per conversation turn. If you have already asked one, proceed with your best interpretation`;

// ─── Auto-ingest threshold ───────────────────────────────────────────

/** Minimum extraction confidence to trigger automatic entity ingestion. */
const AUTO_INGEST_CONFIDENCE_THRESHOLD = 0.7;

// ─── Bundle builder for auto-ingest ─────────────────────────────────

/**
 * Converts an ExtractionPreview into a RabbitHoleBundleData-compatible
 * payload for the ingest-bundle endpoint.
 */
function buildAutoIngestBundle(preview: ExtractionPreview) {
  const timestamp = Date.now();
  return {
    entities: preview.entities.map((entity) => ({
      uid: entity.uid,
      type: entity.type,
      name: entity.name,
      aliases: entity.aliases ?? [],
      tags: [],
      properties: {
        ...(entity.properties ?? {}),
        // Source tracking: record provenance as auto-extracted from search
        sources: [`auto-extract:${timestamp}`],
      },
    })),
    relationships: preview.relationships.map((rel) => ({
      uid: rel.uid,
      type: rel.type,
      source: rel.source,
      target: rel.target,
      ...(rel.confidence !== undefined && { confidence: rel.confidence }),
      properties: {},
    })),
    evidence:
      preview.citations.length > 0
        ? [
            {
              uid: `evidence:auto-ingest-${timestamp}`,
              kind: "research",
              title: "Auto-extracted from search agent",
              publisher: "Rabbit Hole Search Agent",
              date: new Date().toISOString().slice(0, 10),
              reliability: preview.confidence,
              notes: `Auto-ingested with ${Math.round(preview.confidence * 100)}% confidence`,
            },
          ]
        : [],
    files: [],
    content: [],
  };
}

// ─── Route Handler ──────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json();
  const messages: UIMessage[] = body.messages ?? [];

  const model = getAIModel("smart");

  // ── Middleware setup ──────────────────────────────────────────────
  const agentId = generateSecureId();

  // Extract the last user message as the query for tracing context.
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const query =
    lastUserMessage?.parts?.find(
      (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
    )?.text ?? undefined;

  const tracing = createTracingContext({ agentId, query });
  const ctx: MiddlewareContext = { agentId, state: {}, tracing };

  const registry = getMiddlewareRegistry();

  // Register deferred tool loading middleware.
  // Additional tools (MCP tools, domain-specific extractors, etc.) can be
  // added here. Only name + description are needed at registration time;
  // the full schema is bound on demand when the agent calls tool_search.
  registry.register({
    id: "deferred-tool-loading",
    enabled: true,
    middleware: new DeferredToolLoadingMiddleware({ deferredTools: [] }),
  });

  const chain = registry.buildChain();

  // Wrap each tool's execute function through the middleware chain.
  // The original execute becomes the innermost executor; middleware can
  // intercept, modify args/results, or skip execution entirely.
  const wrappedTools = {
    searchGraph: {
      ...searchTools.searchGraph,
      execute: async (input: { query: string }) =>
        chain.wrapToolCall(
          ctx,
          "searchGraph",
          input as Record<string, unknown>,
          searchTools.searchGraph.execute as unknown as ToolExecutor
        ),
    },
    ...(SEARXNG_ENABLED
      ? {
          searchWeb: {
            ...searchWebTool,
            execute: async (input: { query: string }) =>
              chain.wrapToolCall(
                ctx,
                "searchWeb",
                input as Record<string, unknown>,
                searchWebTool.execute as unknown as ToolExecutor
              ),
          },
        }
      : {}),
    searchWikipedia: {
      ...searchTools.searchWikipedia,
      execute: async (input: { query: string }) =>
        chain.wrapToolCall(
          ctx,
          "searchWikipedia",
          input as Record<string, unknown>,
          searchTools.searchWikipedia.execute as unknown as ToolExecutor
        ),
    },
    searchCommunities: {
      ...searchTools.searchCommunities,
      execute: async (input: { query: string }) =>
        chain.wrapToolCall(
          ctx,
          "searchCommunities",
          input as Record<string, unknown>,
          searchTools.searchCommunities.execute as unknown as ToolExecutor
        ),
    },
    askClarification: {
      ...searchTools.askClarification,
      execute: async (input: { question: string }) =>
        chain.wrapToolCall(
          ctx,
          "ask_clarification",
          input as Record<string, unknown>,
          searchTools.askClarification.execute as unknown as ToolExecutor
        ),
    },
    toolSearch: {
      ...searchTools.toolSearch,
      execute: async (input: { select: string }) =>
        chain.wrapToolCall(
          ctx,
          "tool_search",
          input as Record<string, unknown>,
          searchTools.toolSearch.execute as unknown as ToolExecutor
        ),
    },
  };

  // beforeAgent: fires before the streamText agent loop begins.
  await chain.beforeAgent(ctx);

  const modelMessages = await convertToModelMessages(messages);

  // Promise that resolves with the extraction preview after afterAgent runs.
  // This allows createUIMessageStream to inject the preview as message
  // metadata after the AI stream completes — without blocking the response.
  let resolveExtractionPreview!: (preview: ExtractionPreview | null) => void;
  const extractionPreviewPromise = new Promise<ExtractionPreview | null>(
    (resolve) => {
      resolveExtractionPreview = resolve;
    }
  );

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: wrappedTools,
    stopWhen: stepCountIs(5),

    // beforeModel: fires before each LLM turn.
    // Uses AI SDK's prepareStep to intercept the messages array per-step.
    // PassthroughMiddleware returns undefined so messages are left unchanged.
    prepareStep: async ({ messages: stepMessages }) => {
      const modified = await chain.beforeModel(
        ctx,
        // Cast to middleware's ModelMessage type — structurally compatible.
        stepMessages as Parameters<typeof chain.beforeModel>[1]
      );
      // Only override messages if a middleware actually changed them.
      if (modified === stepMessages) return undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { messages: modified as any };
    },

    // afterModel: fires after each LLM turn completes.
    onStepFinish: async (step) => {
      if (step.toolCalls?.length) {
        console.log(
          `[search-agent] Step: ${step.toolCalls.map((t) => t?.toolName).join(", ")}`
        );
      }
      await chain.afterModel(ctx, {
        text: step.text,
        toolCalls: step.toolCalls?.map((tc) => ({
          toolCallId: tc?.toolCallId ?? "",
          toolName: tc?.toolName ?? "",
          args: (tc && "args" in tc ? tc.args : {}) as Record<string, unknown>,
        })),
        usage: {
          promptTokens: step.usage?.inputTokens ?? undefined,
          completionTokens: step.usage?.outputTokens ?? undefined,
          totalTokens:
            step.usage?.inputTokens != null && step.usage?.outputTokens != null
              ? step.usage.inputTokens + step.usage.outputTokens
              : undefined,
        },
      });
    },

    // afterAgent: fires when the full agent loop completes.
    // Runs afterAgent middleware (including StructuredExtractionMiddleware),
    // then auto-ingests high-confidence entities if applicable.
    onFinish: async (event) => {
      await chain.afterAgent(ctx, {
        text: event.text,
        finishReason: event.finishReason,
        usage: {
          promptTokens: event.usage?.inputTokens ?? undefined,
          completionTokens: event.usage?.outputTokens ?? undefined,
          totalTokens:
            event.usage?.inputTokens != null &&
            event.usage?.outputTokens != null
              ? event.usage.inputTokens + event.usage.outputTokens
              : undefined,
        },
      });

      const preview = ctx.state["extractionPreview"] as
        | ExtractionPreview
        | undefined;

      // Auto-ingest high-confidence entities (>= 0.7) without user action.
      // Low-confidence extractions are left for manual "Add to Graph".
      if (
        preview &&
        typeof preview.confidence === "number" &&
        preview.confidence >= AUTO_INGEST_CONFIDENCE_THRESHOLD
      ) {
        try {
          const rabbitHoleUrl =
            process.env.RABBIT_HOLE_URL || "http://localhost:3000";
          const bundle = buildAutoIngestBundle(preview);
          const ingestRes = await fetch(`${rabbitHoleUrl}/api/ingest-bundle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: bundle,
              mergeOptions: {
                strategy: "merge_smart",
                preserveTimestamps: true,
              },
            }),
          });
          if (ingestRes.ok) {
            (preview as unknown as Record<string, unknown>).autoIngested = true;
            console.log(
              `[auto-ingest] ✅ Ingested ${preview.entities.length} entities (confidence: ${preview.confidence.toFixed(2)})`
            );
          } else {
            console.warn(
              `[auto-ingest] ⚠️ Ingest endpoint returned ${ingestRes.status}`
            );
          }
        } catch (err) {
          // Per deviation rules: log error, do not block the response
          console.error(`[auto-ingest] ❌ Failed:`, err);
        }
      }

      // Resolve the preview promise so createUIMessageStream can inject metadata.
      resolveExtractionPreview(preview ?? null);

      // Flush Langfuse trace in the background — never blocks the response.
      tracing.flush().catch(() => {});
    },
  });

  // Use createUIMessageStream to inject the extraction preview as message
  // metadata after the AI stream completes. This allows the client to:
  // 1. Show "Auto-ingested" status for high-confidence extractions
  // 2. Show manual "Add to Graph" button for low-confidence extractions
  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Merge the AI stream (without its finish event — we send our own).
      writer.merge(result.toUIMessageStream({ sendFinish: false }));

      // Wait for afterAgent to complete and resolve the extraction preview.
      const preview = await extractionPreviewPromise;

      // Inject the extraction preview as message metadata so the client
      // can display auto-ingest status without a separate API call.
      if (preview) {
        writer.write({
          type: "message-metadata",
          messageMetadata: { extractionPreview: preview },
        });
      }

      // Send finish to close the message on the client.
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream: uiStream });
}
