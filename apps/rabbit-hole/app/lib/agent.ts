/**
 * Shared search-agent definitions — tools + system prompt.
 *
 * Used by both the rich UI endpoint (/api/chat) and the OpenAI-compatible
 * passthrough (/v1/chat/completions) so both surfaces produce identical
 * agent behavior.
 */

import { tool } from "ai";
import { z } from "zod";

import { searchWeb, searchWikipedia } from "./search";

export const SEARXNG_ENABLED = !!process.env.SEARXNG_ENDPOINT;

const searchWebTool = tool({
  description:
    "Search the web using SearXNG. Call multiple times with different queries and categories to build comprehensive coverage.",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    categories: z
      .enum(["general", "social media", "it", "news", "science"])
      .optional()
      .describe(
        'Search category. "general" (default) = broad web (Google, Brave, DDG). ' +
          '"social media" = Reddit & Hacker News — community discussions, real-world experience, debates. ' +
          '"it" = GitHub, Stack Overflow, Arch Wiki — code, repos, technical docs. ' +
          '"science" = arXiv, Semantic Scholar, PubMed — academic papers. ' +
          '"news" = Google News, Reuters — recent events and announcements.'
      ),
  }),
  execute: async (input: { query: string; categories?: string }) => {
    const results = await searchWeb(input.query, 10, {
      categories: input.categories,
    });
    return { results };
  },
});

export const searchTools = {
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

  askClarification: tool({
    description:
      "Ask the user a clarifying question when their query has multiple valid interpretations, references ambiguous entities (e.g. 'Mercury' — planet or element?), or when intent is unclear. Use at most once per turn.",
    inputSchema: z.object({
      question: z
        .string()
        .describe("The specific clarifying question to ask the user"),
    }),
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
    execute: async (input: { select: string }) => ({
      __type: "tool_not_found" as const,
      requestedName: input.select,
      reason: "DeferredToolLoadingMiddleware is not configured.",
    }),
  }),
};

export const SYSTEM_PROMPT = `You are Rabbit Hole, an AI search engine. You answer questions by searching multiple sources and synthesizing comprehensive, well-cited answers.

## Workflow
${
  SEARXNG_ENABLED
    ? `1. Search the web first — use searchWeb with a precise query to get current, authoritative results
2. Search Wikipedia for foundational context on people, organizations, places, and well-known topics
3. If results are thin or the question has multiple angles, search the web again with a different query formulation
4. Synthesize everything into a clear, well-cited answer — more sources = better answer`
    : `1. Search Wikipedia for foundational context on well-known topics
2. Synthesize findings — web search is not available, so use Wikipedia + your knowledge`
}

## Getting Good Coverage
- Run searchWeb multiple times with different queries AND different categories
- Start with "general" (default) for broad results, then go deeper:
  - Query involves code, libraries, tools, or CLI → search again with categories: "it" (GitHub + Stack Overflow)
  - Query is "what do people think/use/recommend" → search with categories: "social media" (Reddit + HN)
  - Query involves recent events, releases, or announcements → use categories: "news"
  - Query involves research papers or academic topics → use categories: "science" (arXiv + Semantic Scholar)
- Example: for "best state management in React", run: (1) general "React state management 2024", (2) it "zustand vs redux comparison github", (3) social media "React state management Reddit"

## Citations (REQUIRED)
- Every factual claim MUST include an inline [N] citation where N matches the source's citationNumber
- Web sources and Wikipedia: assign the next available number sequentially and cite as [N] inline
- Do NOT omit citations. Every claim that can be traced to a source must have one

## Answer Format
- Answer directly and thoroughly
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
