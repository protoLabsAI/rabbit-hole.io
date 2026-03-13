# @proto/charts Architecture

**Package:** @proto/charts  
**Version:** 0.1.0  
**Status:** In Development (Phase 4/9 Complete)

---

## Overview

Modular chart visualization package built with atomic design principles. Currently implementing Gantt chart with plans to expand to other chart types.

---

## Design Philosophy

### Atomic Design Structure

```
Atoms → Molecules → Organisms → Templates
```

**Atoms:** Pure UI primitives (no business logic)  
**Molecules:** Simple compositions (2-3 atoms)  
**Organisms:** Complex features (with state)  
**Templates:** Full compositions (high-level API)

### Separation of Concerns

```
Types ← Utils → Hooks → Components
```

**Types:** All type definitions (no logic)  
**Utils:** Pure functions (no React)  
**Hooks:** React hooks (stateful logic)  
**Components:** Presentation layer (uses hooks + utils)

---

## Package Architecture

### Directory Structure

```
packages/charts/src/
├── index.ts                  # Root export
├── gantt/                    # Gantt chart module
│   ├── index.ts              # Gantt export
│   ├── types/                # Type definitions
│   ├── utils/                # Pure functions
│   ├── hooks/                # React hooks
│   ├── context/              # React context
│   ├── lib/                  # Internal utilities
│   ├── atoms/                # Atomic components
│   ├── molecules/            # Molecular components
│   ├── organisms/            # Organism components
│   └── templates/            # Template components
└── [future chart types]/     # timeline/, roadmap/, etc.
```

### Export Strategy

**Multi-entry build:**
```json
{
  "exports": {
    ".": "./dist/index.js",           // Root (all)
    "./gantt": "./dist/gantt/index.js" // Gantt-specific
  }
}
```

**Import patterns:**
```typescript
// Specific import (tree-shakeable)
import { GanttChart, GanttFeature } from "@proto/charts/gantt";

// Root import (also tree-shakeable)
import { GanttChart } from "@proto/charts";
```

---

## Component Layers

### Layer 1: Types (No Dependencies)

**Purpose:** Type definitions and contracts

```typescript
// types/index.ts
export type GanttFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: GanttStatus;
};
```

**Exports:** 11 types (GanttFeature, GanttStatus, GanttMarkerProps, Range, etc.)

### Layer 2: Utilities (Types Only)

**Purpose:** Pure calculation functions

```typescript
// utils/date-calculations.ts
export const getOffset = (
  date: Date,
  timelineStartDate: Date,
  context: GanttContextProps
): number => {
  // Pure calculation
};
```

**Exports:** 12 functions across 4 files
- Date math (7 functions)
- Position calculations (1 function)
- Timeline generation (1 function)
- Overlap detection (2 functions)

**Dependencies:** `date-fns` only

### Layer 3: Context & Hooks (Types + Utils)

**Purpose:** State management and React integration

```typescript
// hooks/use-gantt-context.ts
export const useGanttContext = () => {
  const context = useContext(GanttContext);
  if (!context) {
    throw new Error("useGanttContext must be used within GanttProvider");
  }
  return context;
};
```

**Exports:** 5 hooks
- Context access
- Global state (jotai)
- Timeline management
- Memoized calculations

**Dependencies:** React, jotai, utils

### Layer 4: Atoms (All Previous Layers)

**Purpose:** Pure UI primitives

**Examples:**
- `GanttColumn` - Single column cell
- `GanttMarker` - Timeline marker
- `GanttToday` - Current date indicator
- `GanttAddFeatureHelper` - Add button

**Pattern:**
```typescript
export const GanttColumn: FC<Props> = ({ index, isSecondary }) => {
  const gantt = useGanttContext();
  const [dragging] = useGanttDragging();
  
  return <div className={cn(/* ... */)}>...</div>;
};
```

**Dependencies:** Hooks, utils, @proto/ui/atoms, @proto/icon-system

