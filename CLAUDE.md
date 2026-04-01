# CLAUDE.md

## Focus

The active surface is the **Search Engine** at `/`. Everything else (Atlas, Research, Evidence) exists but is not the priority. Don't modify Atlas Cytoscape code (it's being replaced with 3D). Don't restructure Research (it's being extracted into a standalone app). Focus all work on the search → knowledge graph pipeline.

## Git Workflow

- **Two-branch strategy**: `dev` (integration) and `main` (production)
- Feature branches from `dev`, squash-merge PRs into `dev`
- Periodic `dev → main` merge PRs to promote to production
- No staging branch
- **Never commit unresolved merge conflicts** — pre-commit hook blocks `<<<<<<` markers

## Code Conventions

- **Monorepo**: pnpm workspace + Turborepo
- **Testing**: Vitest
- **Linting**: ESLint flat config with strict import ordering
- **AI SDK**: Use `getAIModel()` from `@proto/llm-providers/server` for AI SDK models (streamText, generateText)
- **LangChain**: Use `getModel()` from `@proto/llm-providers/server` for LangChain models (legacy paths)
- Use `getGlobalNeo4jClient()` from `@proto/database`
- Use `getGlobalPostgresPool()` from `@proto/database`
- Use `generateSecureId()` from `@proto/utils`
- Use `Icon` from `@proto/icon-system`
- Default theme: `prod-environment` (🐰 rabbit-hole.io)

## Search Engine Architecture

**Frontend**: `useChat` from `@ai-sdk/react` + `DefaultChatTransport` → `POST /api/chat`

**Backend**: AI SDK v6 `streamText` with 5 tools:
- `searchGraph` — Hybrid BM25 (Neo4j fulltext) + vector (Qdrant) search with RRF fusion
- `searchCommunities` — GraphRAG community summary search for thematic/holistic questions
- `searchWeb` — SearXNG self-hosted web search
- `searchWikipedia` — Wikipedia article fetch
- `askClarification` — Ask user a clarifying question (intercepted by middleware)

The agent decides tool order and iteration. `stopWhen: stepCountIs(5)`.

**Middleware pipeline** (`@proto/research-middleware`): DeerFlow-inspired composable middleware wraps the streamText agent loop. Hooks fire at lifecycle points: `beforeAgent`, `beforeModel`, `afterModel`, `wrapToolCall`, `afterAgent`. Middleware registered in `app/lib/middleware-config.ts`:

| Middleware | Hook | Purpose |
|---|---|---|
| EntityMemory | beforeAgent | Queries Neo4j for prior knowledge, flags stale entities |
| ResearchPlanner | beforeAgent | Generates 3-5 step research plan for complex queries |
| Clarification | wrapToolCall | Intercepts askClarification, returns question to user |
| LoopDetection | wrapToolCall | Hashes tool calls, warns at repeat 2, blocks at 3 |
| Reflection | afterModel | Evaluates evidence quality, guides gap-filling |
| ParallelDecomposition | beforeAgent | Decomposes complex queries into focused sub-queries |
| StructuredExtraction | afterAgent | Extracts entities/relationships for "Add to Graph" preview |
| DeferredToolLoading | beforeAgent | Deferred tool schema loading (disabled by default) |

**Langfuse tracing**: Every middleware hook, tool call, and LLM call produces Langfuse traces when `LANGFUSE_PUBLIC_KEY` is set. Traces include session ID, query, token usage, and quality metrics. Set `LANGFUSE_BASE_URL` for self-hosted instances.

**Graph ingestion is user-triggered** — not automatic. Users click "Add to Knowledge Graph" on a message, which calls `POST /api/chat/ingest` to extract entities and ingest via `/api/ingest-bundle`. The StructuredExtractionMiddleware now pre-computes extraction previews using full research context.

**Shared search utilities**: `app/lib/search.ts` is the single source of truth for `searchGraph`, `searchWeb`, `searchWikipedia`, `buildLuceneQuery`, and `withRetry`. Both `/api/chat` and `/api/research/deep` import from here.

