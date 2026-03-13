# Research Mode Import Dialog

Configuration dialog for importing Atlas entities into Research Mode with tier limit validation.

## Usage

```tsx
import { useResearchImportDialog } from "@/hooks/ui";
import { ResearchModeImportDialog } from "./components/ResearchModeImportDialog";

function MyComponent() {
  const dialog = useResearchImportDialog();
  const userTier = getUserTierClient(user);

  // Open dialog
  dialog.open(nodeData);

  return (
    <ResearchModeImportDialog
      isOpen={dialog.isOpen}
      entityUid={dialog.entityUid}
      entityName={dialog.entityName}
      onClose={dialog.close}
      userTier={userTier}
    />
  );
}
```

## Features

- Tier limit validation (FREE: 50, BASIC: 500, ENTERPRISE: unlimited)
- Real-time ego network preview
- Traffic light warning system (green/yellow/red)
- Configurable hops (0-3) and node limit (10-150)
- Debounced API calls (300ms)
- Opens in new tab with `window.open('_blank')`

## Components

- `ResearchModeImportDialog` - Main dialog component
- `TierLimitWarning` - Usage display with validation
- `ImportPreview` - Entity/relationship count preview
- `useResearchImportValidation` - Hook for fetching limits and preview data

## APIs Used

- `GET /api/v1/tenant/limits` - Current tier usage
- `GET /api/graph-tiles/ego/[uid]` - Ego network preview

## Implementation Notes

- Validation is client-side advisory only (research page re-validates server-side)
- Preview data updates automatically when hops/nodeLimit changes
- Handles unlimited tier (maxEntities: -1) gracefully
- Shows estimated counts on API timeout
