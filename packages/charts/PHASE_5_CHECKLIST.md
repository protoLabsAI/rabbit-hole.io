# Phase 5: Molecules - Checklist

**Phase:** 5/9  
**Components:** 4 molecules  
**Estimated Time:** 3-4 hours

---

## Pre-Phase Verification ✅

- [x] Phase 4 complete (4 atoms built)
- [x] Package building successfully
- [x] All atoms exported and accessible
- [x] Documentation updated

---

## Component Checklist

### 1. GanttHeader

**Source:** Lines 294-446 in `components/ui/shadcn-io/gantt/index.tsx`

- [ ] Create `molecules/gantt-header/gantt-header.tsx`
- [ ] Create `molecules/gantt-header/index.ts`
- [ ] Extract GanttContentHeader sub-component
- [ ] Extract DailyHeader component
- [ ] Extract MonthlyHeader component
- [ ] Extract QuarterlyHeader component
- [ ] Create headers record mapping
- [ ] Add exports to `molecules/index.ts`
- [ ] Build and verify: `pnpm run build`

**Key Dependencies:**
- Uses `GanttColumn` atom
- Uses `useGanttContext` hook
- Uses `date-fns` format functions

**Verification:**
```typescript
import { GanttHeader } from "@proto/charts/gantt";
// Should compile without errors
```

---

### 2. GanttSidebarItem

**Source:** Lines 448-515

- [ ] Create `molecules/gantt-sidebar-item/gantt-sidebar-item.tsx`
- [ ] Create `molecules/gantt-sidebar-item/index.ts`
- [ ] Implement duration calculation
- [ ] Add click and keyboard handlers
- [ ] Integrate scrollToFeature functionality
- [ ] Add status color indicator
- [ ] Add exports to `molecules/index.ts`
- [ ] Build and verify

**Key Features:**
- Duration with `formatDistance`
- Keyboard navigation (Enter key)
- Click to scroll to feature
- Status color dot

**Verification:**
```typescript
const feature = {
  id: "1",
  name: "Test",
  startAt: new Date(),
  endAt: new Date(),
  status: { id: "1", name: "Active", color: "#00ff00" }
};

<GanttSidebarItem feature={feature} />
```

---

### 3. GanttFeatureCard

**Source:** Lines 794-823

- [ ] Create `molecules/gantt-feature-card/gantt-feature-card.tsx`
- [ ] Create `molecules/gantt-feature-card/index.ts`
- [ ] Integrate @dnd-kit/core useDraggable
- [ ] Use @proto/ui Card component
- [ ] Implement dragging state management
- [ ] Add cursor styling
- [ ] Add exports to `molecules/index.ts`
- [ ] Build and verify

**Key Dependencies:**
- @dnd-kit/core `useDraggable`
- @proto/ui `Card` component
- `useGanttDragging` hook

**Verification:**
```typescript
<GanttFeatureCard id="feature-1">
  <p>Feature content</p>
</GanttFeatureCard>
```

---

### 4. GanttDragHelper

**Source:** Lines 740-792

- [ ] Create `molecules/gantt-drag-helper/gantt-drag-helper.tsx`
- [ ] Create `molecules/gantt-drag-helper/index.ts`
- [ ] Implement edge resize handles (left/right)
- [ ] Add hover visual feedback
- [ ] Add date tooltip on hover/drag
- [ ] Integrate useDraggable with ID pattern
- [ ] Add exports to `molecules/index.ts`
- [ ] Build and verify

**Key Features:**
- Direction prop: "left" | "right"
- Visual handle on hover
- Date display tooltip
- Cursor styling (!cursor-col-resize)

**Verification:**
```typescript
<GanttDragHelper
  featureId="1"
  direction="left"
  date={new Date()}
/>
```

---

## Additional Components (Optional)

### GanttColumns (Molecule)

**Source:** Lines 661-688

