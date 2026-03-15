# CLAUDE.md

## Git Workflow

- **Ship to main**: Feature branches are created from `main` and PR back to `main`
- PRs are squash-merged with auto-merge when CI passes
- **Never commit unresolved merge conflicts** — pre-commit hook blocks `<<<<<<` markers
- When merging branches, always verify zero conflict markers before committing

## Code Conventions

- **Monorepo**: pnpm workspace + Turborepo
- **Testing**: Vitest, TDD approach
- **Linting**: ESLint flat config with strict import ordering
- Use `getModel()` from `@proto/llm-providers/server` — never import LangChain models directly
- Use `getGlobalNeo4jClient()` from `@proto/database` — never create Neo4j driver directly
- Use `getGlobalPostgresPool()` from `@proto/database` — never create `Pool` directly
- Use `generateSecureId()` from `@proto/utils` — takes no arguments, never use `crypto.randomUUID`
- Use `Icon` from `@proto/icon-system` — never import `lucide-react` directly
- Default theme: `prod-environment` (🐰 rabbit-hole.io branding)

## Project Structure

- `apps/rabbit-hole/` — Next.js application (search engine, atlas, research, evidence)
- `apps/rabbit-hole/app/page.tsx` — AI search engine landing page
- `apps/rabbit-hole/app/api/search/` — Streaming search API (SSE)
- `apps/rabbit-hole/app/api/entity-search/` — Full-text entity lookup (Neo4j Lucene)
- `apps/rabbit-hole/app/api/ingest-bundle/` — Bundle ingestion into Neo4j
- `packages/` — Shared libraries (@proto/types, @proto/database, @proto/ui, @proto/utils, etc.)
- `packages/mcp-server/` — MCP server with research tools and Claude Code plugin
- `services/job-processor/` — Media ingestion pipeline (PDF, audio, video, text)
- `agent/` — LangGraph agent server
- `migrations/` — Neo4j schema migrations (run with cypher-shell or Node.js)
- `docs/` — Technical documentation (architecture, API, operations)
- `custom-domains/` — Entity type definitions

## Search Engine

The landing page (`/`) is a Perplexity-style AI search engine:

1. Graph search via Neo4j full-text index (sub-5ms)
2. Web research via Tavily + Wikipedia when graph is thin
3. Auto-extract entities and ingest back (self-growing graph)
4. Process file attachments via job-processor media pipeline
5. Stream AI answer with citations via `getModel("smart")`
6. Follow-up suggestions via `getModel("fast")`

Sessions stored in localStorage, synced to URL via `?s=<id>`.

## Rabbit Hole Plugin

The rabbit-hole Claude Code plugin provides:

- `/research <topic>` — Research an entity/topic and extract structured knowledge
- `/ingest <url or file>` — Ingest URLs, PDFs, audio, video, or documents
- `/graph <topic>` — Build and validate knowledge graph bundles
- MCP tools: `graph_search`, `research_entity`, `extract_entities`, `validate_bundle`, `ingest_bundle`, `wikipedia_search`, `tavily_search`, `web_search`

Required env vars: `RABBIT_HOLE_ROOT`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `GROQ_API_KEY`
