---
name: product_vision
description: Rabbit Hole is a community-driven evidence-based knowledge graph search engine with a self-hosted Electron research app
type: project
---

Rabbit Hole has three surfaces:

1. **Atlas** (public, hosted) — Community knowledge graph search engine backed by Neo4j. Pre-populated with Wikipedia. Expands as users search — each query deepens the graph. Every entity/relationship has evidence provenance. Uses Cytoscape for visualization.

2. **Research App** (private, Electron) — Self-hosted AI-assisted research workspace. Uses in-memory Graphology + React Flow. Multiple workspaces. Can pull entities from Atlas, edit locally, submit back with diff review. No user data on servers.

3. **Research Demo** (hosted web) — Ephemeral demo of the Research App for try-before-download.

**Why:** Atlas is about data separation — public Atlas is community-owned. Research App is self-hosted via Electron so we host no user data. The Atlas and Research App connect via pull/submit with diff review.

**How to apply:** When working on Atlas features, use Neo4j + Cytoscape. When working on Research features, use Graphology + React Flow. Never persist research workspace data to the server. Evidence provenance is mandatory — nothing exists without sources.
