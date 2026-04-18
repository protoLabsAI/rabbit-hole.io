# Middleware Pipeline

The middleware pipeline wraps the `streamText` agent loop. It's a DeerFlow-inspired composable chain defined in `packages/research-middleware/`.

## Architecture

```
Request
  ↓
[beforeAgent hooks] — all middleware runs in registration order
  ↓
streamText agent loop
  ↓  ↑  (repeats until stopWhen)
[wrapToolCall hooks] — wrap each tool execution
[beforeModel / afterModel hooks] — wrap each LLM call
  ↓
[afterAgent hooks]
  ↓
Response
```

## Middleware registry

Middleware is wired in `app/lib/middleware-config.ts`.

| Middleware | Hook | Purpose |
|-----------|------|---------|
| `EntityMemory` | `beforeAgent` | Queries Neo4j for entities related to the query. Flags stale entities (> 30 days). Injects summary into system prompt. |
| `ResearchPlanner` | `beforeAgent` | For complex queries, generates a 3–5 step research plan and injects it into context. |
| `ParallelDecomposition` | `beforeAgent` | Decomposes compound queries into focused sub-queries. Runs sub-queries concurrently. |
| `DeferredToolLoading` | `beforeAgent` | Lazy-loads tool schemas. Disabled by default. |
| `Clarification` | `wrapToolCall` | Intercepts `askClarification` tool calls. Returns the question to the client as a stream annotation. Pauses the agent loop. |
| `LoopDetection` | `wrapToolCall` | Hashes each tool call. Warns the agent at the 2nd repeat of the same call. Blocks at 3rd repeat. |
| `Reflection` | `afterModel` | Evaluates evidence quality after each LLM call. Guides the agent to fill gaps if sources are thin. |
| `StructuredExtraction` | `afterAgent` | Extracts entities and relationships from the full research context. Stores as a preview for the "Add to Graph" button. |

## Hook signatures

```typescript
interface Middleware {
  name: string;

  beforeAgent?(ctx: AgentContext): Promise<void>;

  beforeModel?(ctx: ModelContext): Promise<void>;

  afterModel?(ctx: ModelContext, result: ModelResult): Promise<void>;

  wrapToolCall?(
    ctx: ToolContext,
    next: () => Promise<ToolResult>
  ): Promise<ToolResult>;

  afterAgent?(ctx: AgentContext, result: AgentResult): Promise<void>;
}
```

## `AgentContext`

```typescript
interface AgentContext {
  query: string;
  messages: CoreMessage[];
  systemPrompt: string;
  sessionId?: string;
  metadata: Record<string, unknown>;
}
```

`metadata` is a mutable bag shared across all middleware in a request. Use it to pass state between hooks (e.g., `graphIsEmpty`, `researchPlan`).

## `ToolContext`

```typescript
interface ToolContext {
  toolName: string;
  args: Record<string, unknown>;
  callId: string;
  metadata: Record<string, unknown>;
}
```

## Langfuse tracing

When `LANGFUSE_PUBLIC_KEY` is set, every hook, tool call, and LLM call produces a Langfuse trace. Spans are nested:

```
Trace: search session
  Span: EntityMemory.beforeAgent
  Span: streamText agent loop
    Span: tool/searchWeb
    Span: tool/searchWikipedia
    Span: Reflection.afterModel
  Span: StructuredExtraction.afterAgent
```

Configure:
```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # or self-hosted
```

## Adding custom middleware

1. Create a class implementing `Middleware` in `packages/research-middleware/src/middleware/`
2. Export it from `packages/research-middleware/src/index.ts`
3. Register it in `app/lib/middleware-config.ts`:

```typescript
import { MyMiddleware } from "@protolabsai/research-middleware";

export const middlewareChain = createMiddlewareChain([
  new EntityMemory(),
  new MyMiddleware({ option: "value" }),
  // ...
]);
```

Middleware runs in registration order. Hook order for a single request:

1. All `beforeAgent` hooks (in order)
2. For each agent step: `wrapToolCall` (innermost = last registered), `beforeModel`, `afterModel`
3. All `afterAgent` hooks (in order)
