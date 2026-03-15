# Rabbit Hole — Project Status

> Last updated: 2026-03-15

## Product Phases

| Phase | Product | Status | Notes |
|-------|---------|--------|-------|
| **1** | **Search Engine** (`/`) | **Active** | Perplexity-style AI search with deep research mode |
| **2** | **3D Atlas** (`/atlas`) | Planned | Replacing Cytoscape with modern 3D (millions of nodes) |
| **3** | **Research App** | Planned | Downloadable Tauri/Electron self-hostable app |

## Search Engine — Feature Status

### Core Search (`/api/chat`)

| Feature | Status | PR |
|---------|--------|-----|
| AI SDK v6 agentic search (`streamText` + tools) | Done | #68 |
| Neo4j full-text search via Lucene index | Done | #67 |
| Tavily web search | Done | #68 |
| Wikipedia article fetch | Done | #68 |
| Shared search utilities (`lib/search.ts`) | Done | #76 |
| Session persistence (localStorage + URL sync) | Done | #68 |
| Conversation history / follow-up questions | Done | #68 |
| User-triggered "Add to Knowledge Graph" | Done | #69 |
| Reading-optimized typography (16px, 1.6 line-height) | Done | #74 |
| Markdown renderer with code blocks + tables | Done | #74 |
| File attachments (images, documents) | Done | #68 |

### Deep Research (`/api/research/deep`)

| Feature | Status | PR |
|---------|--------|-----|
| Agentic research pipeline (scope → research → evaluate → synthesis) | Done | #76 |
| Structured scope output via `generateObject` | Done | #76 |
| Coverage gap evaluation with agentic iteration (up to 3x) | Done | #76 |
| Streaming report synthesis (`streamText` + chunks) | Done | #76 |
| Inline citations `[1]` `[2]` with hover preview tooltips | Done | #76 |
| Three-panel UI (activity feed / report+ToC / source cards) | Done | #76 |
| Progressive key findings during research | Done | #76 |
| Research plan preview card | Done | #76 |
| Cancel button with AbortController | Done | #76 |
| Running counters (searches / sources) | Done | #76 |
| Export (Download Markdown + Copy Report) | Done | #76 |
| SSE with heartbeats + reconnection (Last-Event-ID) | Done | #73 |
| globalThis store (survives Turbopack module isolation) | Done | #73 |
| Retry logic with exponential backoff | Done | #76 |

### Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| Neo4j Lucene full-text index (`idx_entity_name_fulltext`) | Done | Migration 006, sub-5ms |
| AI SDK provider adapter (`getAIModel()`) | Done | Anthropic, OpenAI, Google, Groq |
| MCP plugin with 8 tools | Done | graph_search, research_entity, etc. |
| Docker research stack | Done | Neo4j, Postgres, MinIO, Job Processor, LangGraph |

## Known Gaps / Next Up

| Priority | Item | Notes |
|----------|------|-------|
| P1 | "Go deeper" button on thin quick search results | Escalate to deep research when graph is sparse |
| P1 | Persistent deep research state | Currently in-memory — lost on server restart |
| P2 | PDF export for deep research reports | Currently Markdown only |
| P2 | Mid-research steering | Add context/refine while research is running |
| P2 | Source restriction | Let users specify domains to prioritize or exclude |
| P3 | Push notifications when deep research completes | Users can navigate away during research |
| P3 | Entity preview before KG ingestion | Show what entities will be added before committing |

## Architecture Decisions

- **User-controlled graph growth**: Entity extraction is triggered manually ("Add to Knowledge Graph"), not automatic. This prevents noise and gives users control over what enters the graph.
- **AI SDK v6 over LangChain**: Chat search uses Vercel AI SDK for streaming and tool calling. Deep research uses AI SDK `generateObject` + `streamText`. LangChain retained only for legacy agent paths.
- **In-memory research store**: Uses `globalThis.__researchStore` to survive Turbopack module isolation between route handlers. Acceptable for single-server deployment; needs Redis/Postgres for multi-server.
- **Single theme**: `prod-environment` theme optimized for prolonged reading. No theme switcher — just light/dark mode.
