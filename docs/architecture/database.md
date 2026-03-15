# Database & Schema

Neo4j graph database schema, entity model, and indexing strategy.

## Entity Model

All entities carry the `:Entity` superlabel plus a type-specific label:

```
(:Entity:Person { uid, name, aliases[], tags[], clerk_org_id, ... })
(:Entity:Organization { uid, name, aliases[], tags[], clerk_org_id, ... })
(:Entity:Technology { uid, name, aliases[], tags[], clerk_org_id, ... })
```

### Core Properties (all entities)

| Property | Type | Description |
|----------|------|-------------|
| `uid` | string | Unique identifier, format: `{type}:{snake_case_name}` |
| `name` | string | Display name |
| `aliases` | string[] | Alternative names (indexed for search) |
| `tags` | string[] | Categorization tags (indexed for search) |
| `clerk_org_id` | string | Tenant isolation — `'public'` or org ID |

### Entity Types

Defined in `custom-domains/` and registered via `EntitySchemaRegistry`:

| Category | Types |
|----------|-------|
| Social | Person, Organization, Movement, Group |
| Technology | Software, Platform, Technology, Framework |
| Geographic | Country, Region, City, Ecosystem |
| Academic | Research, Publication, University |
| Economic | Company, Industry, Market, Product |
| Biological | Animal, Species, Microorganism |
| Astronomical | Planet, Star, Galaxy |
| Cultural | Art, Music, Film, Literature |

### Relationship Types

Core relationships carry properties like `confidence`, `at` (timestamp), and domain-specific fields:

| Relationship | Properties |
|-------------|------------|
| `SPEECH_ACT` | sentiment, confidence, category, intensity, narrative, tone |
| `FUNDS` | amount, currency, purpose, confidence |
| `ATTACKS` | category, intensity, confidence |
| `PLATFORMS` | editorialControl, confidence |
| `AUTHORED`, `FOUNDED`, `WORKS_AT`, `PART_OF` | confidence |

## Indexes

### Full-Text (Lucene)

| Index | Labels | Properties | Analyzer |
|-------|--------|-----------|----------|
| `idx_entity_name_fulltext` | Entity | name, aliases, tags | standard-no-stop-words |

Domain-specific full-text indexes exist for scientific names, geographic names, and astronomical objects (see migration 004).

### Property Indexes

Key property indexes from migrations 002-005:

- `Entity.name`, `Entity.uid` — fast lookup by name or UID
- `Content.content_type`, `Content.platform_uid` — content filtering
- `Evidence.kind`, `Evidence.publisher`, `Evidence.reliability` — evidence queries
- Relationship temporal indexes (`SPEECH_ACT.at`, `FUNDS.at`, `ATTACKS.at`) — time-range queries

## Migration System

Migrations are numbered Cypher files in `migrations/`:

```
migrations/
├── 002_relationship_indexes.cypher
├── 003_time_navigation_indexes.cypher
├── 004_extended_entity_indexes.cypher
├── 005_extended_relationship_indexes.cypher
└── 006_fulltext_entity_index.cypher
```

All use `IF NOT EXISTS` — safe to re-run. See [operations/migrations.md](../operations/migrations.md) for how to apply them.

## Tenant Isolation

Every entity is scoped to a tenant via `clerk_org_id`:

```cypher
WHERE (e.clerk_org_id = 'public' OR e.clerk_org_id = $orgId)
```

- `'public'` — visible to all users (Wikipedia seed data, community contributions)
- Org-specific — visible only to members of that Clerk organization
