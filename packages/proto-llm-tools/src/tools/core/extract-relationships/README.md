# Relationship Extraction Tool

Generic core tool for extracting relationships between entities from text content.

## Overview

The `extractRelationshipsTool` discovers and extracts relationships between provided entities based on text content. It supports:
- **Focus entity strategy**: Extract relationships involving specific entities
- **Domain-aware relationship types**: Use valid relationship types from knowledge domains
- **Batch processing**: Handle large entity sets efficiently
- **Confidence filtering**: Filter out low-confidence relationships
- **Deduplication**: Automatically deduplicate relationships

## Key Features

- **Focus Entity Strategy**: Prioritize relationships involving specific entities
- **Domain-Aware**: Uses valid relationship types from selected domains
- **Batch Processing**: Processes large entity sets in configurable batches
- **Confidence Filtering**: Filter relationships by confidence score
- **Deduplication**: Automatic deduplication by relationship UID
- **Type-Safe**: Full TypeScript support with Zod schemas
- **Source Grounding**: Optional source text references
- **Flexible**: Works with any entity discovery/extraction output

## Usage

### Basic Relationship Extraction

```typescript
import { extractRelationshipsTool } from "@protolabsai/llm-tools";

const entities = [
  { uid: "person:albert_einstein", name: "Albert Einstein", type: "Person" },
  { uid: "org:princeton", name: "Princeton University", type: "Organization" },
  { uid: "person:niels_bohr", name: "Niels Bohr", type: "Person" },
];

const result = await extractRelationshipsTool.invoke({
  content: "Albert Einstein worked at Princeton University from 1933 to 1955. He collaborated with Niels Bohr on quantum mechanics research.",
  entities,
  domains: ["social", "academic"],
});

console.log(result.relationships);
// [
//   {
//     uid: "rel:person:albert_einstein_WORKED_AT_org:princeton",
//     type: "WORKED_AT",
//     source: "person:albert_einstein",
//     target: "org:princeton",
//     confidence: 0.95,
//     properties: { start_date: "1933", end_date: "1955" }
//   },
//   {
//     uid: "rel:person:albert_einstein_COLLABORATED_WITH_person:niels_bohr",
//     type: "COLLABORATED_WITH",
//     source: "person:albert_einstein",
//     target: "person:niels_bohr",
//     confidence: 0.9,
//     properties: { description: "quantum mechanics research" }
//   }
// ]
```

### Focus Entity Strategy

Extract relationships involving only specific entities:

```typescript
const result = await extractRelationshipsTool.invoke({
  content: longTextWithManyEntities,
  entities: allEntities, // 50 entities
  focusEntityUids: ["person:albert_einstein", "person:marie_curie"], // Only relationships involving these
  batchSize: 10, // Process other entities in batches of 10
});

// Only returns relationships where Einstein or Curie is the source
```

### Domain-Specific Relationship Types

```typescript
// Medical domain relationships
const medicalResult = await extractRelationshipsTool.invoke({
  content: "Patient was diagnosed with Type 2 Diabetes and prescribed Metformin at Mayo Clinic.",
  entities: [
    { uid: "person:patient", name: "Patient", type: "Person" },
    { uid: "condition:diabetes", name: "Type 2 Diabetes", type: "Condition" },
    { uid: "med:metformin", name: "Metformin", type: "Medication" },
    { uid: "org:mayo", name: "Mayo Clinic", type: "Organization" },
  ],
  domains: ["medical"],
});

// Uses medical relationship types: DIAGNOSED_WITH, PRESCRIBED, TREATED_AT, etc.
```

### Confidence Filtering

```typescript
// Only high-confidence relationships
const result = await extractRelationshipsTool.invoke({
  content: text,
  entities,
  confidenceThreshold: 0.85, // Only relationships with confidence >= 0.85
});
```

### Exclude Generic Relationships

