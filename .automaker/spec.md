# Rabbit Hole — Product Specification

## Vision

A community-driven, evidence-based knowledge graph search engine. Users search through a living knowledge graph that expands as they explore — every query deepens the graph, filling out entities, relationships, and evidence trails. The rabbit hole goes deeper the more you search.

## Product Architecture

### Three Surfaces

#### 1. Atlas (Public Search Engine — hosted)
- **What**: A live search app over a hosted knowledge graph
- **Who**: Public users, community-driven
- **How**: Pre-populated with all of Wikipedia as the seed corpus. As users search, the graph expands — new entities, relationships, and evidence are discovered and added in real-time
- **Storage**: Neo4j (persistent, shared, community knowledge base)
- **Key feature**: Every search makes the graph smarter. Nodes have an "expand" action that triggers deeper research from that point, going further down the rabbit hole
- **Evidence system**: Every entity and relationship is grounded in evidence — sources, citations, retrieval timestamps, reliability scores. Nothing exists without provenance

#### 2. Research App (Private — Electron, self-hosted)
- **What**: AI-assisted research workspace for deep investigation
- **Who**: Individual researchers, journalists, analysts
- **How**: Electron app users download and self-host. No user data on our servers
- **Storage**: In-memory Graphology graph (local to the user's session/workspace)
- **Key features**:
  - Multiple research workspaces per user
  - AI researcher assistance (search, extract, analyze)
  - Pull entities/domains from the public Atlas into a local workspace for investigation
  - Edit, annotate, restructure locally without affecting the public graph
  - Submit back to Atlas when ready — with a diff view showing what's new/changed, allowing adjustment before commit
  - React Flow canvas with EntityCard nodes, manual + algorithmic layout
- **Distribution**: Electron app, fully self-contained (bundles Neo4j or uses local storage)

#### 3. Research Demo (Hosted — web)
- **What**: A hosted demo of the Research App for try-before-download
- **Who**: Prospective users evaluating the product
- **How**: Same UI as the Electron app but ephemeral — workspaces don't persist across sessions
- **Limitations**: No persistence, no Atlas submission, watermarked/limited

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    PUBLIC ATLAS                          │
│              (Neo4j, community-owned)                   │
│                                                         │
│  Wikipedia seed → Search expands → Community grows      │
│  Every entity has evidence trail                        │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ Search   │───→│ Expand   │───→│ Deeper   │──→ ...   │
│  │ "DORA"   │    │ node     │    │ research │          │
│  └──────────┘    └──────────┘    └──────────┘          │
└──────────┬──────────────────────────────┬───────────────┘
           │ pull entities                │ submit diff
           ▼                              ▲
┌─────────────────────────────────────────────────────────┐
│                 RESEARCH APP (local)                     │
│            (Graphology, user-owned)                      │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Workspace 1 │  │ Workspace 2 │  │ Workspace 3 │    │
│  │ (in-memory) │  │ (in-memory) │  │ (in-memory) │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
│  AI assistant • Manual editing • Import/Export           │
│  Pull from Atlas • Diff + submit back to Atlas          │
└─────────────────────────────────────────────────────────┘
```

### Evidence System

Every piece of knowledge must be traceable:

- **Evidence nodes**: Source documents with kind (government, court, media, research, social), publisher, date, URL, archive URLs, reliability score
- **Entity citations**: Per-entity links to evidence with claim text, source URL, excerpt, confidence score
- **Relationship citations**: Per-relationship links to evidence with the same structure
- **Retrieval tracking**: When was this information fetched? From where? Is the source still accessible?
- **Reliability scoring**: 0-1 score based on source type, cross-referencing, recency

### Technology Stack

- **Graph database**: Neo4j (Atlas — hosted, persistent)
- **In-memory graph**: Graphology (Research App — local, ephemeral)
- **Visualization**: React Flow (Research App), Cytoscape (Atlas)
- **Search + extraction**: MCP tools (Wikipedia, Tavily, DuckDuckGo, entity extraction via Claude)
- **Bundle format**: RabbitHoleBundleData (entities, relationships, evidence, content, files, citations)
- **Desktop**: Electron (Research App distribution)
- **Hosting**: Self-hosted Neo4j + Next.js for Atlas; zero cloud for Research App

### What We Don't Do

- **No user data hosting** — the Research App is fully self-hosted via Electron
- **No authentication** — Clerk has been removed, Atlas is public
- **No cloud storage of research** — workspaces are local to the user's machine
- **No paywalls on the knowledge graph** — the Atlas is community-owned and open

## Current State (March 2026)

### Shipped
- [x] MCP research pipeline (Wikipedia + web + Tavily → entity extraction → Neo4j)
- [x] `ingest_bundle` MCP tool for direct Neo4j persistence
- [x] Auto-persist in `research_entity` (persist=true by default)
- [x] Live SSE graph updates on Atlas (nodes appear in real-time)
- [x] Smart node positioning via cytoscape-layout-utilities
- [x] Incremental cy.add() — no flash, no viewport reset
- [x] Docker compose for full stack (Neo4j, Postgres, MinIO, Job Processor, LangGraph Agent)
- [x] Research page with React Flow canvas, EntityCard nodes, Graphology state
- [x] Bundle import/export (RabbitHoleBundleData format with validation)
- [x] Evidence schema with citations and reliability scoring

### Next Up
- [ ] Atlas search-to-expand: clicking a node triggers deeper research
- [ ] Wikipedia seed import (bulk ingest of Wikipedia corpus)
- [ ] Research App → Atlas diff/submit workflow
- [ ] Atlas → Research App entity pull
- [ ] Research page SSE integration (live updates to React Flow via Graphology)
- [ ] Electron packaging for Research App
- [ ] Public Atlas search UI (search bar → graph exploration)
