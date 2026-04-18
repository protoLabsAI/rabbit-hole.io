# Graph and Web Search

Rabbit Hole combines two fundamentally different search systems. Understanding when each is valuable — and how they complement each other — explains many design decisions.

## Web search: broad, current, ephemeral

SearXNG returns results from the live web. Every query hits external engines in real time. This means:

- **Current**: Results reflect what's published today
- **Broad**: Any topic, any domain, any language
- **Ephemeral**: Results aren't stored — the same query tomorrow might return different results

Web search is good for: recent events, unfamiliar topics, community discussions, code examples, academic papers.

## Graph search: personal, fast, cumulative

Neo4j stores entities and relationships from past research sessions. Queries run locally with no external network calls. This means:

- **Personal**: Only contains what you've explicitly ingested
- **Fast**: Sub-millisecond for fulltext, ~10ms for vector similarity
- **Cumulative**: Gets richer over time as you research more

Graph search is good for: topics you've researched before, connecting ideas across sessions, finding prior sources without re-searching.

## Hybrid search (RRF fusion)

When both sources have relevant results, they're combined using Reciprocal Rank Fusion:

```
score = Σ (weight / (rank_in_source + 60))
```

A source ranked #1 in both web and graph gets a much higher combined score than one ranked #5 in one source and not appearing in the other.

The constant `60` is a smoothing factor that prevents the #1 result from completely dominating. This is the same technique used in modern RAG pipelines.

## The empty graph problem

A fresh Rabbit Hole installation has no graph data. If the agent called `searchGraph` on every query, it would:
1. Hit Neo4j
2. Get zero results
3. Use one of its 7 tool steps doing nothing useful

The solution is the `graphIsEmpty` flag. When `searchGraph` returns zero results on the first call of a session, all subsequent graph calls in that session are skipped. The agent becomes web-first automatically.

Once you've ingested some research sessions, the graph becomes valuable. The agent will start finding relevant prior knowledge and the graph/web ratio shifts toward graph-first for familiar topics.

## What the graph stores

After a research session, clicking **Add to Knowledge Graph** triggers extraction of:

| Entity type | How it's used in search |
|-------------|------------------------|
| Technology (Neo4j, React) | Matched exactly in fulltext; related technologies found via `RELATED_TO` edges |
| Concept (GraphRAG, RRF) | Retrieved by semantic similarity in vector search |
| Organization (Anthropic) | Connected to related products, people, papers |
| Person (researcher names) | Connected to papers, organizations |
| Paper (title + URL) | Retrieved by concept similarity |

Relationships between entities let the graph answer questions like "what technologies are related to vector search?" — without web search.

## Community summaries (GraphRAG)

After enough entities accumulate, a community detection algorithm groups related entities into communities. Each community gets an LLM-generated summary.

The `searchCommunities` tool searches these summaries — it answers broad thematic questions like "what have I researched about ML infrastructure?" by returning community-level overviews rather than individual entity matches.

This is the GraphRAG pattern: graph topology (communities) used to improve LLM context, rather than treating the graph as a flat document store.

## The progression

1. **Day 1**: Graph is empty. All searches go to SearXNG. Results are good but not personalized.
2. **Week 1**: A dozen research sessions ingested. Graph has ~200 entities. Graph search finds relevant results for topics you've covered. Web search fills the rest.
3. **Month 1**: Hundreds of sessions. Graph is a rich personal knowledge base. Familiar topics are answered primarily from graph — faster, more consistent, with your own prior analysis.
4. **Long term**: The graph becomes a second brain — capturing the synthesis and connections from every research session you've done.

## Why not just store web results directly?

Raw web results are noisy — ads, navigation elements, paywalls, low-quality content. The entity extraction pipeline distills research into structured entities and relationships. This produces a much more useful signal than a raw document store.

The extraction step is also opinionated: it identifies what *you* found valuable enough to ingest, not everything that exists on the web.