### Layer 5: Molecules (Atoms + Hooks)

**Purpose:** Simple compositions (2-3 atoms)

**Planned:**
- `GanttHeader` - Timeline header (uses GanttColumn)
- `GanttSidebarItem` - Sidebar row (uses Badge)
- `GanttFeatureCard` - Feature card (uses Card + DnD)
- `GanttDragHelper` - Resize handle (uses Icon + DnD)

**Pattern:**
```typescript
export const GanttHeader: FC<Props> = ({ className }) => {
  const gantt = useGanttContext();
  
  // Compose atoms
  return (
    <div>
      <GanttContentHeader />
      <GanttColumns />
    </div>
  );
};
```

### Layer 6: Organisms (Molecules + State)

**Purpose:** Complex features with state management

**Planned:**
- `GanttSidebar` - Full sidebar (uses SidebarItem + ScrollArea)
- `GanttTimeline` - Timeline grid (uses Header + Columns)
- `GanttFeatureList` - Feature rendering (uses FeatureRow)
- `GanttFeatureRow` - Overlap handling (uses FeatureItem + algorithm)

**Pattern:**
```typescript
export const GanttSidebar: FC<Props> = ({ features, groups }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Complex state + composition
  return (
    <ScrollArea>
      {groups.map(group => (
        <GanttSidebarGroup>
          {group.features.map(feature => (
            <GanttSidebarItem
              feature={feature}
              onSelect={setSelectedId}
            />
          ))}
        </GanttSidebarGroup>
      ))}
    </ScrollArea>
  );
};
```

### Layer 7: Templates (All Layers)

**Purpose:** High-level compositions with simple API

**Planned:**
- `GanttProvider` - Context provider (state management)
- `GanttChart` - Complete chart (simple API)

**Pattern:**
```typescript
export const GanttChart: FC<Props> = ({
  features,
  range = "monthly",
  zoom = 100,
  onFeatureMove,
}) => {
  return (
    <GanttProvider range={range} zoom={zoom}>
      <GanttSidebar features={features} />
      <GanttTimeline>
        <GanttHeader />
        <GanttFeatureList features={features} onMove={onFeatureMove} />
        <GanttToday />
      </GanttTimeline>
    </GanttProvider>
  );
};
```

---

## State Management

### Global State (Jotai)

**Atoms defined in hooks:**
```typescript
// use-gantt-dragging.ts
const draggingAtom = atom(false);

// use-gantt-scroll.ts
const scrollXAtom = atom(0);
```

**Usage:**
```typescript
const [dragging, setDragging] = useGanttDragging();
const [scrollX, setScrollX] = useGanttScrollX();
```

### Context State (React Context)

**Provided by GanttProvider:**
```typescript
<GanttContext.Provider
  value={{
    zoom,
    range,
    columnWidth,
    sidebarWidth,
    rowHeight,
    headerHeight,
    timelineData,
    onAddItem,
    ref,
    scrollToFeature,
  }}
>
```

**Accessed via hook:**
```typescript
const gantt = useGanttContext();
// Access: gantt.zoom, gantt.range, etc.
```

### Local State (Component)

**Used for:**
- Hover states
- Temporary UI states
- Controlled inputs

**Example:**
```typescript
const [hovering, setHovering] = useState(false);
```

---

## Performance Optimizations

### Memoization Strategy

**Utilities:** Already memoized in hooks
```typescript
const offset = useMemo(
  () => getOffset(date, timelineStartDate, gantt),
  [date, timelineStartDate, gantt]
);
```

**Components:** Use React.memo for expensive renders
```typescript
export const GanttMarker = memo(function GanttMarker(props) {
  // Component logic
});
```

