# Package Split Strategy - @protolabsai/llm-tools

**Authored**: October 27, 2025  
**Context**: Type generation memory issue requiring architectural solutions  
**Timeline**: Phase implementation over 2-3 months

## Current State: Monolithic Package

### Statistics

- **Codebase**: 179 files (127 _.ts, 26 _.tsx, 21 \*.md)
- **Entry points**: 11 (resulting in 22 built files: CJS + ESM)
- **External dependencies**: 19 packages
- **Type complexity**: Very High (LangChain + Tiptap + monorepo)

### Entry Point Distribution

```
index.ts                                        → Full server exports
├─ workflows/
├─ tools/
├─ config/
└─ utils/

client.ts                                       → Browser-safe only
├─ hooks/
├─ config/ (subset)
├─ types/ (browser-only)
└─ NO LangChain/LangGraph

playgrounds/index.ts                           → Playground components
├─ playgrounds/entity-research-playground/
├─ playgrounds/langextract-playground/
├─ playgrounds/llm-provider-playground/
├─ playgrounds/transcription-playground/
└─ playgrounds/tiptap-extraction-playground/

tools/deep-agent-entity-researcher/*          → 5 sub-entry points
├─ graph/
├─ tools/
├─ prompts/
├─ subagents/
└─ state

tools/entity-extraction-basic/*               → 1 sub-entry point
```

## Proposed Split Architecture

### Phase 1: Extract High-Type-Complexity Workflows (Q1 2026)

**New Package**: `@protolabsai/llm-workflows`

- Move server-only LangGraph workflows
- Move job queue patterns
- Retain complex state graphs

**Benefits**:

- Isolates LangGraph type resolution (StateGraph, StateAnnotation, etc.)
- Reduces entry points from 11 to 5 in @protolabsai/llm-tools
- Reduces type surface by 40% in main package

**Contents to Move**:

```
src/workflows/
├─ entity-extraction/
├─ entity-research/
├─ multi-phase-extraction/
└─ human-loop-extraction-graph/

src/tools/
├─ deep-agent-entity-researcher/ (entire tool)
└─ entity-extraction-basic/
```

**Remaining in @protolabsai/llm-tools**:

```
src/
├─ client.ts (unchanged)
├─ index.ts (re-exports from @protolabsai/llm-workflows)
├─ hooks/ (React Query, Transcription, YouTube)
├─ config/ (Wikipedia, LangExtract, YouTube, Transcription)
├─ playgrounds/ (moved to separate package in Phase 2)
└─ utils/ (helpers, polling, polling)
```

### Phase 2: Extract Playgrounds (Q1 2026)

**New Package**: `@protolabsai/llm-playgrounds`

- Move all playground components
- Include playground-specific state and utilities
- Maintain dependency on both @protolabsai/llm-tools and @protolabsai/llm-workflows

**Benefits**:

- Isolates Tiptap type complexity
- Eliminates 5 entry points (playgrounds/\* exports)
- Separates UI concerns from library logic

**Contents to Move**:

```
src/playgrounds/
├─ entity-research-playground/
├─ langextract-playground/
├─ llm-provider-playground/
├─ transcription-playground/
└─ tiptap-extraction-playground/

Related docs:
├─ REFACTORING_COMPLETE.md (LLM Provider)
└─ README.md (playground index)
```

**Result Structure**:

```
@protolabsai/llm-playgrounds/
├─ src/
│  ├─ components/ (Playgrounds)
│  ├─ hooks/ (Playground-specific)
│  ├─ state/ (Playground state)
│  └─ index.ts
├─ package.json (dependencies: @protolabsai/llm-tools, @protolabsai/llm-workflows)
└─ tsup.config.ts
```

### Phase 3: Deep Agent Researcher Package (Q2 2026)

**New Package**: `@protolabsai/entity-researcher`

- Specialized multi-agent system for entity research
- Complete autonomy from other tools
- All 6 subagents + coordinator

**Benefits**:

- Isolates complex multi-agent orchestration
- Reduces entry points in @protolabsai/llm-workflows
- Enables independent versioning and updates

**Contents to Move**:

```
src/tools/deep-agent-entity-researcher/
├─ graph/
├─ prompts/
├─ state.ts
├─ subagents/
├─ tools/
├─ utils/
└─ README.md
```

**Result Structure**:

```
@protolabsai/entity-researcher/
├─ src/
│  ├─ graph/
│  ├─ prompts/
│  ├─ subagents/
│  ├─ tools/
│  ├─ state.ts
│  └─ index.ts
├─ package.json
└─ tsup.config.ts
```

## Memory Impact Analysis

### Before Split (Current)

```
Build command: NODE_OPTIONS='--max-old-space-size=4096' tsup

Type resolution per entry point:
├─ 11 entry points
├─ 2 formats (CJS/ESM)
├─ Each resolves: @langchain/*, @tiptap/*, @protolabsai/types
└─ Total combinations: 22 type generation passes

Peak memory: ~3.5GB during type generation
Estimated build time: 45-60 seconds
```

### After Complete Split

