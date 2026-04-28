/**
 * Chat API — AI SDK v6 Agentic Search Endpoint
 *
 * Uses streamText with tools for multi-step search:
 * - searchWeb: SearXNG self-hosted search
 * - searchWikipedia: Wikipedia article fetch
 * - askClarification: ask the user a clarifying question
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
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";

import { getAIModel } from "@protolabsai/llm-providers/server";
import {
  createTracingContext,
  DeferredToolLoadingMiddleware,
  type MiddlewareContext,
  type ToolExecutor,
} from "@protolabsai/research-middleware";
import { generateSecureId } from "@protolabsai/utils";

import { SEARXNG_ENABLED, SYSTEM_PROMPT, searchTools } from "../../lib/agent";
import { getMiddlewareRegistry } from "../../lib/middleware-config";

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
  const searchWebToolDef = searchTools.searchWeb;
  const wrappedTools = {
    ...(SEARXNG_ENABLED && searchWebToolDef
      ? {
          searchWeb: {
            ...searchWebToolDef,
            execute: async (input: { query: string; categories?: string }) =>
              chain.wrapToolCall(
                ctx,
                "searchWeb",
                input as Record<string, unknown>,
                searchWebToolDef.execute as unknown as ToolExecutor
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
    stopWhen: stepCountIs(7),

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