**Callbacks:** useCallback for event handlers
```typescript
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Throttling

**Scroll events:**
```typescript
const handleScroll = useCallback(
  throttle(() => {
    // Scroll logic
  }, 100),
  [dependencies]
);
```

**Mouse tracking:**
```typescript
const top = useThrottle(mousePosition.y - offset, 10);
```

---

## Drag & Drop Architecture

### DnD Kit Integration

**Feature Card (Whole Feature):**
```typescript
const { attributes, listeners, setNodeRef } = useDraggable({
  id: feature.id
});

<div {...attributes} {...listeners} ref={setNodeRef}>
  {/* Card content */}
</div>
```

**Drag Helpers (Edge Resize):**
```typescript
const { attributes, listeners, setNodeRef } = useDraggable({
  id: `feature-drag-helper-${featureId}`
});
```

**DnD Context Wrapper:**
```typescript
<DndContext
  modifiers={[restrictToHorizontalAxis]}
  onDragEnd={onDragEnd}
  onDragMove={handleDragMove}
  sensors={[mouseSensor]}
>
  <DraggableComponent />
</DndContext>
```

**Note:** Each draggable element needs its own DndContext wrapper

---

## CSS Architecture

### CSS Variables (Set by Provider)

```css
--gantt-zoom: 100
--gantt-column-width: 150px  /* Calculated: (zoom/100) * baseWidth */
--gantt-header-height: 60px
--gantt-row-height: 36px
--gantt-sidebar-width: 300px /* Auto-calculated from DOM */
```

**Usage in components:**
```tsx
<div style={{ height: "var(--gantt-row-height)" }}>
```

### Tailwind Classes

**Consistent patterns:**
- `sticky top-0` - Sticky headers
- `z-20` - Z-index layers
- `bg-backdrop/90 backdrop-blur-sm` - Frosted glass
- `border-border/50` - Subtle borders
- `text-muted-foreground` - Secondary text

---

## Dependencies Available

### Internal Packages

```typescript
import { Card, Badge, Button, ContextMenu } from "@proto/ui/atoms";
import { Icon } from "@proto/icon-system";
import { cn } from "../../lib/utils"; // Internal cn utility
```

### External Libraries

```typescript
import { format, addDays, differenceInDays } from "date-fns";
import { useDraggable } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useMouse, useThrottle } from "@uidotdev/usehooks";
import { atom, useAtom } from "jotai";
import throttle from "lodash.throttle";
```

---

## Build Process

### Development Workflow

```bash
# Terminal 1: Watch mode
cd packages/charts
pnpm run dev

# Terminal 2: Build and test in app
cd ../..
pnpm run build
pnpm run dev

