# Custom Domains

Define custom entity domains using JSON configuration with automatic TypeScript generation.

## Quick Start

**Create a domain in 5 minutes:**

```bash
pnpm run create:domain
```

Or manually:

```json
// custom-domains/my_domain/domain.config.json
{
  "name": "my_domain",
  "displayName": "My Domain",
  "description": "My custom domain.",
  "entities": {
    "MyEntity": {
      "uidPrefix": "my_entity",
      "properties": {
        "field": { "type": "string" }
      }
    }
  },
  "ui": {
    "color": "#3B82F6",
    "icon": "⭐"
  }
}
```

Then run: `pnpm run scan:domains`

## Directory Structure

```
custom-domains/
  automotive/              # Example domain
    domain.config.json     # ← Source of truth (JSON)
    card.config.ts         # UI configuration (optional)
    index.ts               # Exports

  _templates/              # Ready-to-use templates
    minimal.domain.json
    complete.domain.json
    retail.domain.json
    healthcare.domain.json
    education.domain.json
    multi-entity.domain.json
    README.md

  schema.json              # JSON Schema specification
```

## How It Works

```
1. Write JSON          → domain.config.json
2. Validate            → pnpm run validate:domains
3. Generate TypeScript → pnpm run scan:domains
4. Auto-register       → Domains available in app
```

### Generated Files

```
.generated/custom-domains/
  automotive.ts          # Auto-generated TypeScript
  registry.ts            # Auto-registration
```

**Never edit generated files** - they regenerate on every build.

## Creating Domains

### Option 1: CLI Tool (Recommended)

```bash
pnpm run create:domain
```

Interactive prompts guide you through:

- Choose template
- Enter domain details
- Configure entities
- Auto-validates and generates

### Option 2: Use Template

```bash
# Copy template
cp custom-domains/_templates/minimal.domain.json custom-domains/my_domain/domain.config.json

# Edit and run scanner
pnpm run scan:domains
```

### Option 3: Manual JSON

1. Create `custom-domains/YOUR_DOMAIN/domain.config.json`
2. Define entities and properties
3. Run `pnpm run validate:domains`
4. Run `pnpm run scan:domains`

## Domain Configuration

### Required Fields

```json
{
  "name": "domain_name", // snake_case identifier
  "displayName": "Display Name", // Human-readable
  "description": "Description.", // Full description
  "entities": {
    /* ... */
  }, // At least one entity
  "ui": {
    "color": "#RRGGBB", // Hex color
    "icon": "🎯" // Single emoji
  }
}
```

### Optional Fields

```json
{
  "version": "1.0.0", // Semantic version
  "author": "Author Name", // Creator
  "tags": ["tag1", "tag2"], // Searchable tags
  "extendsFrom": "parent_domain", // Inheritance
  "relationships": ["REL_TYPE"] // Valid relationships
}
```

## Entity Definition

```json
{
  "entities": {
    "EntityName": {
      // PascalCase with underscores
      "uidPrefix": "entity_name", // snake_case
      "displayName": "Entity Name", // Human-readable (optional)
      "properties": {
        "field_name": {
          // snake_case
          "type": "string", // Property type
          "required": false, // Optional field
          "description": "Field info" // Documentation
        }
      }
    }
  }
}
```

## Property Types

| Type      | Validation                    | Example                                                          |
| --------- | ----------------------------- | ---------------------------------------------------------------- |
| `string`  | minLength, maxLength, pattern | `"name": { "type": "string", "maxLength": 100 }`                 |
| `number`  | min, max, integer             | `"age": { "type": "number", "min": 0, "integer": true }`         |
| `boolean` | none                          | `"active": { "type": "boolean" }`                                |
| `date`    | format                        | `"created": { "type": "date", "format": "ISO8601" }`             |
| `enum`    | values                        | `"status": { "type": "enum", "values": ["active", "inactive"] }` |
| `array`   | items, minItems, maxItems     | `"tags": { "type": "array", "items": "string" }`                 |
| `object`  | valueType                     | `"meta": { "type": "object", "valueType": "any" }`               |

