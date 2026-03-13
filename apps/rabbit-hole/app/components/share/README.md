# Share Components System

**Location**: `app/components/share/`  
**Purpose**: Modular, reusable components for the revokable timeline share links system  
**Status**: API Integration Complete - Live Data Connected

## 🏗️ Architecture Overview

The share components system provides a complete, modular foundation for publicly accessible timeline sharing with:

- **Modular Design** - Individual, reusable components with single responsibilities
- **shadcn UI Integration** - Consistent design system with proper accessibility
- **Storybook Documentation** - Comprehensive stories for all components and states
- **Type Safety** - Full TypeScript integration with `@proto/types` validation
- **Event Visualization** - Revolutionary timeline component supporting duration events

## 📁 Component Structure

```
app/components/share/
├── SharePageHeader.tsx              # Title, metadata, view count
├── SharePageHeader.stories.tsx      # 8 comprehensive stories
├── ShareTimelineVisualization.tsx   # Aggregated timeline wrapper
├── ShareTimelineVisualization.stories.tsx # 9 story variants
├── EventTimelineChart.tsx           # NEW: Chronological event timeline
├── EventTimelineChart.stories.tsx   # 7 stories + anti-democratic rhetoric
├── SharePageErrorStates.tsx         # Four error state components
├── SharePageErrorStates.stories.tsx # 6 error state variants
├── SharePageFooter.tsx              # Professional footer
├── SharePageFooter.stories.tsx      # 6 footer configurations
├── index.ts                         # Clean component exports
└── README.md                        # This documentation
```

## 🎯 Core Components

### SharePageHeader

**Purpose**: Display title, metadata, and view count for shared pages  
**Features**: Dynamic title fallback, metadata badges, responsive layout

```typescript
import { SharePageHeader } from "@/components/share";

<SharePageHeader
  shareData={{
    title: "Q1 2024 Executive Analysis",
    description: "Comprehensive timeline analysis...",
    entityUid: "per:executive_name",
    shareType: "timeline",
    parameters: { timeWindow: { from: "2024-01-01", to: "2024-03-31" } },
    viewCount: 156,
    // ... other SharePageData fields
  }}
/>
```

**Design Elements**:

- Badge components for metadata (share type, granularity, time window)
- View count with eye icon
- Entity UID reference
- Text overflow handling for long titles

### EventGanttChart ⭐ **LATEST - Professional Timeline**

**Purpose**: Professional Gantt chart visualization with advanced grouping and overlapping event support  
**Perfect For**: Complex timelines with multiple overlapping events, interactive comparison  
**Status**: Active (replaces EventTimelineChart for share pages)

```typescript
import { EventGanttChart } from "@/components/share";

<EventGanttChart
  events={timelineEvents}
  height={600}
  readOnly={true}  // Default for share pages
  groupBy="category"  // or "entity" or "importance"
  range="monthly"  // or "daily" or "quarterly"
  maxEvents={50}  // Performance optimization
  onEventClick={(event) => console.log(event)}
  onGroupByChange={(strategy) => console.log(strategy)}
/>
```

**Key Features:**

- Three grouping strategies (category, entity, importance) with UI toggle
- Professional Gantt chart UI with overlapping event support
- Read-only and edit modes
- Multiple timeline ranges (daily, monthly, quarterly)
- Zoom control (50-200%)
- Performance-optimized with configurable event limits

### EventTimelineChart 📅 **LEGACY - Still Used**

**Purpose**: Simple chronological event visualization  
**Status**: Legacy component, still used by MultiEntityTimelineChart  
**Perfect For**: Basic timeline displays without advanced features

```typescript
import { EventTimelineChart, createEgoGraphUrl } from "@/components/share";

// Perfect for investigative research queries
<EventTimelineChart
  events={[
    {
      id: "trump-campaign-1",
      timestamp: "2024-01-01T00:00:00Z",
      endDate: "2024-02-15T23:59:59Z", // Duration event
      eventType: "ongoing",
      title: "Election fraud campaign",
      category: "election_rhetoric",
      importance: "critical",
      confidence: 0.95,
    },
    {
      id: "trump-rally-1",
      timestamp: "2024-01-15T10:30:00Z", // Point event
      eventType: "relationship",
      title: "Rally speech",
      category: "election_rhetoric",
      importance: "major",
      targetEntity: {
        uid: "evt:2020_election",
        name: "2020 Election",
        type: "Event"
      }
    }
  ]}
  onEgoGraphLink={(entityUid, timestamp) => {
    const egoUrl = createEgoGraphUrl(entityUid, timestamp);
    window.open(egoUrl, '_blank');
  }}
  height={450}
/>
```

