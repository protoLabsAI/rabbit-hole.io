# Search System

## Quick Search (AI SDK v6)

The landing page (`/`) uses AI SDK `streamText` with an agentic tool loop.

```
User types query
    │
    ▼
useChat (DefaultChatTransport) → POST /api/chat
    │
    ▼
streamText({
  model: getAIModel("smart"),
  tools: { searchGraph, searchWeb, searchWikipedia },
  stopWhen: stepCountIs(5)
})
    │
    ├─ LLM calls searchGraph (Neo4j full-text, sub-5ms)
    ├─ If thin results → calls searchWeb (Tavily) + searchWikipedia
    └─ Streams answer as UIMessage parts (text + tool calls)
```

The LLM decides tool order and iteration count. Tool results stream as native UIMessage parts — no custom SSE protocol.

### Graph Ingestion

User-controlled, not automatic. "Add to Knowledge Graph" button on each message calls `POST /api/chat/ingest` → extract entities via `getAIModel("fast")` → ingest bundle to Neo4j.

### Key Files

| File | Purpose |
|------|---------|
| `app/api/chat/route.ts` | Agentic search (streamText + 3 tools) |
| `app/api/chat/ingest/route.ts` | Manual entity extraction + ingest |
| `app/hooks/useChatSearch.ts` | useChat wrapper |
| `app/components/search/ChatMessage.tsx` | UIMessage parts renderer |
| `app/components/search/ChatMarkdown.tsx` | Ava-ported markdown renderer |
| `app/components/search/CodeBlock.tsx` | Prism.js syntax highlighting |

## Deep Research

Long-running research mode (minutes) for comprehensive reports.

```
POST /api/research/deep { query } → { researchId }
GET  /api/research/deep/:id       → SSE stream (15s heartbeats)
GET  /api/research/deep/:id/status → polling fallback
```

### Agent Architecture (Supervisor-Researcher)

```
Phase 1: SCOPE
  └─ LLM plans 3-5 research dimensions

Phase 2: RESEARCH (per dimension)
  ├─ searchGraph → check existing knowledge
  ├─ searchWeb → Tavily advanced search
  ├─ searchWikipedia → article text
  └─ Compress findings via getAIModel("fast")

Phase 3: SYNTHESIS
  └─ Generate comprehensive cited report via getAIModel("smart")
```

### SSE Events

| Event | Data |
|-------|------|
| `phase.started` | phase name, label |
| `phase.completed` | phase name |
| `search.started` | query, source (graph/web/wikipedia) |
| `search.completed` | query, source, resultCount |
| `research.dimension` | index, total, dimension name |
| `research.compressing` | dimension |
| `research.compressed` | dimension, noteLength |
| `scope.completed` | dimensions array, brief |
| `report.completed` | report length |
| `research.completed` | summary stats |
| `state` | final state (status, report, sources) |

### Frontend

`DeepResearchPanel` — full-page overlay with:
- Phase progress bar (Scope → Research → Synthesis → Complete)
- Activity feed (left) — timestamped, icon-coded entries
- Report preview (center) — progressive ChatMarkdown rendering
- Actions: Add to Knowledge Graph, Copy Report

### State Persistence

In-memory `Map<researchId, ResearchState>`. Supports SSE reconnection via `Last-Event-ID` header. 2-hour TTL cleanup.

### Key Files

| File | Purpose |
|------|---------|
| `app/api/research/deep/route.ts` | Start research + agent pipeline |
| `app/api/research/deep/[id]/route.ts` | SSE stream with heartbeats |
| `app/api/research/deep/[id]/status/route.ts` | Polling fallback |
| `app/api/research/deep/research-store.ts` | In-memory state store |
| `app/components/search/DeepResearchPanel.tsx` | Full-page research UI |

## Full-Text Index

```cypher
CREATE FULLTEXT INDEX idx_entity_name_fulltext IF NOT EXISTS
FOR (n:Entity)
ON EACH [n.name, n.aliases, n.tags]
OPTIONS {
  indexConfig: {
    `fulltext.analyzer`: 'standard-no-stop-words',
    `fulltext.eventually_consistent`: true
  }
};
```

Sub-5ms at any scale. Migration 006.

## Sessions

- localStorage persistence via `useSearchSessions`
- URL sync: `?s=<sessionId>`
- Types: `"chat"` (quick search) and `"deep-research"` (research reports)
- Sidebar groups by date (Today / Yesterday / This week / Older)
- Research sessions show flask icon, chat sessions show message icon

## Scaling Roadmap

1. **Meilisearch sidecar** — for typo-tolerance and sub-10ms latency
2. **Vector search** — embedding-based semantic search
3. **3D Atlas** — replace Cytoscape with modern 3D for millions of nodes