Full reference: [docs/developer/json-domain-config.md](../docs/developer/json-domain-config.md)

## Validation & Linting

```bash
# Validate correctness
pnpm run validate:domains

# Check best practices
pnpm run lint:domains
```

**Validation checks:**

- Required fields present
- Valid formats (colors, names, patterns)
- No circular dependencies
- Unique UID prefixes

**Linting checks:**

- Naming conventions
- Description quality
- Property validation completeness
- Metadata presence

## Card Configuration

Add UI card rendering (optional):

```typescript
// custom-domains/my_domain/card.config.ts
import { createCardConfig } from "@protolabsai/types";

export const myDomainCardConfig = createCardConfig()
  .useDefaultComponent()
  .section({ id: "info", title: "Information", order: 1 })
  .fields([
    { property: "field", label: "Field", type: "text", section: "info" },
  ])
  .build();
```

Reference in TypeScript index:

```typescript
// custom-domains/my_domain/index.ts
export { myDomainDomainConfig } from "../../.generated/custom-domains/my_domain";
export * from "./card.config";
```

## Examples

### Minimal Domain

```json
{
  "name": "simple",
  "displayName": "Simple",
  "description": "Minimal domain example.",
  "entities": {
    "Item": {
      "uidPrefix": "item"
    }
  },
  "ui": {
    "color": "#3B82F6",
    "icon": "📦"
  }
}
```

### Complete Domain

See: [\_templates/complete.domain.json](./_templates/complete.domain.json)

### Industry Templates

- [retail.domain.json](./_templates/retail.domain.json) - E-commerce
- [healthcare.domain.json](./_templates/healthcare.domain.json) - Medical
- [education.domain.json](./_templates/education.domain.json) - Academic

## Build Integration

Domains auto-scan on:

- `pnpm run build` (prebuild hook)
- `pnpm run dev` (predev hook)

Manual scan:

```bash
pnpm run scan:domains
```

## Troubleshooting

### Domain Not Registered

1. Check scanner ran: `pnpm run scan:domains`
2. Verify file: `.generated/custom-domains/registry.ts`
3. Restart dev server

### Validation Errors

```bash
❌ custom-domains/my_domain/domain.config.json - Invalid
   - Invalid color: #ZZZ
   💡 Use 6-digit hex format, e.g., "#DC2626"
```

Fix errors and re-run `pnpm run validate:domains`

### TypeScript Errors

```bash
pnpm run type-check:app
```

Check generated TypeScript: `.generated/custom-domains/my_domain.ts`

## Documentation

- **Quick Start:** [docs/developer/domain-quick-start.md](../docs/developer/domain-quick-start.md)
- **JSON Reference:** [docs/developer/json-domain-config.md](../docs/developer/json-domain-config.md)
- **Auto-Discovery:** [docs/developer/domain-auto-discovery.md](../docs/developer/domain-auto-discovery.md)
- **Migration Guide:** [docs/developer/domain-migration-guide.md](../docs/developer/domain-migration-guide.md)
- **CLI Tools:** [scripts/README.md](../scripts/README.md)
- **Templates:** [\_templates/README.md](./_templates/README.md)

## Reference

### Commands

```bash
pnpm run create:domain     # Create new domain (interactive)
pnpm run validate:domains  # Validate all domains
pnpm run lint:domains      # Check best practices
pnpm run scan:domains      # Generate TypeScript
```

### Schema

JSON Schema: [schema.json](./schema.json)  
Schema URL: `https://rabbit-hole.io/schemas/domain-v1.json`

### Migration from TypeScript

See: [docs/developer/domain-migration-guide.md](../docs/developer/domain-migration-guide.md)

Example: Automotive domain converted in RAB-21

---

**Get started:** `pnpm run create:domain`
