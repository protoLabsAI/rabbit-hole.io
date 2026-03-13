# Development Dashboard

Administrative interface using the `@proto/ui` PanelHub pattern for memory-efficient panel loading.

## Features

- **Memory Efficient**: Only one management panel loaded at a time
- **Dynamic Loading**: Panels are code-split and loaded on demand
- **Role-Based Access**: Admin-only panels filtered based on user permissions
- **Side Navigation**: Playground-hub inspired UI with category grouping
- **URL State**: Panel selection persisted in URL query parameters

## Architecture

```
Dashboard
├── DashboardClient.tsx       ← Main component using PanelHub
├── registry/
│   └── dashboard-panels.ts   ← Panel registry configuration
└── components/
    ├── FilesManagementTab.tsx
    ├── EntitiesManagementTab.tsx
    ├── ShareLinksManagementTab.tsx
    ├── SessionsManagementTab.tsx
    └── IntegrityCheckTab.tsx
```

## Panel Registry

All panels are defined in `registry/dashboard-panels.ts`:

```typescript
{
  id: "files",
  name: "Files",
  description: "File management and processing states",
  category: "management",
  icon: "📁",
  importFn: () => import("../components/FilesManagementTab").then(m => ({
    default: m.FilesManagementTab
  })),
  adminOnly: false,
}
```

## Available Panels

| Panel     | Category      | Admin Only | Description                  |
| --------- | ------------- | ---------- | ---------------------------- |
| Files     | Management    | No         | File management & processing |
| Entities  | Management    | No         | Entity monitoring & limits   |
| Shares    | Collaboration | No         | Share link management        |
| Sessions  | Collaboration | No         | Active collaboration         |
| Integrity | System        | Yes        | Data integrity checks        |

## Memory Management

The dashboard uses the PanelHub pattern from `@proto/ui`:

- **One Panel at a Time**: Only the active panel is loaded in memory
- **Automatic Cleanup**: Previous panel unmounts before new one loads
- **Code Splitting**: Each panel is in a separate chunk (~60-90KB)
- **100ms Delay**: Gives React time to garbage collect unmounted panels

## Usage

The dashboard automatically handles:

- User authentication (Clerk)
- Admin role detection
- Workspace ID management
- Panel filtering based on permissions
- URL state synchronization

## Adding New Panels

1. Create panel component in `components/`:

```typescript
// components/MyNewPanel.tsx
"use client";

export function MyNewPanel({ workspaceId }: { workspaceId?: string }) {
  return <div>My new panel content</div>;
}
```

2. Add to registry in `registry/dashboard-panels.ts`:

```typescript
{
  id: "my-panel",
  name: "My Panel",
  description: "Description here",
  category: "management",
  icon: "🎯",
  importFn: () => import("../components/MyNewPanel").then(m => ({
    default: m.MyNewPanel
  })),
  status: "active",
  tags: ["custom", "new"],
  adminOnly: false, // Set to true for admin-only
}
```

3. Panel appears in dashboard automatically!

## Props Passed to Panels

All panels receive:

- `workspaceId` (string): Current workspace identifier

Panels can accept additional props by defining them in their interface.

## Performance

- **Initial Load**: ~2KB (registry only)
- **Per Panel**: 60-90KB (varies by complexity)
- **Switch Time**: <500ms including 100ms cleanup delay
- **Memory Overhead**: Minimal (one panel at a time)

## Related

- **PanelHub Component**: `packages/ui/src/panel-hub/`
- **Pattern Source**: `app/components/playground-hub/`
- **Documentation**: `packages/ui/README.md`
