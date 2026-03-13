# Tiptap Extraction Playground

Interactive multi-phase entity extraction with visual annotations in a Tiptap editor.

## Features

- **4-Phase Extraction Pipeline**:
  - **Discover**: Find all entities (people, organizations, locations, events, concepts)
  - **Structure**: Extract required fields for each entity
  - **Enrich**: Add optional fields and complete entity profiles
  - **Deep Dive**: Discover relationships between entities

- **Visual Annotations**: Source-grounded highlights with confidence indicators
- **Domain-Aware**: Extract entities based on selected domains (social, academic, geographic, etc.)
- **Confidence Filtering**: Adjustable threshold to show/hide low-confidence extractions
- **Knowledge Graph Integration**: One-click ingestion to Neo4j

## Usage

### Basic Implementation

```tsx
import { TiptapExtractionPlayground } from "@proto/llm-tools/playgrounds";

export default function ExtractionPage() {
  return (
    <TiptapExtractionPlayground
      defaultText="Marie Curie was a Polish-French physicist..."
      defaultDomains={["social", "academic"]}
      defaultMode="enrich"
    />
  );
}
```

### Extraction Modes

- **discover**: Quick entity scan (Phase 1 only)
- **structure**: Core entity data with required fields (Phases 1-2)
- **enrich**: Complete profiles with optional fields (Phases 1-3)
- **deep_dive**: Full intelligence including relationships (Phases 1-4)

### Available Domains

- **social** (👥): People, organizations, groups
- **geographic** (🌍): Locations, regions, places
- **academic** (🎓): Publications, concepts, research
- **medical** (⚕️): Conditions, treatments, medical entities
- **technology** (💻): Tech companies, products, innovations
- **economic** (💰): Financial entities, markets, transactions
- **cultural** (🎨): Art, cultural movements, traditions

## API

### Component Props

```typescript
interface TiptapExtractionPlaygroundProps {
  defaultText?: string; // Initial text to load
  defaultDomains?: string[]; // Pre-selected domains
  defaultMode?: ExtractionMode; // Initial extraction mode
}
```

### Extraction Result

```typescript
interface ExtractionWorkflowResult {
  discoveredEntities: Record<string, string[]>; // Entity names by type
  structuredEntities: Record<string, Entity>; // Entities with required fields
  enrichedEntities: Record<string, Entity>; // Full entity profiles
  relationships: Relationship[]; // Discovered relationships
  annotations: TiptapAnnotation[]; // Tiptap marks for highlighting
  processingTime: Record<string, number>; // Time per phase (ms)
  errorLog: string[]; // Any errors encountered
}
```

## Architecture

### LangGraph Workflow

```
Input Text
    ↓
discoverNode → structureNode → enrichNode → relateNode → annotationNode
                    ↓              ↓            ↓              ↓
                Phase 1        Phase 2      Phase 3        Phase 4
```

### Backend Integration

- **LangExtract Service**: Multi-entity extraction with source grounding
- **API Route**: `/api/extraction-workflow` - Handles workflow execution
- **State Management**: LangGraph manages phase progression and state

## Entity Highlight Extension

Custom Tiptap mark for entity annotations:

```typescript
editor
  .chain()
  .focus()
  .setTextSelection({ from: 0, to: 15 })
  .setEntityHighlight({
    entityUid: "person:marie_curie",
    entityType: "Person",
    entityName: "Marie Curie",
    domain: "social",
    confidence: 0.95,
    color: "#3b82f6",
    attributes: {
      /* entity data */
    },
  })
  .run();
```

## Confidence Thresholds

Default confidence levels per phase:

- **Discover**: 0.7 (lower - want to catch everything)
- **Structure**: 0.8 (medium - required fields need confidence)
- **Enrich**: 0.6 (lower - optional fields, flag for review)
- **Relate**: 0.75 (medium-high - relationships need validation)

Visual indicators:

- **≥ 0.90**: Green badge, solid highlight
- **0.75-0.89**: Yellow badge, normal highlight
- **0.60-0.74**: Orange badge, "Needs Review" flag
- **< 0.60**: Red badge, faded highlight

## Example Use Cases

### Biography Extraction

```typescript
<TiptapExtractionPlayground
  defaultText="Albert Einstein (1879-1955) was a German-born theoretical physicist..."
  defaultDomains={["social", "academic", "geographic"]}
  defaultMode="enrich"
/>
```

### News Article Analysis

```typescript
<TiptapExtractionPlayground
  defaultText="Tesla CEO announced a $500M funding round..."
  defaultDomains={["social", "economic", "technology"]}
  defaultMode="deep_dive"
/>
```

### Research Paper Extraction

```typescript
<TiptapExtractionPlayground
  defaultText="Published in Nature Medicine, Dr. Sarah Chen demonstrated..."
  defaultDomains={["academic", "medical", "social"]}
  defaultMode="enrich"
/>
```

## Performance

Target processing times (1000-word document):

- Discover: < 3s
- Structure: < 5s per entity type
- Enrich: < 3s per entity
- Relate: < 8s for 10 entities
- **Total**: < 30s for full deep dive

## Future Enhancements

- Template library for common document types
- Batch document processing
- Active learning from user corrections
- Multi-language support
- OCR integration
- Export formats (JSON-LD, RDF, CSV)
