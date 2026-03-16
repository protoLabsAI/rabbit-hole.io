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

### Slash Commands

Type `/` in the search input to toggle modes:

| Command | Mode | Description |
|---------|------|-------------|
| `/deep-research` | Deep Research | Comprehensive multi-source research report |
| `/due-diligence` | Due Diligence | Evidence-based validation and analysis |

Selected mode shows as a colored pill badge in the input. Keyboard navigation: arrows to select, tab/enter to confirm, esc to dismiss, backspace to clear mode.

### Graph Ingestion

User-controlled, not automatic. "Add to Knowledge Graph" button on each message calls `POST /api/chat/ingest` → extract entities via `getAIModel("fast")` → ingest bundle to Neo4j.

### Shared Search Utilities

`app/lib/search.ts` is the single source of truth for search functions. Both `/api/chat` and `/api/research/deep` import from here.

| Function | Purpose |
|----------|---------|
| `searchGraph(query, limit)` | Neo4j full-text search via Lucene index |
| `searchWeb(query, maxResults)` | Tavily advanced web search |
| `searchWikipedia(query)` | Wikipedia article fetch |
| `buildLuceneQuery(rawQuery)` | Escape and wildcard-suffix for Lucene |
| `withRetry(fn, maxRetries, delayMs)` | Retry wrapper with exponential backoff |

### Key Files

| File | Purpose |
|------|---------|
| `app/lib/search.ts` | Shared search utilities (graph, web, wiki, retry) |
| `app/api/chat/route.ts` | Agentic search (streamText + 3 tools) |
| `app/api/chat/ingest/route.ts` | Manual entity extraction + ingest |
| `app/hooks/useChatSearch.ts` | useChat wrapper |
| `app/components/search/ChatMessage.tsx` | UIMessage parts renderer |
| `app/components/search/ChatMarkdown.tsx` | Markdown renderer with inline citation support |
| `app/components/search/CodeBlock.tsx` | Prism.js syntax highlighting |
| `app/components/search/SearchInput.tsx` | Input with slash commands, file attach, mode pills |

## Deep Research

Long-running agentic research mode (minutes) for comprehensive reports with citations.

### API

```
POST   /api/research/deep        { query, mode? } → { researchId }
GET    /api/research/deep/:id    → SSE stream (15s heartbeats, 300ms poll)
DELETE /api/research/deep/:id    → Cancel running research
GET    /api/research/deep/:id/status → Polling fallback
```

`mode` is `"deep-research"` (default) or `"due-diligence"`. Due diligence uses different scope and synthesis prompts focused on validation, risks, and recommendations.

### Agentic Pipeline

```
Phase 1: SCOPE (generateObject → structured output)
  └─ LLM produces 3-6 research dimensions + brief

Phase 2: PLAN REVIEW
  └─ Dimensions shown to user (auto-continues after 1.5s)

Phase 3: RESEARCH LOOP (per dimension, up to 3 iterations)
  ├─ searchGraph → check existing knowledge (with retry)
  ├─ searchWeb → Tavily advanced search (with retry)
  ├─ searchWikipedia → article text (with retry)
  ├─ Compress findings via generateObject (summary + keyFinding)
  └─ EVALUATE: LLM checks coverage gaps
       ├─ If gaps found → research new dimensions (loop)
       └─ If coverage sufficient → proceed to synthesis

Phase 4: SYNTHESIS (streamText → streamed report)
  └─ Report with inline citations [1][2] referencing numbered sources
```

Key differences from a simple pipeline:
- **Agentic iteration**: The LLM evaluates coverage gaps after research and can add new dimensions (up to 3 iterations)
- **Structured output**: Scope uses `generateObject` with zod schema instead of fragile JSON parsing
- **Streaming synthesis**: Report streams via `streamText` with `report.chunk` events
- **Progressive findings**: Each dimension produces a `keyFinding` surfaced to the UI before the report
- **Cancel support**: `AbortController` checked between phases, `DELETE` endpoint preserves partial report
- **Retry logic**: All search calls wrapped in `withRetry(fn, 2, 1000)`

### SSE Events

| Event | Data |
|-------|------|
| `phase.started` | phase name, label |
| `phase.completed` | phase name |
| `search.started` | query, source (graph/web/wikipedia) |
| `search.completed` | query, source, resultCount |
| `research.dimension` | index, total, dimension, iteration |
| `research.finding` | key finding text |
| `research.compressing` | dimension |
| `research.compressed` | dimension, noteLength |
| `research.evaluation` | complete (bool), gaps (array) |
| `scope.completed` | dimensions array, brief |
| `report.chunk` | text (streaming report delta) |
| `report.completed` | report length |
| `research.completed` | summary stats (duration, sources, iterations) |
| `research.cancelled` | phase at cancellation |
| `counters.update` | searches count, sources count |
| `state` | final state (status, report, sources, findings, dimensions) |

### Frontend

When deep research is active, the page switches from single-column chat to an embedded three-panel layout:

- **Activity feed (left, 240px)** — timestamped events, progressive key findings (blue cards), source type counters
- **Report (center)** — research plan card → streaming ChatMarkdown with inline citation badges `[1]` `[2]` → ToC strip → action buttons
- **Sources panel (right, 280px, toggleable)** — numbered source cards with favicon, domain, title, snippet

Each panel scrolls independently (viewport-constrained via `h-screen overflow-hidden`).

**Inline citations**: The synthesis prompt instructs the LLM to cite sources as `[1]`, `[2]`. ChatMarkdown pre-processes these into links, rendering as superscript badges with hover tooltips showing source favicon, title, domain, and snippet.

**Actions**: Add to Knowledge Graph, Copy Report, Download Markdown, Stop (cancel).

### State Persistence

In-memory `Map<researchId, ResearchState>` on `globalThis.__researchStore` (survives Turbopack module isolation). Supports SSE reconnection via `Last-Event-ID` header. 2-hour TTL cleanup.

### Key Files

| File | Purpose |
|------|---------|
| `app/api/research/deep/route.ts` | Start research + agentic pipeline |
| `app/api/research/deep/[id]/route.ts` | SSE stream + DELETE cancel handler |
| `app/api/research/deep/[id]/status/route.ts` | Polling fallback |
| `app/api/research/deep/research-store.ts` | In-memory state store with cancel support |
| `app/components/search/DeepResearchPanel.tsx` | Three-panel research UI (embedded or overlay) |
| `app/components/search/DeepResearchInline.tsx` | Compact inline research card (legacy) |

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

## Branding & Icons

Source SVG: `public/rabbit-hole.svg` (beige bg + dark icon for favicons/PWA)
Transparent icon: `public/rabbit-hole-icon.svg` (for in-page use, adapts via CSS mask)

Run `node scripts/generate-icons.mjs` to regenerate all assets from the source SVG:
- `favicon.ico`, `favicon.svg` — browser tab
- `apple-touch-icon.png` — iOS home screen
- `icons/icon-{16..1024}.png` — PWA sizes
- `icons/icon-512-maskable.png` — PWA maskable
- `og-image.png` — Open Graph social sharing

## Scaling Roadmap

1. **Meilisearch sidecar** — for typo-tolerance and sub-10ms latency
2. **Vector search** — embedding-based semantic search
3. **3D Atlas** — replace Cytoscape with modern 3D for millions of nodes
