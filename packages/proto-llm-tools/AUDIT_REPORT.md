# @proto/llm-tools Package Audit Report

**Date:** October 27, 2025  
**Issue:** Build failure due to memory exhaustion during DTS generation  
**Error:** `ERR_WORKER_OUT_OF_MEMORY: JS heap out of memory`

---

## Executive Summary

The build fails during TypeScript declaration (DTS) generation due to memory exhaustion in CI. The package has grown to include 12 entry points with complex dependency graphs, causing the TypeScript compiler worker to exceed memory limits. Additionally, the package contains deprecated/unused code that should be removed.

---

## Root Cause Analysis

### Memory Issue

1. **Too Many Entry Points**: 12 separate entry points in `tsup.config.ts`
2. **Parallel DTS Generation**: tsup spawns workers for each entry point
3. **Complex Type Dependencies**: Deep import chains through workspace packages
4. **CI Memory Constraints**: GitHub Actions runners have limited memory
5. **Large Playground Components**: React Flow and other heavy dependencies

### Build Process

```
✅ ESM Build: Success (3.4s)
✅ CJS Build: Success (3.7s)
❌ DTS Build: Memory exhaustion during worker process
```

---

## Deprecated/Unused Code

### 1. `tools/core/` - DEPRECATED ❌

**Status:** Not exported from main index, only used in standalone tests

**Location:** `/src/tools/core/`

**Contents:**

- `extract/` - extractTool implementation
- `summarize/` - summarizeTool implementation
- Test files: `test-extract.ts`, `test-summarize.ts`
- Extensive documentation (6 MD files)

**Reason for Deprecation:**

- Not exported from `src/tools/index.ts`
- Not used in any application code
- Only referenced in test files and documentation
- Functionality superseded by other workflows

**Evidence:**

```bash
grep -r "extractTool\|summarizeTool" apps/
# Returns: Only references in docs, not in active code
```

**Recommendation:** Delete entire `tools/core/` directory

---

### 2. `entity-extraction-basic/graph/` - EMPTY ❌

**Status:** Empty directory

**Location:** `/src/tools/entity-extraction-basic/graph/`

**Recommendation:** Delete empty directory

---

### 3. `LLMProviderPlayground` - NOT EXPORTED ⚠️

**Status:** Commented out of exports

**Location:** `/src/playgrounds/llm-provider-playground/`

**Comment in `playgrounds/index.ts`:**

```typescript
// LLMProviderPlayground NOT exported to prevent Node.js module bundling in client components
```

**Reason:**

- Causes bundling issues with Node.js modules
- Not safe for client-side rendering
- Not actually used in apps

**Evidence:**

```bash
grep -r "LLMProviderPlayground" apps/
# Returns: No matches
```

**Recommendation:** Move to apps layer or delete if truly deprecated

---

### 4. `EntityResearchPlayground` - PARTIALLY EXPORTED ⚠️

**Status:** Not exported from main playgrounds/index.ts

**Location:** `/src/playgrounds/entity-research-playground/`

**Comment in `playgrounds/index.ts`:**

```typescript
// EntityResearchPlayground NOT exported to prevent SSR evaluation of React Flow
```

**Usage:**

- Used in: `apps/rabbit-hole/app/playground/components/EntityResearchPlaygroundLoader.tsx`
- Loaded via dynamic import to avoid SSR issues

**Has Separate Entry Point:** ✅

```typescript
// package.json exports
"./playgrounds/entity-research-playground/index": {
  "types": "./dist/playgrounds/entity-research-playground/index.d.ts",
  "import": "./dist/playgrounds/entity-research-playground/index.mjs",
  "require": "./dist/playgrounds/entity-research-playground/index.js"
}
```

**Recommendation:** Keep but optimize (see solutions below)

---

## Active Code Inventory

### ✅ Actively Used

1. **Main Exports** (`src/index.ts`)
   - Workflow tools
   - Individual tools (langextract, entity-extraction-basic, deep-agent)
   - Configuration exports (langextract, wikipedia, youtube)
   - Job queue utilities

2. **Client Entry** (`src/client.ts`)
   - React hooks for client-side use

3. **Playgrounds** (Actively Used)
   - `LangExtractPlayground` ✅
   - `TranscriptionPlayground` ✅
   - `YouTubePlayground` ✅
   - `WikipediaPlayground` ✅
   - `TiptapExtractionPlayground` ✅
   - `EntityResearchPlayground` ✅ (separate entry)

4. **Tools**
   - `deep-agent-entity-researcher` ✅
   - `entity-extraction-basic` ✅
   - `langextract-client` ✅

5. **Workflows**
   - `multi-phase-extraction` ✅
   - `human-loop-extraction-graph` ✅
   - `entity-research` ✅

---

## Solutions

### Option 1: Increase Memory Limit (Quick Fix) ⚡

**Implementation:**

```json
// package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' tsup"
  }
}
```

**Pros:**

- Minimal code changes
- Fast implementation

