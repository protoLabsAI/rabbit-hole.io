# Ingest to Knowledge Graph

After a search or research session, you can extract entities and relationships and store them in Neo4j. Over time this builds a personal knowledge base that enriches future searches.

## How it works

1. You run a search or deep research
2. You click **Add to Knowledge Graph** on a message
3. The server extracts entities (people, organizations, concepts, technologies, papers) and their relationships
4. Entities are ingested into Neo4j via `/api/ingest-bundle`
5. Future searches query the graph first — prior knowledge appears as cited results

## Ingesting from search chat

After any search response, look for the **Add to Graph** button (bottom of the message). Clicking it:

1. Sends the full message context to `POST /api/chat/ingest`
2. The `StructuredExtractionMiddleware` has pre-computed an extraction preview using full research context
3. You'll see a preview of entities to be ingested
4. Confirm to write to Neo4j

## Ingesting from deep research

After a completed research report, click **Add to Graph** (top right of report panel). This ingests all entities extracted across every research dimension — typically more thorough than chat ingestion.

## Ingesting via MCP

If you have the MCP server running, use:

```bash
# Ingest a URL
curl -X POST http://localhost:3398/mcp \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -d '{"method": "tools/call", "params": {"name": "ingest_url", "arguments": {"url": "https://example.com/article"}}}'

# Ingest a local file
curl -X POST http://localhost:3398/mcp \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -d '{"method": "tools/call", "params": {"name": "ingest_file", "arguments": {"path": "/path/to/file.pdf"}}}'
```

See [MCP tools reference](../api/mcp-tools) for full tool schemas.

## What gets extracted

The extraction pipeline identifies:

| Entity type | Examples |
|-------------|---------|
| Technology | React, Neo4j, LangChain, Rust |
| Concept | GraphRAG, vector search, RRF fusion |
| Organization | Anthropic, Vercel, OpenAI |
| Person | Author names, researchers |
| Paper | Academic paper titles + URLs |
| Product | Named products, libraries, tools |

Relationships: `USES`, `RELATED_TO`, `CREATED_BY`, `DESCRIBED_IN`, `COMPETES_WITH`

## Checking what's in your graph

Use the **Atlas** panel (navigation) to browse your knowledge graph visually, or search for specific entities via the entity search bar.

You can also query the graph directly:

```
GET /api/entity-search?q=GraphRAG
```

## Graph search in future queries

Once entities are ingested, the `searchGraph` tool activates automatically on relevant queries. Matching entities and their relationships appear as graph-sourced citations alongside web results.

## Related

- [Search Chat API](../reference/search-chat-api) — `/api/chat/ingest` endpoint spec
- [Graph and web search](../explanation/graph-web-relationship) — how graph and web results combine
