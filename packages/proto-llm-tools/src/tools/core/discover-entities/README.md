# Entity Discovery Tool

Generic core tool for discovering entities in text content using domain-aware extraction.

## Overview

The `discoverEntitiesTool` is a flexible entity discovery tool that identifies entities in text based on:
- **Domain filtering**: Focus on specific knowledge domains (social, academic, geographic, etc.)
- **Entity type filtering**: Extract specific entity types (Person, Organization, Location, etc.)
- **Focus entity prioritization**: Ensure specific entities are included in results
- **Confidence filtering**: Filter out low-confidence entities

## Key Features

- **Domain-aware**: Automatically adapts extraction based on knowledge domains
- **Type-safe**: Full TypeScript support with Zod schemas
- **Source grounding**: Optional source text references for discovered entities
- **Confidence scoring**: Each entity includes a confidence score
- **Deduplication**: Automatically deduplicates entities by normalized name
- **Focus prioritization**: Prioritizes specified focus entities in results
- **Flexible limits**: Control maximum number of entities returned

## Usage

### Basic Discovery

```typescript
import { discoverEntitiesTool } from "@proto/llm-tools";

const result = await discoverEntitiesTool.invoke({
  content: "Marie Curie was a Polish-French physicist who conducted pioneering research on radioactivity at the Sorbonne in Paris. She was the first woman to win a Nobel Prize.",
  domains: ["social", "academic", "geographic"],
  maxEntities: 25,
});

console.log(result.entities);
// [
//   { uid: "Person:marie_curie", type: "Person", name: "Marie Curie", confidence: 0.95, ... },
//   { uid: "Organization:sorbonne", type: "Organization", name: "Sorbonne", confidence: 0.90, ... },
//   { uid: "Location:paris", type: "Location", name: "Paris", confidence: 0.88, ... },
//   { uid: "Event:nobel_prize", type: "Event", name: "Nobel Prize", confidence: 0.85, ... }
// ]
```

### Domain-Specific Discovery

```typescript
// Medical domain
const medicalResult = await discoverEntitiesTool.invoke({
  content: "Patient was diagnosed with Type 2 Diabetes and prescribed Metformin. Follow-up at Mayo Clinic.",
  domains: ["medical"],
  maxEntities: 10,
});

// Technology domain
const techResult = await discoverEntitiesTool.invoke({
  content: "Apple released the iPhone 15 with the new A17 chip. The device supports 5G and runs iOS 17.",
  domains: ["technology"],
  maxEntities: 15,
});
```

### Entity Type Filtering

```typescript
// Extract only people and organizations
const result = await discoverEntitiesTool.invoke({
  content: "Elon Musk founded SpaceX and Tesla. Both companies are headquartered in the United States.",
  entityTypes: ["Person", "Organization"],
  maxEntities: 20,
});

// Result will only include Person and Organization entities
```

### Focus Entity Prioritization

```typescript
// Ensure specific entities are included
const result = await discoverEntitiesTool.invoke({
  content: "The article mentions hundreds of people, including Albert Einstein, Marie Curie, and many others...",
  focusEntityNames: ["Albert Einstein", "Marie Curie"],
  maxEntities: 10,
});

// Focus entities will always be included, even if many entities are found
console.log(result.metadata.focusEntityUids);
// ["Person:albert_einstein", "Person:marie_curie"]
```

### Confidence Filtering

```typescript
// Only return high-confidence entities
const result = await discoverEntitiesTool.invoke({
  content: "...",
  confidenceThreshold: 0.85, // Only entities with confidence >= 0.85
  includeSourceGrounding: true,
});

// All returned entities have confidence >= 0.85
```

### With Source Grounding

```typescript
const result = await discoverEntitiesTool.invoke({
  content: "Marie Curie conducted research on radioactivity in Paris.",
  includeSourceGrounding: true,
});

console.log(result.entities[0]);
// {
//   uid: "Person:marie_curie",
//   type: "Person",
//   name: "Marie Curie",
//   confidence: 0.95,
//   sourceText: "Marie Curie conducted research",
//   startChar: 0,
//   endChar: 31
// }
```

## Input Schema

