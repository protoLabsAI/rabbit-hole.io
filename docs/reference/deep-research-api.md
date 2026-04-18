# Deep Research API

The deep research API manages long-running research jobs. Jobs are started with a POST, then streamed via SSE.

## Start a research job

```
POST /api/research/deep
```

**Request**:
```typescript
{
  query: string;       // research topic
  sessionId?: string;  // for Langfuse tracing
}
```

**Response**:
```typescript
{
  researchId: string;
  status: "started";
}
```

The job starts immediately in the background.

### Example

```bash
curl -X POST http://localhost:3399/api/research/deep \
  -H "Content-Type: application/json" \
  -d '{ "query": "GraphRAG vs standard RAG for enterprise" }' \
  | jq '.researchId'
```

## Stream research events

```
GET /api/research/deep/:id
```

Returns a Server-Sent Events (SSE) stream. Each event is a JSON object.

```bash
curl -N http://localhost:3399/api/research/deep/res_abc123
```

### Event schema

```typescript
interface ResearchEvent {
  type: ResearchEventType;
  data: unknown;
  timestamp: string;
}
```

### Event types

| Type | When | Data |
|------|------|------|
| `scope_started` | Pipeline begins | `{ query }` |
| `scope_complete` | Dimensions defined | `{ dimensions: string[] }` |
| `dimension_started` | Dimension research begins | `{ dimension: string; index: number }` |
| `dimension_source` | A source found | `{ title; url; snippet; dimension }` |
| `dimension_complete` | Dimension done | `{ dimension; summary; keyFinding; sourceCount }` |
| `evaluate_started` | Gap analysis begins | `{ iteration: number }` |
| `evaluate_complete` | Gap analysis done | `{ gaps: string[]; hasGaps: boolean }` |
| `synthesis_started` | Report generation begins | — |
| `synthesis_delta` | Report text chunk | `{ text: string }` |
| `synthesis_complete` | Report done | `{ sourceCount: number }` |
| `error` | Pipeline error | `{ message: string }` |
| `done` | Stream closed | `{ researchId }` |

### Example event stream

```
data: {"type":"scope_complete","data":{"dimensions":["Performance benchmarks","Memory usage","Developer experience"]},"timestamp":"..."}

data: {"type":"dimension_started","data":{"dimension":"Performance benchmarks","index":0},"timestamp":"..."}

data: {"type":"dimension_source","data":{"title":"Rust vs Go benchmarks","url":"...","snippet":"..."},"timestamp":"..."}

data: {"type":"synthesis_delta","data":{"text":"## Performance\n\nRust consistently outperforms..."},"timestamp":"..."}
```

## Poll for status

```
GET /api/research/deep/:id/status
```

Returns a snapshot without opening a stream:

```typescript
{
  researchId: string;
  status: "running" | "complete" | "error" | "cancelled";
  phase: "scope" | "research" | "evaluate" | "synthesis" | "done";
  dimensionsTotal: number;
  dimensionsComplete: number;
  sourceCount: number;
  report?: string;  // present when status === "complete"
}
```

## Cancel a job

```
DELETE /api/research/deep/:id
```

Cancels the running job. The current dimension finishes, then the job stops.

**Response**: `204 No Content`

## State storage

Research state is held in-memory on `globalThis.__researchStore`. This survives Turbopack module isolation but does **not** persist across process restarts. Plan accordingly — completed reports should be downloaded before restarting the server.