**Visual Language**:

- **🔵 Points**: Single moments (speeches, statements, incidents)
- **▬▬▬ Bars**: Duration events with start/end markers
- **⬜⬜⬜ Dashed**: Ongoing events (no end date, gentle 3-second pulse)
- **Red**: Critical importance (constitutional crises, major threats)
- **Orange**: Major importance (significant statements, policy changes)
- **Blue**: Minor importance (routine activities)

### ShareTimelineVisualization

**Purpose**: Wrapper for aggregated timeline data with proper states  
**Features**: Loading states, error handling, summary statistics

```typescript
import { ShareTimelineVisualization } from "@/components/share";

<ShareTimelineVisualization
  shareData={sharePageData}
  timelineData={aggregatedTimelineData} // From graph-tiles/timeslice API
  isLoading={false}
  error={undefined}
/>
```

### SharePageErrorStates

**Purpose**: User-friendly error states for various failure modes  
**Components**: `ExpiredTokenError`, `RevokedTokenError`, `NotFoundError`, `GenericError`

```typescript
import { ExpiredTokenError, RevokedTokenError } from "@/components/share";

// In share page error handling
if (error instanceof ShareTokenExpiredError) {
  return <ExpiredTokenError onRetry={handleRetry} />;
}
if (error instanceof ShareTokenRevokedError) {
  return <RevokedTokenError />;
}
```

### SharePageFooter

**Purpose**: Professional footer with branding and configurable links

```typescript
import { SharePageFooter } from "@/components/share";

<SharePageFooter
  showPoweredBy={true}
  additionalLinks={[
    { label: "Privacy", href: "/privacy", external: false },
    { label: "Terms", href: "/terms", external: false },
  ]}
/>
```

## 🎨 Design System Integration

### shadcn UI Components Used

- **Card**, **CardContent**, **CardHeader** - Structure and layout
- **Badge** - Metadata display and status indicators
- **Button** - Actions and navigation
- **Separator** - Visual section breaks

### Color System

**Error States**:

- Red: Expired tokens, critical errors
- Orange: Revoked tokens, warnings
- Gray: Not found, informational
- Blue: Actions, links

**Event Timeline**:

- Red (Critical): Constitutional crises, major threats to democracy
- Orange (Major): Significant political statements, policy changes
- Blue (Minor): Standard activities, routine statements

### Typography & Spacing

- Consistent with existing Atlas page patterns
- Responsive breakpoints (sm, md, lg)
- Proper text contrast ratios (WCAG AA compliant)
- Mobile-first responsive design

## 🔗 Data Integration

### Timeline Data Sources

**Aggregated Timeline** (`ShareTimelineVisualization`):

```typescript
// Uses existing graph-tiles/timeslice-enhanced API
const timelineData = await fetch(
  `/api/graph-tiles/timeslice-enhanced?${params}`
);
// Returns: TimeAggregationBin[] format for TimelineChart
```

**Chronological Events** (`EventTimelineChart`):

```typescript
// Uses new entity-timeline utilities from @proto/utils
import { fetchEntityTimeline } from "@proto/utils/atlas";

const timeline = await fetchEntityTimeline(client, entityUid, {
  importance: ["critical", "major"],
  dateRange: { from: "2024-01-01", to: "2024-12-31" },
});
// Returns: TimelineEvent[] format for EventTimelineChart
```

### Share Token Data

**Share Page Data** (`SharePageData` from `@proto/types`):

```typescript
interface SharePageData {
  token: string;
  entityUid: string;
  shareType: ShareType;
  parameters: ShareTokenParameters;
  title: string | null;
  description: string | null;
  isExpired: boolean;
  isRevoked: boolean;
  viewCount: number;
}
```

## 🧪 Testing & Development

### Storybook Development

```bash
# View all share component stories
pnpm storybook

# Navigate to:
# - Share/SharePageHeader - Title and metadata variations
# - Share/EventTimelineChart - Anti-democratic rhetoric examples
# - Share/SharePageErrorStates - All error state variants
# - Share/ShareTimelineVisualization - Loading, error, data states
# - Share/SharePageFooter - Footer configurations
```

