# Unified Research Graph API

**Endpoint:** `/api/research/graph`  
**Version:** 1.0  
**Status:** Production Ready

## Overview

Single unified endpoint for multi-source entity research with evidence-first design. Consolidates Wikipedia research, file extraction, and future data sources into one consistent API.

## Key Features

- **Evidence-First Design**: All entities backed by Evidence nodes
- **Multi-Source Support**: Wikipedia + Files (arXiv/Scholar coming soon)
- **Multiple Entities**: Comma-separated entity names or multiple files
- **Domain Filtering**: Filter entities by domain using `domainRegistry`
- **Entity Deduplication**: Automatic merging of similar entities
- **Parallel Processing**: Concurrent source fetching and extraction

## Request Format

**Method:** `POST` (multipart/form-data)

```typescript
FormData {
  entityNames: "Einstein, Curie, Feynman",  // Comma-separated
  sources: '["wikipedia"]',                  // JSON array
  domains: '["social", "academic"]',         // Optional
  entityTypes: '["Person", "Organization"]', // Optional
  maxEntities: "50",                         // Default: 50
  file_0: File,                              // Multiple files supported
  file_1: File,
}
```

## Response Format

```typescript
{
  success: boolean;
  bundle: {
    evidence: Evidence[];        // Source tracking
    entities: Entity[];          // With _evidence_uids
    relationships: Relationship[]; // With evidence_uids
    files: File[];
    content: Content[];
  };
  stats: {
    evidenceCreated: number;
    entitiesExtracted: number;
    relationshipsDiscovered: number;
    filesProcessed: number;
    sourcesUsed: string[];
  };
  metrics: {
    confidence: number;          // Based on evidence reliability
    completeness: number;        // Evidence coverage %
    processingTime: number;      // Milliseconds
    evidenceCoverage: number;    // % entities with evidence
  };
  warnings: string[];
  errors: string[];
}
```

## Evidence Schema

```typescript
{
  uid: "evidence:wikipedia_albert_einstein_2025-10-28",
  kind: "major_media" | "user_document" | ...,
  title: "Albert Einstein - Wikipedia Article",
  publisher: "Wikipedia",
  date: "2025-10-28",
  url: "https://en.wikipedia.org/...",
  reliability: 0.85,
  notes: "Auto-retrieved (15000 chars)",
  retrieved_at: "2025-10-28T10:00:00Z"
}
```

## Entity Linking

All entities include evidence UIDs in properties:

```typescript
{
  uid: "person:albert_einstein",
  type: "Person",
  name: "Albert Einstein",
  properties: {
    birthDate: "1879-03-14",
    _evidence_uids: [
      "evidence:wikipedia_albert_einstein_2025-10-28",
      "evidence:file_biography_pdf_2025-10-28"
    ],
    _enrichedAt: "2025-10-28T10:00:00Z"
  }
}
```

## Usage Examples

### Single Entity from Wikipedia

```typescript
const formData = new FormData();
formData.append("entityNames", "Albert Einstein");
formData.append("sources", JSON.stringify(["wikipedia"]));

const response = await fetch("/api/research/graph", {
  method: "POST",
  body: formData,
});
```

### Multiple Entities

```typescript
const formData = new FormData();
formData.append("entityNames", "Einstein, Curie, Feynman");
formData.append("sources", JSON.stringify(["wikipedia"]));
formData.append("domains", JSON.stringify(["social", "academic"]));
formData.append("maxEntities", "100");
```

### File + Wikipedia

```typescript
const formData = new FormData();
formData.append("entityNames", "Tesla Inc");
formData.append("sources", JSON.stringify(["wikipedia"]));
formData.append("file_0", pdfFile);
formData.append("domains", JSON.stringify(["economic", "technology"]));
```

## Architecture

### Workflow Phases

1. **Source Preparation**: Validate inputs, parse entity names
2. **Parallel Fetching**: Wikipedia + file extraction (Promise.all)
3. **Evidence Creation**: One Evidence node per source
4. **Entity Extraction**: LangExtract with evidence linking
5. **Deduplication**: Merge similar entities (Levenshtein)
6. **Bundle Assembly**: Return RabbitHoleBundleData format

### File Structure

```
apps/rabbit-hole/app/api/research/graph/
├── route.ts              # Main endpoint
├── evidence-creator.ts   # Evidence node generation
├── source-fetcher.ts     # Multi-source parallel fetching
└── README.md            # This file
```

## Domain Registry Integration

Entity types automatically sourced from domain registry:

```typescript
const entityTypesByDomain = domainRegistry.getEntityTypesByDomain();
// Returns: { social: ["Person", "Organization", ...], medical: [...], ... }

const computedTypes = domains.flatMap(
  (domain) => entityTypesByDomain[domain] || []
);
```

## Performance

| Operation              | Target | Notes                |
| ---------------------- | ------ | -------------------- |
| Single entity + Wiki   | <3s    | Baseline             |
| 5 entities + Wiki      | <5s    | Parallel fetch       |
| 10 entities + Wiki     | <8s    | Parallel extract     |
| File (1MB PDF)         | <4s    | Text extraction      |
| File + Wikipedia       | <6s    | Combined sources     |
| 100 entities           | Job    | Use background queue |

## Error Handling

- **400**: Invalid request (no sources, invalid domains)
- **401**: Authentication required
- **403**: Tier limit (requires Basic+)
- **500**: Processing error

Partial failures returned in `errors` array with success data.

## Related Endpoints

- `/api/research/entity` - Legacy single entity (deprecated)
- `/api/research/extract-from-file` - Legacy file extraction (deprecated)
- `/api/research/enrich-entity` - Field enrichment only

## Migration Notes

Existing endpoints updated to return bundle format with backward compatibility:

```typescript
// New format
response.bundle.entities

// Backward compatible
response.entities
```

## Future Enhancements

- [ ] arXiv source integration
- [ ] Google Scholar integration
- [ ] Custom URL scraping
- [ ] Job queue for large batches (>100 entities)
- [ ] Response streaming
- [ ] Relationship discovery across sources
- [ ] Multi-source confidence scoring

## Implementation Reference

- Evidence pattern: `packages/proto-llm-tools/src/tools/deep-agent-entity-researcher/`
- Bundle format: `packages/types/src/validation-schemas-modular.ts`
- Research Agent: `agent/src/research-agent/`

---

**Created:** 2025-10-28  
**Last Updated:** 2025-10-28  
**Maintainer:** Research Team

