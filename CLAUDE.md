# CLAUDE.md

## Git Workflow

- **Two-branch model**: `dev` (integration) and `main` (production)
- Feature branches are created from `dev` and PR back to `dev`
- Promote to production: merge `dev` → `main` via PR
- No staging branch
- **Never commit unresolved merge conflicts** — pre-commit hook blocks `<<<<<<` markers
- When merging branches, always verify zero conflict markers before committing

## Code Conventions

- **Monorepo**: pnpm workspace + Turborepo
- **Testing**: Vitest, TDD approach
- **Linting**: ESLint flat config with strict import ordering
- Use `getModel()` from `@proto/llm-providers/server` — never import LangChain models directly
- Use `getGlobalPostgresPool()` from `@proto/database` — never create `Pool` directly
- Use `generateSecureId()` from `@proto/utils` — takes no arguments, never use `crypto.randomUUID`

## Project Structure

- `apps/` — Next.js applications (rabbit-hole, playground, etc.)
- `packages/` — Shared libraries (@proto/types, @proto/database, @proto/utils, etc.)
- `services/` — Backend services (job-processor)
- `agent/` — LangGraph agent server
- `custom-domains/` — Entity type definitions
- `packages/mcp-server/plugins/rabbit-hole/` — Claude Code plugin (commands: `/research`, `/ingest`, `/graph`; agents: `deep-research`, `entity-extractor`)

## Rabbit Hole Plugin

The rabbit-hole Claude Code plugin is installed as a user-level marketplace in `~/.claude/settings.json`. It provides:

- `/research <topic>` — Research an entity/topic and extract structured knowledge
- `/ingest <url or file>` — Ingest URLs, PDFs, audio, video, or documents
- `/graph <topic>` — Build and validate knowledge graph bundles
- MCP tools: `mcp__rabbit-hole__*` (web_search, tavily_search, wikipedia_search, extract_entities, research_entity, etc.)

Required env vars: `RABBIT_HOLE_ROOT`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `GROQ_API_KEY`
