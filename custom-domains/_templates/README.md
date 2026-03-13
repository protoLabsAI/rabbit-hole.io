# Domain Templates

Ready-to-use JSON templates for creating custom domains quickly.

## Quick Start

### Option 1: CLI Tool (Recommended)

```bash
pnpm run create:domain
```

Interactive wizard guides you through:
1. Select template
2. Enter domain details
3. Configure entities
4. Auto-generate domain.config.json
5. Auto-run scanner

### Option 2: Manual Copy

1. Copy template file
2. Replace `{{PLACEHOLDERS}}` with your values
3. Save to `custom-domains/YOUR_DOMAIN/domain.config.json`
4. Run `pnpm run scan:domains`

## Available Templates

### minimal.domain.json

**Use when:** You need simple entity categorization without custom properties

**Contains:**
- Single entity with no properties
- Basic UI configuration
- Minimal setup

**Time to customize:** 2 minutes

**Example use cases:**
- Simple tagging systems
- Basic categorization
- Proof of concept

### complete.domain.json

**Use when:** You want to see all available features or need complex validation

**Contains:**
- All 7 property types (string, number, boolean, date, array, object, enum)
- All validation rules demonstrated
- Entity-specific UI customization
- Full metadata
- Relationships

**Time to customize:** 10-15 minutes

**Example use cases:**
- Reference for other domains
- Learning the schema
- Complex business entities

### multi-entity.domain.json

**Use when:** Your domain has multiple related entity types

**Contains:**
- 2 entities with basic properties
- Relationships between entities
- Shared UI theme
- Entity-specific icons

**Time to customize:** 5-8 minutes

**Example use cases:**
- Business domains (Company + Employee)
- Content systems (Article + Author)
- Project management (Project + Task)

### retail.domain.json

**Use when:** Building e-commerce or retail applications

**Contains:**
- Product (with SKU, price, rating)
- Category (with hierarchy)
- Brand (with origin info)
- E-commerce relationships

**Time to customize:** 2-3 minutes (ready to use)

**Example use cases:**
- Online stores
- Inventory systems
- Product catalogs

### healthcare.domain.json

**Use when:** Building medical or healthcare applications

**Contains:**
- Patient (with medical info)
- Provider (with specialty)
- Facility (with services)
- Medical relationships

**Time to customize:** 2-3 minutes (ready to use)

**Example use cases:**
- Medical records
- Hospital management
- Patient care systems

### education.domain.json

**Use when:** Building educational or academic applications

**Contains:**
- Student (with enrollment info)
- Course (with prerequisites)
- Instructor (with research areas)
- Academic relationships

**Time to customize:** 2-3 minutes (ready to use)

**Example use cases:**
- Learning management systems
- Academic tracking
- Course catalogs

## Placeholder Reference

All templates use `{{PLACEHOLDER}}` syntax:

### Required Placeholders

