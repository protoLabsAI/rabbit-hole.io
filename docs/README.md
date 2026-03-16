# Documentation

Technical documentation for the Rabbit Hole knowledge graph platform.

## Product Vision

1. **Search Engine** (NOW) — Perplexity-style AI search at `/`. Self-growing knowledge graph. Deep research mode for comprehensive reports.
2. **3D Atlas** (NEXT) — Replace Cytoscape with modern 3D visualization for millions of nodes.
3. **Research App** (FUTURE) — Downloadable Tauri/Electron app. Self-hostable local search engine.

## Architecture

| Document | Description |
|----------|-------------|
| [Search System](architecture/search.md) | Quick search (AI SDK streamText), deep research (supervisor-researcher), full-text index, sessions, scaling roadmap |
| [Database & Schema](architecture/database.md) | Neo4j schema, entity model, migration system |

## API Reference

| Document | Description |
|----------|-------------|
| [Entity Search API](api/entity-search.md) | `POST /api/entity-search` — full-text entity lookup |
| [MCP Tools](api/mcp-tools.md) | All MCP server tools for research, search, and ingestion |

### Additional Endpoints (not yet documented)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Agentic search — AI SDK streamText with tools |
| `/api/chat/ingest` | POST | Manual entity extraction + KG ingestion |
| `/api/research/deep` | POST | Start deep research job (mode: deep-research or due-diligence) |
| `/api/research/deep/:id` | GET | SSE stream for research progress |
| `/api/research/deep/:id` | DELETE | Cancel a running research job |
| `/api/research/deep/:id/status` | GET | Polling fallback for research status |

## Operations

| Document | Description |
|----------|-------------|
| [Migrations](operations/migrations.md) | Neo4j schema migrations — how to run and create them |
