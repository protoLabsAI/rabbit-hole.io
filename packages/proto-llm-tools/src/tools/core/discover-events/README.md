# Event Discovery Tool

## Overview

The `discoverEventsTool` extracts and identifies all events associated with a given entity from text content. It uses LangExtract (via job queue) to intelligently parse text and surface events with full event schema properties including types, dates, significance, participants, and source grounding.

## Key Features

- **Entity-Centric Discovery**: Find events related to a specific entity (person, organization, etc.)
- **Universal Event Types**: Supports 42+ event types across all domains (political, business, tech, biological, etc.)
- **Advanced Filtering**: Filter by event types, date ranges, significance levels, and confidence scores
- **Source Grounding**: Optional text span extraction showing where events were mentioned
- **Smart Deduplication**: Automatically merges duplicate events, keeping highest confidence scores
- **Temporal Validation**: Validates date formats and date range logic

## Usage

### Basic Event Discovery

```typescript
import { discoverEventsTool } from "@protolabsai/proto-llm-tools";

const result = await discoverEventsTool.invoke({
  content: "Trump held a rally in Iowa on January 15, 2024...",
  primaryEntityUid: "person:donald_trump",
  primaryEntityName: "Donald Trump",
});

console.log(result.events);
// [
//   {
//     uid: "event:iowa_rally_2024_01_15",
//     type: "Event",
//     name: "Iowa Rally",
//     eventType: "rally",
//     date: "2024-01-15",
//     location: "Iowa",
//     significance: "major",
//     confidence: 0.92,
//     sourceText: "Trump held a rally in Iowa...",
//     ...
//   }
// ]
```

### Event Type Filtering

```typescript
const result = await discoverEventsTool.invoke({
  content: contentText,
  primaryEntityUid: "person:joe_biden",
  eventTypes: ["meeting", "conference", "election"],
  maxEvents: 25,
});
```

### Date Range Filtering

```typescript
const result = await discoverEventsTool.invoke({
  content: contentText,
  primaryEntityUid: "org:tesla",
  primaryEntityName: "Tesla",
  dateRange: {
    from: "2023-01-01",
    to: "2024-12-31",
  },
});
```

### Significance Filtering

```typescript
const result = await discoverEventsTool.invoke({
  content: contentText,
  primaryEntityUid: "person:elon_musk",
  significance: ["major", "historic", "catastrophic"],
  confidenceThreshold: 0.8,
});
```

### Combined Filtering

```typescript
const result = await discoverEventsTool.invoke({
  content: contentText,
  primaryEntityUid: "org:openai",
  primaryEntityName: "OpenAI",
  eventTypes: ["launch", "announcement", "acquisition"],
  dateRange: {
    from: "2024-01-01",
    to: "2024-12-31",
  },
  significance: ["major", "historic"],
  maxEvents: 50,
  confidenceThreshold: 0.75,
  includeSourceGrounding: true,
});
```

## Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `content` | `string` | ✅ | - | Text content to extract events from |
| `primaryEntityUid` | `string` | ✅ | - | UID of entity events relate to (e.g., 'person:donald_trump') |
| `primaryEntityName` | `string` | ❌ | - | Human name for better contextual matching |
| `eventTypes` | `string[]` | ❌ | all types | Filter by event types (rally, meeting, incident, etc.) |
| `dateRange` | `object` | ❌ | - | Filter events within date range ({from, to} in YYYY-MM-DD) |
| `significance` | `string[]` | ❌ | all levels | Filter by significance (minor, moderate, major, historic, catastrophic) |
| `maxEvents` | `number` | ❌ | `50` | Maximum events to return (1-100) |
| `modelId` | `string` | ❌ | config default | LLM model ID for extraction |
| `temperature` | `number` | ❌ | config default | Model temperature (0-2) |
| `includeSourceGrounding` | `boolean` | ❌ | `true` | Include source text spans |
| `confidenceThreshold` | `number` | ❌ | `0.7` | Minimum confidence score (0-1) |

## Output Schema

```typescript
{
  success: boolean;
  events: Array<{
    uid: string;              // "event:rally_iowa_jan_15_2024"
    type: "Event";
    name: string;             // "Iowa Rally"
    eventType?: string;       // "rally"
    date?: string;            // "2024-01-15"
    endDate?: string;         // Multi-day events
    significance?: string;    // "major"
    description?: string;
    location?: string;
    participants?: string[];  // UIDs
    organizers?: string[];    // UIDs
    outcome?: string;
    media_coverage?: string;  // "extensive"
    casualties?: number;
    economic_impact?: number;
    confidence: number;       // 0-1
    sourceText?: string;      // Where event was mentioned
    startChar?: number;
    endChar?: number;
  }>;
  metadata: {
    totalFound: number;       // Before limit
    returned: number;         // After limit
    eventTypes: string[];     // Types searched
    modelUsed: string;
    contentLength: number;
    processingTime: number;   // milliseconds
  };
}
```

