# Fleet Agent Architecture

Rabbit-hole exposes its research pipeline as a fleet-native A2A agent so other agents (Ava and workstacean) can delegate research tasks to it.

## Overview

```
Fleet (Ava, workstacean)
    │  A2A JSON-RPC 2.0 over HTTP
    ▼
researcher A2A server (port 7870)
    ├─ search     → MCP HTTP :3398 → research_entity(depth:basic)  → Neo4j
    ├─ deep_research → /api/research/deep SSE → report chunks → A2A artifacts
    ├─ ingest_url → MCP HTTP :3398 → ingest_url  → job processor → Neo4j
    └─ kg_facts   → MCP HTTP :3398 → graph_search → Neo4j
```

The UI (`/`) is a quick-access surface for humans. The A2A server is the primary interface for agents.

## Two Transport Layers

### A2A (port 7870)
Protocol for agent-to-agent communication — task submission, streaming, cancel, push notifications. Consumed by fleet orchestrators.

### MCP HTTP (port 3398)
Model Context Protocol over HTTP — tool calls for Claude Code, Cursor, and the A2A producers. Stateful sessions (initialize → tools/call). Bearer token auth via `MCP_AUTH_TOKEN`.

These two layers serve different consumers. The A2A producers call MCP internally. Fleet agents only touch A2A.

## Data Flow: search skill

```
Fleet agent                      researcher A2A           MCP server (:3398)         Neo4j
   │                                    │                        │                      │
   │── message/stream (search) ────────▶│                        │                      │
   │                                    │── POST /mcp (initialize)──▶                   │
   │                                    │◀── 200 + Mcp-Session-Id ──                    │
   │                                    │── POST /mcp (research_entity) ─▶              │
   │                                    │          (persist: true)        │── Cypher ──▶│
   │                                    │◀────────── entity bundle ───────               │
   │◀── artifact-update (markdown) ─────│                                               │
   │◀── status-update (completed) ──────│                                               │
```

## Data Flow: deep_research skill

```
Fleet agent          researcher A2A        Next.js app (:3000)        Neo4j
   │                        │                      │                     │
   │── message/stream ─────▶│                      │                     │
   │   (deep_research)       │── POST /api/research/deep ──▶             │
   │                         │◀── { researchId } ───────────             │
   │                         │── GET /api/research/deep/:id ──▶          │
   │                         │   (SSE stream)                            │
   │                         │                                           │
   │                         │  [report.chunk events]                    │
   │◀── artifact-update ─────│◀── data: {"type":"report.chunk"...}       │
   │   (append: true)        │                                           │
   │                         │  [state event: completed]                 │
   │◀── artifact-update ─────│◀── data: {"type":"state","data":          │
   │   (lastChunk: true)     │          {"status":"completed"...}}       │
   │◀── status-update ───────│                                           │
   │   (completed)           │                                           │
```

## MCP Client Session Management

Each A2A producer that calls MCP (`search`, `ingest_url`, `kg_facts`) uses `agent/src/a2a/skills/mcp-client.ts`:

1. **Initialize**: `POST /mcp` with `{"method":"initialize"}` → server returns `Mcp-Session-Id` header
2. **Tool call**: `POST /mcp` with `{"method":"tools/call"}` + `Mcp-Session-Id` header → result
3. Sessions are ephemeral — one session per producer invocation, not pooled

The MCP server's `enableJsonResponse: true` means responses are JSON (not SSE), keeping the client simple.

## Cancel Propagation

When a fleet agent calls `tasks/cancel`:

```
Fleet agent         A2A task store       deep_research producer     Next.js app
   │── tasks/cancel ──▶│                        │                        │
   │                    │── AbortController.abort()──▶                   │
   │                    │                        │── fetch() rejected ──  │
   │                    │                        │── DELETE /api/research/deep/:id ──▶
   │                    │                        │                        │── abort()
   │                    │── transition: canceled ─│                        │
   │◀── task (canceled) ─│                                                │
```

The `DELETE` is fire-and-forget. If the app is unreachable, the producer exits cleanly because its `fetch` already rejected.

## Producer Contract

All producers implement `ProducerFn = (ctx: ProducerContext, input: string) => Promise<void>`:

```typescript
interface ProducerContext {
  taskId: string;
  contextId: string;
  signal: AbortSignal;         // fires on tasks/cancel
  pushText(chunk: string): void; // append to artifact, notify subscribers
  finish(): void;               // transition to completed
  fail(error: { code: number; message: string }): void; // transition to failed
}
```

A producer must call exactly one of `finish()` or `fail()`. Calling neither causes the task store to auto-complete when the producer promise resolves. Calling `pushText` after a terminal call is a no-op.

## Fleet Registration

To make the researcher visible to workstacean/Ava, add to `protoworkstacean/workspace/agents.yaml`:

```yaml
- name: researcher
  url: "http://rabbit-hole-agent:7870/a2a"
  apiKeyEnv: RESEARCHER_API_KEY
  skills:
    - search
    - deep_research
    - ingest_url
    - kg_facts
```

And in the rabbit-hole agent container:

```yaml
environment:
  - RABBIT_HOLE_URL=http://rabbit-hole:3000
  - RABBIT_HOLE_MCP_URL=http://rabbit-hole:3398
  - RABBIT_HOLE_MCP_TOKEN=${MCP_AUTH_TOKEN}
  - RESEARCHER_API_KEY=${RESEARCHER_API_KEY}
  - A2A_ADVERTISE_URL=http://rabbit-hole-agent:7870
```

## Scalability Notes

- **Task store is in-memory** — single instance only. Horizontal scaling requires a shared store (Redis).
- **Deep research is long-running** — 3–15 minutes. Keep connection timeouts generous in the fleet.
- **MCP sessions are ephemeral** — one per tool call, not pooled. If MCP is called heavily, consider adding a session pool.
- **SSE reconnection** — `tasks/resubscribe` reattaches to a running task. Safe for unreliable network paths.