### Component Testing

**Mock Data Patterns**:

```typescript
// Use realistic test data from stories
import { createMockShareData } from "./SharePageHeader.stories";

const mockShareData = createMockShareData({
  title: "Custom Timeline Title",
  viewCount: 42,
  parameters: {
    timeWindow: { from: "2024-01-01", to: "2024-03-31" },
    granularity: "day",
  },
});
```

**Anti-Democratic Rhetoric Examples**:

```typescript
// Realistic timeline events for testing
const antiDemocraticEvents = [
  {
    id: "trump-campaign-1",
    timestamp: "2024-01-01T00:00:00Z",
    endDate: "2024-02-15T23:59:59Z",
    eventType: "ongoing",
    title: "Election fraud campaign",
    description: "Sustained campaign of false election fraud claims",
    category: "election_rhetoric",
    importance: "critical",
    confidence: 0.95,
  },
  // Point events within campaigns...
];
```

### Unit Testing

```bash
# Test new entity timeline utilities (no service calls)
pnpm test:vitest -- packages/utils/src/atlas/__tests__/entity-timeline.test.ts --run

# Test existing share token utilities
pnpm test:vitest -- packages/utils/src/__tests__/share-tokens.test.ts --run
```

## 📖 Usage Patterns

### Complete Share Page Implementation

```typescript
// app/share/[token]/page.tsx
import {
  SharePageHeader,
  ShareTimelineVisualization,
  EventTimelineChart,
  SharePageFooter,
  ExpiredTokenError,
  RevokedTokenError
} from "@/components/share";

export default async function SharePage({ params }: SharePageProps) {
  try {
    const shareData = await getShareData(params.token);
    const timelineEvents = await getTimelineEvents(shareData.entityUid);

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <SharePageHeader shareData={shareData} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Aggregated timeline overview */}
          <ShareTimelineVisualization
            shareData={shareData}
            timelineData={aggregatedData}
          />

          {/* Chronological events timeline */}
          <EventTimelineChart
            events={timelineEvents}
            onEgoGraphLink={(entityUid, timestamp) => {
              const egoUrl = createEgoGraphUrl(entityUid, timestamp);
              window.open(egoUrl, '_blank');
            }}
            height={450}
          />
        </div>

        {/* Footer */}
        <SharePageFooter />
      </div>
    );
  } catch (error) {
    if (error instanceof ShareTokenExpiredError) {
      return <ExpiredTokenError />;
    }
    if (error instanceof ShareTokenRevokedError) {
      return <RevokedTokenError />;
    }
    throw error;
  }
}
```

### Meta Tags Generation

```typescript
// Use built-in Next.js generateMetadata pattern
export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const shareData = await getShareData(params.token);

  return {
    title: shareData.title || `Timeline for ${shareData.entityUid}`,
    description:
      shareData.description || "Interactive timeline visualization...",
    openGraph: {
      title: shareData.title,
      description: shareData.description,
      images: [`/api/share/${params.token}/preview.png`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: shareData.title,
      description: shareData.description,
      images: [`/api/share/${params.token}/preview.png`],
    },
  };
}
```

## ✅ API Integration - IMPLEMENTED

### Entity Timeline Integration

**Live data connection implemented** using clean utilities from `@proto/utils/atlas`:

```typescript
// app/api/entity-timeline/[entityUid]/route.ts - IMPLEMENTED
import {
  fetchEntityTimeline,
  validateTimelineFilters,
  createEgoGraphUrl,
} from "@proto/utils/atlas";

export async function GET(request: NextRequest) {
  const timeline = await fetchEntityTimeline(client, entityUid, filters);
  return NextResponse.json(timeline);
}
```

**Share page integration** - EventTimelineChart now displays real data:

```typescript
// app/share/[token]/page.tsx - IMPLEMENTED
const timelineEvents = await getTimelineEvents(shareData.entityUid);

<EventTimelineChart
  events={timelineEvents}
  onEgoGraphLink={(entityUid, timestamp) => {
    const egoUrl = createEgoGraphUrl(entityUid, timestamp);
    window.open(egoUrl, '_blank');
  }}
/>
```

### Share Token Management

**Authentication Pattern**:

```typescript
import { withAuthAndLogging } from "@proto/auth";
import { ShareTokenService } from "@/lib/share-token-service";

export const DELETE = withAuthAndLogging("revoke share token")(async (
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: { params: { token: string } }
) => {
  const shareTokenService = new ShareTokenService();
  await shareTokenService.revokeShareToken(params.token, user.userId);
  return NextResponse.json({ success: true });
});
```

