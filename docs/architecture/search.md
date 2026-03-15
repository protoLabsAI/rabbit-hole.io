# Search System

How entity search works, why it's built this way, and where it's going.

## Current Architecture (v3 — Full-Text Indexed)

Entity search uses a **Neo4j full-text index** backed by Apache Lucene. This replaced the original O(n) `CONTAINS` scan which would time out well before 1M nodes.

```
User/Agent query
      │
      ▼
  buildLuceneQuery()        ← escapes special chars, adds prefix wildcard
      │
      ▼
  db.index.fulltext.queryNodes('idx_entity_name_fulltext', query)
      │
      ▼
  Lucene full-text index    ← indexes Entity.name, Entity.aliases, Entity.tags
      │
      ▼
  Tenant filter (WHERE)     ← clerk_org_id = 'public' OR clerk_org_id = $orgId
      │
      ▼
  Match reason labeling     ← Exact name / Name match / Alias / Tag / Full-text
      │
      ▼
  Results sorted by Lucene score
```

### Index Definition

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

**Key design decisions:**

- **`:Entity` superlabel** — All entity nodes (Person, Organization, etc.) carry the `:Entity` label, so one index covers everything.
- **`eventually_consistent: true`** — Index updates are queued asynchronously. This avoids adding Lucene write latency to the ingest path (bundle writes stay fast). Search results lag writes by a few seconds at most.
- **`standard-no-stop-words` analyzer** — Lowercases and tokenizes but preserves short words. The default `standard` analyzer drops "a", "the", etc., which appear in entity names like "The New York Times".
- **Array property indexing** — `aliases` and `tags` are string arrays. Neo4j full-text indexes index each element as a separate document, so searching "DORA" matches an alias without needing to scan the array.

### Query Building

The `buildLuceneQuery()` function prepares user input for the Lucene query parser:

1. Escapes Lucene special characters (`+ - & | ! ( ) { } [ ] ^ " ~ * ? : \ /`)
2. Appends `*` to the last token for prefix matching (search-as-you-type)

Examples:
- `"trump"` → `"trump*"` — matches "Trump", "Trumpism"
- `"donald trump"` → `"donald trump*"` — matches "Donald Trump"
- `"O'Brien"` → `"O\'Brien*"` — escapes the apostrophe

### Performance Characteristics

| Dataset size | Query latency | Index build time |
|-------------|---------------|-----------------|
| 100 nodes | < 1ms | instant |
| 10K nodes | ~1-2ms | seconds |
| 1M nodes | ~2-5ms | ~1 minute |
| 10M nodes | ~5-10ms | ~5 minutes |
| 100M+ nodes | ~10-20ms | ~40 minutes |

Latencies assume the Lucene index fits in OS page cache. If not, first queries after cold start will be slower until the OS warms the cache.

### Consumers

| Consumer | How it calls search |
|----------|-------------------|
| **SearchBar UI** (`app/atlas/components/SearchBar.tsx`) | `POST /api/entity-search` with 300ms debounce |
| **`graph_search` MCP tool** | Calls `POST /api/entity-search` via `RABBIT_HOLE_URL` |
| **Deep Research Agent** | Uses `graph_search` in Phase 0 to check existing knowledge |
| **`/research` command** | Uses `graph_search` in Step 0 before deciding to research |

## Scaling Roadmap

### Phase 2: Meilisearch Sidecar (when needed)

If search-as-you-type needs sub-10ms latency with **typo tolerance**, add Meilisearch as a search sidecar:

```
Write path:  Client → Neo4j → Event queue → Meilisearch sync consumer
Read path:   Client → Meilisearch (get UIDs + scores) → Neo4j (graph traversal)
```

**Why Meilisearch over Elasticsearch:**
- Single Rust binary, zero JVM tuning
- Built-in typo tolerance (no fuzzy config needed)
- Native hybrid search (vector + keyword) in one request
- Sub-7ms query latency at 6M documents ([benchmark](https://blog.gigasearch.co/elasticsearch-against-competitors/))

**When to add it:**
- Typo-tolerant search is a UX requirement
- Sub-10ms p99 latency is needed
- Hybrid semantic + keyword search is needed

**Sync strategy:**
- Add a Meilisearch write to the `ingest-bundle` API route (application-level sync)
- Index entity `uid`, `name`, `type`, `aliases`, `tags`, `clerk_org_id`
- No database-level CDC needed — application writes to both stores

### Phase 3: Vector Search (when needed)

Add embedding-based semantic search for queries like "people involved in AI regulation":

- Generate embeddings at ingest time (entity name + description)
- Store as Neo4j vector index or in Meilisearch's hybrid store
- Combine with full-text via score normalization

**Memory budget:** ~8-10GB per 1M vectors (1536 dimensions). Only add when the use case justifies the RAM.
