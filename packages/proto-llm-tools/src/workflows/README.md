# Multi-Phase Extraction Workflow

Domain-aware entity extraction using `@proto/types` domain system.

## Key Features

### 1. Domain System Integration

**No Hardcoded Values**:

- All colors from domain `ui.color`
- All icons from domain `ui.icon` and `ui.entityIcons`
- All entity types from domain `entities`
- All UID prefixes from domain `uidPrefixes`
- All relationships from domain `relationships`

**Dynamic Loading**:

```typescript
import { getAllDomainUIMetadata } from "@proto/llm-tools";

// Get all available domains
const domains = getAllDomainUIMetadata();
// Returns: [{ value: "social", label: "Social", icon: "👥", color: "#3B82F6", ... }]
```

### 2. Automatic UID Generation

Uses domain-specific prefixes from `@proto/types`:

```typescript
import { generateDomainUID } from "@proto/llm-tools";

// Automatically finds correct prefix from domain registry
generateDomainUID("Albert Einstein", "Person", "social");
// → "person:albert_einstein"

generateDomainUID("Harvard University", "University", "academic");
// → "university:harvard_university"
```

### 3. Dynamic Field Extraction

Enrichment fields defined per entity type, easily extensible:

```typescript
import { getEnrichmentFieldsForEntity } from "@proto/llm-tools";

getEnrichmentFieldsForEntity("Person", "social");
// → ["birthDate", "deathDate", "nationality", "occupation", "bio", "education"]

getEnrichmentFieldsForEntity("Company", "economic");
// → ["founded", "headquarters", "industry", "revenue", "employees"]
```

### 4. Entity & Domain Filtering

```typescript
await extractionGraph.invoke({
  inputText: "...",
  domains: ["social", "academic"],

  // Only extract these entity types
  includeEntityTypes: ["Person", "University", "Publication"],

  // Or exclude specific types
  excludeEntityTypes: ["Event", "Media"],
});
```

## Architecture

```
Domain Registry (@proto/types)
        ↓
getAllDomainUIMetadata()
        ↓
    UI Controls (dynamic domain buttons)
        ↓
extractionGraph.invoke({ domains: [...] })
        ↓
getEntityTypesForDomains(domains) → extraction classes
        ↓
generateDomainUID(name, type, domain) → proper UIDs
        ↓
getDomainColorForEntity(type) → visualization
```

## Adding New Domains

1. **Add to `@proto/types`** domain system:

```typescript
// packages/types/src/domains/your-domain/domain.config.ts
export const yourDomainConfig: DomainConfig = {
  name: "your-domain",
  entities: { YourEntity: YourEntitySchema },
  uidPrefixes: { YourEntity: "yourentity" },
  relationships: ["YOUR_RELATIONSHIP"],
  ui: {
    color: "#ABC123",
    icon: "🎯",
    entityIcons: { YourEntity: "📌" },
  },
};
```

2. **Register in domain registry**:

```typescript
// packages/types/src/domain-system/registry.ts
import { yourDomainConfig } from "../domains/your-domain";
domainRegistry.registerDomain(yourDomainConfig);
```

3. **Done!** - Extraction workflow automatically:
   - Shows domain in UI with correct color/icon
   - Generates proper UIDs using uidPrefixes
   - Extracts entity types from domain
   - Supports domain relationships

## Utility Functions

### Domain Access

- `getAllDomains()` - Get all domain configs
- `getDomainConfig(name)` - Get specific domain
- `getEntityTypesForDomains(names)` - Get entity types

### Entity Helpers

- `generateDomainUID(name, type, domain)` - Generate UID
- `getDomainColorForEntity(type)` - Get color
- `getDomainIconForEntity(type)` - Get icon
- `getDomainNameForEntity(type)` - Find domain for type
- `validateEntityAgainstDomain(entity, type, domain)` - Validate

### Enrichment

- `getEnrichmentFieldsForEntity(type, domain)` - Get fields to extract
- `generateEnrichmentExample(type)` - Get few-shot example

### Relationships

- `getRelationshipTypesForDomains(domains)` - Get valid relationship types

## Bug Fixes

### Fixed: Entity Data Mixing

**Problem**: Adolf Hitler's UID showed Einstein's data

**Cause**: Enrichment was overwriting protected fields (uid, type, name)

**Fix**: Added protected fields set:

```typescript
const protectedFields = new Set(["uid", "type", "name", "_domain"]);
// Never overwrite these during enrichment
```

### Fixed: Duplicate Entity Names

**Problem**: Relationship prompt showed "Einstein, Einstein, Einstein..."

**Cause**: Multiple entities with same name weren't deduplicated

**Fix**: Set-based deduplication:

```typescript
const uniqueNames = new Set(
  Array.from(state.enrichedEntities.values()).map((e) => e.name)
);
const entityNames = Array.from(uniqueNames).join(", ");
```

## Extensibility

### Add Entity Type to Enrichment

Edit `domain-schema-extractor.ts`:

```typescript
const typeSpecificFields: Record<string, string[]> = {
  // ... existing types ...
  YourNewType: ["field1", "field2", "field3"],
};
```

### Add Enrichment Example

Edit `domain-schema-extractor.ts`:

```typescript
const examples: Record<string, {...}> = {
  // ... existing examples ...
  YourNewType: {
    input_text: "Example text with your entity...",
    expected_output: {
      your_type_enriched: [{ field1: "value1", ... }]
    }
  }
};
```

## Testing

```bash
cd packages/proto-llm-tools
pnpm exec tsx test.ts
```

Validates:

- All 4 extraction modes
- Domain system integration
- UID generation
- Field extraction
- Relationship discovery
- Annotation creation
