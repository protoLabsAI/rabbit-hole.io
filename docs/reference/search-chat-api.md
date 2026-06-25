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
      { "role": "user", "content": "What is retrieval-augmented generation?" }
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
  "args": { "query": "retrieval-augmented generation explained", "categories": "general" },
  "result": [ ... ]
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

## Step limit

The agent stops after **5 tool-call steps** (`stopWhen: stepCountIs(5)`).
