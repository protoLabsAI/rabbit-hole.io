# Handoff: Rabbit Hole Deep Research Platform

**Date**: 2026-03-14
**Handoff Number**: 001

---

## Overview/Summary

Rabbit Hole is a self-hosted deep research platform extracted from the proto-starter monorepo. In this session, we took it from a non-functional extraction (broken Clerk auth, missing packages, disconnected agent pipeline) to a working research platform with an MCP server and Claude Code plugin.

The **MCP server and plugin are the primary interface** — they expose 10 research and media processing tools that any MCP client can use. The web UI (React Flow + CopilotKit) exists as a POC but needs further work to be production-ready.

## Background/Context

- **Origin**: Extracted from `https://github.com/protoLabsAI/proto-starter` — a multi-tenant SaaS with Clerk auth, Hocuspocus collaboration, and tiered pricing. None of that applies to the self-hosted version.
- **Decision: Tools-first**: After struggling with UI render loops and workspace initialization, we pivoted to building an MCP server that exposes research capabilities directly. Any agent (Claude Code, Cursor, custom) can now run research without the web UI.
- **Architecture**: Monorepo with pnpm workspaces + Turborepo. Next.js app, LangGraph agent server, job processor for media, PostgreSQL + Neo4j + MinIO infrastructure.

## Current State

### What's working:
- [x] Clerk auth removed from 118+ files (local-user context)
- [x] Hocuspocus removed, local Yjs/IndexedDB forced
- [x] MCP server with 10 tools (search, extract, ingest, validate)
- [x] Claude Code plugin with commands (/research, /ingest, /graph) and agents
- [x] Plugin installed and configured on KJ's machine
- [x] Docker infrastructure (Postgres, Neo4j, MinIO, Job Processor, LangGraph Agent)
- [x] Agent → Canvas bridge wired (CopilotKit action + event listener)
- [x] Multi-provider search (Wikipedia, DuckDuckGo, Tavily)
- [x] Research depth controls
- [x] Parallel subagent execution
- [x] Research scoping phase
- [x] `pnpm install` succeeds
- [x] Dev server starts (`pnpm --filter @apps/rabbit-hole dev`)
- [x] All merged to main

### What needs work:
- [ ] **Web UI render performance** — The full workspace page freezes the browser (too many components + Yjs observers). The minimal POC page (`ResearchPOC.tsx`) loads but the CopilotKit → LangGraph agent flow needs tuning
- [ ] **LangGraph agent scoping** — Agent still expects `entityName`/`entityType` in state; the fix to extract from chat messages was deployed but needs Docker container rebuild verification
- [ ] **`packages/forms`** — Copied from proto-starter but not cleaned up; may have stale Clerk references
- [ ] **Stale worktrees** — 11+ worktrees in `.worktrees/` from agent runs; should be cleaned up
- [ ] **CI pipeline** — GitHub Actions workflow has failing checks (Validate Code, Docker Lint); needs attention
- [ ] **`@proto/collab` package** — Directory exists with only `node_modules/`; should be fully deleted
- [ ] **End-to-end test** — No automated test that runs: search → extract → validate → output bundle

## Technical Approach

### MCP Server Architecture
```
packages/mcp-server/
├── src/
│   ├── index.ts          # Server entry (stdio transport)
│   ├── handler.ts        # Tool dispatch + implementations
│   └── tools/
│       ├── research-tools.ts  # 6 research tools
│       └── media-tools.ts     # 4 media tools
├── plugins/
│   ├── .claude-plugin/marketplace.json
│   └── rabbit-hole/      # Claude Code plugin
│       ├── .claude-plugin/plugin.json
│       ├── hooks/         # start-mcp.sh, health checks
│       ├── commands/      # /research, /ingest, /graph
│       └── agents/        # deep-research, entity-extractor
└── dist/index.js          # Built output
```

### Tool Implementations
- **Search tools** (wikipedia_search, web_search, tavily_search) — Call external APIs directly, no Docker needed
- **Entity extraction** (extract_entities) — Calls Anthropic API with structured extraction prompt
- **Research pipeline** (research_entity) — Orchestrates search → extract → validate in sequence
- **Media tools** (ingest_url, ingest_file, transcribe_audio, extract_pdf) — Proxy to job-processor at localhost:8680 (requires Docker)