```typescript
{
  // Required
  content: string;                          // Text content to discover entities from
  
  // Domain and type filtering
  domains?: string[];                       // Default: ["social", "academic", "geographic"]
  entityTypes?: string[];                   // Specific types to extract (if not provided, uses all types from domains)
  
  // Focus entities
  focusEntityNames?: string[];              // Names of entities to prioritize
  
  // Limits
  maxEntities?: number;                     // Default: 25, Range: 1-100
  
  // LLM parameters
  modelId?: string;                         // LLM model ID
  temperature?: number;                     // Model temperature (0-2)
  
  // Processing options
  includeSourceGrounding?: boolean;         // Default: true
  confidenceThreshold?: number;             // Default: 0.7, Range: 0-1
}
```

## Output Schema

```typescript
{
  success: boolean;
  entities: Array<{
    uid: string;                            // Unique identifier (type:normalized_name)
    type: string;                           // Entity type
    name: string;                           // Entity name
    confidence: number;                     // Confidence score (0-1)
    sourceText?: string;                    // Source text span
    startChar?: number;                     // Start position
    endChar?: number;                       // End position
  }>;
  metadata: {
    totalFound: number;                     // Total entities found before filtering
    returned: number;                       // Number of entities returned
    domains: string[];                      // Domains used
    entityTypes: string[];                  // Entity types extracted
    focusEntityUids?: string[];             // UIDs of focus entities
    modelUsed: string;
    contentLength: number;
  };
}
```

## Available Domains

- **social** (👥): People, organizations, groups, social movements
- **academic** (🎓): Publications, research, concepts, institutions
- **geographic** (🌍): Locations, regions, places, geographical features
- **medical** (⚕️): Conditions, treatments, procedures, medical entities
- **technology** (💻): Tech companies, products, innovations, software
- **economic** (💰): Financial entities, markets, transactions, economic concepts
- **cultural** (🎨): Art, cultural movements, traditions, cultural artifacts
- **political** (🏛️): Political entities, governments, policies, elections

## Entity Types by Domain

Each domain includes specific entity types:

```typescript
// Social domain
["Person", "Organization", "Group", "SocialMovement"]

// Academic domain
["Publication", "Concept", "AcademicInstitution", "ResearchProject"]

// Geographic domain
["Location", "City", "Country", "Region", "GeographicFeature"]

// Medical domain
["Condition", "Treatment", "Procedure", "MedicalDevice", "Medication"]

// Technology domain
["TechCompany", "Product", "Software", "Hardware", "TechConcept"]

// Economic domain
["Company", "Market", "FinancialInstrument", "EconomicIndicator"]

// Cultural domain
["Artwork", "CulturalMovement", "Tradition", "CulturalArtifact"]

// Political domain
["PoliticalEntity", "Government", "Policy", "Election", "PoliticalParty"]
```

## Architecture

```
┌──────────────────────┐
│ discoverEntitiesTool │  (Generic, domain-aware)
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│ enqueueLangExtract   │  (Job queue integration)
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│  LangExtract Job     │  (Rate limiting, retries)
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│ LangExtract Service  │  (Python service with LLM)
└──────────────────────┘
```

## Integration Examples

### In Multi-Phase Extraction Pipeline

```typescript
import { discoverEntitiesTool } from "@proto/llm-tools";

// Phase 1: Discover entities
const discoveryResult = await discoverEntitiesTool.invoke({
  content: inputText,
  domains: ["social", "academic"],
  maxEntities: 50,
});

// Phase 2: Structure entities (extract required fields)
for (const entity of discoveryResult.entities) {
  const structuredEntity = await structureEntity(entity);
  // ... continue with enrichment, etc.
}
```

### API Route Integration

```typescript
// Replace existing discover phase logic
export async function POST(request: NextRequest) {
  const { content, domains, focusEntityNames, maxEntities } = await request.json();

  const result = await discoverEntitiesTool.invoke({
    content,
    domains,
    focusEntityNames,
    maxEntities,
  });

  return NextResponse.json({
    entities: result.entities,
    focusEntityUids: result.metadata.focusEntityUids,
    totalFound: result.metadata.totalFound,
  });
}
```

### Interactive Extraction Playground

