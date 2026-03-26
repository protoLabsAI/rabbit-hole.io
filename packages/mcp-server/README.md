# Rabbit Hole MCP Server

MCP server for deep research and media processing. Lets any MCP client (Claude Code, Cursor, custom agents) search the web, extract entities, build knowledge graphs, and ingest media — all via tool calls.

Supports two transports:
- **stdio** — for local MCP clients (Claude Code, Cursor)
- **HTTP** — for network agents via [Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) (spec 2025-03-26)

## Quick Start

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

## Transport Options

### 1. stdio (local)

For Claude Code or any local MCP client:

```bash
node dist/index.js
```

### 2. HTTP (network)

For agents and apps across your network:

```bash
# Development
pnpm dev:http

# Production
MCP_AUTH_TOKEN=$(openssl rand -hex 32) pnpm start:http
```

Server starts on port 3398 (configurable via `MCP_PORT`).

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/mcp` | POST | Bearer | MCP JSON-RPC (initialize, tool calls) |
| `/mcp` | GET | Bearer | SSE stream for server-initiated messages |
| `/mcp` | DELETE | Bearer | Session teardown |
| `/health` | GET | None | Server status, uptime, tool count |
| `/openapi.json` | GET | None | Auto-generated OpenAPI 3.1 spec |

## Client Configuration

### Claude Code (stdio)

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "rabbit-hole": {
      "command": "node",
      "args": ["./packages/mcp-server/dist/index.js"],
      "env": {
        "JOB_PROCESSOR_URL": "http://localhost:8680",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
        "TAVILY_API_KEY": "${TAVILY_API_KEY}",
        "GROQ_API_KEY": "${GROQ_API_KEY}"
      }
    }
  }
}
```

### Remote MCP Client (HTTP)

Any MCP client that supports Streamable HTTP transport:

```json
{
  "mcpServers": {
    "rabbit-hole": {
      "url": "http://<host>:3398/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_AUTH_TOKEN>"
      }
    }
  }
}
```

### Agent Frameworks (OpenAPI)

For LangChain, CrewAI, or other frameworks, import the OpenAPI spec:

```
GET http://<host>:3398/openapi.json
```

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | For entity extraction | — | Powers LLM-based entity extraction |
| `JOB_PROCESSOR_URL` | For media ingestion | `http://localhost:8680` | Job processor API |
| `RABBIT_HOLE_URL` | For bundle ingest | `http://localhost:3399` | Rabbit Hole app URL |
| `TAVILY_API_KEY` | No | — | Premium web search |
| `GROQ_API_KEY` | No | — | Free audio transcription via Groq |
| `MCP_PORT` | No | `3398` | HTTP server port |
| `MCP_AUTH_TOKEN` | For HTTP production | — | Bearer token for HTTP auth |
| `LANGFUSE_PUBLIC_KEY` | No | — | Langfuse tracing |
| `LANGFUSE_SECRET_KEY` | No | — | Langfuse tracing |
| `LANGFUSE_BASE_URL` | No | — | Langfuse self-hosted URL |

## Available Tools (12)

### Research Tools (8)

| Tool | Description | Requires |
|------|-------------|----------|
| `wikipedia_search` | Fetch Wikipedia articles (up to 8K chars) | Nothing |
| `web_search` | DuckDuckGo instant answers, 5-8 results | Nothing |
| `tavily_search` | Premium web search with credibility scoring | `TAVILY_API_KEY` |
| `extract_entities` | LLM-based entity extraction from text | `ANTHROPIC_API_KEY` |
| `validate_bundle` | Bundle structural integrity check | Nothing |
| `ingest_bundle` | Ingest bundle into Neo4j knowledge graph | App running |
| `graph_search` | Search existing entities in Neo4j | App running |
| `research_entity` | Full pipeline: search → extract → validate | `ANTHROPIC_API_KEY` |

### Media Processing Tools (4)

| Tool | Description | Requires |
|------|-------------|----------|
| `ingest_url` | Ingest any URL (HTML, PDF, YouTube, audio) | Docker services |
| `ingest_file` | Ingest local file (text, PDF, DOCX, audio, video) | Docker services |
| `transcribe_audio` | Audio transcription with timestamps | Docker + `GROQ_API_KEY` |
| `extract_pdf` | PDF text extraction with per-page output | Docker services |

## Deployment

### PM2 (recommended)

```bash
# Build
pnpm build

# Start HTTP server with auth
MCP_AUTH_TOKEN=$(openssl rand -hex 32) \
MCP_PORT=3398 \
JOB_PROCESSOR_URL=http://localhost:8680 \
RABBIT_HOLE_URL=http://localhost:3399 \
pm2 start packages/mcp-server/dist/http-server.js --name rabbit-hole-mcp

# Save for auto-restart
pm2 save
```

### Docker

The MCP server can also run inside the Docker Compose stack. Research tools work without Docker — they call external APIs directly. Media tools require the job processor:

```bash
docker compose -f docker-compose.research.yml --env-file .env.research up -d
```

## Architecture

```
┌──────────────────────────┐     ┌──────────────────────────┐
│  Local MCP Client        │     │  Network MCP Client      │
│  (Claude Code, Cursor)   │     │  (agents, apps, scripts) │
└────────┬─────────────────┘     └────────┬─────────────────┘
         │ stdio                           │ HTTP (port 3398)
         │                                 │ Bearer token auth
         ▼                                 ▼
┌──────────────────────────────────────────────────────────┐
│  MCP Server  (@proto/mcp-server)                         │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ index.ts    │  │ http-server │  │ openapi.ts      │  │
│  │ (stdio)     │  │ (HTTP+SSE)  │  │ (spec gen)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│                                                          │
│  handler.ts → tool routing + source health tracking      │
├──────────────────────────────────────────────────────────┤
│  Research Tools        │  Media Tools                    │
│  ├→ Wikipedia API      │  ├→ Job Processor (:8680)       │
│  ├→ DuckDuckGo API     │  │  ├→ FFmpeg (video)           │
│  ├→ Tavily API         │  │  ├→ Whisper/Groq (audio)     │
│  ├→ Anthropic API      │  │  ├→ unpdf (PDF)              │
│  └→ Rabbit Hole App    │  │  └→ yt-dlp (YouTube)         │
│     ├→ /api/entity-search                                │
│     └→ /api/ingest-bundle                                │
└──────────────────────────────────────────────────────────┘
```

## Development

```bash
# stdio mode (auto-reload)
pnpm dev

# HTTP mode (auto-reload)
pnpm dev:http

# Build for production
pnpm build

# Run tests
pnpm test
```
