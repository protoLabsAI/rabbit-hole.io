# @proto/charts Documentation

## Overview

Data visualization components for `@proto/charts`, including Gantt charts and geographic maps.

## Components

### Gantt Chart

Interactive timeline visualization for project planning.

### MapCanvas

Geographic visualization with Leaflet for displaying entities on maps.

## Documentation Files

### 1. Interactive Stories (`stories/GanttChart.stories.tsx`)

17 live examples demonstrating all features and use cases:

**View Ranges**

- Default (Monthly)
- DailyView
- QuarterlyView

**Organization**

- GroupedFeatures
- WithMarkers

**Customization**

- ZoomedIn (150%)
- ZoomedOut (75%)
- ReadOnly
- WithoutTodayMarker

**Edge Cases**

- Empty
- SingleFeature
- OverlappingFeatures

**Interactivity**

- InteractiveClick
- StatusVariants
- FullConfiguration

### 2. Comprehensive Guide (`stories/GanttChart.mdx`)

Full MDX documentation including:

- **Overview** - Key features and capabilities
- **Installation** - Setup instructions and dependencies
- **Basic Usage** - Simple examples with code
- **Props Reference** - Complete API documentation
- **View Ranges** - Daily, monthly, quarterly with examples
- **Grouping** - Organizing features into categories
- **Timeline Markers** - Adding important date indicators
- **Zoom Levels** - Adjusting detail from 50% to 200%
- **Interactive Features** - Drag & drop, clicks, add items
- **Display Variants** - Read-only, no today marker
- **Status Colors** - Customizing feature appearance
- **Overlapping Features** - Automatic lane detection
- **Edge Cases** - Empty states and single features
- **Architecture** - Component structure and design
- **Performance** - Bundle size, optimization tips
- **Custom Composition** - Building with primitives
- **Accessibility** - Keyboard nav, ARIA labels
- **Browser Support** - Compatibility matrix
- **Troubleshooting** - Common issues and solutions

### 3. Quick Reference (`stories/GanttChart-QuickReference.mdx`)

Condensed cheat sheet including:

- **Import statements**
- **Minimal examples**
- **Props cheat sheet** - Table format
- **Type definitions** - All TypeScript types
- **Common patterns** - Grouping, markers, events
- **Status color palette** - Recommended colors
- **View range guide** - When to use each
- **Zoom level guide** - Use cases per zoom
- **Date utilities** - Common date operations
- **Performance tips** - Large datasets, memoization
- **Advanced composition** - Lower-level components
- **Keyboard shortcuts** - Navigation reference
- **Troubleshooting** - Quick fixes
- **Migration guide** - From legacy implementations

## Accessing Documentation

### Storybook UI

```bash
pnpm run storybook
```

Navigate to:

- `Templates/Charts/GanttChart` - Main documentation
- `Templates/Charts/GanttChart Quick Reference` - Cheat sheet

**Note:** Organized under Templates to reflect atomic design hierarchy (GanttChart is a template-level component)

### In Code

```tsx
import { GanttChart } from "@proto/charts/gantt";
import type {
  GanttFeature,
  GanttChartGroup,
  GanttMarkerProps,
} from "@proto/charts/gantt";
```

### Package README

See `packages/charts/README.md` for:

- Package overview
- Installation
- Quick start examples
- API reference
- Component architecture
- Development workflow

## Documentation Structure

```
Documentation Hierarchy:

1. GanttChart.mdx (Main Guide)
   └─ Comprehensive walkthrough
   └─ All features explained
   └─ Live story embeds
   └─ Code examples
   └─ Best practices

2. GanttChart-QuickReference.mdx (Cheat Sheet)
   └─ Quick lookup
   └─ Tables and lists
   └─ Common patterns
   └─ Troubleshooting

3. GanttChart.stories.tsx (Interactive Examples)
   └─ Live demos
   └─ Storybook controls
   └─ Play functions
   └─ Visual reference

4. README.md (Package Documentation)
   └─ Installation
   └─ Quick start
   └─ Migration guide
   └─ Contributing
```

## Writing Style

### Main Guide (MDX)

- **Comprehensive** - Cover all features
- **Example-driven** - Code samples for everything
- **Visual** - Embed live stories
- **Educational** - Explain why, not just how

### Quick Reference (MDX)

- **Concise** - No explanations unless critical
- **Scannable** - Tables and lists
- **Actionable** - Copy-paste ready
- **Complete** - All props, types, patterns

### Stories (TSX)

- **Descriptive names** - Clear what each shows
- **Documented** - Comments explain purpose
- **Interactive** - Use controls where useful
- **Tested** - Play functions for key interactions

## Documentation Coverage

### ✓ Covered

- All props and their types
- All view ranges (daily, monthly, quarterly)
- Grouping features
- Timeline markers
- Zoom levels (50-200%)
- Drag & drop interactions
- Click handlers
- Add item functionality
- Read-only mode
- Status colors and customization
- Overlapping feature detection
- Empty states
- Performance optimization
- Custom composition with primitives
- Type definitions
- Common patterns
- Troubleshooting
- Browser support
- Accessibility features

### Future Additions

- [ ] Video tutorials
- [ ] Advanced customization guide
- [ ] Theme customization
- [ ] Server-side rendering guide
- [ ] Integration examples (Next.js, Remix)
- [ ] Custom lane algorithms
- [ ] Export/print functionality
- [ ] Collaborative editing patterns

## Contributing to Documentation

### Adding a New Story

1. Add story to `GanttChart.stories.tsx`
2. Update story count in `AUDIT_SUMMARY.md`
3. Reference in `GanttChart.mdx` if needed

### Updating MDX Docs

1. Edit `GanttChart.mdx` or `GanttChart-QuickReference.mdx`
2. Run Storybook to preview changes
3. Verify all code examples are valid
4. Check all Canvas embeds work

### Documentation Checklist

- [ ] Code examples are valid TypeScript
- [ ] All imports are correct
- [ ] Live story embeds load properly
- [ ] Tables are formatted correctly
- [ ] Links work (internal and external)
- [ ] No typos or grammar issues
- [ ] Examples follow best practices
- [ ] Props match actual implementation

## Best Practices for Examples

### Good Example Structure

```tsx
// ✅ Complete, copy-paste ready
import { GanttChart } from "@proto/charts/gantt";

const features = [
  {
    id: "1",
    name: "Task",
    startAt: new Date(2024, 0, 1),
    endAt: new Date(2024, 0, 15),
    status: { id: "1", name: "Done", color: "#22c55e" },
  },
];

function MyComponent() {
  return <GanttChart features={features} />;
}
```

### Poor Example Structure

```tsx
// ❌ Incomplete, unclear
<GanttChart features={data} />
```

## Documentation Metrics

- **Stories**: 17 interactive examples
- **MDX Pages**: 2 (main guide + quick reference)
- **Code Examples**: 40+
- **Type Definitions**: 4 core types documented
- **Props Documented**: 11 props with defaults
- **Patterns Shown**: 15+ common use cases

## Related Documentation

- `packages/charts/README.md` - Package overview
- `packages/charts/ARCHITECTURE.md` - Technical architecture
- `packages/charts/BUILD_PERFORMANCE.md` - Build analysis
- `packages/charts/AUDIT_SUMMARY.md` - Dependency audit
- `packages/charts/CHANGELOG.md` - Version history
