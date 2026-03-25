/**
 * Chat API — AI SDK v6 Agentic Search Endpoint
 *
 * Uses streamText with tools for multi-step search:
 * - searchGraph: Neo4j full-text search
 * - searchWeb: Tavily advanced search
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
  type UIMessage,
} from "ai";
import { z } from "zod";

import { getAIModel } from "@proto/llm-providers/server";
import {
  createTracingContext,
  DeferredToolLoadingMiddleware,
  type MiddlewareContext,
  type ToolExecutor,
} from "@proto/research-middleware";
import { generateSecureId } from "@proto/utils";

import { getMiddlewareRegistry } from "../../lib/middleware-config";
import { searchGraph, searchWeb, searchWikipedia } from "../../lib/search";

// ─── Tool Definitions ───────────────────────────────────────────────

const searchTools = {
  searchGraph: tool({
    description:
      "Search the knowledge graph for existing entities by name, alias, or tag. Always call this first to check what we already know.",
    inputSchema: z.object({
      query: z.string().describe("Search query for the knowledge graph"),
    }),
    execute: async (input: { query: string }) => searchGraph(input.query),
  }),

  searchWeb: tool({
    description:
      "Search the web via Tavily for recent, high-quality results. Use when the knowledge graph doesn't have enough information.",
    inputSchema: z.object({
      query: z.string().describe("Web search query"),
    }),
    execute: async (input: { query: string }) => {
      const results = await searchWeb(input.query);
      if (results.length === 0 && !process.env.TAVILY_API_KEY) {
        return { results: [], note: "TAVILY_API_KEY not set" };
      }
      return { results };
    },
  }),

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
3. If the graph is thin, call searchWeb and/or searchWikipedia for more context
4. Synthesize all findings into a clear, well-cited answer

## Answer Format
- Answer directly and concisely
- Cite web sources as [Source Title](url) when referencing them
- Mention knowledge graph entities by name when relevant
- Use markdown for readability
- If information is uncertain, say so
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
    searchWeb: {
      ...searchTools.searchWeb,
      execute: async (input: { query: string }) =>
        chain.wrapToolCall(
          ctx,
          "searchWeb",
          input as Record<string, unknown>,
          searchTools.searchWeb.execute as unknown as ToolExecutor
        ),
    },
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
          `[search-agent] Step: ${step.toolCalls.map((t) => t.toolName).join(", ")}`
        );
      }
      await chain.afterModel(ctx, {
        text: step.text,
        toolCalls: step.toolCalls?.map((tc) => ({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: ("args" in tc ? tc.args : {}) as Record<string, unknown>,
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
    // Tracing is flushed asynchronously — no latency impact on the response.
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

      // Flush Langfuse trace in the background — never blocks the response.
      tracing.flush().catch(() => {});
    },
  });

  return result.toUIMessageStreamResponse();
}
