# Core Tools Playground

Interactive playground for testing the three fundamental entity extraction tools from `@proto/llm-tools`.

## Overview

This playground provides a hands-on interface to test and explore the core entity extraction tools:
- **🔍 Discover Entities** - Domain-aware entity discovery
- **✨ Enrich Entity** - Schema-based entity enrichment
- **🔗 Extract Relationships** - Relationship extraction between entities

## Features

### 1. Entity Discovery Tab
- Input text content
- Configure domains (social, academic, geographic, etc.)
- Set maximum entity limit
- View discovered entities with confidence scores
- Export entities for relationship extraction

### 2. Entity Enrichment Tab
- Specify entity name and type
- Define fields to extract (comma-separated)
- Provide content containing entity information
- View extracted fields with values
- Schema-based extraction

### 3. Relationship Extraction Tab
- Load entities from discovery or add manually
- Extract relationships between entities
- View relationship types, confidence, and properties
- Domain-aware relationship types

## Usage

### Access the Playground

1. Navigate to `/playground`
2. Select "Core Tools" from the Data Extraction category
3. Choose a tab to test a specific tool

### Example Workflow

**Step 1: Discover Entities**
```
Input Text: "Albert Einstein was born in Germany and worked at Princeton University..."
Domains: social, academic, geographic
Max Entities: 25

Output: Person:albert_einstein, Location:germany, Organization:princeton_university
```

**Step 2: Enrich Entity**
```
Entity Name: Albert Einstein
Entity Type: Person
Fields: birthPlace, occupation, education
Content: [same text from step 1]

Output: { birthPlace: "Germany", occupation: "theoretical physicist", ... }
```

**Step 3: Extract Relationships**
```
Entities: [loaded from Step 1]
Content: [same text]

Output: 
- Albert Einstein -[BORN_IN]-> Germany
- Albert Einstein -[WORKED_AT]-> Princeton University
```

## Tool Integration

The playground uses the tools directly:

```typescript
import {
  discoverEntitiesTool,
  enrichEntityTool,
  extractRelationshipsTool,
} from "@proto/llm-tools";

// Discovery
const discovery = await discoverEntitiesTool.invoke({
  content: text,
  domains: ["social", "academic"],
  maxEntities: 25,
});

// Enrichment
const enrichment = await enrichEntityTool.invoke({
  entityName: "Tesla Inc.",
  entityType: "Organization",
  content: text,
  schema: { description: "string", founded: "number" },
});

// Relationships
const relationships = await extractRelationshipsTool.invoke({
  content: text,
  entities: discovery.entities,
  domains: ["social", "academic"],
});
```

## Available Domains

- **social**: People, organizations, groups
- **academic**: Publications, research, concepts
- **geographic**: Locations, regions, places
- **medical**: Conditions, treatments, procedures
- **technology**: Tech companies, products, software
- **economic**: Financial entities, markets
- **cultural**: Art, cultural movements, traditions
- **political**: Political entities, governments, policies

## Tips

### Discover
- Start with 2-3 domains for best results
- Use maxEntities to control output size
- Confidence threshold filters low-quality entities

### Enrich
- Provide descriptive field names
- Content should contain information about the entity
- Schema mode provides stricter typing

### Relationships
- Requires at least 2 entities
- Focus entity strategy for large entity sets
- Domain-aware relationship types ensure valid relationships

## Sample Data

The playground includes sample text for each tool:

**Discovery Sample:**
Historical text about Albert Einstein, Princeton University, and collaborations

**Enrichment Sample:**
Business description of Tesla Inc. with founding details

**Relationships Sample:**
Text describing Einstein's relationships with institutions and colleagues

## Integration

Registered in playground hub:

```typescript
{
  id: "core-tools",
  name: "Core Tools",
  description: "Test core entity extraction tools",
  category: "data-extraction",
  icon: "wrench",
  tags: ["tools", "entities", "relationships", "extraction", "core"],
}
```

## Related

- **LangExtract Playground**: Lower-level extraction service testing
- **Entity Research Playground**: Complete research workflows
- **Interactive Extraction**: Multi-phase extraction with review