# Navigate to http://localhost:3000/share/[token]
```

### Build Outputs

```
dist/
├── index.js           # CJS root
├── index.mjs          # ESM root
├── index.d.ts         # Types root
├── gantt/
│   ├── index.js       # CJS gantt
│   ├── index.mjs      # ESM gantt
│   └── index.d.ts     # Types gantt
└── [source maps]
```

### Verification Steps

After building each component:

1. **Build:** `pnpm run build` (should succeed)
2. **Type Check:** `pnpm run type-check` (should pass)
3. **Size Check:** Verify dist sizes reasonable (< 50 KB)
4. **Exports:** Import in app to verify exports work

---

## Line Number Reference (Original Component)

Key sections in `components/ui/shadcn-io/gantt/index.tsx`:

| Lines | Component | Phase | Status |
|-------|-----------|-------|--------|
| 1-83 | Imports + Types | 2-3 | ✅ Done |
| 98-157 | Date utilities | 2 | ✅ Done |
| 159-172 | Position utils | 2 | ✅ Done |
| 174-195 | Timeline generation | 2 | ✅ Done |
| 197-262 | Offset/Width calculation | 2 | ✅ Done |
| 280-292 | Context definition | 3 | ✅ Done |
| 294-339 | GanttContentHeader | 5 | ⏳ Next |
| 341-377 | DailyHeader | 5 | ⏳ Next |
| 379-396 | MonthlyHeader | 5 | ⏳ Next |
| 398-420 | QuarterlyHeader | 5 | ⏳ Next |
| 428-446 | GanttHeader | 5 | ⏳ Next |
| 448-515 | GanttSidebarItem | 5 | ⏳ Next |
| 517-526 | GanttSidebarHeader | 6 | ⏳ Later |
| 528-548 | GanttSidebarGroup | 6 | ⏳ Later |
| 550-569 | GanttSidebar | 6 | ⏳ Later |
| 571-615 | GanttAddFeatureHelper | 4 | ✅ Done |
| 617-659 | GanttColumn | 4 | ✅ Done |
| 661-688 | GanttColumns | 5 | ⏳ Next |
| 690-738 | GanttCreateMarkerTrigger | 6 | ⏳ Later |
| 740-792 | GanttFeatureDragHelper | 5 | ⏳ Next |
| 794-823 | GanttFeatureItemCard | 5 | ⏳ Next |
| 825-969 | GanttFeatureItem | 6 | ⏳ Later |
| 971-983 | GanttFeatureListGroup | 6 | ⏳ Later |
| 985-1059 | GanttFeatureRow | 6 | ⏳ Later |
| 1061-1076 | GanttFeatureList | 6 | ⏳ Later |
| 1078-1150 | GanttMarker | 4 | ✅ Done |
| 1152-1391 | GanttProvider | 7 | ⏳ Later |
| 1393-1410 | GanttTimeline | 6 | ⏳ Later |
| 1412-1466 | GanttToday | 4 | ✅ Done |

---

## Type System

### Core Types

```typescript
// Main entity
type GanttFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: GanttStatus;
  lane?: string;
};

// Configuration
type Range = "daily" | "monthly" | "quarterly";

// Context
type GanttContextProps = {
  zoom: number;
  range: Range;
  columnWidth: number;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  onAddItem?: (date: Date) => void;
  timelineData: TimelineData;
  ref: RefObject<HTMLDivElement | null> | null;
  scrollToFeature?: (feature: GanttFeature) => void;
};
```

### Type Exports

All types exported from `types/index.ts`:
```typescript
import type { GanttFeature, Range, GanttContextProps } from "@proto/charts/gantt";
```

---

## Utility Functions

### Date Calculations

```typescript
// Get appropriate date function based on range
getsDaysIn(range) → (date: Date) => number
getDifferenceIn(range) → (a: Date, b: Date) => number
getInnerDifferenceIn(range) → (a: Date, b: Date) => number
getStartOf(range) → (date: Date) => Date
getEndOf(range) → (date: Date) => Date
getAddRange(range) → (date: Date, amount: number) => Date

// Position calculations
getOffset(date, startDate, context) → number
getWidth(startAt, endAt, context) → number
calculateInnerOffset(date, range, columnWidth) → number
```

### Position Calculations

```typescript
getDateByMousePosition(context, mouseX) → Date
```

### Timeline Generation

```typescript
createInitialTimelineData(today) → TimelineData
```

### Overlap Detection

```typescript
calculateFeaturePositions(features) → FeatureWithPosition[]
calculateMaxSubRows(features) → number
```

---

## Hook System

### Context Hook

```typescript
const gantt = useGanttContext();
// Throws error if used outside GanttProvider
```

### State Hooks (Jotai)

```typescript
const [dragging, setDragging] = useGanttDragging();
const [scrollX, setScrollX] = useGanttScrollX();
```

### Timeline Hook

```typescript
const { timelineData, extendPast, extendFuture } = useTimelineData(new Date());
```

### Calculations Hook

```typescript
const { getOffset, getWidth, calculateInnerOffset } = useDateCalculations(gantt);
```

---

## Component Composition Rules

### Atoms

**Rules:**
- No state beyond UI state (hover, focus)
- No business logic
- Can use context via hooks
- Single responsibility
- Reusable across molecules

**Example:**
```typescript
// ✅ Good atom
export const GanttColumn: FC = ({ index, isSecondary }) => {
  const [hovering, setHovering] = useState(false); // ✅ UI state only
  return <div onMouseEnter={() => setHovering(true)}>...</div>;
};

