/**
 * Research Tools
 *
 * Search, discovery, and analysis tools for entity research.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const researchTools: Tool[] = [
  {
    name: "wikipedia_search",
    description:
      "Fetch a Wikipedia article for an entity. Returns the article text (up to 4000 chars). Great for initial entity research and evidence gathering.",
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
      "Search the web using DuckDuckGo. Returns 5-8 results with titles, URLs, and snippets. No API key required. Use for broad discovery.",
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
      "High-quality web search optimized for recent and credible results. Requires TAVILY_API_KEY. Use for deep research when DuckDuckGo isn't enough.",
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
  {
    name: "extract_entities",
    description:
      "Extract structured entity data from text. Uses an LLM to identify entities, their types, properties, and relationships from raw text content. Returns a JSON bundle of entities and relationships.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text content to extract entities from",
        },
        entityTypes: {
          type: "array",
          items: { type: "string" },
          description:
            "Entity types to look for (e.g., ['person', 'organization', 'location']). If omitted, all types are extracted.",
        },
        focusEntity: {
          type: "string",
          description:
            "Primary entity name to focus extraction around (optional)",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "validate_bundle",
    description:
      "Validate a research bundle for structural integrity. Checks entity schemas, relationship referential integrity, evidence UID format, and completeness metrics.",
    inputSchema: {
      type: "object",
      properties: {
        bundle: {
          type: "object",
          description:
            "RabbitHoleBundleData object with entities, relationships, evidence arrays",
        },
      },
      required: ["bundle"],
    },
  },
  {
    name: "ingest_bundle",
    description:
      "Ingest a RabbitHoleBundleData object into the Rabbit Hole knowledge graph. POSTs the bundle to the rabbit-hole API and returns the import summary with created/kept counts for entities, relationships, evidence, files, and content.",
    inputSchema: {
      type: "object",
      properties: {
        bundle: {
          type: "object",
          description:
            "RabbitHoleBundleData JSON object with fields: entities, relationships, evidence, content, files",
        },
      },
      required: ["bundle"],
    },
  },
  {
    name: "graph_search",
    description:
      "Search the Rabbit Hole knowledge graph for existing entities by name, alias, or tag. Returns matching entities with UIDs, types, and relevance scores. Use before research_entity to check if an entity already exists in the graph.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Entity name or search terms (e.g., 'Donald Trump', 'OpenAI', 'climate change')",
        },
        entityTypes: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional: filter by entity type (e.g., ['Person', 'Organization'])",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10, max: 50)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "research_entity",
    description:
      "Run the full research pipeline for an entity. Searches multiple sources, extracts entities and relationships, and assembles a complete knowledge graph bundle. This is the high-level orchestration tool — use individual tools for more control.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Research question or entity name (e.g., 'Apollo space program', 'Tesla Inc')",
        },
        depth: {
          type: "string",
          enum: ["basic", "detailed", "comprehensive"],
          description:
            "Research depth: basic (1 pass, fast), detailed (2-3 passes, default), comprehensive (5+ passes, thorough)",
          default: "detailed",
        },
        entityType: {
          type: "string",
          description:
            "Optional entity type hint (e.g., 'company', 'person', 'technology')",
        },
        persist: {
          type: "boolean",
          description:
            "Whether to automatically persist the research bundle to the knowledge graph after a successful run (default: true)",
          default: true,
        },
        budget: {
          type: "object",
          description:
            "Optional research budget configuration to cap adaptive depth rounds. Defaults to { maxAdditionalRounds: 3, maxTotalSources: 5 }.",
          properties: {
            maxAdditionalRounds: {
              type: "number",
              description:
                "Maximum number of additional search rounds beyond the initial parallel round (default: 3)",
              default: 3,
            },
            maxTotalSources: {
              type: "number",
              description:
                "Maximum total number of source queries across all rounds (default: 5)",
              default: 5,
            },
          },
        },
      },
      required: ["query"],
    },
  },
  {
    name: "check_knowledge_freshness",
    description:
      "Check when a topic was last researched in the temporal knowledge graph and whether the knowledge is fresh. Returns fact count, age in days, and freshness status. Use this before running deep_research to avoid redundant work.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The research topic or query to check freshness for",
        },
        maxAgeDays: {
          type: "number",
          description:
            "Maximum age in days to consider knowledge fresh (default: 7)",
          default: 7,
        },
      },
      required: ["topic"],
    },
  },
];
