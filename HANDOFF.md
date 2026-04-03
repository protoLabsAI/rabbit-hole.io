# Rabbit Hole — Developer Handoff

**Date:** 2026-03-13
**Repo:** https://github.com/protoLabsAI/rabbit-hole.io
**Branch:** `main`
**Extracted from:** proto-starter monorepo (https://github.com/protoLabsAI/proto-starter)

---

## What This Is

A self-hostable deep research platform. Users ask research questions, an AI agent investigates using multiple search providers and source types, extracts entities and relationships with per-claim citations, and streams results onto a React Flow graph board for exploration and curation.

**Single-user first.** No multi-tenant, no collaborative editing, no SaaS tiers.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │ CopilotKit    │  │ React Flow Board                 │ │
│  │ Chat Interface│  │ (Graphology → React Flow → Yjs)  │ │
│  └──────┬───────┘  └──────────────┬───────────────────┘ │
└─────────┼──────────────────────────┼────────────────────┘
          │                          │
          ▼                          ▼
┌─────────────────┐     ┌──────────────────┐
│  Next.js App     │     │  IndexedDB        │
│  (port 3000)     │     │  (local Yjs)      │
│  API routes      │     └──────────────────┘
└────────┬────────┘
         │
    ┌────┴────┬──────────────┬───────────────┐
    ▼         ▼              ▼               ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│LangGraph│ │PostgreSQL│ │  Neo4j   │ │  MinIO       │
│ Agent   │ │  (app)  │ │  (graph) │ │  (files)     │
│ :8123   │ │  :5432  │ │  :7687   │ │  :9000/:9001 │
└────┬────┘ └────────┘ └──────────┘ └──────────────┘
     │
     ▼
┌──────────────┐
│ Job Processor │
│ (ingestion)   │
│ :8680         │
└──────────────┘
```

---

## Directory Structure

```
rabbit-hole.io/
├── apps/rabbit-hole/             # Next.js 15 application
│   ├── app/research/             # Main research page (React Flow board)
│   ├── app/api/                  # API routes
│   └── middleware.ts             # Auth middleware
├── agent/                        # LangGraph agent server
│   ├── src/research-agent/       # 6 subagents (evidence, extraction, analysis, etc.)
│   ├── src/writing-agent/        # Document editing agent
│   └── langgraph.json            # Graph registration config
├── services/job-processor/       # Media ingestion pipeline
│   ├── src/adapters/             # 7 format adapters (text, pdf, docx, audio, video, etc.)
│   └── src/api/                  # REST API (POST /ingest, GET /ingest/:id/stream)
├── packages/                     # Shared libraries (@proto/*)
│   ├── types/                    # Zod schemas, entity types, bundle types
│   ├── database/                 # PostgreSQL pool + queries
│   ├── utils/                    # MinIO storage, file processing, domain helpers
│   ├── ui/                       # Component library (shadcn/ui + Radix)
│   ├── llm-providers/            # LLM abstraction (Anthropic, OpenAI, Groq, Ollama)
│   ├── deepagent/                # Deep research agent logic
│   ├── auth/                     # *** NEEDS REMOVAL — Clerk auth ***
│   ├── collab/                   # *** NEEDS REMOVAL — Hocuspocus collab ***
│   └── ... (20 packages total)
├── custom-domains/               # Entity type definitions (JSON configs)
├── migrations/postgresql/        # Database migrations
├── docker/postgres/              # Custom Postgres Dockerfile
├── scripts/                      # Dev tooling
└── docker-compose.research.yml   # Infrastructure services
```

---

## Immediate TODO: Rip Out Clerk + Hocuspocus

This is the **#1 priority** before any new feature work. The app currently requires Clerk auth and tries to connect to a Hocuspocus WebSocket server (ws://localhost:1234) that doesn't exist in the self-hosted stack.

### Clerk Removal

Clerk is deeply integrated — 40+ files import from `@clerk/nextjs`.

**Files to modify:**
- `apps/rabbit-hole/middleware.ts` — Replace `clerkMiddleware()` with a simple pass-through or local session check
- `apps/rabbit-hole/app/layout.tsx` — Remove `<ClerkProvider>` wrapper
- `apps/rabbit-hole/app/components/layout/GlobalUserMenu.tsx` — Remove `<SignedIn>` wrapper, simplify user menu
- `apps/rabbit-hole/app/research/ResearchClientWorkspace.tsx` — Remove `useAuth()` dependency for workspace ID generation
- All API routes using `auth()` — Replace with a fixed local user ID
- `packages/auth/` — Can be gutted or deleted entirely

**Strategy:** Replace all `useAuth()` / `auth()` calls with a hardcoded local user context. For single-user self-hosted, there's no need for real auth. A simple context provider that returns `{ userId: "local-user" }` is sufficient.

### Hocuspocus Removal

The workspace hook (`apps/rabbit-hole/app/research/hooks/useWorkspace.ts`) selects between local Yjs (IndexedDB) and Hocuspocus (WebSocket) based on user tier. Since there's no Hocuspocus server and no tiers, force local-only mode.

**Files to modify:**
- `apps/rabbit-hole/app/research/hooks/useWorkspace.ts` — Always use `useLocalYjs`, never `useHocuspocusYjs`
- `apps/rabbit-hole/app/hooks/useHocuspocusYjs.ts` — Can be deleted
- `packages/collab/` — Can be deleted
- `services/yjs-collaboration-server/` — Already removed from this repo

**Strategy:** Remove the tier-based provider selection. Always use `useLocalYjs` which stores workspace state in IndexedDB.

---

## Critical Gap: Agent → Canvas Bridge

The deep research agent produces entity bundles but they **never reach the React Flow board**. This is the core feature gap.

**Current flow (broken):**
```
User asks question → CopilotKit → LangGraph agent → bundle JSON → ???
```

**Target flow:**
```
User asks question → CopilotKit → LangGraph agent → stream entities
  → API route receives entities → pushes to React Flow graph
  → User sees entities appear on canvas in real-time
```

The bundle format is defined in `packages/types/` as `RabbitHoleBundleData`:
- `entities[]` — Nodes with uid, name, type, properties, tags, aliases
- `relationships[]` — Edges with uid, type, source, target, properties
- `evidence[]` — Source citations
- `content[]` — Content nodes
- `files[]` — File references
- `entityCitations{}` — Per-entity source mapping
- `relationshipCitations{}` — Per-relationship source mapping

The React Flow board already knows how to render these (see `apps/rabbit-hole/app/research/lib/bundle-exporter.ts` for the export side).

---

## Other Known Gaps

1. **Search providers** — Currently Wikipedia-only. Need Tavily + DuckDuckGo + Wikipedia
2. **Research depth** — `researchDepth` config exists but is a no-op. Needs to control agent iteration depth
3. **Sequential subagents** — The 6 research subagents run sequentially. Need parallel execution
4. **No scoping phase** — Agent should clarify the question and generate a research brief before diving in
5. **Media pipeline disconnected** — Job processor works standalone but agent can't trigger ingestion

---

## Running Locally

### Prerequisites
- Node.js 20+
- pnpm 10+
- Docker Desktop

### Infrastructure Services
```bash
# Start Postgres, Neo4j, MinIO, Job Processor, LangGraph Agent
docker compose -f docker-compose.research.yml --env-file .env.research up -d
```

### Next.js Dev Server
```bash
# Install deps
pnpm install

# Create .env.local with:
#   APP_DATABASE_URL=postgresql://app_user:changeme@localhost:5432/rabbit_hole_app
#   NEO4J_URI=bolt://localhost:7687
#   NEO4J_USER=neo4j
#   NEO4J_PASSWORD=changeme
#   JOB_PROCESSOR_URL=http://localhost:8680
#   MINIO_ENDPOINT=localhost:9000
#   MINIO_ACCESS_KEY=minio
#   MINIO_SECRET_KEY=changeme
#   MINIO_USE_SSL=false
#   COPILOTKIT_REMOTE_URL=http://localhost:8123
#   ANTHROPIC_API_KEY=<your key>
#   OPENAI_API_KEY=<your key>
#   TAVILY_API_KEY=<your key>

# Start dev server
pnpm --filter @apps/rabbit-hole dev
```

**Note:** Next.js runs outside Docker. The Docker build OOMs on machines with < 16GB RAM allocated to Docker. Use the dev server locally, Nix build for cloud deployment.

### Service Ports
| Service | Port | URL |
|---------|------|-----|
| Rabbit Hole | 3000 | http://localhost:3000/research |
| Neo4j Browser | 7474 | http://localhost:7474 |
| MinIO Console | 9001 | http://localhost:9001 |
| Job Processor | 8680 | http://localhost:8680/health |
| LangGraph Agent | 8123 | http://localhost:8123/ok |
| PostgreSQL | 5432 | `psql -U app_user -d rabbit_hole_app` |

---

## Code Conventions

- **`getModel()`** from `@proto/llm-providers/server` — never import LangChain models directly
- **`getGlobalPostgresPool()`** from `@proto/database` — never create `Pool` directly
- **`generateSecureId()`** from `@proto/utils` — never use `crypto.randomUUID()`
- **Strict import ordering** enforced by ESLint (builtin → external → @proto/* → internal)
- **pnpm workspace + Turborepo** for builds
- **Vitest** for testing, TDD approach

---

## Key Files Reference

| Area | File | Purpose |
|------|------|---------|
| Research page | `apps/rabbit-hole/app/research/page.tsx` | Entry point for research UI |
| React Flow editor | `apps/rabbit-hole/app/research/components/ResearchEditor.tsx` | Graph visualization |
| Workspace hook | `apps/rabbit-hole/app/research/hooks/useWorkspace.ts` | Multi-tab workspace with Yjs |
| Chat interface | `apps/rabbit-hole/app/research/components/ResearchChatInterface.tsx` | CopilotKit chat |
| Bundle exporter | `apps/rabbit-hole/app/research/lib/bundle-exporter.ts` | Graph → bundle JSON |
| Bundle types | `packages/types/src/rabbit-hole-bundle.ts` | RabbitHoleBundleData schema |
| Agent supervisor | `agent/src/research-agent/` | LangGraph research agent |
| Agent config | `agent/langgraph.json` | Graph registration |
| Media ingestion | `services/job-processor/src/adapters/` | 7 format adapters |
| Entity types | `custom-domains/` | JSON entity definitions |
| Docker infra | `docker-compose.research.yml` | All infrastructure services |

---

## Git Workflow

- **Two-branch model:** `dev` (integration) → `main` (production)
- Feature branches from `dev`, PR back to `dev`
- Promote via `dev` → `main` PR when ready
- No staging branch

---

## Docker Build Notes

The rabbit-hole Next.js image requires special handling for memory-constrained environments:

- `SKIP_DTS=1` — Skips TypeScript declaration generation in `@proto/llm-tools` (saves ~4GB RAM)
- `SKIP_STANDALONE=1` — Disables Next.js standalone output tracing (saves ~2GB RAM)
- `webpackBuildWorker: false` — Disabled in next.config.js (spawns parallel worker that doubles memory)
- `--max-old-space-size=6144` — Heap limit set to 6GB (needs ~8GB Docker allocation)
- `--concurrency=1` — Turbo builds packages one at a time
- **Build all containers stopped** — Docker can't build the Next.js image while running other containers on < 16GB machines

The LangGraph agent runs via `npx langgraphjs dev --port 8123 --host 0.0.0.0 --no-browser` and needs a `.env` file (even if empty) in its working directory.
