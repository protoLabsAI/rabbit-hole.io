# A2A Agent Reference

The researcher is a spec-compliant A2A (Agent-to-Agent) server exposing rabbit-hole's research pipeline to fleet agents (Ava, etc.) via JSON-RPC 2.0 over HTTP.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/.well-known/agent-card.json` | Agent discovery card |
| `GET` | `/.well-known/agent.json` | Legacy alias |
| `POST` | `/a2a` | JSON-RPC 2.0 — all skill methods |

Default port: **7870** (`$A2A_PORT`).

## Skills

### search

Quick hybrid search across web, knowledge graph, and Wikipedia.

**Input**: plain text query  
**Output**: markdown bundle — Wikipedia summary, extracted entities, sources

**Implementation**: calls MCP `research_entity(depth:"basic", persist:true)` → formats result.

**Typical latency**: 5–15s (parallel Wikipedia + web + entity extraction).

---

### deep_research

Full agentic research pipeline with streaming report.

**Input**: plain text topic  
**Output**: streaming markdown report with inline citations

**Implementation**:
1. `POST /api/research/deep` → `{ researchId }`
2. `GET /api/research/deep/:id` (SSE) → streams `report.chunk` events as A2A artifact deltas
3. `state` event with `status:"completed"` → A2A task terminal

**Typical latency**: 3–15 minutes depending on topic breadth. Streams chunks as they're written.

**Cancel**: A2A `tasks/cancel` fires `AbortSignal`, which sends `DELETE /api/research/deep/:id` to the app.

---

### ingest_url

Ingest a URL (HTML, PDF, audio, video, YouTube) into the knowledge graph.

**Input**: full URL (`http://` or `https://`)  
**Output**: ingest summary (jobId, status, entity/relationship counts)

**Implementation**: calls MCP `ingest_url` → returns job processor result.

---

### kg_facts

Query the knowledge graph for entities matching the input.

**Input**: plain text query  
**Output**: markdown entity list with UIDs, types, aliases, tags, relationship counts, and connected entities

**Implementation**: calls MCP `graph_search(query, limit:15)` → formats entities.

## JSON-RPC Methods

| Method | Description |
|--------|-------------|
| `message/send` | Submit a task, returns task record immediately |
| `message/stream` | Submit a task, returns SSE stream of events |
| `message/sendStream` | Alias for `message/stream` |
| `tasks/get` | Retrieve task record by ID |
| `tasks/list` | List all tasks in the store |
| `tasks/cancel` | Cancel a running task |
| `tasks/resubscribe` | Reattach SSE stream to a running task |
| `pushNotificationConfig/set` | Register a webhook for task events |
| `pushNotificationConfig/get` | Retrieve webhook config for a task |

### Skill routing

Tasks are dispatched by `metadata.skillHint` in the message. If not set, defaults to `"search"`.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "message/stream",
  "params": {
    "message": {
      "parts": [{ "kind": "text", "text": "Temporal knowledge graphs" }],
      "metadata": { "skillHint": "deep_research" }
    }
  }
}
```

## SSE Event Stream

`message/stream` and `tasks/resubscribe` return an SSE stream. Events:

| Event | When | Payload |
|-------|------|---------|
| `status-update` | State transition | `{ taskId, status: { state }, final: bool }` |
| `artifact-update` | Chunk arrives | `{ taskId, artifact: { parts: [{text}] }, append: bool, lastChunk: bool }` |

Terminal states: `completed`, `failed`, `canceled`.

Artifact events with `append: true` carry only the new chunk. `lastChunk: true` carries the full accumulated text (for reconnection / missed-chunk recovery).

## Authentication

When `RESEARCHER_API_KEY` is set, every `/a2a` request must include:

```
X-API-Key: <value of RESEARCHER_API_KEY>
```

Without the env var, auth is advertised in the card but not enforced (dev mode).

## Task Lifecycle

```
submitted → working → completed
                    → failed
                    → canceled
```

Tasks are in-memory with a 1-hour TTL after reaching a terminal state.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `A2A_PORT` | `7870` | Bind port |
| `A2A_ADVERTISE_URL` | `http://localhost:7870` | URL in agent card (fleet uses this) |
| `RESEARCHER_API_KEY` | _(empty)_ | API key enforcement |
| `AGENT_VERSION` | `0.0.0` | Semver in agent card |
| `RABBIT_HOLE_URL` | `http://localhost:3000` | Next.js app (used by `deep_research`) |
| `RABBIT_HOLE_MCP_URL` | `http://localhost:3398` | MCP HTTP server (used by `search`, `ingest_url`, `kg_facts`) |
| `RABBIT_HOLE_MCP_TOKEN` | _(empty)_ | Bearer token for MCP HTTP server |

## Key Files

| File | Purpose |
|------|---------|
| `agent/src/a2a-main.ts` | Entrypoint — wires producers, starts server |
| `agent/src/a2a/index.ts` | `startA2AServer()` — builds all layers |
| `agent/src/a2a/card.ts` | Agent card + skill definitions |
| `agent/src/a2a/rpc/methods.ts` | JSON-RPC method handlers |
| `agent/src/a2a/store/task-store.ts` | In-memory task state machine |
| `agent/src/a2a/skills/mcp-client.ts` | Two-step MCP HTTP session helper |
| `agent/src/a2a/skills/search-producer.ts` | `search` skill implementation |
| `agent/src/a2a/skills/deep-research-producer.ts` | `deep_research` skill implementation |
| `agent/src/a2a/skills/ingest-url-producer.ts` | `ingest_url` skill implementation |
| `agent/src/a2a/skills/kg-facts-producer.ts` | `kg_facts` skill implementation |
| `agent/src/a2a/skills/echo.ts` | Echo stubs (used by tests only) |

## Running Locally

```bash
# Dev (watch mode)
pnpm --filter @protolabsai/agent dev:a2a

# Production (built)
pnpm --filter @protolabsai/agent build
node agent/dist/a2a-main.js
```

## Smoke Test

```bash
# Check agent card
curl http://localhost:7870/.well-known/agent-card.json | jq '.skills[].id'

# Stream a search task
curl -N -X POST http://localhost:7870/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,"method":"message/stream",
    "params":{"message":{"parts":[{"kind":"text","text":"Anthropic Claude"}],
    "metadata":{"skillHint":"search"}}}
  }'

# Stream a deep research task
curl -N -X POST http://localhost:7870/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":2,"method":"message/stream",
    "params":{"message":{"parts":[{"kind":"text","text":"Temporal knowledge graphs"}],
    "metadata":{"skillHint":"deep_research"}}}
  }'
```
