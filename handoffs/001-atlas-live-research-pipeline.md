# Handoff: Atlas Live Research Pipeline

**Date**: 2026-03-14
**Handoff Number**: 001

---

## Overview/Summary

Built the complete pipeline from MCP research tools through Neo4j persistence to live Atlas visualization. A single `research_entity` call now searches Wikipedia/web/Tavily, extracts entities with proper UIDs, creates evidence nodes, and streams results to the Atlas graph in real-time via SSE. Also cleaned up 24k+ lines of dead code, resolved 110 merge conflict markers, and established the product specification for three surfaces (Atlas, Research App, Research Demo).

## Background/Context

- **Product vision**: Rabbit Hole is a community-driven evidence-based knowledge graph search engine. Three surfaces: Atlas (public Neo4j), Research App (private Electron), Research Demo (hosted web). See `.automaker/spec.md`.
- **Starting state**: MCP server existed but returned data without persisting. Atlas page existed but had no search, no live updates, no way to ingest research data. `dev` and `main` branches had 110 committed merge conflict markers from a botched Clerk removal merge.
- **Clerk removal**: Authentication was removed prior to this session. Many files still had Clerk references that broke builds.

## Current State

### Completed
- [x] MCP `research_entity` tool — full pipeline: search → extract → validate → persist to Neo4j
- [x] MCP `ingest_bundle` tool — POST bundles to `/api/ingest-bundle`
- [x] Auto-persist flag on `research_entity` (default: true)
- [x] Entity extraction prompt produces compliant UIDs (`type:name` format, `rel:` prefix)
- [x] Evidence nodes created from research sources (Wikipedia, web, Tavily)
- [x] Entity citations linking entities to source evidence
- [x] SSE endpoint `/api/atlas/graph-updates` streams entity/relationship events
- [x] In-memory EventEmitter bridges ingest route to SSE endpoint
- [x] `useGraphUpdates` hook — incremental `cy.add()` with `cytoscape-layout-utilities` smart positioning
- [x] Atlas search bar with autocomplete (calls `/api/entity-search`)
- [x] Simplified Atlas header (font-mono "rabbit hole", entity/relationship counts)
- [x] Live connection indicator (bottom-left, pulsing green dot)
- [x] 110 merge conflict markers resolved across both branches
- [x] Pre-commit hook blocks `<<<<<<` markers
- [x] `.automaker/worktree-init.sh` runs `pnpm install` in new worktrees
- [x] 24,336 lines of dead code removed (10 route directories, @proto/collab, Clerk remnants)
- [x] Root README rewritten for Rabbit Hole product
- [x] Product spec at `.automaker/spec.md`
- [x] Docker compose config — lowered Neo4j heap, removed incompatible GDS plugin
- [x] dev and main branches in sync