```
@protolabsai/llm-tools:
├─ 3 entry points (index, client, utils)
├─ 2 formats
├─ Type surface: 30% of current
└─ Peak memory: ~1.2GB

@protolabsai/llm-workflows:
├─ 2 entry points (index, state-types)
├─ 2 formats
├─ Type surface: 40% (high complexity)
└─ Peak memory: ~1.5GB (parallel)

@protolabsai/llm-playgrounds:
├─ 1 entry point (index)
├─ 2 formats
├─ Type surface: 20%
└─ Peak memory: ~0.8GB (parallel)

@protolabsai/entity-researcher:
├─ 1 entry point (index)
├─ 2 formats
├─ Type surface: 15%
└─ Peak memory: ~0.8GB (parallel)

Parallel build: max(1.5GB, 1.2GB, 0.8GB, 0.8GB) ≈ 1.5GB
Sequential build: 1.5 + 1.2 + 0.8 + 0.8 = 4.3GB
Savings: 58% memory per package, parallelizable
```

## Implementation Roadmap

### Phase 0: Current (Oct 27, 2025)

- ✅ Disable `dts.resolve: true`
- ✅ Document type generation strategy
- ⏳ Monitor build performance
- ⏳ Verify no hydration/runtime regressions

### Phase 1: Create @protolabsai/llm-workflows (Week 1-2, Nov 2025)

```bash
pnpm create-workspace-package llm-workflows
# Move workflows/ and tools/ to new package
# Update imports in @protolabsai/llm-tools
# Verify exports and entry points
```

### Phase 2: Create @protolabsai/llm-playgrounds (Week 3-4, Nov 2025)

```bash
pnpm create-workspace-package llm-playgrounds
# Move playgrounds/ to new package
# Update Storybook imports
# Update app/rabbit-hole imports
```

### Phase 3: Create @protolabsai/entity-researcher (Dec 2025)

```bash
pnpm create-workspace-package entity-researcher
# Move tools/deep-agent-entity-researcher/ to new package
# Update references in @protolabsai/llm-workflows
```

### Phase 4: Consolidate @protolabsai/llm-tools (Dec 2025)

- Simplify package to client-safe utilities + configs
- Reduce to 2-3 entry points
- Consider final size reduction: 85% smaller

## Dependency Graph After Split

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ @protolabsai/llm-tools (Client-safe utilities & configs)                         │
│ - React hooks (React Query, Transcription, YouTube)                         │
│ - Config (Wikipedia, LangExtract, YouTube, Transcription)                   │
│ - Types (browser-safe only)                                                 │
│ - Dependencies: React, @tanstack/react-query, @protolabsai/types                  │
└─────────────────────────────────────────────────────────────────────────────┘
            ↑                                          ↑
            │ imports                                 │ imports
            │                                         │
┌───────────────────────────────┐    ┌──────────────────────────────┐
│ @protolabsai/llm-workflows          │    │ @protolabsai/llm-playgrounds       │
│ - LangGraph workflows          │    │ - Playground components      │
│ - Job queue patterns           │    │ - Playground state/hooks     │
│ - Tool implementations         │    │ - Storybook support         │
│ - LangChain integrations       │    │ - Dependencies: @protolabsai/llm-* │
│ - Dependencies: LangChain/*    │    └──────────────────────────────┘
└───────────────────────────────┘
            ↑
            │ imports
            │
┌───────────────────────────────┐
│ @protolabsai/entity-researcher      │
│ - Multi-agent coordinator     │
│ - 6 specialized subagents     │
│ - Complex state management    │
│ - Dependencies: @protolabsai/llm-*  │
└───────────────────────────────┘
```

## Success Metrics

### Build Performance

- [ ] Individual package builds complete in <30 seconds
- [ ] Parallel monorepo build: <45 seconds (vs current ~60 seconds)
- [ ] Type-check: <20 seconds per package
- [ ] Memory usage: <2GB per package (vs current 3.5GB)

### Codebase Health

- [ ] Zero circular dependencies between packages
- [ ] Reduced LOC per package (max 2000 lines)
- [ ] Clear ownership boundaries
- [ ] Easy to parallelize in CI/CD

### Developer Experience

- [ ] Faster incremental builds
- [ ] Clearer import paths
- [ ] Better tree-shaking for bundle size
- [ ] Easier to test in isolation

## Migration Checklist

For each phase:

- [ ] Create new workspace package with standard structure
- [ ] Move source files with import updates
- [ ] Verify exports and re-exports
- [ ] Update consuming applications
- [ ] Update TypeScript paths (if needed)
- [ ] Verify tsup config and builds succeed
- [ ] Test in development environment
- [ ] Update documentation and README files
- [ ] Update CI/CD pipeline
- [ ] Create PR with detailed change description

## Known Risks

1. **Circular Dependencies**: May emerge between layers
   - Mitigation: Use tsup `external` array strictly
   - Test with `check-circular-deps.mjs` script

2. **Import Path Complexity**: More packages = more imports
   - Mitigation: Create barrel exports per phase
   - Update IDE autocomplete

3. **Version Coordination**: Monorepo alleviates, but verify
   - Mitigation: Test cross-package imports thoroughly
   - Document stable API contracts

4. **Bundle Size**: Potential duplication across packages
   - Mitigation: Ensure external deps prevent bundling
   - Monitor final bundle sizes in app

## References

- `rules/04-package-creation-and-building.md` - Package structure standards
- `packages/proto-llm-tools/TYPEGEN_AUDIT.md` - Type generation analysis
- `packages/proto-llm-tools/tsup.config.ts` - Current build config
- `pnpm-workspace.yaml` - Monorepo configuration
- `turbo.json` - Build orchestration