// ❌ Bad atom
export const GanttColumn: FC = ({ index }) => {
  const [features, setFeatures] = useState([]); // ❌ Business logic
  useEffect(() => { fetchFeatures(); }, []); // ❌ Side effects
};
```

### Molecules

**Rules:**
- Compose 2-3 atoms
- Minimal state (mostly UI state)
- Can use hooks
- Can have props for data

**Example:**
```typescript
// ✅ Good molecule
export const GanttHeader: FC = ({ className }) => {
  const gantt = useGanttContext(); // ✅ Context
  const id = useId(); // ✅ UI utility
  
  return (
    <div>
      <GanttContentHeader /> {/* ✅ Composes atoms */}
      <GanttColumns />
    </div>
  );
};
```

### Organisms

**Rules:**
- Complex state management
- Compose molecules and atoms
- Business logic allowed
- Can have side effects

**Example:**
```typescript
// ✅ Good organism
export const GanttSidebar: FC = ({ features, groups, onSelect }) => {
  const [selected, setSelected] = useState<string | null>(null); // ✅ State
  const [expanded, setExpanded] = useState<Set<string>>(new Set()); // ✅ Complex state
  
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    onSelect?.(id);
  }, [onSelect]);
  
  return (/* Complex composition */);
};
```

### Templates

**Rules:**
- Provide context
- Manage global state
- High-level API
- Compose all layers

---

## Migration Path (Phase 8)

### Old Import (Still Works)

```typescript
import { GanttProvider, GanttTimeline } from "@/components/ui/shadcn-io/gantt";
```

### New Import (After Migration)

```typescript
import { GanttProvider, GanttTimeline } from "@proto/charts/gantt";
```

### Parallel Period

During migration, both imports work:
- Old path: Points to original component
- New path: Points to @proto/charts

This allows gradual migration without breaking changes.

### Consumers to Update

**1. EventGanttChart** (`app/components/share/EventGanttChart.tsx`)
- Line 38-50: Update imports
- Test: Share page functionality

**2. Share Page** (`app/share/[token]/page.tsx`)
- No code changes (uses EventGanttChart)
- Test: End-to-end timeline rendering

---

## Success Criteria by Phase

### Phase 5 (Molecules) ✅ When:
- [ ] GanttHeader renders correctly with all variants
- [ ] GanttSidebarItem displays feature info
- [ ] GanttFeatureCard is draggable
- [ ] GanttDragHelper provides resize feedback
- [ ] Package builds without errors
- [ ] Type definitions complete

### Phase 6 (Organisms) ✅ When:
- [ ] GanttSidebar groups features correctly
- [ ] GanttTimeline infinite scroll works
- [ ] GanttFeatureList renders all features
- [ ] GanttFeatureRow handles overlaps
- [ ] Complex state management functional

### Phase 7 (Templates) ✅ When:
- [ ] GanttProvider manages all state
- [ ] GanttChart provides simple API
- [ ] All components have stories
- [ ] Storybook displays correctly

### Phase 8 (Migration) ✅ When:
- [ ] EventGanttChart uses new package
- [ ] Share page renders identically
- [ ] No regressions in functionality
- [ ] Performance benchmarks met

### Phase 9 (Cleanup) ✅ When:
- [ ] Documentation complete
- [ ] Old component removed
- [ ] PR merged to main

---

## Files to Update Per Phase

### Phase 5 (Molecules)

**Create:**
- `molecules/gantt-header/gantt-header.tsx`
- `molecules/gantt-header/index.ts`
- `molecules/gantt-sidebar-item/gantt-sidebar-item.tsx`
- `molecules/gantt-sidebar-item/index.ts`
- `molecules/gantt-feature-card/gantt-feature-card.tsx`
- `molecules/gantt-feature-card/index.ts`
- `molecules/gantt-drag-helper/gantt-drag-helper.tsx`
- `molecules/gantt-drag-helper/index.ts`

**Update:**
- `molecules/index.ts` (add all exports)
- `STATUS.md` (update progress)
- `PROGRESS_SUMMARY.md` (mark tasks complete)

### Phase 6 (Organisms)

**Create:**
- `organisms/gantt-sidebar/gantt-sidebar.tsx`
- `organisms/gantt-timeline/gantt-timeline.tsx`
- `organisms/gantt-feature-list/gantt-feature-list.tsx`
- `organisms/gantt-feature-row/gantt-feature-row.tsx`
- Index files for each

**Update:**
- `organisms/index.ts`
- Status docs

### Phase 7 (Templates)

**Create:**
- `templates/gantt-provider/gantt-provider.tsx`
- `templates/gantt-chart/gantt-chart.tsx`
- Stories for all components
- Index files

**Update:**
- `templates/index.ts`
- `README.md` (usage examples)
- `CHANGELOG.md` (feature list)

### Phase 8 (Migration)

**Update:**
- `app/components/share/EventGanttChart.tsx` (imports only)
- Test coverage
- Performance benchmarks

### Phase 9 (Cleanup)

**Delete:**
- `components/ui/shadcn-io/gantt/` (entire directory)

**Update:**
- Final documentation
- Migration guide
- Handoff complete document

---

## Troubleshooting

### Build Fails

```bash
# Clean slate
rm -rf dist node_modules
pnpm install
pnpm run build
```

### Type Errors

Check import paths:
```typescript
// ❌ Wrong
import { useGanttContext } from "@proto/charts/gantt";

