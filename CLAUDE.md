# CLAUDE.md

## Focus

The active surface is the **Search Engine** at `/`. Everything else (Atlas, Research, Evidence) exists but is not the priority. Don't modify Atlas Cytoscape code (it's being replaced with 3D). Don't restructure Research (it's being extracted into a standalone app). Focus all work on the search → knowledge graph pipeline.

## Git Workflow

- **Ship to main**: Feature branches from `main`, squash-merge PRs
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

**Backend**: AI SDK v6 `streamText` with 3 tools:
- `searchGraph` — Neo4j full-text search via Lucene index
- `searchWeb` — Tavily advanced search
- `searchWikipedia` — Wikipedia article fetch

The agent decides tool order and iteration. `stopWhen: stepCountIs(5)`.

**Graph ingestion is user-triggered** — not automatic. Users click "Add to Knowledge Graph" on a message, which calls `POST /api/chat/ingest` to extract entities and ingest via `/api/ingest-bundle`.

**Shared search utilities**: `app/lib/search.ts` is the single source of truth for `searchGraph`, `searchWeb`, `searchWikipedia`, `buildLuceneQuery`, and `withRetry`. Both `/api/chat` and `/api/research/deep` import from here.

**Key files:**
- `app/page.tsx` — Search engine UI (useChat + ChatMessage)
- `app/lib/search.ts` — Shared search utilities (graph, web, wiki, retry)
- `app/api/chat/route.ts` — Agentic search endpoint (streamText + tools)
- `app/api/chat/ingest/route.ts` — Manual entity extraction + ingest
- `app/api/entity-search/route.ts` — Neo4j full-text entity lookup
- `app/hooks/useChatSearch.ts` — useChat wrapper
- `app/hooks/useSearchSessions.ts` — Session persistence (localStorage)
- `app/components/search/ChatMessage.tsx` — UIMessage parts renderer
- `app/components/search/ChatMarkdown.tsx` — Markdown renderer with inline citation support
- `app/components/search/SearchInput.tsx` — Input with file attach
- `app/components/search/SearchSidebar.tsx` — Session history + nav
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

## MCP Plugin

- `/research`, `/ingest`, `/graph` commands
- Tools: `graph_search`, `research_entity`, `extract_entities`, `validate_bundle`, `ingest_bundle`, `wikipedia_search`, `tavily_search`, `web_search`
- Env: `RABBIT_HOLE_ROOT`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `GROQ_API_KEY`