```typescript
// Exclude generic RELATED_TO relationships
const result = await extractRelationshipsTool.invoke({
  content: text,
  entities,
  excludeGenericRelationships: true, // Default: true
});
```

### Batch Processing for Large Entity Sets

```typescript
const result = await extractRelationshipsTool.invoke({
  content: longDocument,
  entities: largeEntitySet, // 100 entities
  batchSize: 20, // Process 20 at a time to avoid rate limits
});
```

## Input Schema

```typescript
{
  // Required
  content: string;                          // Text content to extract from
  entities: Array<{                         // Entities to find relationships between
    uid: string;
    name: string;
    type: string;
  }>;                                       // Min: 2 entities
  
  // Focus entities
  focusEntityUids?: string[];               // Focus on specific entities
  
  // Domain filtering
  domains?: string[];                       // Default: ["social", "academic", "geographic"]
  
  // Batch processing
  batchSize?: number;                       // Default: 10, Range: 1-50
  
  // Confidence filtering
  confidenceThreshold?: number;             // Default: 0.7, Range: 0-1
  
  // LLM parameters
  modelId?: string;                         // LLM model ID
  temperature?: number;                     // Model temperature (0-2)
  
  // Processing options
  includeSourceGrounding?: boolean;         // Default: true
  excludeGenericRelationships?: boolean;    // Default: true (exclude RELATED_TO)
}
```

## Output Schema

```typescript
{
  success: boolean;
  relationships: Array<{
    uid: string;                            // rel:source_type_target
    type: string;                           // Relationship type
    source: string;                         // Source entity UID
    target: string;                         // Target entity UID
    confidence: number;                     // Confidence score (0-1)
    properties?: {                          // Additional properties
      start_date?: string;
      end_date?: string;
      description?: string;
    };
    sourceText?: string;                    // Source text span
    startChar?: number;                     // Start position
    endChar?: number;                       // End position
  }>;
  metadata: {
    totalFound: number;                     // Total before filtering
    returned: number;                       // Number returned
    entitiesProcessed: number;
    focusEntitiesCount: number;
    batchesProcessed: number;
    validRelationshipTypes: string[];
    domains: string[];
    modelUsed: string;
    contentLength: number;
  };
}
```

## Relationship Types by Domain

### Social Domain
- `WORKED_AT`, `EMPLOYED_BY`
- `FOUNDED`, `CO_FOUNDED`
- `MEMBER_OF`, `PART_OF`
- `COLLABORATED_WITH`, `PARTNERED_WITH`
- `MARRIED_TO`, `PARENT_OF`, `SIBLING_OF`
- `INFLUENCED_BY`, `MENTORED_BY`
- `STUDIED_UNDER`, `TAUGHT`

### Academic Domain
- `AUTHORED`, `CO_AUTHORED`
- `PUBLISHED_IN`
- `CITED_BY`, `REFERENCES`
- `STUDIED_AT`, `GRADUATED_FROM`
- `RESEARCHED`, `CONTRIBUTED_TO`
- `PEER_REVIEWED`

### Geographic Domain
- `LOCATED_IN`, `BASED_IN`
- `BORN_IN`, `DIED_IN`
- `CAPITAL_OF`, `BORDERS`
- `PART_OF_REGION`

### Medical Domain
- `DIAGNOSED_WITH`
- `TREATED_WITH`, `PRESCRIBED`
- `CAUSES`, `PREVENTED_BY`
- `SYMPTOM_OF`, `COMPLICATION_OF`

### Technology Domain
- `DEVELOPED_BY`, `CREATED_BY`
- `POWERED_BY`, `BUILT_WITH`
- `ACQUIRED_BY`, `MERGED_WITH`
- `COMPETES_WITH`

### Economic Domain
- `INVESTED_IN`, `FUNDED_BY`
- `ACQUIRED`, `SOLD_TO`
- `TRADED_ON`, `LISTED_ON`
- `SUBSIDIARY_OF`, `PARENT_COMPANY_OF`

