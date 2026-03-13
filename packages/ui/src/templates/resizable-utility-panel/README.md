# ResizableUtilityPanel

Universal utility panel component with tabs, custom headers, and collapsible/resizable functionality.

## Features

- **Tabbed Interface** - Multiple tabs with custom content
- **Per-Tab Headers** - Custom header content and actions for each tab
- **Collapsible** - Full collapse with floating tab buttons
- **Resizable** - Drag-to-resize with constraints
- **Positioning** - Top, bottom, left, or right
- **Persistence** - Saves size, collapsed state, and active tab
- **Theme-Aware** - Full semantic color token support

## Quick Start

```tsx
import { ResizableUtilityPanel } from "@/components/layouts";
import { Grid3x3, Settings } from "lucide-react";

const tabs = [
  {
    id: "entities",
    label: "Entities",
    icon: <Grid3x3 className="w-4 h-4" />,
    content: <EntityPalette />,
    headerContent: <span>100 nodes</span>,
    headerActions: <Button size="sm">Filter</Button>,
    badge: "12",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="w-4 h-4" />,
    content: <SettingsPanel />,
    headerContent: <span>3 hops</span>,
  },
];

<ResizableUtilityPanel
  tabs={tabs}
  position="bottom"
  layoutId="my-utility-panel"
  defaultSize={300}
  collapsible
  title="Tools"
/>;
```

## Props

### Required

- `tabs` - Array of `UtilityTab` objects
- `layoutId` - Unique ID for localStorage persistence

### Optional

- `position` - `"top" | "bottom" | "left" | "right"` (default: `"bottom"`)
- `defaultSize` - Initial size in px (horiz) or % (vert)
- `minSize` / `maxSize` - Size constraints
- `collapsible` - Enable collapse (default: `true`)
- `defaultCollapsed` - Start collapsed
- `defaultTab` - Initial active tab ID
- `onTabChange` - Callback when tab changes
- `onCollapseChange` - Callback when collapse changes
- `className` - Additional CSS classes
- `showResizeHandle` - Show resize handle (default: `true`)
- `title` - Optional panel title

## UtilityTab Interface

```typescript
interface UtilityTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  headerContent?: React.ReactNode; // Metadata in header
  headerActions?: React.ReactNode; // Action buttons in header
  badge?: string | number; // Badge on tab
}
```

## Examples

### Entity Legend with Counts

```tsx
{
  id: 'legend',
  label: 'Legend',
  icon: <Grid3x3 className="w-4 h-4" />,
  content: <EntityLegend />,
  headerContent: (
    <span className="text-xs">
      {nodeCount} nodes, {edgeCount} edges
    </span>
  ),
  headerActions: (
    <Button size="sm" variant="ghost">
      <Download className="w-4 h-4" />
    </Button>
  ),
}
```

### Settings with Current State

```tsx
{
  id: 'settings',
  label: 'Settings',
  icon: <Sliders className="w-4 h-4" />,
  content: <SettingsForm />,
  headerContent: (
    <span className="text-xs text-muted-foreground">
      {hops} hops, {maxNodes} max
    </span>
  ),
}
```

### Tools with Badge

```tsx
{
  id: 'tools',
  label: 'Tools',
  content: <ToolsPalette />,
  badge: toolCount,
  headerActions: (
    <Button size="sm" onClick={addTool}>
      Add Tool
    </Button>
  ),
}
```

## Positioning

```tsx
// Bottom panel (default)
<ResizableUtilityPanel position="bottom" defaultSize={300} />

// Right sidebar
<ResizableUtilityPanel position="right" defaultSize={25} />

// Top toolbar
<ResizableUtilityPanel position="top" defaultSize={200} />

// Left panel
<ResizableUtilityPanel position="left" defaultSize={20} />
```

## Use Cases

- **Entity Palettes** - Drag-and-drop entity creation
- **Settings Panels** - Configuration and preferences
- **Tool Palettes** - Drawing tools, controls
- **Legends** - Graph legends, color scales
- **Properties** - Selected item properties
- **History** - Undo/redo history
- **Layers** - Layer management
- **Debug** - Developer tools

## Layout Persistence

Each panel saves:

- Panel size
- Collapsed state
- Active tab

Storage key format: `{layoutId}-{property}`

```typescript
localStorage.getItem("research-utility-panel-size");
localStorage.getItem("research-utility-panel-collapsed");
localStorage.getItem("research-utility-panel-tab");
```

## Theme Integration

Uses semantic tokens:

- `bg-card` - Panel background
- `border-border` - Borders and handles
- `text-foreground` / `text-muted-foreground` - Text
- `bg-muted` - Tab list background
- `bg-background` - Active tab background
- `bg-primary` - Hover states

## Accessibility

- Keyboard tab navigation
- Screen reader announcements
- Focus management
- ARIA roles and labels

## Related Components

- `ResizableChatLayout` - Chat sidebar layout
- `Tabs` - Base tabs component
- `Button` - Action buttons

---

**Created**: October 4, 2025  
**Status**: Production Ready
