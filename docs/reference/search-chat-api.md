# Search Chat API

The search chat API powers the main search UI. It accepts a conversation and streams a response using the AI SDK v6 streaming format.

## Endpoint

```
POST /api/chat
```

## Request

```typescript
interface ChatRequest {
  messages: Message[];
  id?: string;          // session ID (used for Langfuse tracing)
}

interface Message {
  role: "user" | "assistant";
  content: string;
}
```

### Example request

```bash
curl -X POST http://localhost:3399/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "What is GraphRAG?" }
    ]
  }'
```

## Response

The response is a stream in [AI SDK v6 data stream format](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol). Consume it with `useChat` from `@ai-sdk/react` or parse the SSE events manually.

### Event types

| Prefix | Description |
|--------|-------------|
| `0:` | Text delta — append to current message |
| `2:` | Data part — tool calls, sources, metadata |
| `8:` | Message annotations |
| `d:` | Finish event with usage stats |
| `e:` | Error |

### Tool call events

When the agent calls a tool, a `2:` data event carries:

```json
{
  "type": "tool_call",
  "toolName": "searchWeb",
  "args": { "query": "GraphRAG explained", "categories": "general" },
  "result": [ ... ]
}
```

## Query graph tool

**Tool name**: `searchGraph`

Runs hybrid BM25 + vector search against Neo4j. Only called if the knowledge graph has content.

**Input**:
```typescript
{ query: string }
```

**Output**: Array of `GraphSearchResult`:
```typescript
{
  title: string;
  content: string;
  url: string;
  score: number;
  entityType?: string;
}
```

## Web search tool

**Tool name**: `searchWeb`

Calls SearXNG. The agent selects categories based on query intent.

**Input**:
```typescript
{
  query: string;
  categories?: "general" | "social media" | "it" | "science" | "news";
}
```

**Output**: Array of `WebSearchResult`:
```typescript
{
  title: string;
  url: string;
  snippet: string;
  engines?: string[];
  publishedDate?: string;
}
```

## Wikipedia tool

**Tool name**: `searchWikipedia`

**Input**:
```typescript
{ query: string }
```

## Clarification tool

**Tool name**: `askClarification`

When the agent is uncertain about query intent, it calls this tool. The `ClarificationMiddleware` intercepts it and returns the question to the client as a special annotation — the agent does not proceed until the user replies.

**Input**:
```typescript
{ question: string }
```

## Communities tool

**Tool name**: `searchCommunities`

Searches GraphRAG community summaries in Neo4j. Only called for broad thematic questions when the graph has community data.

**Input**:
```typescript
{ query: string }
```

## Ingest endpoint

```
POST /api/chat/ingest
```

Extracts entities from a message and ingests them into Neo4j. Called when the user clicks **Add to Knowledge Graph**.

**Request**:
```typescript
{
  messageId: string;
  sessionId: string;
}
```

The `StructuredExtractionMiddleware` pre-computes extraction previews during the search, so this call is fast.

## Step limit

The agent stops after **7 tool-call steps** (`stopWhen: stepCountIs(7)`).
