# Rabbit Hole

A community-driven, evidence-based knowledge graph search engine. Every search makes the graph smarter. The rabbit hole goes deeper the more you explore.

## What Is This?

Rabbit Hole is a search engine backed by a living knowledge graph. When you search, the graph expands — new entities, relationships, and evidence are discovered and added in real-time. Every piece of knowledge is traceable to its source.

### Three Surfaces

**Atlas** (public, hosted) — The knowledge graph search engine. Pre-populated with Wikipedia. Expands as users search. Community-owned.

**Research App** (private, Electron) — AI-assisted research workspace you download and self-host. Pull entities from the Atlas, investigate locally, submit back when ready. We host none of your data.

**Research Demo** (hosted web) — Try the Research App in your browser before downloading.

## Quick Start

```bash
# Clone and install
git clone https://github.com/protoLabsAI/rabbit-hole.io.git
cd rabbit-hole.io
pnpm install

# Start infrastructure (Neo4j, Postgres, MinIO, Job Processor, LangGraph Agent)
docker compose -f docker-compose.research.yml up -d

# Start Next.js
pnpm dev

# Open Atlas
open http://localhost:3000/atlas
```

### Services

| Service | Port | Purpose |
|---------|------|---------|
| Next.js | 3000 | Web application |
| Neo4j Browser | 7474 | Graph database UI |
| Neo4j Bolt | 7687 | Graph database protocol |
| MinIO Console | 9001 | Object storage UI |
| Job Processor | 8680 | Background processing API |
| LangGraph Agent | 8123 | AI research agent |

## Architecture

```
rabbit-hole.io/
├── apps/rabbit-hole/        # Next.js application
│   ├── app/atlas/           # Atlas — knowledge graph search (Cytoscape)
│   ├── app/research/        # Research App — workspace (React Flow)
│   ├── app/evidence/        # Evidence management
│   └── app/api/             # API routes
├── packages/
│   ├── @proto/types         # Zod schemas, bundle format, entity types
│   ├── @proto/database      # Neo4j + PostgreSQL clients
│   ├── @proto/mcp-server    # MCP tools for Claude Code integration
│   ├── @proto/deepagent     # Multi-pass research agent (LangGraph)
│   ├── @proto/llm-providers # LLM abstraction (Claude, GPT, Gemini)
│   └── @proto/utils         # Graph algorithms, atlas config
├── services/job-processor/  # Background job processing
├── agent/                   # LangGraph agent server
└── custom-domains/          # Entity type definitions
```

### Data Flow

```
          ┌──────────────────────────────────────────┐
          │          ATLAS (Neo4j, public)            │
          │  Wikipedia seed → Search expands graph    │
          │  Every entity has evidence provenance     │
          └────────┬───────────────────┬──────────────┘
                   │ pull              │ submit (with diff)
                   ▼                   ▲
          ┌──────────────────────────────────────────┐
          │      RESEARCH APP (Graphology, local)     │
          │  Multiple workspaces • AI assistance      │
          │  Edit locally • Submit when ready          │
          └──────────────────────────────────────────┘
```

## Key Concepts

### Evidence-Based Knowledge

Nothing exists without provenance. Every entity and relationship is grounded in evidence:

- **Evidence nodes** — source documents with kind, publisher, date, URL, reliability score
- **Entity citations** — per-entity links to evidence with claim text, excerpts, confidence
- **Relationship citations** — per-relationship source grounding

### Live Graph Updates

When research data is ingested, the Atlas updates in real-time via Server-Sent Events. Nodes appear on the graph as they're discovered — no page reload needed.

### MCP Integration

The `@proto/mcp-server` package provides research tools for Claude Code:

- `research_entity` — full pipeline: search Wikipedia/web/Tavily, extract entities, validate, persist to Neo4j
- `ingest_bundle` — import a RabbitHoleBundleData object into the knowledge graph
- `extract_entities` — LLM-based entity extraction from text
- `validate_bundle` — validate bundle structure and referential integrity

### Bundle Format

All knowledge flows through the RabbitHoleBundleData format:

```typescript
{
  entities: [{ uid, name, type, properties, tags, aliases }],
  relationships: [{ uid, type, source, target, confidence }],
  evidence: [{ uid, kind, title, publisher, date, url, reliability }],
  entityCitations: { [entityUid]: [{ claimText, sourceUrl, excerpt, confidence }] },
  content: [],
  files: []
}
```

## Tech Stack

- **Graph database**: Neo4j 5 with APOC
- **In-memory graph**: Graphology (Research App)
- **Visualization**: Cytoscape.js (Atlas), React Flow (Research App)
- **Framework**: Next.js 15, React 19, TypeScript
- **AI**: Claude (entity extraction), LangGraph (research agent)
- **Search**: Wikipedia API, Tavily, DuckDuckGo
- **Storage**: PostgreSQL, MinIO (S3-compatible)
- **Monorepo**: pnpm workspaces + Turborepo

## Development

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm turbo run build --filter='./packages/*'

# Run tests
pnpm test

# Lint
pnpm lint:check

# Build MCP server (after code changes)
pnpm turbo run build --filter=@proto/mcp-server
```

## License

Private — all rights reserved.