## Event Types (42 Total)

### Social/Political
- `conference`, `rally`, `protest`, `meeting`, `incident`, `ceremony`, `election`, `legal_proceeding`

### Infrastructure/Construction
- `construction_start`, `construction_complete`, `infrastructure_failure`, `maintenance_event`, `demolition`, `renovation`

### Biological/Life
- `birth`, `death`, `migration`, `reproduction`, `evolution_event`, `extinction`, `discovery`

### Astronomical
- `formation`, `collision`, `explosion`, `observation`

### Technology
- `launch`, `update`, `security_breach`, `outage`, `acquisition`, `shutdown`

### Economic
- `ipo`, `merger`, `bankruptcy`, `market_crash`, `policy_change`

### Generic
- `announcement`, `milestone`, `crisis`, `celebration`, `investigation`

## Significance Levels

- `minor` - Low impact, local significance
- `moderate` - Regional impact, moderate attention
- `major` - National impact, significant attention
- `historic` - International impact, lasting importance
- `catastrophic` - Global impact, transformative consequences

## Media Coverage Levels

- `none` - No media coverage
- `minimal` - Local media only
- `moderate` - Regional/national coverage
- `extensive` - Major national/international coverage
- `global` - Worldwide coverage

## Error Handling

### Invalid Date Range
```typescript
// Returns error if dates invalid or from > to
{
  success: false,
  events: [],
  metadata: {...},
  error: "Invalid date range: 'from' must be <= 'to'."
}
```

### No Events Found
```typescript
// Returns empty array with success: true
{
  success: true,
  events: [],
  metadata: {
    totalFound: 0,
    returned: 0,
    ...
  }
}
```

### LangExtract Failure
```typescript
// Returns error with context
{
  success: false,
  events: [],
  metadata: {...},
  error: "LangExtract timeout: Job exceeded 5 minute limit"
}
```

## Performance

- **Typical Processing**: 2-4 seconds for 50KB text
- **Max Recommended**: 200KB text per call
- **Concurrent Calls**: Supported via job queue
- **Deduplication**: O(1) lookup using Map

## Related Tools

- [`discoverEntitiesTool`](../discover-entities/README.md) - Discover entities in text
- [`extractRelationshipsTool`](../extract-relationships/README.md) - Extract relationships between entities
- [`enrichEntityTool`](../enrich-entity/README.md) - Enrich entity with additional data

## Integration Examples

### Agent Research Workflow
```typescript
// 1. Discover entities
const entities = await discoverEntitiesTool.invoke({...});

// 2. For each entity, discover associated events
for (const entity of entities.entities) {
  const events = await discoverEventsTool.invoke({
    content: sourceContent,
    primaryEntityUid: entity.uid,
    primaryEntityName: entity.name,
  });
  
  // Process events...
}
```

### Timeline Building
```typescript
const events = await discoverEventsTool.invoke({
  content: biographyText,
  primaryEntityUid: "person:albert_einstein",
  dateRange: { from: "1879-01-01", to: "1955-12-31" },
  significance: ["major", "historic"],
});

// Sort and visualize on timeline
events.events.sort((a, b) => a.date.localeCompare(b.date));
```

## Implementation Notes

- **Pattern**: Mirrors `discoverEntitiesTool` structure
- **Extraction**: Uses examples-based LangExtract (NOT schema constraints)
- **Deduplication**: Events with same name+date are merged (highest confidence kept)
- **UID Generation**: Format `event:normalized_name_YYYY_MM_DD`
- **Source Grounding**: Matches events to text spans by name substring matching
- **Filtering Order**: confidence → eventTypes → dateRange → significance → limit

## Testing

See `example.ts` for comprehensive usage examples including:
- Political event discovery (rallies, meetings, legal proceedings)
- Tech event discovery (launches, acquisitions, security breaches)
- Multi-domain events (political + business + tech)
- Date range filtering scenarios
- Significance filtering scenarios
- Confidence threshold comparisons

## Future Enhancements

- Batch event discovery (multiple entities simultaneously)
- Event relationship extraction (related_events linking)
- Event validation (cross-reference with Neo4j existing events)
- Multi-language support
- Automatic participant/organizer UID resolution





