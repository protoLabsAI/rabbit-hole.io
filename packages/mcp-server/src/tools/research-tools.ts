/**
 * Research Tools
 *
 * Search tools exposed via MCP. Lean: web + wikipedia only. Graph-bound
 * tools (extract_entities, validate_bundle, ingest_bundle, graph_search,
 * research_entity, check_knowledge_freshness) were removed when the
 * launch stack stopped depending on Neo4j.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const researchTools: Tool[] = [
  {
    name: "wikipedia_search",
    description:
      "Fetch a Wikipedia article for an entity. Returns the article text (up to 4000 chars). Great for foundational context on well-known topics.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Entity name or topic to search Wikipedia for",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web. Uses SearXNG when SEARXNG_ENDPOINT is configured, falls back to DuckDuckGo otherwise. Returns 5–10 results with titles, URLs, and snippets.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "tavily_search",
    description:
      "High-quality web search optimized for recent and credible results. Requires TAVILY_API_KEY. Use when DuckDuckGo or SearXNG isn't enough.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        maxResults: {
          type: "number",
          description: "Maximum results to return (default: 5)",
          default: 5,
        },
      },
      required: ["query"],
    },
  },
];
