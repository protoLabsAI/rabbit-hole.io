# Search System

How entity search works, why it's built this way, and where it's going.

## Current Architecture (v5 — AI SDK Agent)

The landing page (`/`) is a Perplexity-style AI search engine. The backend is an AI SDK v6 `streamText` agent that decides which tools to call and in what order:

```
User query
      │
      └─ POST /api/chat
            │
            └─ streamText agent (stopWhen: stepCountIs(5))
                  │
                  ├─ searchGraph — Neo4j full-text search via Lucene index
                  │     └─ Returns entities with relationship counts + connections
                  │
                  ├─ searchWeb — Tavily advanced search (6 results)
                  │     └─ Used when graph is thin
                  │
                  └─ searchWikipedia — Wikipedia article fetch
                        └─ Used for foundational context on well-known topics
```

The agent's default workflow (from the system prompt):
1. Always call `searchGraph` first to check existing knowledge
2. If graph has good results (3+ entities), use them to answer
3. If graph is thin, call `searchWeb` and/or `searchWikipedia`
4. Synthesize all findings into a well-cited answer

### Self-Growing Knowledge Graph

Graph growth is **user-triggered**, not automatic. After receiving an answer, users click "Add to Knowledge Graph" on a message. This calls `POST /api/chat/ingest`, which:
1. Extracts entities from the message content via `getAIModel("fast")`
2. Posts the bundle to `/api/ingest-bundle` → persists to Neo4j

### Sessions

- Sessions stored in localStorage with URL sync (`?s=<id>`)
- Sidebar shows grouped history (Today / Yesterday / This week / Older)
- Conversation history sent to LLM for context on follow-up queries
- Sessions are revisitable via URL

### Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Search engine UI (`useChat` + `ChatMessage`) |
| `app/api/chat/route.ts` | Agentic search endpoint (`streamText` + tools) |
| `app/api/chat/ingest/route.ts` | Manual entity extraction + ingest |
| `app/api/entity-search/route.ts` | Neo4j full-text entity lookup |
| `app/hooks/useChatSearch.ts` | `useChat` wrapper |
| `app/hooks/useSearchSessions.ts` | Session persistence (localStorage) |
| `app/components/search/ChatMessage.tsx` | UIMessage parts renderer |
| `app/components/search/SearchInput.tsx` | Input with file attach |
| `app/components/search/SearchSidebar.tsx` | Session history + nav |
| `packages/llm-providers/src/server/ai-sdk.ts` | AI SDK provider adapter |

### Frontend

Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` posting to `POST /api/chat`. Messages are rendered as UIMessage parts (text, tool calls, tool results).

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

**Key decisions:**
- `:Entity` superlabel covers all entity types
- `eventually_consistent: true` avoids write-path latency
- `standard-no-stop-words` preserves short words in entity names

### Query Building

`buildLuceneQuery()` escapes special characters and appends `*` for prefix matching:
- `"trump"` → `"trump*"`
- `"donald trump"` → `"donald trump*"`

### Performance

| Dataset size | Query latency |
|-------------|---------------|
| 100 nodes | < 1ms |
| 1M nodes | ~2-5ms |
| 10M+ nodes | ~5-10ms |

## Scaling Roadmap

### Phase 2: Meilisearch Sidecar (when needed)

Add for typo-tolerance and sub-10ms latency. Single Rust binary, native hybrid search.

### Phase 3: Vector Search (when needed)

Embedding-based semantic search. ~8-10GB RAM per 1M vectors.
