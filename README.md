# Rabbit Hole

A self-growing knowledge graph search engine. Every search makes the graph smarter.

## What Is This?

Rabbit Hole is an AI search engine backed by a living knowledge graph. When you search, the graph expands — new entities, relationships, and evidence are discovered and ingested in real-time. Upload documents and they become part of the knowledge base. Every piece of knowledge is traceable to its source.

### Product Roadmap

| Phase | Product | Status |
|-------|---------|--------|
| **1** | **Search Engine** (`/`) — Perplexity-style AI search. Self-growing knowledge graph. | Active |
| **2** | **3D Atlas** — GPU-accelerated 3D graph visualization (Cosmograph) for millions of nodes. | In Progress |
| **3** | **Research App** — Downloadable self-hostable app (Tauri/Electron) with full research workspace. | Planned |

### Current Surfaces

| Surface | Description |
|---------|-------------|
| **Search** (`/`) | AI search engine. Graph search + web research + streaming answers + user-triggered KG ingest + deep research mode. |
| **Atlas** (`/atlas`) | 3D knowledge graph visualization (react-force-graph-3d, migrating to Cosmograph GPU renderer) |
| **Research** (`/research`) | Research workspace (React Flow canvas, entity cards, enrichment wizards). Dev-only — gated by `ENABLE_RESEARCH=true`. |

## Quick Start

```bash
git clone https://github.com/protoLabsAI/rabbit-hole.io.git
cd rabbit-hole.io
pnpm install

# Start infrastructure
docker compose -f docker-compose.research.yml up -d

# Start Next.js
pnpm dev

# Open search engine
open http://localhost:3399
```

### Services

| Service | Port | Purpose |
|---------|------|---------|
| Next.js | 3399 | Web application + search engine |
| Neo4j Browser | 7474 | Graph database UI |
| Neo4j Bolt | 7687 | Graph database protocol |
| MinIO Console | 9001 | Object storage UI |
| Job Processor | 8680 | Media processing + job queue |
| LangGraph Agent | 8123 | AI research agent |

## How Search Works

### Quick Search (`POST /api/chat`)

```
User query (+ optional file attachments)
    │
    ├─ searchGraph: Neo4j full-text search (sub-5ms via Lucene index)
    ├─ searchWeb: Tavily advanced search (if graph is thin)
    ├─ searchWikipedia: Wikipedia article fetch (for foundational context)
    ├─ AI SDK v6 streamText with tool loop (up to 5 steps)
    └─ Stream answer with inline citations
```

Users can click **"Add to Knowledge Graph"** on any answer to extract entities and ingest them — graph growth is user-controlled, not automatic.

### Deep Research (`POST /api/research/deep`)

```
User query
    │
    ├─ SCOPE: generateObject → 3-6 research dimensions (structured output)
    ├─ PLAN REVIEW: Show dimensions to user (auto-continues)
    ├─ RESEARCH LOOP (per dimension, up to 3 iterations):
    │   ├─ searchGraph + searchWeb + searchWikipedia (with retry)
    │   ├─ Compress findings → extract key finding
    │   └─ EVALUATE: LLM checks for coverage gaps → loop if gaps found
    ├─ SYNTHESIS: streamText → report with inline citations [1][2]
    └─ Stream report chunks to UI as they're generated
```

Three-panel UI: Activity feed (left) | Report with ToC + citations (center) | Source cards panel (right). Cancel button preserves partial reports.

Sessions are stored locally and accessible via URL (`?s=<id>`). Conversation history provides context for follow-up questions.

## Architecture

```
rabbit-hole.io/
├── apps/rabbit-hole/          # Next.js application
│   ├── app/                   # Search engine landing page
│   ├── app/atlas/             # 3D knowledge graph visualization
│   ├── app/research/          # Research workspace (dev-only, gated by ENABLE_RESEARCH)
│   ├── app/evidence/          # Evidence management
│   ├── app/lib/search.ts      # Shared search utilities (graph, web, wiki)
│   ├── app/api/chat/          # AI SDK v6 agentic search + ingest
│   ├── app/api/research/deep/ # Deep research pipeline (SSE + cancel)
│   ├── app/api/entity-search/ # Full-text entity lookup
│   └── app/api/ingest-bundle/ # Bundle ingestion
├── packages/
│   ├── @proto/types               # Zod schemas, bundle format, entity types
│   ├── @proto/database            # Neo4j + PostgreSQL clients
│   ├── @proto/mcp-server          # MCP tools (stdio + HTTP, port 3398)
│   ├── @proto/research-middleware # AI SDK middleware chain (EntityMemory, Reflection, etc.)
│   ├── @proto/llm-providers       # LLM abstraction (Claude, GPT, Gemini)
│   ├── @proto/ui                  # Component library (atoms/molecules/organisms)
│   └── @proto/utils               # Graph algorithms, atlas config
├── services/job-processor/    # Media ingestion + job queue (Sidequest)
├── agent/                     # LangGraph agent server
├── migrations/                # Neo4j schema migrations
├── docs/                      # Technical documentation
└── custom-domains/            # Entity type definitions
```

## MCP Integration

The `@proto/mcp-server` provides tools for Claude Code and other MCP clients:

| Tool | Purpose |
|------|---------|
| `graph_search` | Search the knowledge graph for existing entities |
| `research_entity` | Full research pipeline: search → extract → validate → persist |
| `extract_entities` | LLM-based entity extraction from text |
| `ingest_bundle` | Persist a bundle into Neo4j |
| `validate_bundle` | Validate bundle structure |
| `wikipedia_search` | Fetch Wikipedia articles |
| `tavily_search` | Premium web search |
| `web_search` | SearXNG self-hosted web search |
| `ingest_url` | Fetch and ingest a URL into the knowledge graph |
| `ingest_file` | Upload and ingest a local file |
| `transcribe_audio` | Transcribe audio and ingest as evidence |
| `extract_pdf` | Extract text from a PDF and ingest |

## Tech Stack

- **Search**: Neo4j full-text (Lucene), Tavily, Wikipedia, DuckDuckGo
- **Graph database**: Neo4j 5 with APOC
- **AI**: AI SDK v6 (`streamText`, `generateObject`), Claude via `@proto/llm-providers`, LangGraph agents
- **Framework**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, @proto/ui component library, Lucide icons
- **Media**: Job processor with adapters for PDF, audio, video, text, HTML
- **Storage**: PostgreSQL (Sidequest job queue), MinIO (S3-compatible)
- **Monorepo**: pnpm workspaces + Turborepo

## Documentation

See [`docs/`](docs/) for detailed technical documentation:
- [Search System](docs/architecture/search.md) — full pipeline, self-growing graph, scaling roadmap
- [Database & Schema](docs/architecture/database.md) — Neo4j schema, entity model, indexes
- [Entity Search API](docs/api/entity-search.md) — endpoint reference
- [MCP Tools](docs/api/mcp-tools.md) — all MCP tool interfaces
- [Migrations](docs/operations/migrations.md) — Neo4j migration runbook

## License

Private — all rights reserved.