```typescript
// Current pattern (using API route)
const response = await fetch("/api/extraction/phases/discover", {
  method: "POST",
  body: JSON.stringify({ inputText, domains, maxEntities }),
});

// Could be refactored to use tool directly (when playground is client-side)
const result = await discoverEntitiesTool.invoke({
  content: inputText,
  domains,
  maxEntities,
});
```

## Comparison to Existing Patterns

### Old Pattern (Multi-phase workflow)
```typescript
// ❌ Tightly coupled to multi-phase extraction state
const result = await discoverNode({
  inputText,
  mode: "deep_dive",
  domains: ["social"],
  confidenceThresholds: { discover: 0.7, ... },
  // ... many other state fields
});
```

### New Pattern (Standalone tool)
```typescript
// ✅ Simple, focused, reusable
const result = await discoverEntitiesTool.invoke({
  content: inputText,
  domains: ["social"],
  maxEntities: 25,
});
```

## Deduplication Strategy

The tool automatically deduplicates entities using normalized names:

```typescript
// These would be deduplicated:
"Albert Einstein"  → "Person:albert_einstein"
"albert einstein"  → "Person:albert_einstein"  (same UID)
"Einstein"         → "Person:einstein"         (different UID)
```

Normalization rules:
- Convert to lowercase
- Remove special characters (except hyphens)
- Replace spaces with underscores
- Trim whitespace

## Focus Entity Matching

Focus entities use fuzzy matching to handle variations:

```typescript
// Focus name: "Marie Curie"
// Matches:
- "Marie Curie"          ✓
- "marie curie"          ✓
- "Marie Sklodowska-Curie" ✓ (contains "marie curie")
- "Curie"                ✓ (partial match)
```

## Error Handling

The tool returns `success: false` on errors:

```typescript
const result = await discoverEntitiesTool.invoke({...});

if (!result.success) {
  console.error("Discovery failed:", result.error);
  // Fallback to empty entities
  return { entities: [] };
}
```

## Performance Considerations

1. **Content Size**: Large content may be slow. Consider chunking or summarizing first.
2. **Entity Count**: More entities = longer processing time. Use `maxEntities` to limit.
3. **Domains**: More domains = more entity types = longer processing. Be selective.
4. **Source Grounding**: Adds overhead. Disable if not needed for performance.

## Best Practices

### 1. Choose Relevant Domains
```typescript
// ❌ Too broad
domains: ["social", "academic", "geographic", "medical", "technology"]

// ✅ Focused
domains: ["social", "academic"]
```

### 2. Use Confidence Threshold
```typescript
// ✅ Filter out noise
confidenceThreshold: 0.8  // Only high-confidence entities
```

### 3. Limit Entity Count
```typescript
// ✅ Reasonable limit for interactive use
maxEntities: 25

// ❌ May be slow for large content
maxEntities: 100
```

### 4. Prioritize Focus Entities
```typescript
// ✅ Ensure key entities are included
focusEntityNames: ["Company XYZ", "Person ABC"]
```

### 5. Disable Source Grounding When Not Needed
```typescript
// ✅ Faster when source text not needed
includeSourceGrounding: false
```

## Related Tools

- **enrichEntityTool**: Enrich discovered entities with additional fields
- **summarizeTool**: Summarize large content before discovery
- **entityExtractionBasicTool**: Discover + structure in one call
- **deepAgentEntityResearcherTool**: Multi-source entity research

## Dependencies

- `enqueueLangExtract` - Job queue integration
- `langextractConfig` - Service configuration
- `getEntityTypesForDomains` - Domain-to-entity-type mapping
- LangExtract service must be running
- Job processor must be running

## Environment Requirements

```bash
LANGEXTRACT_URL=http://localhost:8000
JOB_PROCESSOR_URL=http://localhost:8680
```

## Future Enhancements

1. **Batch Discovery**: Discover entities across multiple documents
2. **Streaming Support**: Stream entities as they're discovered
3. **Entity Linking**: Link discovered entities to knowledge bases
4. **Alias Detection**: Detect entity aliases/variations
5. **Relationship Hints**: Suggest potential relationships between entities
6. **Custom Entity Types**: Support user-defined entity types
7. **Entity Clustering**: Group similar entities together

