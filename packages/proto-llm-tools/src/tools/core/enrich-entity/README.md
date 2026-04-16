# Entity Enrichment Tool

Generic core tool for enriching entities by extracting structured data from provided content.

## Overview

The `enrichEntityTool` is a flexible entity enrichment tool that supports both:

- **Schema-based extraction**: Define a JSON schema for the expected output structure
- **Example-based extraction**: Provide examples of input/output pairs to guide extraction

## Key Features

- **Content-agnostic**: Not dependent on Wikipedia or any specific data source
- **Flexible extraction**: Choose between schema or examples based on your needs
- **Source grounding**: Optional source text references for extracted data
- **Type-safe**: Full TypeScript support with Zod schemas

## Usage

### ⚠️ Schema-Based Enrichment (EXPERIMENTAL - NOT RECOMMENDED)

**Note:** Schema-based extraction currently returns empty results. See Linear ticket [RAB-195](https://linear.app/rabbit-hole-dev/issue/RAB-195). Use example-based extraction instead.

```typescript
import { enrichEntityTool } from "@protolabsai/llm-tools";

// ⚠️ This currently doesn't work reliably
const result = await enrichEntityTool.invoke({
  entityName: "Tesla Inc.",
  entityType: "Organization",
  content:
    "Tesla Inc. is an American automotive and clean energy company. Founded in 2003, it is headquartered in Austin, Texas.",
  schema: {
    description: "string",
    founded: "number",
    headquarters: "string",
    industries: "array<string>",
  },
});

// ❌ Currently returns: { enrichedData: {}, fieldsExtracted: [] }
// Expected: { description: "...", founded: 2003, ... }
```

### ✅ Example-Based Enrichment (RECOMMENDED)

This is the recommended approach that works reliably in production.

```typescript
import { enrichEntityTool } from "@protolabsai/llm-tools";

const result = await enrichEntityTool.invoke({
  entityName: "Albert Einstein",
  entityType: "Person",
  content:
    "Albert Einstein was a theoretical physicist born in Germany in 1879. He developed the theory of relativity and won the Nobel Prize in Physics in 1921.",
  examples: [
    {
      input_text:
        "Marie Curie was a physicist and chemist born in Poland in 1867. She won the Nobel Prize in Physics in 1903.",
      expected_output: {
        birthYear: 1867,
        birthPlace: "Poland",
        occupation: "physicist and chemist",
        awards: ["Nobel Prize in Physics (1903)"],
      },
    },
  ],
  fieldsToExtract: ["birthYear", "birthPlace", "occupation", "awards"],
  modelId: "gemini-2.5-flash-lite",
});

console.log(result.enrichedData);
// {
//   birthYear: 1879,
//   birthPlace: "Germany",
//   occupation: "theoretical physicist",
//   awards: ["Nobel Prize in Physics (1921)"]
// }
```

### In Multi-Phase Extraction Pipeline

You can use this tool in custom extraction pipelines:

```typescript
import { enrichEntityTool } from "@protolabsai/llm-tools";
import {
  getEnrichmentFieldsForEntity,
  generateEnrichmentExample,
} from "@protolabsai/llm-tools";

// Get domain-specific enrichment fields
const enrichmentFields = getEnrichmentFieldsForEntity("Person", "social");
const example = generateEnrichmentExample("Person");

// Enrich entity with domain-specific fields
const result = await enrichEntityTool.invoke({
  entityName: entity.name,
  entityType: entity.type,
  content: sourceContent,
  examples: [example],
  fieldsToExtract: enrichmentFields,
});

// Merge enriched data with entity
const enrichedEntity = {
  ...entity,
  ...result.enrichedData,
};
```

## Input Schema

```typescript
{
  // Required
  entityName: string;        // Name of entity to enrich
  entityType: string;        // Type (Person, Organization, etc.)
  content: string;           // Text to extract from

  // Schema OR Examples (schema takes precedence)
  schema?: Record<string, any>;              // JSON schema
  examples?: Array<{                         // Input/output examples
    input_text: string;
    expected_output: Record<string, any>;
  }>;

  // Optional
  fieldsToExtract?: string[];               // Field names to extract
  modelId?: string;                         // LLM model ID
  temperature?: number;                     // Model temperature (0-2)
  includeSourceGrounding?: boolean;         // Include source references
}
```

## Output Schema

```typescript
{
  success: boolean;
  enrichedData: Record<string, any>;        // Extracted fields
  metadata: {
    modelUsed: string;
    contentLength: number;
    fieldsExtracted: string[];
    useSchemaConstraints: boolean;
  };
  sourceGrounding?: Array<{                 // Optional source references
    field: string;
    sourceText: string;
    startIndex?: number;
    endIndex?: number;
  }>;
}
```

## Schema vs Examples

| Feature        | Schema              | Examples           |
| -------------- | ------------------- | ------------------ |
| Status         | ⚠️ **EXPERIMENTAL** | ✅ **RECOMMENDED** |
| Type safety    | ✅ Strong           | ⚠️ Weak            |
| Flexibility    | ⚠️ Rigid            | ✅ Flexible        |
| Working        | ❌ Returns empty    | ✅ Works perfectly |
| Related option | `true`              | `false`            |

**⚠️ Schema-based extraction is currently experimental** (See Linear ticket [RAB-195](https://linear.app/rabbit-hole-dev/issue/RAB-195))

- Currently returns empty results
- Not recommended for production use
- Use examples instead until fixed

**✅ Example-based extraction (RECOMMENDED):**

- `useSchemaConstraints: false`
- Works reliably with all entity types
- More flexible extraction
- Proven in production

**When schema is provided:**

- `useSchemaConstraints: true`
- Examples are ignored
- ⚠️ May return empty results - use examples instead

**When only examples are provided:**

- `useSchemaConstraints: false`
- ✅ Reliable extraction
- Best for production use

## Architecture

```
┌─────────────────────┐
│  enrichEntityTool   │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ enqueueLangExtract  │  → Job Queue
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  LangExtract Job    │  → Rate limiting, retries
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ LangExtract Service │  → Python service with LLM
└─────────────────────┘
```

## Comparison to Existing Enrichment

### Old Pattern (Wikipedia-dependent)

```typescript
// ❌ Tightly coupled to Wikipedia
const wikipediaContent = await fetchWikipediaWithCache(entityName);
const result = await callLangExtract({
  text: wikipediaContent,
  prompt: `Extract fields for ${entityName}`,
  examples: [example],
});
```

### New Pattern (Content-agnostic)

```typescript
// ✅ Works with any content source
const result = await enrichEntityTool.invoke({
  entityName,
  entityType,
  content: anyContentSource, // Wikipedia, PDF, web scrape, etc.
  schema: domainSchema, // Or examples
});
```

## Integration with Domain Configs

The tool works seamlessly with domain-specific schemas:

```typescript
import { getDomainConfig } from "@protolabsai/llm-tools";

const domainConfig = getDomainConfig("social");
const personSchema = domainConfig.entities.Person.schema;

const result = await enrichEntityTool.invoke({
  entityName: "Jane Doe",
  entityType: "Person",
  content: sourceContent,
  schema: personSchema, // Use domain schema directly
});
```

## Error Handling

The tool returns `success: false` on errors with error details:

```typescript
const result = await enrichEntityTool.invoke({...});

if (!result.success) {
  console.error("Enrichment failed:", result.error);
  // Fallback to original entity data
}
```

## Related

- **summarizeTool**: Summarize large content before enrichment
- **entityExtractionBasicTool**: Discover and structure entities
- **deepAgentEntityResearcherTool**: Multi-source entity research