## 🎯 Research Use Cases

### Anti-Democratic Rhetoric Analysis

**Perfect Component**: `EventTimelineChart`  
**Query Example**: "Show all instances of Donald Trump's anti-democratic rhetoric"

**Expected Data Flow**:

1. User creates share link for `per:donald_trump` with rhetoric category filters
2. `EventTimelineChart` displays chronological events with duration campaigns
3. Click events open ego graph visualization for deep-dive analysis

**Visual Representation**:

- **Campaign periods** shown as duration bars (▬▬▬)
- **Specific speeches** shown as points (🔵) within campaigns
- **Ongoing rhetoric** shown with dashed borders and pulse animation
- **Critical events** highlighted in red with high priority

### Timeline Event Types

**Intrinsic Events** (Generated from entity dates):

- Birth/death events for persons
- Founding/dissolution for organizations
- Launch/shutdown for platforms
- Lifespan and operational periods

**Relationship Events** (From Neo4j relationships):

- Speech acts with sentiment analysis
- Business transactions and partnerships
- Political endorsements and attacks
- Platform interactions and moderation

**Duration Support**:

- Investigation periods
- Campaign timeframes
- Legal proceedings
- Ongoing processes (no end date)

## 🔧 Development Workflow

### Adding New Components

1. **Create Component** - Follow existing patterns with TypeScript + shadcn UI
2. **Add Stories** - Comprehensive Storybook stories with realistic data
3. **Export Integration** - Add to `index.ts` for clean imports
4. **Documentation** - Update this README with usage examples

### Extending EventTimelineChart

**Adding Event Categories**:

```typescript
// Add new category handling in getEventColor function
const getEventColor = (event: TimelineEvent) => {
  switch (event.importance) {
    case "critical":
      return "bg-red-500 border-red-600";
    case "major":
      return "bg-orange-500 border-orange-600";
    case "minor":
      return "bg-blue-500 border-blue-600";
    // Add new importance levels here
  }
};
```

**Custom Event Types**:

```typescript
// Extend TimelineEvent interface in @proto/types
export interface TimelineEvent {
  // ... existing fields
  customCategory?: string; // Add custom categorization
  metadata?: Record<string, any>; // Event-specific metadata
}
```

### Testing New Features

**Component Stories**:

```typescript
// Add to relevant .stories.tsx file
export const NewFeature: Story = {
  args: {
    // Test configuration
  },
  parameters: {
    docs: {
      description: {
        story: "Description of new feature functionality",
      },
    },
  },
};
```

**Unit Tests** (if utilities involved):

```typescript
// Add to packages/utils/src/atlas/__tests__/
describe("New Feature", () => {
  it("should handle new functionality", () => {
    // Pure function testing without service calls
    expect(newFunction(input)).toEqual(expectedOutput);
  });
});
```

## 📊 Performance Considerations

### Component Optimization

**EventTimelineChart**:

- Efficient event positioning calculations
- Hover state throttling for large datasets
- Responsive design with proper mobile interactions
- Memory-efficient event rendering

**Share Page Loading**:

- Server-side rendering for social media optimization
- Progressive loading of timeline data
- Proper error boundaries and fallbacks

### Data Fetching

**Timeline APIs**:

- Use pagination for large event sets
- Implement proper caching with TTL
- Filter at query level, not client-side
- Follow Neo4j integer requirements (`Math.floor()`)

## 🌟 Innovation Highlights

### EventTimelineChart Breakthrough

**First Implementation** of proper duration event support in timeline visualization:

1. **Duration Events**: Visual bars showing campaign periods, investigations, ongoing processes
2. **Ongoing Events**: Dashed borders with animated pulse for events without end dates
3. **Interactive Integration**: Click events to open ego graph with entity + date context
4. **Research Applications**: Perfect for investigative queries about rhetoric patterns

### Modular Architecture

**Before**: Monolithic share pages with duplicated code  
**After**: Modular, reusable components with single responsibilities

**Benefits**:

- Easy to test individual components in isolation
- Consistent design system integration
- Reusable across different share page types
- Maintainable with clear separation of concerns

## 🔮 Future Enhancements

### Component Extensions

**Planned Features**:

