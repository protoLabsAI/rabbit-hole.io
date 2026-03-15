# Rabbit Hole

A self-growing knowledge graph search engine. Every search makes the graph smarter.

## What Is This?

Rabbit Hole is an AI search engine backed by a living knowledge graph. When you search, the graph expands — new entities, relationships, and evidence are discovered and ingested in real-time. Upload documents and they become part of the knowledge base. Every piece of knowledge is traceable to its source.

### Surfaces

| Surface | Description |
|---------|-------------|
| **Search** (`/`) | Perplexity-style AI search engine. Graph search + web research + streaming answers. |
| **Atlas** (`/atlas`) | Interactive knowledge graph visualization (Cytoscape.js) |
| **Research** (`/research`) | AI-assisted research workspace (React Flow + CopilotKit) |
| **Evidence** (`/evidence`) | Evidence timeline and provenance viewer |

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
open http://localhost:3000
```

### Services

| Service | Port | Purpose |
|---------|------|---------|
| Next.js | 3000 | Web application + search engine |
| Neo4j Browser | 7474 | Graph database UI |
| Neo4j Bolt | 7687 | Graph database protocol |
| MinIO Console | 9001 | Object storage UI |
| Job Processor | 8680 | Media processing + job queue |
| LangGraph Agent | 8123 | AI research agent |

## How Search Works

```
User query (+ optional file attachments)
    │
    ├─ Neo4j graph search (instant, sub-5ms via Lucene full-text index)
    ├─ Evidence node fetch (provenance for found entities)
    ├─ Web research if graph is thin (Tavily + Wikipedia, parallel)
    ├─ Auto-extract entities → ingest back to graph (self-growing)
    ├─ Process uploaded files via job-processor pipeline
    ├─ Stream AI answer with citations (getModel("smart"))
    └─ Generate follow-up suggestions (getModel("fast"))
```

Sessions are stored locally and accessible via URL (`?s=<id>`). Conversation history provides context for follow-up questions.

## Architecture

```
rabbit-hole.io/
├── apps/rabbit-hole/          # Next.js application
│   ├── app/                   # Search engine landing page
│   ├── app/atlas/             # Knowledge graph visualization
│   ├── app/research/          # Research workspace
│   ├── app/evidence/          # Evidence management
│   ├── app/api/search/        # Streaming search API (SSE)
│   ├── app/api/entity-search/ # Full-text entity lookup
│   └── app/api/ingest-bundle/ # Bundle ingestion
├── packages/
│   ├── @proto/types           # Zod schemas, bundle format, entity types
│   ├── @proto/database        # Neo4j + PostgreSQL clients
│   ├── @proto/mcp-server      # MCP tools for Claude Code
│   ├── @proto/llm-providers   # LLM abstraction (Claude, GPT, Gemini)
│   ├── @proto/ui              # Component library (atoms/molecules/organisms)
│   └── @proto/utils           # Graph algorithms, atlas config
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
| `web_search` | DuckDuckGo search |

## Tech Stack

- **Search**: Neo4j full-text (Lucene), Tavily, Wikipedia, DuckDuckGo
- **Graph database**: Neo4j 5 with APOC
- **AI**: Claude via `@proto/llm-providers`, LangGraph agents
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