// ✅ Correct (within package)
import { useGanttContext } from "../../hooks";
```

### Component Not Rendering

Ensure wrapped in Provider when testing:
```typescript
<GanttProvider>
  <YourComponent />
</GanttProvider>
```

### DnD Not Working

Check DndContext wrapper and sensor configuration:
```typescript
const mouseSensor = useSensor(MouseSensor, {
  activationConstraint: {
    distance: 10,
  },
});
```

---

## Completion Checklist

Use this to verify each phase:

### Phase 5 Checklist
- [ ] All 4 molecules created
- [ ] Each has component file + index.ts
- [ ] molecules/index.ts exports all
- [ ] Package builds successfully
- [ ] Types generated correctly
- [ ] STATUS.md updated
- [ ] PROGRESS_SUMMARY.md updated

### Phase 6 Checklist
- [ ] All 4 organisms created
- [ ] Complex state working
- [ ] Overlap algorithm functional
- [ ] Package builds successfully
- [ ] organisms/index.ts complete
- [ ] Docs updated

### Phase 7 Checklist
- [ ] GanttProvider functional
- [ ] GanttChart API intuitive
- [ ] All stories created
- [ ] Storybook renders
- [ ] templates/index.ts complete

### Phase 8 Checklist
- [ ] EventGanttChart migrated
- [ ] Share page verified
- [ ] Tests passing
- [ ] Performance validated

### Phase 9 Checklist
- [ ] All docs complete
- [ ] Old component removed
- [ ] Final handoff created
- [ ] PR ready for review

---

## Contact Points

**Questions about:**
- Architecture decisions → Check with team lead
- Performance issues → Document for review
- Breaking changes → Require approval
- Build problems → Check this guide first

**Progress reporting:**
- Update STATUS.md after each phase
- Create handoff if blocked
- Notify team when ready for review

---

**Next Step:** Start Phase 5 - Create `molecules/gantt-header/gantt-header.tsx`

**Estimated Time:** 3-4 hours for complete Phase 5

**Good Luck!**

