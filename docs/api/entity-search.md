# Entity Search API

`POST /api/entity-search` — Search the knowledge graph for entities by name, alias, or tag.

## Request

```typescript
{
  searchQuery: string   // 2-100 characters, required
  entityTypes?: string[]  // filter by type (e.g., ["Person", "Organization"])
  limit?: number        // 1-50, default: 10
}
```

## Response

```typescript
{
  success: true,
  data: {
    results: [
      {
        entity: {
          uid: "person:josh_tyson",
          name: "Josh Tyson",
          type: "Person",
          tags: ["founder", "ai"],
          aliases: ["Joshua Tyson"]
        },
        similarity: 1.0,           // Lucene relevance score
        matchReasons: ["Exact name match"]
      }
    ],
    totalResults: 1,
    query: "josh",
    searchTime: 3                  // milliseconds
  }
}
```

### Match Reasons

| Reason | When |
|--------|------|
| `Exact name match` | `toLower(name) = toLower(query)` |
| `Name match` | `toLower(name) CONTAINS toLower(query)` |
| `Alias match` | An alias contains the query |
| `Tag match` | A tag contains the query |
| `Full-text match` | Lucene tokenization matched (e.g., prefix, partial token) |

## Examples

```bash
# Search for any entity
curl -X POST /api/entity-search \
  -H "Content-Type: application/json" \
  -d '{"searchQuery": "dora"}'

# Search for people only
curl -X POST /api/entity-search \
  -H "Content-Type: application/json" \
  -d '{"searchQuery": "wilson", "entityTypes": ["Person"], "limit": 5}'
```

## Authentication

Requires Clerk authentication via `withAuthAndLogging` middleware. Tenant context is resolved from request headers — results are filtered to the user's organization plus public data.

## Implementation

- **Route**: `apps/rabbit-hole/app/api/entity-search/route.ts`
- **Index**: `idx_entity_name_fulltext` (migration 006)
- **Query**: `db.index.fulltext.queryNodes()` with Lucene prefix matching