## Architecture

```
┌─────────────────────────────┐
│ extractRelationshipsTool    │  (Generic, domain-aware)
└─────────────┬───────────────┘
              │
              v
┌─────────────────────────────┐
│ Focus Entity Strategy       │  (Optional)
│ - Separate focus/other      │
│ - Batch other entities      │
└─────────────┬───────────────┘
              │
              v
┌─────────────────────────────┐
│ enqueueLangExtract          │  (Per batch/entity)
└─────────────┬───────────────┘
              │
              v
┌─────────────────────────────┐
│ LangExtract Job             │  (Rate limiting, retries)
└─────────────┬───────────────┘
              │
              v
┌─────────────────────────────┐
│ Relationship Processing     │
│ - Entity UID resolution     │
│ - Confidence filtering      │
│ - Deduplication            │
└─────────────────────────────┘
```

## Integration Examples

### With Discovery Tool

```typescript
import { discoverEntitiesTool, extractRelationshipsTool } from "@protolabsai/llm-tools";

// Step 1: Discover entities
const discovery = await discoverEntitiesTool.invoke({
  content: text,
  domains: ["social", "academic"],
});

// Step 2: Extract relationships
const relationships = await extractRelationshipsTool.invoke({
  content: text,
  entities: discovery.entities,
  domains: ["social", "academic"],
});
```

### Complete Extraction Pipeline

```typescript
import {
  discoverEntitiesTool,
  enrichEntityTool,
  extractRelationshipsTool,
} from "@protolabsai/llm-tools";

// 1. Discover
const entities = await discoverEntitiesTool.invoke({
  content: text,
  domains: ["social"],
});

// 2. Enrich
const enrichedEntities = await Promise.all(
  entities.entities.map(async (entity) => {
    const enriched = await enrichEntityTool.invoke({
      entityName: entity.name,
      entityType: entity.type,
      content: text,
      schema: domainSchema,
    });
    return { ...entity, ...enriched.enrichedData };
  })
);

// 3. Extract relationships
const relationships = await extractRelationshipsTool.invoke({
  content: text,
  entities: enrichedEntities,
});
```

### API Route Integration

```typescript
export async function POST(request: NextRequest) {
  const { content, entities, focusEntityUids } = await request.json();

  const result = await extractRelationshipsTool.invoke({
    content,
    entities,
    focusEntityUids,
    domains: ["social", "academic", "geographic"],
  });

  return NextResponse.json({
    relationships: result.relationships,
    metadata: result.metadata,
  });
}
```

## Comparison to Existing Patterns

### Old Pattern (Relate API Route)
```typescript
// ❌ Complex batching and processing logic in API route
// - Manual batch creation
// - Direct langextract service calls
// - Manual entity resolution
// - Manual deduplication
// - 305 lines of code
```

### New Pattern (Standalone Tool)
```typescript
// ✅ Simple, focused, reusable
const result = await extractRelationshipsTool.invoke({
  content: text,
  entities,
  focusEntityUids,
  batchSize: 10,
});

// All processing handled by tool
```

## Focus Entity Strategy

When `focusEntityUids` is provided:

1. **Separate entities**: Focus entities vs. others
2. **Process per focus entity**: For each focus entity:
   - Batch other entities (batchSize at a time)
   - Extract relationships between focus entity and batch
3. **Benefits**:
   - Ensures important entities have relationships extracted
   - Handles large entity sets efficiently
   - Reduces token usage by focusing extraction

When `focusEntityUids` is NOT provided:
- Extracts all relationships between all entities
- Single extraction call (no batching by entity)
- Best for smaller entity sets (<20 entities)

## Entity UID Resolution

The tool uses fuzzy matching to resolve entity names from extraction to UIDs:

