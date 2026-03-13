# SideNavigationPanel

VSCode-style side navigation with vertical tabs and content panels.

## Features

- Vertical tab navigation with icons
- Collapsible to icon-only mode (~60px)
- Resizable navigation panel
- Left or right positioning
- Badge support for counts
- Layout persistence (nav width, collapsed state, active tab)

## Quick Start

```tsx
import { SideNavigationPanel } from "@/components/layouts";

const tabs = [
  {
    id: "biological",
    label: "Biological",
    icon: <Microscope className="w-5 h-5" />,
    badge: 12,
    content: <BiologicalContent />,
  },
  // ... more tabs
];

<SideNavigationPanel
  tabs={tabs}
  layoutId="my-navigation"
  navPosition="left"
  collapsible
/>;
```

## Props

- `tabs` - Array of SideNavTab objects (required)
- `layoutId` - Unique ID for localStorage persistence (required)
- `navPosition` - "left" | "right" (default: "left")
- `defaultNavWidth` - Initial width in pixels (default: 180)
- `minNavWidth` - Minimum expanded width (default: 120)
- `maxNavWidth` - Maximum width (default: 300)
- `collapsedWidth` - Icon-only width (default: 60)
- `collapsible` - Enable collapse (default: true)
- `defaultCollapsed` - Start collapsed (default: false)
- `defaultTab` - Initial active tab ID
- `onTabChange` - Tab change callback
- `onCollapseChange` - Collapse state callback

## SideNavTab Interface

```typescript
interface SideNavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  content: React.ReactNode;
}
```

## Use Cases

- Domain-based entity palettes
- Tool categories
- Settings categories
- File explorers
- Navigation menus

## Example: Research Entities

```tsx
const domainTabs = [
  {
    id: "biological",
    label: "Biological",
    icon: <Microscope className="w-5 h-5" />,
    badge: entityCount,
    content: <EntityGrid types={biologicalTypes} />,
  },
];

<SideNavigationPanel
  tabs={domainTabs}
  layoutId="entity-domains"
  navPosition="left"
  defaultNavWidth={180}
/>;
```

## Persistence

Saves to localStorage:

- `{layoutId}-nav-collapsed` - Collapsed state
- `{layoutId}-nav-tab` - Active tab ID
- Panel width via ResizablePanel

---

**Created**: October 4, 2025  
**Status**: Production Ready