### Agent Architecture (LangGraph)
```
agent/src/research-agent/
├── index.ts              # Graph definition
├── state.ts              # CopilotKit-enabled state
├── graph/nodes.ts        # Coordinator node
└── prompts/              # Re-exports from @proto/deepagent
```
- 6 subagents: evidence-gatherer, entity-extractor, field-analyzer, entity-creator, relationship-mapper, bundle-assembler
- Coordinator orchestrates via tool calls
- CopilotKit integration streams state to frontend

### Key Patterns
- `getModel()` from `@proto/llm-providers/server` — never import LangChain directly
- `getGlobalPostgresPool()` from `@proto/database` — never create Pool directly
- `generateSecureId()` from `@proto/utils` — never use crypto.randomUUID()
- Git workflow: `dev` → `main`, feature branches from dev

## Key Files and Documentation

| File | Purpose |
|------|---------|
| `packages/mcp-server/src/index.ts` | MCP server entry point |
| `packages/mcp-server/src/handler.ts` | All tool implementations |
| `packages/mcp-server/plugins/rabbit-hole/` | Claude Code plugin |
| `packages/mcp-server/README.md` | MCP server setup docs |
| `apps/rabbit-hole/app/research/ResearchPOC.tsx` | Minimal research UI (React Flow + CopilotKit) |
| `apps/rabbit-hole/app/research/ResearchClientWorkspace.tsx` | Full workspace UI (broken, too heavy) |
| `agent/src/research-agent/` | LangGraph research agent |
| `packages/deepagent/src/prompts/coordinator.ts` | Agent coordinator prompt |
| `packages/deepagent/src/graph/scoping/nodes.ts` | Research scoping logic |
| `docker-compose.research.yml` | Infrastructure services |
| `.env.research` | Environment variables (API keys, DB creds) |
| `HANDOFF.md` | Original extraction handoff from proto-starter |
| `CLAUDE.md` | Code conventions and project structure |

## Acceptance Criteria

For this platform to be "production ready":
- [ ] `/research Apollo space program` in Claude Code returns a validated entity bundle
- [ ] `/ingest https://some-url.com/paper.pdf` extracts text successfully
- [ ] `/graph Tesla` produces a knowledge graph with 10+ entities
- [ ] Web UI at localhost:3000/research loads without freezing
- [ ] CopilotKit chat sends query → agent researches → entities appear on canvas
- [ ] `pnpm build` passes for all packages
- [ ] CI checks pass on GitHub

## Open Questions/Considerations

1. **Should the full workspace UI be salvaged or rebuilt?** The `ResearchClientWorkspace` has deep render loops from Yjs observer cascades. The POC (`ResearchPOC.tsx`) works but is minimal. A middle ground might be to incrementally add features to the POC.

2. **LangGraph agent container rebuilds** — Changes to `packages/deepagent/` require rebuilding the Docker image (`docker compose build langgraph-agent`). Consider volume-mounting the agent source for faster dev iteration.

3. **Missing packages from proto-starter** — `@proto/forms` was copied wholesale. Other missing packages (`@proto/freehand-drawing`, `@proto/graph-editor`, `@proto/prompts`) are referenced in code but not extracted. These should be stubbed or the references removed.

4. **Neo4j integration** — The graph database is running but the "Merge to Neo4j" workflow isn't connected. Bundles are validated but not persisted to Neo4j yet.

5. **CopilotKit license** — The public license key `ck_pub_5d425f60d199031698f99a979d267a19` is hardcoded. May need to be rotated or made configurable.

## Next Steps

1. **Test the plugin end-to-end** — Start a new Claude Code session and run `/research Apollo space program`. Verify the full flow: MCP server starts → Wikipedia search → entity extraction → bundle validation → output.

2. **Fix the LangGraph agent** — Rebuild the Docker container to pick up the coordinator prompt changes. Test that free-form questions work (not just entityName/entityType).

3. **Clean up the repo** — Remove stale worktrees (`.worktrees/`), empty `packages/collab/`, and fix the `.gitignore`. Run `pnpm build` and fix any compilation errors.

4. **Improve the web UI** — Start from `ResearchPOC.tsx` and incrementally add: workspace persistence (Yjs), entity node types (custom React Flow nodes), and the chat streaming indicators.

5. **Add Neo4j persistence** — Wire the "Merge to Neo4j" workflow so validated bundles are stored in the graph database for cross-session queries.

6. **Set up CI** — Fix the GitHub Actions workflow so `pnpm build` and tests pass on PRs.
