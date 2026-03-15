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

**Key files:**
- `app/page.tsx` — Search engine UI (useChat + ChatMessage)
- `app/api/chat/route.ts` — Agentic search endpoint (streamText + tools)
- `app/api/chat/ingest/route.ts` — Manual entity extraction + ingest
- `app/api/entity-search/route.ts` — Neo4j full-text entity lookup
- `app/hooks/useChatSearch.ts` — useChat wrapper
- `app/hooks/useSearchSessions.ts` — Session persistence (localStorage)
- `app/components/search/ChatMessage.tsx` — UIMessage parts renderer
- `app/components/search/SearchInput.tsx` — Input with file attach
- `app/components/search/SearchSidebar.tsx` — Session history + nav
- `packages/llm-providers/src/server/ai-sdk.ts` — AI SDK provider adapter

## Product Vision

1. **Search Engine** (NOW) — Perplexity-style AI search. User-controlled graph growth.
2. **3D Atlas** (NEXT) — Replace Cytoscape with modern 3D for millions of nodes.
3. **Research App** (FUTURE) — Downloadable Tauri/Electron self-hostable app.

## MCP Plugin

- `/research`, `/ingest`, `/graph` commands
- Tools: `graph_search`, `research_entity`, `extract_entities`, `validate_bundle`, `ingest_bundle`, `wikipedia_search`, `tavily_search`, `web_search`
- Env: `RABBIT_HOLE_ROOT`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `GROQ_API_KEY`