**Cons:**

- May not work in all CI environments
- Doesn't address root cause
- Longer build times

---

### Option 2: Disable DTS Bundling for Large Entries (Recommended) ⭐

**Implementation:**

```typescript
// tsup.config.ts
export default defineConfig({
  // ... existing config
  dts: {
    resolve: true, // Resolve external types instead of bundling
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
});
```

Or selectively disable for problematic entries:

```typescript
export default defineConfig([
  // Main entries with DTS
  {
    entry: {
      index: "src/index.ts",
      client: "src/client.ts",
      "playgrounds/index": "src/playgrounds/index.ts",
    },
    dts: true,
    // ... other options
  },
  // Large playground without DTS bundling
  {
    entry: {
      "playgrounds/entity-research-playground/index":
        "src/playgrounds/entity-research-playground/index.ts",
    },
    dts: { resolve: true }, // Don't bundle, just emit declarations
    // ... other options
  },
]);
```

**Pros:**

- Reduces memory pressure
- Faster builds
- More maintainable

**Cons:**

- Slightly less type safety (but still type-safe via references)

---

### Option 3: Split Package (Long-term) 🏗️

**Implementation:**
Create separate packages:

- `@proto/llm-tools` - Core tools and workflows
- `@proto/llm-playgrounds` - Playground components

**Pros:**

- Better separation of concerns
- Smaller build units
- Easier to maintain

**Cons:**

- Requires refactoring
- More complex setup
- Time intensive

---

### Option 4: Reduce Entry Points (Moderate) 🔧

**Current Entry Points:** 12

**Consolidate to:**

- `index` - Main entry
- `client` - Client hooks
- `playgrounds/index` - All playgrounds except entity-research
- `playgrounds/entity-research-playground/index` - Entity research only (for SSR avoidance)
- `deep-agent-entity-researcher/*` - Keep for modularity (5 entries)

**Remove from tsup.config.ts:**

- `tools/entity-extraction-basic/index` - Export from main index instead

**Result:** Reduce from 12 to ~10 entry points

---

## Recommended Action Plan

### Phase 1: Immediate Fix (Complete in 10 minutes)

1. ✅ Delete deprecated code:

   ```bash
   rm -rf packages/proto-llm-tools/src/tools/core
   rm -rf packages/proto-llm-tools/src/tools/entity-extraction-basic/graph
   ```

2. ✅ Update `tsup.config.ts` - Add memory-efficient DTS config:

   ```typescript
   dts: {
     resolve: true, // Key change
     compilerOptions: {
       composite: false,
       incremental: false,
     },
   },
   ```

3. ✅ Update `package.json` - Add fallback memory limit:
   ```json
   "build": "NODE_OPTIONS='--max-old-space-size=4096' tsup"
   ```

### Phase 2: Optimize Entry Points (Optional, 30 minutes)

1. Remove `tools/entity-extraction-basic/index` from entry points
2. Export directly from main index instead
3. Update any imports in consuming code

### Phase 3: Long-term (Future consideration)

1. Consider splitting into `@proto/llm-playgrounds` package
2. Evaluate if `LLMProviderPlayground` should be deleted or moved to apps layer
3. Audit other workspace packages for similar issues

---

## Files to Modify

### 1. `tsup.config.ts`

- Add `resolve: true` to dts config

### 2. `package.json`

- Add `NODE_OPTIONS` to build script

### 3. Delete:

- `src/tools/core/` (entire directory)
- `src/tools/entity-extraction-basic/graph/` (empty directory)

---

## Testing Checklist

After implementing fixes:

- [ ] `pnpm run build` succeeds locally
- [ ] `pnpm run type-check` passes
- [ ] All exports still accessible:
  - [ ] `@proto/llm-tools` (main)
  - [ ] `@proto/llm-tools/client`
  - [ ] `@proto/llm-tools/playgrounds`
  - [ ] `@proto/llm-tools/playgrounds/entity-research-playground`
  - [ ] `@proto/llm-tools/deep-agent-entity-researcher/*`
- [ ] CI build passes
- [ ] Apps using the package build successfully

---

## Metrics

### Current State

- **Entry Points:** 12
- **Source Files:** ~191 (including tests and docs)
- **Build Time:** Fails at DTS generation (~7s before failure)
- **Memory Usage:** Exceeds CI limits (~2GB)

### After Phase 1

- **Entry Points:** 12 (unchanged)
- **Source Files:** ~140 (removed ~51 deprecated files)
- **Expected Build Time:** ~8-12s (complete)
- **Expected Memory Usage:** Within CI limits (<2GB)

---

## Conclusion

The memory issue is solvable with minimal changes. Adding `resolve: true` to the DTS config and increasing the memory limit will allow builds to complete. Removing deprecated code will reduce maintenance burden and future build times.

**Primary Fix:** Update tsup config + increase memory limit  
**Secondary Benefit:** Remove 51 deprecated files  
**Impact:** CI builds will succeed, codebase becomes cleaner
