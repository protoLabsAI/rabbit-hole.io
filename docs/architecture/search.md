# Search System

How entity search works, why it's built this way, and where it's going.

## Current Architecture (v4 — AI Search Engine)

The landing page (`/`) is a Perplexity-style AI search engine. The full pipeline:

```
User query (+ optional file attachments)
      │
      ├─ Phase 1: Neo4j graph search (instant, sub-5ms)
      │     └─ Full-text index on Entity.name, aliases, tags
      │     └─ Returns entities with relationship counts + connections
      │
      ├─ Phase 1b: Evidence fetch
      │     └─ Traverses EVIDENCES/CITES/REFERENCES from found entities
      │
      ├─ Phase 2: Classify — need web research?
      │     └─ If <3 graph entities → trigger web research
      │
      ├─ Phase 3: Web research (parallel)
      │     ├─ Tavily (advanced search, 6 results)
      │     └─ Wikipedia (full article text)
      │
      ├─ Phase 3b: Auto-ingest (fire-and-forget)
      │     └─ Extract entities via getModel("fast")
      │     └─ Ingest bundle to Neo4j → graph grows
      │
      ├─ Phase 3c: Process file attachments
      │     └─ Send to job-processor for text extraction
      │     └─ Extract entities from file content → ingest
      │
      ├─ Phase 4: Stream AI answer
      │     └─ getModel("smart") with conversation history
      │     └─ Context: graph entities + web sources + file text
      │
      └─ Phase 5: Follow-up suggestions
            └─ getModel("fast") generates 3 follow-up queries
```

### Self-Growing Knowledge Graph

Every search enriches the graph:
1. Web research results are auto-extracted for entities and ingested
2. Uploaded files are processed and their entities ingested
3. Evidence provenance tracks where each entity came from
4. Subsequent searches for the same topic find the new entities

### Sessions

- Sessions stored in localStorage with URL sync (`?s=<id>`)
- Sidebar shows grouped history (Today / Yesterday / This week / Older)
- Conversation history (last 6 turns) sent to LLM for context
- Sessions are revisitable via URL

### UI Components

| Component | Purpose |
|-----------|---------|
| `SearchInput` | Textarea with file attach (paperclip) and submit |
| `GraphResults` | Entity cards with type icons, connections, expandable details |
| `EvidenceGrid` | Evidence nodes with reliability scores and provenance |
| `SourceCards` | Web source cards with favicons, clickable to open panel |
| `SourcePanel` | Slide-in right panel with full source details |
| `ResearchProgress` | Animated research step indicators |
| `AnswerBlock` | Streaming markdown answer with copy button |
| `FollowUpSuggestions` | Clickable follow-up query buttons |
| `SearchSidebar` | Session history + navigation (Atlas, Research, Evidence) |

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
