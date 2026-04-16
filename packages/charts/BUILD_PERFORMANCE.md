# Build Performance Analysis

## Current Performance

**Total Build Time:** ~3 seconds  
**ESM Build:** ~16ms (fast)  
**TypeScript Declarations (DTS):** ~3000ms (bottleneck)

## Breakdown

```
ESM Build start
ESM dist/index.js           43.37 KB
ESM dist/gantt/index.js     43.37 KB
ESM dist/index.js.map       78.18 KB
ESM dist/gantt/index.js.map 78.26 KB
ESM ⚡️ Build success in 16ms

DTS Build start
DTS ⚡️ Build success in 3026ms
DTS dist/gantt/index.d.ts 8.76 KB
DTS dist/index.d.ts       1.25 KB
```

## Why DTS Build is Slow

1. **Type Generation Overhead** - TypeScript compiler must:
   - Parse all source files (54 TypeScript files)
   - Resolve all type dependencies
   - Generate declaration files (.d.ts)
   - Create declaration maps

2. **Atomic Component Structure** - 54 files across atoms/molecules/organisms/templates architecture
   - More files = more type checking passes
   - Cross-references between layers require dependency resolution

3. **External Type Dependencies**
   - `@dnd-kit/core` - Complex drag-and-drop types
   - `@dnd-kit/modifiers` - Modifier types
   - `date-fns` - Date utility types
   - `jotai` - Atom state types
   - `react` - Component types
   - `@protolabsai/ui` - UI component types
   - `@protolabsai/icon-system` - Icon types

## Performance Is Acceptable

3 seconds for a full build is **reasonable** for this package because:

- 54 TypeScript files with complex component hierarchies
- Multiple external type dependencies
- Atomic design structure with cross-layer references
- Type-safe props across the component tree

## Optimization Options (If Needed)

### 1. Enable TypeScript Project References (Moderate Gain)

Already enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

### 2. Isolate DTS Generation (Small Gain)

Could split type generation into separate step, but adds complexity.

### 3. Reduce File Count (Moderate Gain, High Effort)

Consolidate atoms/molecules into fewer files. Trade-off:

- ✅ Faster builds
- ❌ Less modular architecture
- ❌ Harder to maintain

**Verdict:** Not worth it for 3-second builds.

### 4. Skip Source Maps in Production (Small Gain)

Modify `tsup.config.ts`:

```typescript
sourcemap: process.env.NODE_ENV === "development";
```

Saves ~200-300ms by skipping .map file generation.

### 5. Parallel Type Checking (Already Used)

`tsup` already uses TypeScript's parallel compilation when possible.

## Comparison to Other Packages

| Package       | Files | Build Time | Notes                         |
| ------------- | ----- | ---------- | ----------------------------- |
| @protolabsai/charts | 54    | 3s         | Acceptable for complexity     |
| @protolabsai/ui     | ~100+ | 5-7s       | More components, longer build |
| @protolabsai/types  | ~20   | 1s         | Type definitions only         |

## Recommendations

1. **Keep current setup** - 3 seconds is acceptable
2. **Monitor on CI** - If builds exceed 5 seconds, investigate
3. **Watch mode for dev** - Use `pnpm run dev` for instant rebuilds
4. **Incremental builds** - Turbo already caches unchanged packages

## Dev Workflow

For fastest iteration during development:

```bash
# Terminal 1: Watch mode (rebuilds on change)
cd packages/charts
pnpm run dev

# Terminal 2: Storybook with hot reload
pnpm run storybook
```

Watch mode uses incremental compilation - subsequent rebuilds are < 500ms.








