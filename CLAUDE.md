# CLAUDE.md

## Focus

The active surface is the **Search Engine** at `/`. Search is now **web (Tavily) + a corpus search over your ingested files** (pgvector on Postgres, 1024-dim qwen3 embeddings via the LLM gateway). The pgvector corpus ingest→embed pipeline is partly landed — tracked in [#291](https://github.com/protoLabsAI/rabbit-hole.io/issues/291).

The research + deep-research workspace (Atlas) is **wanted and coming back**, currently gated behind the `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS` dev flag while it's rebuilt. It is not the always-on primary surface today, but it is not dead either — treat it as gated/in-progress.

The old Neo4j/Qdrant knowledge-graph layer (graph search, entity extraction, communities, "Living Knowledge Graph") has been **removed**. Don't reintroduce it.

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
- **AI SDK**: Use `getAIModel()` from `@protolabsai/llm-providers/server` for AI SDK models (streamText, generateText)
- **LangChain**: Use `getModel()` from `@protolabsai/llm-providers/server` for LangChain models (legacy paths)
- Use `getGlobalPostgresPool()` from `@protolabsai/database`
- Use `generateSecureId()` from `@protolabsai/utils`
- Use `Icon` from `@protolabsai/icon-system`
- Default theme: `prod-environment` (🐰 rabbit-hole.io)

## Search Engine Architecture

**Frontend**: `useChat` from `@ai-sdk/react` + `DefaultChatTransport` → `POST /api/chat`

**Backend**: AI SDK v6 `streamText`. The graph/community tools were removed with the Neo4j/Qdrant teardown. Current tools:
- `searchWeb` — web search (Tavily; SearXNG self-hosted also supported when `SEARXNG_ENDPOINT` is set)
- `searchWikipedia` — Wikipedia article fetch
- `askClarification` — Ask user a clarifying question (intercepted by middleware)

A corpus search over ingested files (pgvector on Postgres, 1024-dim qwen3 embeddings via the gateway) is landing as the replacement for the old graph search — see [#291](https://github.com/protoLabsAI/rabbit-hole.io/issues/291).

The agent decides tool order and iteration. `stopWhen: stepCountIs(5)`.

**Middleware pipeline** (`@protolabsai/research-middleware`): DeerFlow-inspired composable middleware wraps the streamText agent loop. Hooks fire at lifecycle points: `beforeAgent`, `beforeModel`, `afterModel`, `wrapToolCall`, `afterAgent`. Middleware registered in `app/lib/middleware-config.ts`:

| Middleware | Hook | Purpose |
|---|---|---|
| ResearchPlanner | beforeAgent | Generates 3-5 step research plan for complex queries |
| Clarification | wrapToolCall | Intercepts askClarification, returns question to user |
| LoopDetection | wrapToolCall | Hashes tool calls, warns at repeat 2, blocks at 3 |
| Reflection | afterModel | Evaluates evidence quality, guides gap-filling |
| ParallelDecomposition | beforeAgent | Decomposes complex queries into focused sub-queries |
| DeferredToolLoading | beforeAgent | Deferred tool schema loading (disabled by default) |

> The graph-bound `EntityMemory` (Neo4j knowledge lookup) and `StructuredExtraction` ("Add to Graph" entity preview) middleware were dropped from the default registry when the knowledge graph was removed. The source still exists but is disabled.

**Langfuse tracing**: Every middleware hook, tool call, and LLM call produces Langfuse traces when `LANGFUSE_PUBLIC_KEY` is set. Traces include session ID, query, token usage, and quality metrics. Set `LANGFUSE_BASE_URL` for self-hosted instances.

**File ingestion** flows through the job-processor (`rh ingest` / file upload) → parse/transcribe → corpus storage. The old "Add to Knowledge Graph" entity-extraction path was removed with the graph layer.

**Shared search utilities**: `app/lib/search.ts` holds `searchWeb`, `searchWikipedia`, and `withRetry`. (The now-unused `searchGraph`/`searchCommunities` exports may still linger pending cleanup.) Both `/api/chat` and the gated `/api/research/deep` import from here.

**Key files:**
- `app/page.tsx` — Search engine UI (useChat + ChatMessage)
- `app/lib/search.ts` — Shared search utilities (web, wiki, retry)
- `app/lib/middleware-config.ts` — Middleware registry (all middleware wired here)
- `app/api/chat/route.ts` — Agentic search endpoint (streamText + middleware + tools)
- `app/hooks/useChatSearch.ts` — useChat wrapper
- `app/hooks/useSearchSessions.ts` — Session persistence (localStorage)
- `app/components/search/ChatMessage.tsx` — UIMessage parts renderer
- `app/components/search/ChatMarkdown.tsx` — Markdown renderer with inline citation support
- `app/components/search/ChatSourcePanel.tsx` — Collapsible source panel shown alongside chat responses; citation badges click-scroll to matching card
- `app/components/search/SourceCard.tsx` — Individual source card (title, URL, snippet, highlight state)
- `app/components/search/SearchInput.tsx` — Input with file attach
- `app/components/search/SearchSidebar.tsx` — Session history + nav
- `packages/research-middleware/` — Middleware runtime, chain, registry, tracing, all middleware
- `packages/llm-providers/src/server/ai-sdk.ts` — AI SDK provider adapter

## Deep Research Architecture

> Gated behind `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS` while the research workspace is rebuilt. Wanted and coming back — not a live production surface today.

**Agentic pipeline**: SCOPE → PLAN REVIEW → RESEARCH (per dimension) → EVALUATE (gap analysis) → [loop?] → SYNTHESIS (streamed)

- `POST /api/research/deep` — Start a research job, returns `researchId`
- `GET /api/research/deep/:id` — SSE stream of research events
- `DELETE /api/research/deep/:id` — Cancel a running job
- `GET /api/research/deep/:id/status` — Polling fallback

**Pipeline details:**
- **Scope**: `generateObject` with structured zod schema produces 3-6 dimensions
- **Research loop**: For each dimension: web + wiki search with retry (corpus search lands per #291), then compress findings with `generateObject` extracting `summary` + `keyFinding`
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

1. **Search Engine** (NOW) — Perplexity-style AI search over web (Tavily) + your ingested corpus (pgvector).
2. **Research / Atlas workspace** (COMING BACK) — gated behind `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS`; being rebuilt.
3. **Research App** (FUTURE) — Downloadable Tauri/Electron self-hostable app.

## `rh` CLI

The old `packages/mcp-server` HTTP MCP server (12 tools, port 3398, graph-bound) has been superseded by the **`@protolabsai/rabbit-hole-cli`** package (`packages/cli`, bin `rh`). Fleet agents shell out to `rh` rather than calling MCP/A2A over HTTP. It's a thin Tavily + LLM-gateway tool with no graph dependencies.

Commands:
- `rh search <query>` — web search via Tavily (with answer summary); JSON by default, `--text` for markdown, `-m/--max <n>` for result count.
- `rh research <topic>` — multi-step deep research: planner → fan-out searches → synthesized markdown report. `-d/--depth <n>`, `--max-results <n>`.
- `rh ingest <source>` — queue a local file or URL to the job-processor for parsing/transcription. `-m/--media-type <type>`, `--wait`.
- `rh status <job-id>` — get current state of an ingest job. `--wait`, `--result`.

All model traffic points at the LiteLLM gateway by default (Langfuse-traced, cost-accounted). Env: `RH_LLM_URL` / `RH_LLM_KEY` / `RH_LLM_MODEL`, `TAVILY_API_KEY`, job-processor URL. See `packages/cli/src/`.