### Remaining
- [ ] Search bar "Enter to research" should trigger actual MCP research (currently shows toast)
- [ ] "Expand from node" context menu action — click a node, research deeper
- [ ] Wikipedia seed import (bulk ingest)
- [ ] Research page SSE integration (React Flow via Graphology, not Cytoscape)
- [ ] Research App → Atlas diff/submit workflow
- [ ] Atlas → Research App entity pull
- [ ] Electron packaging for Research App
- [ ] Public search landing page (search bar front-and-center before graph loads)
- [ ] Remaining broken Clerk references in research page components (don't affect Atlas, will break research page)

## Technical Approach

### Live Update Architecture
```
MCP research_entity
  → POST /api/ingest-bundle (writes to Neo4j)
  → graphUpdateEmitter.emit("graph-update", event)
  → SSE /api/atlas/graph-updates streams to browser
  → useGraphUpdates hook calls cy.add() per entity/edge
  → cytoscape-layout-utilities.placeNewNodes() positions near neighbors
```

The EventEmitter is a process-global singleton (`globalThis.__graphUpdateEmitter`) that survives across API route invocations in the same Next.js server process.

### Bundle Format
All knowledge flows through `RabbitHoleBundleData`:
- Entities: `{ uid: "type:name", name, type, properties, tags, aliases }`
- Relationships: `{ uid: "rel:...", type, source, target, properties }`
- Evidence: `{ uid: "evidence:...", kind, title, publisher, date, url, reliability }`
- EntityCitations: `{ [entityUid]: [{ claimText, sourceUrl, excerpt, confidence }] }`

### Search
Entity search uses `/api/entity-search` (POST) with Neo4j CONTAINS queries across name, aliases, and tags. Similarity scoring: exact=1.0, contains=0.8, alias=0.7, tag=0.5.

### Node Positioning
New nodes added via SSE are positioned using `cytoscape-layout-utilities` `placeNewNodes()` which uses quadrant scoring around existing neighbors. Nodes are batched (200ms debounce) before placement.

## Key Files and Documentation

| File | Purpose |
|------|---------|
| `.automaker/spec.md` | Product specification — three surfaces, data flow, evidence system |
| `packages/mcp-server/src/handler.ts` | MCP tool implementations (research_entity, ingest_bundle, extract_entities) |
| `packages/mcp-server/src/tools/research-tools.ts` | MCP tool schema definitions |
| `apps/rabbit-hole/app/api/ingest-bundle/route.ts` | Bundle ingestion to Neo4j + SSE event emission |
| `apps/rabbit-hole/app/api/atlas/graph-updates/route.ts` | SSE endpoint for live graph mutations |
| `apps/rabbit-hole/app/api/atlas/graph-updates/emitter.ts` | EventEmitter singleton + event type definitions |
| `apps/rabbit-hole/app/api/entity-search/route.ts` | Entity search API with similarity scoring |
| `apps/rabbit-hole/app/atlas/AtlasClient.tsx` | Main Atlas component (1765 lines) |
| `apps/rabbit-hole/app/atlas/hooks/useGraphUpdates.ts` | SSE subscription + incremental cy.add() + layout-utilities |
| `apps/rabbit-hole/app/atlas/components/SearchBar.tsx` | Autocomplete search bar |
| `apps/rabbit-hole/app/atlas/components/LiveIndicator.tsx` | SSE connection status indicator |
| `apps/rabbit-hole/app/atlas/components/AtlasHeader.tsx` | Simplified header with stats |
| `apps/rabbit-hole/app/api/atlas/graph-payload/route.ts` | Neo4j → canonical graph data API |
| `apps/rabbit-hole/app/lib/graph-data-standardizer.ts` | Canonical → Cytoscape element transformation |
| `docker-compose.research.yml` | Full stack: Neo4j, Postgres, MinIO, Job Processor, LangGraph Agent |
| `.automaker/worktree-init.sh` | Worktree setup script (pnpm install) |
| `.husky/pre-commit` | Blocks merge conflict markers from being committed |

## Acceptance Criteria

For the Atlas search engine to be "shippable":
- [ ] User can search the knowledge graph from the Atlas page
- [ ] Selecting a search result navigates to that entity's ego network
- [ ] Pressing Enter on an unknown term triggers live research that populates the graph
- [ ] New nodes appear smoothly near their connections without viewport disruption
- [ ] Every entity has at least one evidence source linking it to provenance
- [ ] The graph is pre-populated with a meaningful seed corpus (Wikipedia)

## Open Questions/Considerations

1. **MCP server restart required**: The MCP server process caches the old `dist/index.js`. After code changes to the MCP server, you need to restart Claude Code (or the MCP host) for changes to take effect. The `research_entity` tool currently doesn't produce compliant UIDs because the running process has the old build — it works correctly after restart.

2. **Research page broken imports**: Several files in `app/research/` still reference deleted collaboration components. These don't affect Atlas but will break the research page. Need a cleanup pass similar to what was done for Atlas.

3. **Neo4j GDS plugin**: Removed from Docker config because no compatible version exists for Neo4j 5.15-community. Community detection features that use GDS (Louvain, Leiden, etc.) won't work until either: (a) upgrade to a Neo4j version with GDS support, or (b) implement community detection outside Neo4j.

4. **Neo4j memory**: Reduced heap to 256M-512M to prevent OOM kills on Docker Desktop (7.6GB total). Monitor if this is sufficient as the graph grows past 1000+ nodes.

5. **Tenant/orgId**: All entities are currently ingested with `clerk_org_id = "public"`. The search and ingest APIs default to `orgId = "public"` when no tenant context exists. This is correct for the public Atlas but will need revisiting if multi-tenant features return.

## Next Steps

1. **Wire search-to-research**: When user presses Enter on an unknown term, call `research_entity` MCP tool (or a new `/api/research/trigger` endpoint) and let SSE stream the results to the Atlas
2. **Add "Expand" to context menu**: Right-click a node → "Research deeper" → triggers research on that entity's name, expanding the graph from that point
3. **Wikipedia seed import**: Bulk ingest Wikipedia articles to pre-populate the Atlas. Consider a job-processor task that processes Wikipedia dump files
4. **Fix research page**: Clean up remaining broken imports so `/research` loads without errors
5. **Deploy to staging**: `docker compose -f docker-compose.research.yml up -d` on the staging machine, then `pnpm build && pnpm start` for the Next.js app
