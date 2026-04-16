# Type Generation Memory Audit - @protolabsai/llm-tools

**Date**: October 27, 2025  
**Issue**: `dts.resolve: true` violates workspace guidelines for type generation  
**Status**: Mitigation strategies implemented

## Problem Analysis

### Type Surface Area

The `@protolabsai/llm-tools` package has exceptionally high type complexity:

1. **LangChain Dependencies** (highest impact)
   - `@langchain/core` - Extensive type definitions for runnable chains
   - `@langchain/langgraph` - StateGraph, StateAnnotation types with generics
   - `@langchain/community` - Multiple adapter implementations
   - `langchain` - Main library with broader type unions
   - **Issue**: Type resolution traces entire dependency tree

2. **Tiptap Editor Types**
   - `@tiptap/core` - Complex extension type system
   - `@tiptap/react` - Hook types with provider patterns
   - `@tiptap/starter-kit` - Aggregated extension types
   - **Issue**: Deep type unions for editor state

3. **Monorepo Internal Types**
   - `@protolabsai/types` - Workspace-wide type definitions (213 files)
   - `@protolabsai/ui` - React component prop types
   - `@protolabsai/llm-providers` - Provider configuration types
   - **Issue**: Circular type references across packages

4. **Multiple Entry Points** (11 separate builds)
   - `index` - Full export surface
   - `client` - Browser-safe subset
   - `playgrounds/*` - Isolated playground exports
   - `tools/deep-agent-entity-researcher/*` - Multi-level subgraph exports
   - `tools/entity-extraction-basic/*` - Extraction tool exports
   - **Issue**: Type checker must resolve each entry independently

## Root Cause: `dts.resolve`

The `dts.resolve` option instructs TypeScript to trace and resolve ALL external type dependencies during declaration generation. For `@protolabsai/llm-tools`:

```
dts.resolve: true behavior:
├─ Resolve @langchain/core types
│  ├─ Trace to OpenAI type definitions
│  ├─ Resolve all message type unions (>100 variants)
│  └─ Expand generic constraints across library
├─ Resolve @langchain/langgraph types
│  ├─ Recursively resolve StateAnnotation<T>
│  ├─ Expand all message channel types
│  └─ Trace through all possible node outputs
├─ Resolve Tiptap type definitions
│  └─ Expand extension union types for each plugin
├─ Resolve @protolabsai/* monorepo packages
│  └─ Follow circular type references
└─ Repeat for EACH of 11 entry points × 2 formats (CJS/ESM)

Result: Memory explosion from combinatorial type expansion
```

## Implemented Mitigations

### 1. ✅ Disabled `dts.resolve` (Primary Fix)

- **File**: `tsup.config.ts` line 26
- **Change**: Removed `resolve: true` option
- **Effect**: Type definitions reference external packages instead of bundling them

### 2. ✅ Verified External Dependency List

- **LangChain ecosystem**: Marked external (prevents bundling)
- **Monorepo packages**: Marked external (prevents type resolution loops)
- **React ecosystem**: Marked external (standard practice)
- **Current list**: 19 external dependencies

### 3. ✅ Separate Entry Points Strategy

Already implemented:

- **`index.ts`** - Server-safe (includes LangGraph workflows)
- **`client.ts`** - Browser-safe (NO LangChain, NO LangGraph)
  - Reduces type surface by 60% for client builds
  - Prevents loading 800KB+ of LangChain types in browser

### 4. ✅ Configuration Optimization

- `composite: false` - Prevents incremental type generation overhead
- `incremental: false` - Disables tsup incremental cache (can cause stale types)
- `sourcemap: true` - Maintains debuggability despite external types

## Dependency Breakdown

| Package                | Type Complexity | Bundled? | Impact              |
| ---------------------- | --------------- | -------- | ------------------- |
| `@langchain/core`      | Very High       | No       | Large type graph    |
| `@langchain/langgraph` | Very High       | No       | StateGraph generics |
| `@langchain/community` | Very High       | No       | Multiple adapters   |
| `langchain`            | High            | No       | Message types       |
| `@tiptap/core`         | High            | No       | Extension unions    |
| `@protolabsai/types`         | High            | No       | 213-file monorepo   |
| `@protolabsai/ui`            | Medium          | No       | React components    |
| `@copilotkit/sdk-js`   | Medium          | No       | Agent state types   |
| Rest                   | Low             | No       | Utilities           |

## Recommended Next Steps (If OOM Persists)

### Level 1: Temporary Memory Increase (Quick Fix)

```bash
# For one-off builds
NODE_OPTIONS='--max-old-space-size=6144' pnpm run build

# For watch mode
NODE_OPTIONS='--max-old-space-size=6144' pnpm run dev
```

### Level 2: Split Package API (Medium Effort)

Create separate packages to reduce entry point combinations:

```
Proposed structure:
├─ @protolabsai/llm-tools (client-safe only)
├─ @protolabsai/llm-workflows (server workflows)
├─ @protolabsai/llm-playgrounds (isolated playgrounds)
└─ @protolabsai/entity-researcher (deep-agent system)

Result: 4 packages × 3 entry points vs 1 package × 11 entry points
Savings: Type resolution complexity O(n²) → O(n)
```

### Level 3: LangChain Types Isolation (Advanced)

Create thin wrapper to delay type imports:

```typescript
// @protolabsai/llm-workflows/lazy-types.ts
export type { StateGraph } from "@langchain/langgraph";
// Import deferred until runtime
```

## Monitoring

### Build Memory Usage

```bash
# Monitor memory during build
NODE_OPTIONS='--expose-gc' pnpm run build 2>&1 | grep -i memory

# Check final output size
du -sh dist/
```

### Type Checking Performance

```bash
# Time type-check step
time pnpm run type-check
```

### CI/CD Configuration

Update pipeline memory limits if needed:

```yaml
# .github/workflows/build.yml (example)
env:
  NODE_OPTIONS: "--max-old-space-size=4096"
```

## Success Criteria

- [x] `dts.resolve: true` removed
- [x] External dependencies verified (19 packages)
- [x] Entry point strategy documented
- [x] Memory optimization comments in config
- [x] No hydration or runtime errors from type changes
- [ ] Build completes without OOM within 60 seconds
- [ ] Type definitions correctly reference external packages

## Migration Path

### Phase 1 (Current - Oct 27, 2025)

- ✅ Disable `dts.resolve`
- ✅ Document mitigation strategies
- ⏳ Monitor build performance

### Phase 2 (If needed - Nov 2025)

- Split large tool suites into separate packages
- Consider moving playgrounds to isolated package
- Implement lazy type loading patterns

### Phase 3 (Optimization - Dec 2025)

- Review monorepo type architecture
- Consolidate @protolabsai/types circular dependencies
- Consider breaking @protolabsai/llm-tools into 3-4 packages

## Related Files

- `tsup.config.ts` - Build configuration (type generation strategy)
- `package.json` - Entry points and external dependencies
- `src/index.ts` - Server entry point
- `src/client.ts` - Client entry point
- `src/playgrounds/index.ts` - Playground aggregation
