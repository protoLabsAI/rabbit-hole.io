# Hooks

Custom React hooks for the Rabbit Hole application.

## User Stats Hook

### `useUserStats`

Manages user activity statistics stored in Clerk `privateMetadata`.

```typescript
import { useUserStats } from "./useUserStats";

const { stats, updateStats, incrementStat, updateLastVisited } = useUserStats();
```

#### Returns

- `stats`: Current user statistics object
  - `entitiesViewed`: Total entities viewed
  - `lastVisited`: ISO timestamp of last visit
  - `queriesRun`: Total queries executed
  - `graphsCreated`: Total graphs created
- `updateStats(updates)`: Merge updates into stats
- `incrementStat(key)`: Increment a numeric stat by 1
- `updateLastVisited()`: Set last visited to current time
- `isLoading`: Loading state
- `isUpdating`: Update in progress state
- `isSignedIn`: User authentication status

#### Storage Details

- **Location**: Clerk `privateMetadata.stats`
- **Size Limit**: 1.2KB total for all metadata
- **Current Usage**: ~300-500 bytes
- **Server-side only**: Updates via `/api/user/stats`

#### Example Usage

```typescript
// Track entity view
useEffect(() => {
  incrementStat("entitiesViewed");
  updateLastVisited();
}, [entityId]);

// Track query execution
const handleSearch = async () => {
  await search();
  await incrementStat("queriesRun");
};

// Display stats
<div>
  <p>Entities Viewed: {stats.entitiesViewed}</p>
  <p>Last Visited: {stats.lastVisited}</p>
</div>
```

## UI Hooks

Located in `app/hooks/ui/`:

- `useEntityDialog`: Base hook for entity-based dialogs
- `useSpecializedDialogs`: Family analysis, biographical analysis, research reports, entity merge
- `useFileUploadDialog`: File upload with metadata processing
- `useToastManager`: Toast notifications
- `useDialogHistory`: Dialog navigation (back/forward)
- `useConditionalDialog`: Authentication-gated dialog controls
- `useWebVitals`: Performance monitoring

## Integration Points

### User Profile

Stats are displayed in the Clerk UserButton dropdown:

- Navigate to: User Avatar → Stats
- Shows all tracked statistics
- Auto-updates on metadata changes

### API Endpoints

- `PATCH /api/user/stats` - Update stats
- `GET /api/user/stats` - Retrieve stats

Both require authentication via Clerk middleware.
