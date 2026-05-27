# Documentation

Technical documentation for Rabbit Hole — AI search you can self-host.

## Product Vision

1. **Search Engine** (NOW) — Perplexity-style AI search at `/` over the web (Tavily) + your ingested corpus (pgvector). BYOK, self-hostable.
2. **Research / Atlas workspace** (COMING BACK) — gated behind `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS` while it's rebuilt.
3. **Research App** (FUTURE) — Downloadable Tauri/Electron app. Self-hostable local search engine.

## Architecture

| Document | Description |
|----------|-------------|
| [Search System](architecture/search.md) | Quick search (AI SDK streamText), deep research (supervisor-researcher), corpus search, sessions, scaling roadmap |
| [Database & Schema](architecture/database.md) | Postgres app schema, corpus / pgvector embeddings, migration system |

## API Reference

| Document | Description |
|----------|-------------|
| [Entity Search API](api/entity-search.md) | `POST /api/entity-search` — full-text entity lookup. **Historical:** retired with the knowledge graph. |
| [MCP Tools](api/mcp-tools.md) | **Historical:** the HTTP MCP server has been replaced by the `rh` CLI (`@protolabsai/rabbit-hole-cli`). |

### Additional Endpoints (not yet documented)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Agentic search — AI SDK streamText with tools |
| `/api/research/deep` | POST | Start deep research job (gated behind `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS`) |
| `/api/research/deep/:id` | GET | SSE stream for research progress (gated) |
| `/api/research/deep/:id` | DELETE | Cancel a running research job (gated) |
| `/api/research/deep/:id/status` | GET | Polling fallback for research status (gated) |

## Operations

| Document | Description |
|----------|-------------|
| [Migrations](operations/migrations.md) | Postgres schema migrations — how to run and create them |
