# Basic Entity Extraction Tool

Simplified two-phase entity extraction workflow focused on discovering and structuring entities without relationship extraction.

## Purpose

Extract entities from text using:

1. **Discover Phase**: Find all entities mentioned
2. **Structure Phase**: Extract required fields for each entity

**NO relationships** - pure entity extraction only. Relationships will be added separately later.

## Usage

```typescript
import { entityExtractionBasicTool } from "@protolabsai/llm-tools";

const result = await entityExtractionBasicTool.invoke({
  text: "Albert Einstein worked at Princeton University in New Jersey.",
  domains: ["social", "academic", "geographic"],
  maxEntities: 25,
});

console.log(result.entities);
// [
//   { uid: "person:albert_einstein", type: "Person", name: "Albert Einstein", ... },
//   { uid: "organization:princeton_university", type: "Organization", name: "Princeton University", ... },
//   { uid: "location:new_jersey", type: "Location", name: "New Jersey", ... }
// ]
```

## Input Schema

```typescript
{
  text: string;              // Text to extract entities from
  domains: string[];         // Domain contexts (social, academic, etc.)
  entityTypes?: string[];    // Optional: specific types to extract
  modelId?: string;          // Optional: LangExtract model override
  temperature?: number;      // Optional: model temperature
  maxEntities?: number;      // Optional: max entities (default: 25)
}
```

## Output Schema

```typescript
{
  entities: Array<{
    uid: string;
    type: string;
    name: string;
    properties: Record<string, any>;
    _confidence: number;
    _phase: "discovered" | "structured";
  }>;
  processingTime: {
    discover: number;
    structure: number;
    total: number;
  };
  stats: {
    totalDiscovered: number;
    totalStructured: number;
    entityTypes: string[];
  };
  errors: string[];
}
```

## Integration with Agents

```typescript
// agent/src/human-loop-extraction-agent/graph/nodes.ts

import { entityExtractionBasicTool } from "@protolabsai/llm-tools";

export async function extractEntitiesNode(state, config) {
  const result = await entityExtractionBasicTool.invoke({
    text: state.inputText,
    domains: state.domains,
  });

  return {
    entities: result.entities,
    processingTime: result.processingTime,
  };
}
```

## Design Philosophy

- **Focus**: Entities only, no relationships
- **Simplicity**: Two clear phases (discover → structure)
- **Reusability**: Import from @protolabsai/llm-tools, use anywhere
- **Performance**: Optimized with retry logic and rate limit handling
- **Extensibility**: Easy to add enrichment or relationships later

## Future Enhancement Path

1. ✅ **Phase 1-2**: Discover + Structure (current implementation)
2. ⏳ **Phase 3**: Enrich (add optional fields) - separate tool
3. ⏳ **Phase 4**: Relate (add relationships) - separate tool
4. ⏳ **Compose**: Chain tools for full workflow when needed

## Differences from Multi-Phase Extraction

| Feature           | entityExtractionBasicTool | extractionGraph                         |
| ----------------- | ------------------------- | --------------------------------------- |
| Phases            | 2 (discover, structure)   | 4 (discover, structure, enrich, relate) |
| Relationships     | ❌ No                     | ✅ Yes                                  |
| Enrichment        | ❌ No                     | ✅ Yes                                  |
| Complexity        | Simple                    | Complex                                 |
| Use Case          | Quick entity extraction   | Full knowledge graph                    |
| Agent Integration | ✅ Direct import          | ❌ Requires workflow setup              |

## Related Tools

- `langextractClientTool` - Direct LangExtract access
- `extractionGraph` - Full multi-phase extraction with relationships
- `deepAgentEntityResearcherTool` - Autonomous research with evidence
