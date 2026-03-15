# Documentation

Technical documentation for the Rabbit Hole knowledge graph platform.

## Architecture

System design, data flow, and scaling decisions.

| Document | Description |
|----------|-------------|
| [Search System](architecture/search.md) | Full-text search, indexing strategy, scaling roadmap |
| [Database & Schema](architecture/database.md) | Neo4j schema, entity model, migration system |

## API Reference

HTTP endpoints and MCP tool interfaces.

| Document | Description |
|----------|-------------|
| [Entity Search API](api/entity-search.md) | `POST /api/entity-search` — full-text entity lookup |
| [MCP Tools](api/mcp-tools.md) | All MCP server tools for research, search, and ingestion |

## Operations

Running, maintaining, and scaling the platform.

| Document | Description |
|----------|-------------|
| [Migrations](operations/migrations.md) | Neo4j schema migrations — how to run and create them |