- `SharePageControls` - User controls for timeline filtering and export
- `SharePageMetrics` - Advanced analytics and engagement tracking
- `SharePageComments` - Public commenting system for shared timelines

### EventTimelineChart Evolution

**Advanced Features**:

- Multi-entity timeline visualization (show multiple actors)
- Sentiment heatmaps overlaid on timeline
- Evidence strength indicators per event
- Interactive filtering controls

### Social Media Optimization

**Enhanced Sharing**:

- Dynamic preview image generation with timeline snapshots
- Platform-specific optimizations (LinkedIn vs Twitter)
- A/B testing for share conversion rates

## 📚 Related Documentation

### API Integration

- `handoffs/2025-09-25_22-52-revokable-share-links-modular-components-handoff.md` - Complete implementation handoff
- `packages/utils/src/atlas/entity-timeline.ts` - Clean timeline utilities
- `packages/utils/src/atlas/__tests__/entity-timeline.test.ts` - Utility tests

### Component Development

- **Storybook**: `pnpm storybook` - Interactive component documentation
- **shadcn UI**: `app/components/ui/` - Design system components
- **Type Definitions**: `packages/types/src/share-tokens.ts` - Share system types

### Database Integration

- `app/api/entity-timeline/[entityUid]/route.ts` - Timeline API endpoint (to be refactored)
- `app/api/graph-tiles/timeslice-enhanced/route.ts` - Aggregated timeline data
- `lib/share-token-service.ts` - Share token CRUD operations

## ⚡ Quick Start

### Development Setup

```bash
# Install dependencies
pnpm install

# Start Storybook for component development
pnpm storybook

# Start Next.js dev server
pnpm dev

# Run component-specific tests
pnpm test:vitest -- app/components/share --run
```

### Creating a Share Page

1. **Import Components**:

```typescript
import {
  SharePageHeader,
  ShareTimelineVisualization,
  EventTimelineChart,
  SharePageFooter,
} from "@/components/share";
```

2. **Fetch Share Data**:

```typescript
const shareData = await shareTokenService.validateShareToken(token);
const timelineEvents = await fetchEntityTimeline(client, shareData.entityUid);
```

3. **Compose Page**:

```typescript
<div className="min-h-screen bg-gray-50 flex flex-col">
  <SharePageHeader shareData={shareData} />
  <div className="flex-1 space-y-6 p-8">
    <ShareTimelineVisualization shareData={shareData} />
    <EventTimelineChart events={timelineEvents} />
  </div>
  <SharePageFooter />
</div>
```

### Adding Ego Graph Links

```typescript
import { createEgoGraphUrl } from "@/components/share";

// In EventTimelineChart
onEgoGraphLink={(entityUid, timestamp) => {
  const egoUrl = createEgoGraphUrl(entityUid, timestamp);
  // Opens: /atlas?mode=ego&center=per:donald_trump&date=2024-01-15
  window.open(egoUrl, '_blank');
}}
```

---

## 🔄 Migration Guide: EventTimelineChart → EventGanttChart

**Date**: October 6, 2025  
**Status**: Migration Complete for Share Pages

### What Changed

EventTimelineChart has been upgraded to EventGanttChart for share pages, providing:

- Professional Gantt chart UI
- Advanced grouping strategies
- Better handling of overlapping events
- Performance optimizations

### Migration Status

**✅ Completed:**

- `app/share/[token]/page.tsx` - Share page timeline
- `app/evidence/components/atlas/EnhancedTimelineTab.tsx` - Entity details
- `app/atlas/components/TimeSliceInfoPanel.tsx` - Time slice modal

**⏸️ Not Migrated:**

- `app/timeline/components/MultiEntityTimelineChart.tsx` - Different system, uses EventTimelineChart internally

### Quick Migration Pattern

```typescript
// Before
<EventTimelineChart
  events={events}
  height={450}
  onEventClick={handleClick}
/>

// After
<EventGanttChart
  events={events}
  height={600}
  readOnly={true}
  groupBy="category"
  range="monthly"
  onEventClick={handleClick}
/>
```

---

**Status**: ✅ October 2025 - Gantt Chart Migration Complete  
**Week 1**: EventTimelineChart integrated with real entity timeline data  
**Week 2**: Complete token CRUD, enhanced meta tags, preview image generation  
**Week 3**: Gantt chart migration with advanced grouping and professional UI  
**Innovation**: Full share link system with professional timeline visualization
