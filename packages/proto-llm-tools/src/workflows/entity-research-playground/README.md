# Entity Research Playground Workflow

Interactive entity research workflow with **evidence-first design**, field-level control, and real-time graph updates.

## Features

- **Evidence-first**: Creates Evidence node for Wikipedia source before entity extraction
- Wikipedia data fetching with retry logic
- LangExtract integration for structured extraction
- Field selection with 'basic' depth defaults (required fields only)
- Quality metrics: confidence, completeness, reliability
- Graph state broadcasting for visualization
- Error handling with graceful fallbacks
- Future: Auto-create related entities and relationships (Phases 2-5)

## Usage

### As Tool (Agent Integration)

```typescript
import { entityResearchPlaygroundTool } from "@proto/llm-tools";

const result = await entityResearchPlaygroundTool.invoke({
  entityName: "Tesla Inc.",
  entityType: "Organization",
  selectedFields: ["founded_date", "industry"], // Optional
  researchDepth: "detailed", // Defaults to "basic"
  skipReview: true,
});
```

### Via API Route

```bash
curl -X POST http://localhost:3000/api/entity-research-playground \
  -H "Content-Type: application/json" \
  -d '{
    "entityName": "Albert Einstein",
    "entityType": "Person",
    "researchDepth": "basic"
  }'
```

## Output Schema

```typescript
{
  success: boolean;
  entity?: Entity; // Full entity with properties, tags, aliases
  entityName: string;
  entityType: string;

  // NEW: Evidence nodes (Phase 1)
  evidence: {
    primaryEvidence: Evidence | null;  // Wikipedia article evidence
    evidenceList: Evidence[];          // All evidence nodes
  };

  // FUTURE: Field analysis (Phase 2)
  fieldAnalysis: {
    analyses: FieldAnalysis[];
    totalFields: number;
    entityCreationCandidates: number;
  };

  // FUTURE: Related entities (Phase 3)
  relatedEntities: {
    entities: Entity[];      // Auto-created from fields (birthPlace → City)
    totalCreated: number;
  };

  // FUTURE: Relationships (Phase 4)
  relationships: {
    relationshipList: Relationship[];  // With evidence_uids backing
    totalCreated: number;
  };

  metrics: {
    confidence: number;      // 0.0 - 1.0
    completeness: number;    // 0.0 - 1.0
    reliability: number;     // 0.0 - 1.0
    fieldsExtracted: number;
    fieldsRequested: number;
    processingTime: number;  // milliseconds
  };
  warnings: string[];
  errors: string[];
  dataGaps: string[];
}
```

## Workflow Nodes

1. **validateInput** - Input validation, field selection defaults
2. **fetchWikipedia** - Wikipedia data retrieval (3 retries)
3. **createEvidence** - Evidence node creation (NEW - Phase 1) ✅
4. **extractEntities** - LangExtract entity extraction (2 retries)
5. **processExtraction** - Quality metric calculation
6. **updateGraph** - Graph state broadcasting
7. **generateReport** - Final report generation

**Future Nodes** (Phases 2-5):

- **analyzeFields** - Detect entity-worthy fields (Phase 2)
- **createRelatedEntities** - Auto-create related entities (Phase 3)
- **createRelationships** - Link with evidence backing (Phase 4)

## Research Depth

- `basic`: Required fields only (default)
- `detailed`: Required + common optional fields
- `comprehensive`: All available fields

## Testing

```bash
cd packages/proto-llm-tools
pnpm test entity-research-playground
```

## Architecture

- **State**: 9 grouped annotations (Phase 1: evidence added, Phases 2-5: fieldAnalysis, relatedEntities, relationships planned)
- **Philosophy**: Evidence → Entities → Relationships (evidence-first design)
- **Retry Policies**: Wikipedia (3x), LangExtract (2x)
- **Execution**: Linear workflow, ~2.1s typical duration
- **Fallbacks**: Minimal entity on extraction failure
- **LangExtract Format**: Wikipedia content wrapped in array `[content]`

## Evidence-First Design (Phase 1 Complete)

Every extraction now creates an Evidence node for the Wikipedia source:

```typescript
{
  uid: "evidence:wikipedia_albert_einstein_2025-10-22",
  kind: "major_media",
  title: "Albert Einstein - Wikipedia Article",
  publisher: "Wikipedia",
  date: "2025-10-22",
  url: "https://en.wikipedia.org/wiki/Albert_Einstein",
  reliability: 0.85
}
```

**Benefits**:

- Provenance tracking from day one
- Know where every entity came from
- Confidence scoring with evidence reliability
- Audit trail for data freshness

**Next**: Phases 2-5 will add auto-entity creation and relationships. See design doc for details.
