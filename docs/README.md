# Documentation

Technical documentation for the Rabbit Hole knowledge graph platform.

## Product Vision

Three products shipping in phases:

1. **Search Engine** (NOW) — Perplexity-style AI search at `/`. Self-growing knowledge graph. Every search enriches Neo4j.
2. **3D Atlas** (NEXT) — Replace Cytoscape with modern 3D visualization for millions of nodes. Consumes the graph Search builds.
3. **Research App** (FUTURE) — Downloadable Tauri/Electron app. Self-hostable local search engine with full research workspace.

**Current priority: Search → KG pipeline.** Make the search experience world-class.

## Architecture

| Document | Description |
|----------|-------------|
| [Search System](architecture/search.md) | AI search pipeline, self-growing graph, sessions, scaling roadmap |
| [Database & Schema](architecture/database.md) | Neo4j schema, entity model, migration system |

## API Reference

| Document | Description |
|----------|-------------|
| [Entity Search API](api/entity-search.md) | `POST /api/entity-search` — full-text entity lookup |
| [MCP Tools](api/mcp-tools.md) | All MCP server tools for research, search, and ingestion |

## Operations

| Document | Description |
|----------|-------------|
| [Migrations](operations/migrations.md) | Neo4j schema migrations — how to run and create them |
