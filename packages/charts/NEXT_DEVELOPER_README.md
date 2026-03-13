# Next Developer - Quick Start Guide

**Welcome!** You're continuing the Gantt chart refactor from Phase 5 (Molecules).

---

## Current Status

✅ **42% Complete** (13/31 tasks)  
✅ **Building Successfully** (CJS + ESM + TypeScript)  
✅ **Foundation Ready** (types, utils, hooks, atoms)

---

## Your Mission

Build 4 molecular components, then continue through organisms and templates.

---

## Quick Start

### 1. Verify Setup

```bash
cd /Users/joshmabry/dev/rabbit-hole.io/packages/charts

# Install dependencies (should already be done)
pnpm install

# Build package
pnpm run build

# Should see:
# ✅ ESM Build success
# ✅ CJS Build success
# ✅ DTS Build success
```

### 2. Open Key Files

**Source to extract from:**
- `components/ui/shadcn-io/gantt/index.tsx`

**Your work location:**
- `packages/charts/src/gantt/molecules/`

**References:**
- `packages/charts/src/gantt/atoms/` (pattern examples)
- `packages/ui/src/molecules/` (atomic design examples)

### 3. Start Building

**Next 4 components:**
1. `GanttHeader` (lines 294-446 in original)
2. `GanttSidebarItem` (lines 448-515 in original)
3. `GanttFeatureCard` (lines 794-823 in original)
4. `GanttDragHelper` (lines 740-792 in original)

---

## Pattern to Follow

### File Structure

```
molecules/gantt-header/
├── gantt-header.tsx       # Create this
└── index.ts               # Create this (export * from "./gantt-header")
```

### Component Template

```typescript
"use client";

import type { FC } from "react";
import { cn } from "../../lib/utils";
import { useGanttContext } from "../../hooks";

export type GanttHeaderProps = {
  className?: string;
};

export const GanttHeader: FC<GanttHeaderProps> = ({ className }) => {
  const gantt = useGanttContext();
  
  // Your implementation
  
  return <div className={cn(/* ... */, className)}>...</div>;
};
```

### After Each Component

1. Create the component file
2. Create the index.ts export
3. Add export to `molecules/index.ts`
4. Build: `pnpm run build`
5. Fix any errors
6. Move to next component

---

## Import Rules

```typescript
// ✅ Relative imports within package
import { useGanttContext } from "../../hooks";
import { GanttColumn } from "../../atoms";
import { cn } from "../../lib/utils";

// ✅ Package imports for external
import { Card } from "@proto/ui/atoms";
import { Icon } from "@proto/icon-system";

// ✅ Direct library imports
import { format } from "date-fns";
import { useDraggable } from "@dnd-kit/core";
```

---

## Resources

**Detailed Guide:**
- `handoffs/2025-10-19_GANTT_REFACTOR_CONTINUATION_HANDOFF.md`

**Progress Tracking:**
- `packages/charts/STATUS.md` - Update after each phase
- `packages/charts/PROGRESS_SUMMARY.md` - Detailed metrics

**Original Plan:**
- `handoffs/2025-10-19_GANTT_CHART_REFACTOR_TO_CHARTS_PKG.md`

**Package Standards:**
- `packages/ui/` - Reference for atomic design
- `rules/04-package-creation-and-building.md` - Build standards

---

## Testing

Tests are planned but not required during initial build. Focus on:
1. Building components
2. Ensuring they compile
3. Exporting correctly

Add tests in later phase or separate PR.

---

## Build Commands

```bash
# Watch mode (recommended)
pnpm run dev

# One-time build
pnpm run build

# Type check
pnpm run type-check
```

---

## Common Errors

**"Module not found"**  
→ Check index.ts files exist and export correctly

**"cn is not exported"**  
→ Use `import { cn } from "../../lib/utils"`

**"useGanttContext must be used within Provider"**  
→ Normal error, will be resolved when Provider is built in Phase 7

---

## Questions?

Check the continuation handoff document first. It has detailed extraction guides with line numbers and code examples.

---

**Start Here:** `molecules/gantt-header/gantt-header.tsx`  
**Estimated Time:** 3-4 hours for Phase 5

Good luck!