```typescript
// Input relationship from LangExtract:
// { source_entity: "Einstein", target_entity: "Princeton University" }

// Entities:
// { uid: "person:albert_einstein", name: "Albert Einstein" }
// { uid: "org:princeton_university", name: "Princeton University" }

// Resolution:
// "Einstein" → "person:albert_einstein" (partial match)
// "Princeton University" → "org:princeton_university" (exact match)
```

**Matching Rules:**
1. Exact match (case-insensitive)
2. Partial match (name contains query or query contains name)
3. No match → relationship skipped

## Deduplication Strategy

Relationships are deduplicated by UID:

```typescript
// UID format: rel:source_type_target
// Example: rel:person:einstein_WORKED_AT_org:princeton

// Multiple extractions of same relationship → single entry
```

## Confidence Filtering

Relationships below `confidenceThreshold` are filtered:

```typescript
// confidenceThreshold = 0.7

// Relationship with confidence 0.95 → included ✓
// Relationship with confidence 0.85 → included ✓
// Relationship with confidence 0.65 → excluded ✗
```

## Performance Considerations

1. **Entity Count**: More entities = more batches = longer processing
2. **Batch Size**: Larger batches = fewer calls but more tokens per call
3. **Focus Entities**: Reduces total calls by focusing extraction
4. **Content Size**: Longer content = longer processing per batch
5. **Rate Limiting**: Handled by job queue (concurrency: 1)

## Best Practices

### ✅ DO
- Use focus entities for large entity sets (>20 entities)
- Set appropriate batch size (10-20 for most cases)
- Use confidence threshold to filter noise (0.7-0.85)
- Exclude generic relationships (default)
- Choose relevant domains for relationship types

### ❌ DON'T
- Don't extract relationships with <2 entities
- Don't use very low confidence thresholds (<0.5)
- Don't use very large batch sizes (>50)
- Don't include entities without proper UIDs
- Don't extract relationships from very long content (>50K chars)

## Error Handling

The tool returns `success: false` on errors:

```typescript
const result = await extractRelationshipsTool.invoke({...});

if (!result.success) {
  console.error("Extraction failed:", result.error);
  // Fallback to empty relationships
  return { relationships: [] };
}
```

## Testing

Run examples:
```bash
tsx packages/proto-llm-tools/src/tools/core/extract-relationships/example.ts
```

## Dependencies

- `enqueueLangExtract` - Job queue integration
- `langextractConfig` - Service configuration
- `getRelationshipTypesForDomains` - Domain-to-relationship-type mapping
- LangExtract service must be running
- Job processor must be running

## Environment Requirements

```bash
LANGEXTRACT_URL=http://localhost:8000
JOB_PROCESSOR_URL=http://localhost:8680
```

## Limitations

1. **Minimum Entities**: Requires at least 2 entities
2. **Rate Limiting**: Inherits langextract rate limits (handled by job queue)
3. **Content Size**: Limited by langextract max content length
4. **Entity Matching**: Uses fuzzy matching which may have false positives
5. **Job Queue Dependency**: Requires job processor to be running

## Future Enhancements

1. **Bidirectional Relationships**: Support symmetric relationships
2. **Relationship Confidence Calibration**: Improve confidence scoring
3. **Entity Linking**: Link to knowledge bases for validation
4. **Relationship Properties Extraction**: Extract more detailed properties
5. **Temporal Reasoning**: Better handling of time-based relationships
6. **Cross-Document Relationships**: Extract relationships across multiple documents
7. **Relationship Clustering**: Group similar relationships

## Related Tools

- **discoverEntitiesTool**: Discover entities before extracting relationships
- **enrichEntityTool**: Enrich entities with additional data
- **summarizeTool**: Summarize large content before extraction
- **deepAgentEntityResearcherTool**: Multi-source entity research with relationships

## Notes

- Tool is marked as `@core` indicating it's a fundamental building block
- Follows same pattern as other core tools
- Fully typed with Zod schemas
- No linter errors
- Ready for production use
- **Not yet integrated into playground** (as per user request)







