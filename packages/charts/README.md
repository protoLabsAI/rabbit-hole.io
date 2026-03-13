# @proto/charts

Professional data visualization components for the Proto platform.

## Features

- **Gantt Charts** - Interactive timeline visualization with drag-and-drop
- **Atomic Design** - Modular components from atoms to templates
- **Performance Optimized** - Memoized calculations, efficient rendering
- **TypeScript** - Full type safety with comprehensive type definitions
- **Flexible** - Use high-level API or compose from primitives
- **Responsive** - Infinite scroll, dynamic column widths

## Installation

```bash
# In monorepo workspace
pnpm add @proto/charts

# Dependencies
# - @dnd-kit/core
# - @proto/ui
# - date-fns
# - jotai
```

## Quick Start

### Simple Gantt Chart

```tsx
import { GanttChart } from "@proto/charts/gantt";

const features = [
  {
    id: "1",
    name: "Feature 1",
    startAt: new Date(2024, 0, 1),
    endAt: new Date(2024, 0, 15),
    status: { id: "1", name: "In Progress", color: "#3b82f6" },
  },
];

function MyGantt() {
  return (
    <GanttChart
      features={features}
      range="monthly"
      zoom={100}
      onFeatureMove={(id, startAt, endAt) => {
        console.log("Feature moved:", id, startAt, endAt);
      }}
    />
  );
}
```

### Grouped Features

```tsx
import { GanttChart } from "@proto/charts/gantt";

const groups = [
  {
    name: "Backend",
    features: [
      {
        id: "1",
        name: "API",
        startAt: new Date(2024, 0, 1),
        endAt: new Date(2024, 0, 10),
        status: { id: "1", name: "Done", color: "#22c55e" },
      },
      {
        id: "2",
        name: "Database",
        startAt: new Date(2024, 0, 5),
        endAt: new Date(2024, 0, 15),
        status: { id: "2", name: "In Progress", color: "#3b82f6" },
      },
    ],
  },
  {
    name: "Frontend",
    features: [
      {
        id: "3",
        name: "UI Components",
        startAt: new Date(2024, 0, 10),
        endAt: new Date(2024, 0, 20),
        status: { id: "2", name: "In Progress", color: "#3b82f6" },
      },
    ],
  },
];

function GroupedGantt() {
  return (
    <GanttChart groups={groups} range="daily" zoom={120} showToday={true} />
  );
}
```

### With Markers

```tsx
import { GanttChart } from "@proto/charts/gantt";

const markers = [
  {
    id: "m1",
    date: new Date(2024, 0, 15),
    label: "Sprint End",
    color: "#ef4444",
  },
];

function GanttWithMarkers() {
  return <GanttChart features={features} markers={markers} range="monthly" />;
}
```

## API Reference

### GanttChart Props

```typescript
interface GanttChartProps {
  // Data
  features?: GanttFeature[]; // Flat list of features
  groups?: GanttChartGroup[]; // Grouped features
  markers?: GanttMarkerProps[]; // Timeline markers

  // Display
  range?: "daily" | "monthly" | "quarterly"; // Default: "monthly"
  zoom?: number; // 50-200, default: 100
  showToday?: boolean; // Default: true

  // Interaction
  readOnly?: boolean; // Default: false
  onFeatureMove?: (id: string, startAt: Date, endAt: Date | null) => void;
  onFeatureClick?: (feature: GanttFeature) => void;
  onAddItem?: (date: Date) => void;

  // Styling
  className?: string;
}

interface GanttFeature {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: {
    id: string;
    name: string;
    color: string; // Hex color
  };
}
```

## Advanced Usage

### Custom Composition

Build your own layout using primitives:

```tsx
import {
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureRow,
  GanttToday,
} from "@proto/charts/gantt";

function CustomGantt({ groups }) {
  return (
    <GanttProvider range="monthly" zoom={100}>
      <GanttSidebar>
        {groups.map((group) => (
          <GanttSidebarGroup key={group.name} name={group.name}>
            {group.features.map((feature) => (
              <GanttSidebarItem key={feature.id} feature={feature} />
            ))}
          </GanttSidebarGroup>
        ))}
      </GanttSidebar>

      <GanttTimeline>
        <GanttHeader />
        <GanttFeatureList>
          {groups.map((group) => (
            <GanttFeatureRow key={group.name} features={group.features} />
          ))}
        </GanttFeatureList>
        <GanttToday />
      </GanttTimeline>
    </GanttProvider>
  );
}
```

## Migration Guide

### From components/ui/shadcn-io/gantt

```diff
- import { GanttChart } from "../../../components/ui/shadcn-io/gantt";
+ import { GanttChart } from "@proto/charts/gantt";

// API remains the same
<GanttChart features={features} />
```

## Component Architecture

**Atoms** - Primitive UI elements

- `GanttColumn`, `GanttMarker`, `GanttToday`, `GanttAddFeatureHelper`

**Molecules** - Simple combinations

- `GanttColumns`, `GanttHeader`, `GanttSidebarItem`, `GanttFeatureCard`, `GanttDragHelper`

**Organisms** - Complex components

- `GanttSidebar`, `GanttTimeline`, `GanttFeatureList`, `GanttFeatureItem`, `GanttFeatureRow`

**Templates** - Full compositions

- `GanttProvider`, `GanttChart`

## Performance

- **Infinite scroll**: Timeline extends dynamically as you scroll
- **Memoization**: Expensive calculations cached with `useMemo`
- **Overlap detection**: O(n) algorithm for feature positioning
- **Bundle size**: ~50KB CJS, ~43KB ESM

## Development

```bash
# Build package
cd packages/charts
pnpm run build

# Watch mode
pnpm run dev

# Type check
pnpm run type-check
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.