- `{{DOMAIN_NAME}}` - snake_case domain identifier (e.g., retail_store)
- `{{DOMAIN_DISPLAY_NAME}}` - Human-readable name (e.g., Retail Store)
- `{{DOMAIN_DESCRIPTION}}` - Domain description
- `{{DOMAIN_COLOR}}` - Hex color (e.g., #F59E0B)
- `{{DOMAIN_ICON}}` - Emoji icon (e.g., 🛒)

### Entity Placeholders (template-dependent)

**Minimal/Complete:**
- `{{ENTITY_NAME}}` - PascalCase entity type (e.g., Product)
- `{{ENTITY_PREFIX}}` - snake_case UID prefix (e.g., product)
- `{{ENTITY_DISPLAY_NAME}}` - Display name (e.g., Product)
- `{{ENTITY_ICON}}` - Entity emoji (e.g., 📦)
- `{{ENTITY_COLOR}}` - Entity hex color (optional)

**Multi-Entity:**
- `{{ENTITY_1_NAME}}`, `{{ENTITY_1_PREFIX}}`, `{{ENTITY_1_DISPLAY_NAME}}`, `{{ENTITY_1_ICON}}`
- `{{ENTITY_2_NAME}}`, `{{ENTITY_2_PREFIX}}`, `{{ENTITY_2_DISPLAY_NAME}}`, `{{ENTITY_2_ICON}}`

**Industry Templates:**
- No placeholders (ready to use as-is or customize)

### Optional Placeholders

- `{{AUTHOR}}` - Author name

## Customization Guide

### After Generation

1. **Add More Entities:** Copy entity structure and add new entries
2. **Add Properties:** Add fields to `properties` object
3. **Add Relationships:** Add relationship types to `relationships` array
4. **Customize UI:** Update colors and icons per entity

### Property Types Reference

```json
{
  "properties": {
    "text": { "type": "string", "required": false },
    "count": { "type": "number", "required": false, "integer": true },
    "active": { "type": "boolean", "required": false },
    "date": { "type": "date", "required": false, "format": "YYYY-MM-DD" },
    "status": { "type": "enum", "required": false, "values": ["active", "inactive"] },
    "tags": { "type": "array", "required": false, "items": "string" },
    "metadata": { "type": "object", "required": false, "valueType": "any" }
  }
}
```

See `docs/developer/json-domain-config.md` for complete property reference.

## Validation

After creating your domain:

```bash
# Validate and generate TypeScript
pnpm run scan:domains

# Should output:
# ✅ custom-domains/YOUR_DOMAIN/domain.config.json
# 📊 Found N valid domain(s)
# ✅ Generated: YOUR_DOMAIN.ts
# ✅ Generated: registry.ts
```

## Examples

### Example 1: Simple Retail Domain

```bash
pnpm run create:domain

# Select template: retail
# Domain name: my_retail
# Display name: My Retail Store
# Description: Online retail store domain
# Color: #F59E0B
# Icon: 🛒

# ✅ Created: custom-domains/my_retail/domain.config.json
```

### Example 2: Custom Domain from Minimal

```bash
pnpm run create:domain

# Select template: minimal
# Domain name: gaming
# Display name: Gaming
# Description: Video game industry domain
# Color: #8B5CF6
# Icon: 🎮
# Entity name: Game
# Entity prefix: game
# Entity icon: 🎯

# ✅ Created: custom-domains/gaming/domain.config.json
```

Then customize:
```json
{
  "entities": {
    "Game": {
      "uidPrefix": "game",
      "properties": {
        "platform": {
          "type": "enum",
          "values": ["PC", "PlayStation", "Xbox", "Switch"],
          "required": false
        },
        "release_year": {
          "type": "number",
          "integer": true,
          "min": 1970,
          "max": 2100,
          "required": false
        }
      }
    }
  }
}
```

## Troubleshooting

### Template validation fails

```bash
pnpm run scan:domains
```

Check error message for specific validation issues.

### Missing placeholders

If CLI skips a field, manually edit the generated JSON and replace `{{PLACEHOLDER}}` values.

### Domain already exists

CLI will prompt before overwriting. Choose 'n' to cancel and pick a different name.

## Template Development

To create new templates:

1. Create JSON file in `custom-domains/_templates/`
2. Use `{{PLACEHOLDER}}` syntax for variable parts
3. Validate template works:
   ```bash
   cp custom-domains/_templates/YOUR_TEMPLATE.json custom-domains/test/domain.config.json
   # Replace placeholders manually
   pnpm run scan:domains
   ```
4. Add to `scripts/create-domain.ts` TEMPLATES object
5. Update this README

## Related Documentation

- `docs/developer/json-domain-config.md` - Complete JSON schema reference
- `custom-domains/schema.json` - JSON Schema specification
- `custom-domains/automotive/domain.config.json` - Real-world example
- `handoffs/2025-10-16_RAB-18_JSON_DOMAIN_TEMPLATES.md` - Implementation details

## Next Steps

- RAB-19: Enhanced CLI with domain management features
- RAB-20: Validation and linting tools for domains

