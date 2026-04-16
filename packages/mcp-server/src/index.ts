#!/usr/bin/env node
/**
 * Rabbit Hole MCP Server
 *
 * Exposes research and media processing tools via MCP protocol.
 * Any MCP client (Claude Code, Cursor, custom agents) can use these
 * tools to run research, search the web, ingest media, and build
 * knowledge graphs.
 *
 * Usage:
 *   npx @protolabsai/mcp-server
 *
 * Environment variables:
 *   JOB_PROCESSOR_URL  - Job processor API URL (default: http://localhost:8680)
 *   RABBIT_HOLE_URL    - Rabbit Hole app URL for bundle ingest (default: http://localhost:3000)
 *   TAVILY_API_KEY     - Tavily API key for premium search (optional)
 *   GROQ_API_KEY       - Groq API key for free audio transcription (optional)
 *   ANTHROPIC_API_KEY  - Anthropic API key for entity extraction (optional)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { handleToolCall } from "./handler.js";
import { mediaTools } from "./tools/media-tools.js";
import { researchTools } from "./tools/research-tools.js";

// Configuration
const JOB_PROCESSOR_URL =
  process.env.JOB_PROCESSOR_URL || "http://localhost:8680";

// All available tools
const ALL_TOOLS = [...researchTools, ...mediaTools];

// Create MCP server
const server = new Server(
  {
    name: "rabbit-hole",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: ALL_TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleToolCall(name, args ?? {}, {
      jobProcessorUrl: JOB_PROCESSOR_URL,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      groqApiKey: process.env.GROQ_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    return {
      content: [
        {
          type: "text" as const,
          text:
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[rabbit-hole-mcp] Server started on stdio");
}

main().catch((error) => {
  console.error("[rabbit-hole-mcp] Fatal error:", error);
  process.exit(1);
});
