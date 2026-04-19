# MCP Tools

The `@protolabsai/mcp-server` package exposes tools via the Model Context Protocol. Any MCP client (Claude Code, Cursor, custom agents) can use these tools.

## Research Tools

### graph_search

Search the knowledge graph for existing entities before starting new research.

```typescript
{
  query: string         // entity name or search terms
  entityTypes?: string[]  // filter by type
  limit?: number        // default: 10, max: 50
}
```

Returns matching entities with UIDs, types, and relevance scores. Use this before `research_entity` to avoid duplicate work.

### wikipedia_search

Fetch a Wikipedia article by topic. Returns article text (up to 8000 chars), URL, and related articles. No API key required.

### web_search

Search the web via DuckDuckGo Instant Answer API. Returns 5-8 results with titles, URLs, and snippets. No API key required.

### tavily_search

High-quality web search optimized for recent and credible results. Requires `TAVILY_API_KEY`.

### extract_entities

LLM-based entity extraction from text. Uses Claude to identify entities, types, properties, and relationships. Returns a JSON bundle. Requires `ANTHROPIC_API_KEY`.

### validate_bundle

Validate a research bundle for structural integrity — entity schemas, relationship referential integrity, UID format.

### ingest_bundle

Persist a `RabbitHoleBundleData` object into the Neo4j knowledge graph. POSTs to the app's `/api/ingest-bundle` endpoint.

### research_entity

Full research pipeline orchestration: search multiple sources, extract entities, validate, and optionally persist.

```typescript
{
  query: string                       // topic or entity name
  depth?: "basic" | "detailed" | "comprehensive"
  entityType?: string                 // hint for extraction
  persist?: boolean                   // auto-persist (default: true)
}
```

## Media Tools

### ingest_url

Extract text content from a URL via the job processor.

### ingest_file

Process a local file via the job processor.

### transcribe_audio

Transcribe audio files (mp3, wav, flac, ogg). Requires `GROQ_API_KEY`.

### extract_pdf

Extract text from PDF files.

## HTTP Transport

The MCP server runs on port 3398 with the Streamable HTTP transport (spec 2025-03-26). It uses **stateful sessions**: each client must `initialize` before calling tools.

### Session flow

```
1. POST /mcp  {"method":"initialize", ...}
   ← 200 + Mcp-Session-Id: <uuid> header

2. POST /mcp  {"method":"tools/call", "params":{"name":"...", "arguments":{...}}}
   Header: Mcp-Session-Id: <uuid>
   ← 200 {"result":{"content":[{"type":"text","text":"..."}]}}

3. DELETE /mcp  (optional teardown)
   Header: Mcp-Session-Id: <uuid>
```

All responses are JSON when `enableJsonResponse: true` (the default).

### Additional endpoints

| Path | Purpose |
|------|---------|
| `GET /health` | Server health (uptime, session count, tool count) |
| `GET /openapi.json` | Auto-generated OpenAPI 3.1 spec |
| `GET /mcp` + `Mcp-Session-Id` | SSE stream for server-initiated messages |

### Auth

When `MCP_AUTH_TOKEN` is set, every request must include:
```
Authorization: Bearer <MCP_AUTH_TOKEN>
```

## Environment Variables

| Variable | Default | Used By |
|----------|---------|---------|
| `RABBIT_HOLE_URL` | `http://localhost:3000` | `graph_search`, `ingest_bundle` |
| `JOB_PROCESSOR_URL` | `http://localhost:8680` | Media tools |
| `MCP_AUTH_TOKEN` | _(empty)_ | Bearer token enforcement |
| `MCP_PORT` | `3398` | HTTP listen port |
| `ANTHROPIC_API_KEY` | _(required for extraction)_ | `extract_entities`, `research_entity` |
| `TAVILY_API_KEY` | _(optional)_ | `tavily_search`, `research_entity` |
| `GROQ_API_KEY` | _(optional)_ | `transcribe_audio` |

## Source

- Tool definitions: `packages/mcp-server/src/tools/research-tools.ts`
- Tool definitions: `packages/mcp-server/src/tools/media-tools.ts`
- Handler: `packages/mcp-server/src/handler.ts`
- HTTP server: `packages/mcp-server/src/http-server.ts`
- Stdio server: `packages/mcp-server/src/index.ts`