**Key files:**
- `app/page.tsx` — Search engine UI (useChat + ChatMessage)
- `app/lib/search.ts` — Shared search utilities (graph, web, wiki, retry)
- `app/lib/middleware-config.ts` — Middleware registry (all middleware wired here)
- `app/api/chat/route.ts` — Agentic search endpoint (streamText + middleware + tools)
- `app/api/chat/ingest/route.ts` — Manual entity extraction + ingest
- `app/api/entity-search/route.ts` — Neo4j full-text entity lookup
- `app/hooks/useChatSearch.ts` — useChat wrapper
- `app/hooks/useSearchSessions.ts` — Session persistence (localStorage)
- `app/components/search/ChatMessage.tsx` — UIMessage parts renderer
- `app/components/search/ChatMarkdown.tsx` — Markdown renderer with inline citation support
- `app/components/search/SearchInput.tsx` — Input with file attach
- `app/components/search/SearchSidebar.tsx` — Session history + nav
- `packages/research-middleware/` — Middleware runtime, chain, registry, tracing, all middleware
- `packages/llm-providers/src/server/ai-sdk.ts` — AI SDK provider adapter

## Deep Research Architecture

**Agentic pipeline**: SCOPE → PLAN REVIEW → RESEARCH (per dimension) → EVALUATE (gap analysis) → [loop?] → SYNTHESIS (streamed)

- `POST /api/research/deep` — Start a research job, returns `researchId`
- `GET /api/research/deep/:id` — SSE stream of research events
- `DELETE /api/research/deep/:id` — Cancel a running job
- `GET /api/research/deep/:id/status` — Polling fallback

**Pipeline details:**
- **Scope**: `generateObject` with structured zod schema produces 3-6 dimensions
- **Research loop**: For each dimension: graph + web + wiki search with retry, then compress findings with `generateObject` extracting `summary` + `keyFinding`
- **Evaluate**: LLM checks coverage gaps. If gaps found and iterations < 3, new dimensions are researched
- **Synthesis**: `streamText` produces the final report with inline citations `[1]`, `[2]` referencing numbered sources
- **State**: In-memory store on `globalThis.__researchStore` (survives Turbopack module isolation)

**UI**: Three-panel layout — activity feed (left) | report with ToC (center) | source cards (right, toggleable)

**Key files:**
- `app/api/research/deep/route.ts` — Pipeline + POST handler
- `app/api/research/deep/research-store.ts` — In-memory state store
- `app/api/research/deep/[id]/route.ts` — SSE stream + DELETE cancel
- `app/components/search/DeepResearchPanel.tsx` — Full-screen research UI

## Product Vision

1. **Search Engine** (NOW) — Perplexity-style AI search. User-controlled graph growth.
2. **3D Atlas** (NEXT) — Replace Cytoscape with modern 3D for millions of nodes.
3. **Research App** (FUTURE) — Downloadable Tauri/Electron self-hostable app.

## MCP Server

Two transports: **stdio** (local clients) and **HTTP** (network agents via Streamable HTTP transport, spec 2025-03-26).

**HTTP server** runs on port 3398 with bearer token auth (`MCP_AUTH_TOKEN` env var):
- `POST /mcp` — MCP JSON-RPC (initialize, tool calls)
- `GET /mcp` — SSE stream for server-initiated messages
- `DELETE /mcp` — Session teardown
- `GET /health` — Server status
- `GET /openapi.json` — Auto-generated OpenAPI 3.1 spec from tool definitions

**12 tools** (8 research, 4 media): `graph_search`, `research_entity`, `extract_entities`, `validate_bundle`, `ingest_bundle`, `wikipedia_search`, `tavily_search`, `web_search`, `ingest_url`, `ingest_file`, `transcribe_audio`, `extract_pdf`

- `/research`, `/ingest`, `/graph` plugin commands
- `research_entity` runs Wikipedia/DuckDuckGo/Tavily in parallel (`Promise.allSettled`) with 10s per-source timeout, source health tracking (3 failures in 10min = auto-disable), and adaptive depth (quality-based follow-up rounds with configurable budget)
- Langfuse tracing per `research_entity` call when `LANGFUSE_PUBLIC_KEY` is set
- Env: `RABBIT_HOLE_ROOT`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `GROQ_API_KEY`, `MCP_AUTH_TOKEN`, `MCP_PORT`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`
