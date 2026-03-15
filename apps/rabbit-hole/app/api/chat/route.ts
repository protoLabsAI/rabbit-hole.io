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
- End with 2-3 related search queries (not questions for the user — short phrases they'd type into a search engine, like "DORA four key metrics" or "Continuous Delivery by Jez Humble")`;

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
