# @proto/observability

Observability utilities for LLM tracing and monitoring across the monorepo.

## Features

- **Langfuse Integration**: Singleton client for API routes and services
- **Graceful Degradation**: Works without configuration
- **Shared Utilities**: Use across multiple apps and services

## Installation

```bash
# Already installed as workspace dependency
pnpm add @proto/observability
```

## Usage

### In API Routes

```typescript
import { getLangfuse } from "@proto/observability";

export async function POST(request: NextRequest) {
  const langfuse = getLangfuse();
  
  const trace = langfuse?.trace({
    name: "my-api-endpoint",
    tags: ["api", "llm"],
    metadata: { /* ... */ },
  });

  const generation = trace?.generation({
    name: "llm-call",
    model: "gpt-4",
    input: messages,
  });

  // ... make LLM call ...

  generation?.end({
    output: response,
    usage: { input: 100, output: 50, total: 150 },
  });

  await langfuse?.flushAsync();
  
  return NextResponse.json({ /* ... */ });
}
```

### Check if Enabled

```typescript
import { isLangfuseEnabled } from "@proto/observability";

if (isLangfuseEnabled()) {
  console.log("Langfuse tracing active");
}
```

## Environment Variables

```bash
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # Optional
```

## Graceful Degradation

- If environment variables are not set, all functions return `null` or `false`
- No errors thrown - your code continues to work
- Warning logged once when tracing is skipped

## Architecture

- **Singleton Pattern**: One Langfuse instance per process
- **Lazy Initialization**: Created on first use
- **Memory Efficient**: Reuses same instance across requests