- [ ] Create `molecules/gantt-columns/gantt-columns.tsx`
- [ ] Create `molecules/gantt-columns/index.ts`
- [ ] Implement column grid rendering
- [ ] Add secondary column styling callback
- [ ] Add exports

**Note:** This composes multiple GanttColumn atoms. Consider building in Phase 5.

---

## Post-Phase Tasks

### Build Verification

```bash
cd packages/charts

# Should succeed
pnpm run build

# Should show:
# ✅ ESM Build success
# ✅ CJS Build success
# ✅ DTS Build success
```

### Export Verification

```bash
# Check dist/ structure
ls -la dist/gantt/

# Should contain:
# index.js (CJS)
# index.mjs (ESM)
# index.d.ts (Types)
```

### Import Test

Create test file or verify in app:
```typescript
import {
  GanttHeader,
  GanttSidebarItem,
  GanttFeatureCard,
  GanttDragHelper,
} from "@proto/charts/gantt";

// All should import without errors
```

---

## Documentation Updates

After Phase 5:

- [ ] Update `STATUS.md`:
  - Change phase to "5/9 Complete"
  - Update "Components: 8/16 (atoms + molecules complete)"
  - Update "What's Working" section

- [ ] Update `PROGRESS_SUMMARY.md`:
  - Mark Phase 5 as "✅ Complete"
  - Update completion percentage
  - Add molecule exports to inventory

- [ ] Update `MIGRATION_PROGRESS.md`:
  - Add Phase 5 section
  - List files created
  - Update remaining work

- [ ] Update `handoffs/2025-10-19_GANTT_REFACTOR_PROGRESS.md`:
  - Update completion percentage
  - Add Phase 5 to completed work
  - Update estimated remaining

---

## Success Criteria

### Phase 5 Complete When:

**Functional:**
- [x] All 4 molecules built and exported
- [x] Package builds without errors (CJS + ESM + DTS)
- [x] Type definitions generated
- [x] Imports work correctly

**Code Quality:**
- [x] All molecules use extracted hooks
- [x] All molecules follow established patterns
- [x] @proto/ui components used where applicable
- [x] Proper TypeScript types
- [x] Clean, readable code

**Documentation:**
- [x] STATUS.md updated
- [x] PROGRESS_SUMMARY.md updated
- [x] Component exports added to molecules/index.ts
- [x] Index files created for each component

---

## Estimated Time Breakdown

| Component | Complexity | Time | Notes |
|-----------|------------|------|-------|
| GanttHeader | High | 90-120min | 4 sub-components |
| GanttSidebarItem | Low | 30-45min | Simple composition |
| GanttFeatureCard | Medium | 45-60min | DnD integration |
| GanttDragHelper | Medium | 45-60min | DnD + positioning |
| **Total** | **-** | **3-4 hours** | **Including testing** |

---

## Potential Challenges

### Challenge 1: GanttHeader Complexity

**Issue:** Has 4 variants (Daily/Monthly/Quarterly + Content Header)

**Solution:** Extract each variant as separate component, compose in parent

### Challenge 2: DnD Integration

**Issue:** @dnd-kit requires specific patterns

**Solution:** Follow GanttFeatureCard pattern from original (lines 794-823)

### Challenge 3: Context Dependencies

**Issue:** Components need context but Provider not built yet

**Solution:** Expected. Provider comes in Phase 7. Components will work once Provider is built.

---

## Next Phase Preview

After Phase 5, you'll build:

**Phase 6: Organisms**
- GanttSidebar (uses GanttSidebarItem)
- GanttTimeline (uses GanttHeader)
- GanttFeatureList
- GanttFeatureRow (complex overlap logic)

**Phase 7: Templates**
- GanttProvider (critical - provides context)
- GanttChart (high-level API)
- Storybook stories

---

**Start:** Create `molecules/gantt-header/gantt-header.tsx`  
**End Goal:** 4 molecules exported and building  
**Time:** 3-4 hours

