# Server/Client Split Migration - Complete

**Date**: 2025-10-25

## Summary

`@proto/llm-providers` now uses server/client split to prevent Node.js modules (`fs`, `child_process`) from bundling in client components.

## Usage

### Client Components (Browser)

```typescript
// Types only - safe for client
import type { ProviderType, ModelCategory } from "@proto/llm-providers";
```

### Server Components / API Routes

```typescript
// Full functionality - server only
import { getModel, getProvider } from "@proto/llm-providers/server";
```

### Tests

```typescript
// Test utilities
import { setupFakeProvider, getModel } from "@proto/llm-providers/testing";
```

## Migration Required

Update imports in server-side code:

```bash
# API routes & server components
s/@proto\/llm-providers"/@proto\/llm-providers\/server"/g

# Client components - add 'type' keyword
import type { ... } from "@proto/llm-providers"
```

## Re-enabled Features

- ✅ BedrockProvider (AWS Bedrock)
- ✅ LLM Provider Playground
- ✅ Deep Agent tools export

## Verification

Build outputs:

```
dist/
├── index.* (types only)
├── client/ (browser-safe)
├── server/ (Node.js APIs)
└── testing/ (test utilities)
```

No `fs` or `child_process` in client builds: ✅
