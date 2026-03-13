# Domain Management Scripts

This directory contains scripts for managing domain configurations in the Rabbit Hole system.

## Available Scripts

### Domain Creation

#### `create-domain.ts`
Interactive CLI tool for creating new domain configurations from templates.

```bash
pnpm run create:domain
```

**Features:**
- Choose from 6 pre-built templates (minimal, complete, multi-entity, retail, healthcare, education)
- Interactive prompts for domain configuration
- Automatic validation and TypeScript generation
- Creates domain in `custom-domains/` directory

**Usage:**
```bash
$ pnpm run create:domain

🚀 Domain Generator - Create Custom Domains from Templates

Available templates:
  minimal      - Minimal domain with single entity
  complete     - Complete example with all property types
  multiEntity  - Domain with 2 entities and relationships
  retail       - Ready-to-use retail/e-commerce domain
  healthcare   - Ready-to-use healthcare domain
  education    - Ready-to-use education domain

Select template: retail
Domain name (snake_case): my_store
Display name: My Store
...
```

### Domain Validation

#### `validate-domains.ts`
Validates domain configurations for correctness and schema compliance.

```bash
pnpm run validate:domains
```

**Validation Checks:**
- ✅ JSON schema validation
- ✅ Required field checks
- ✅ Format validation (naming conventions, colors, regex patterns)
- ✅ Circular dependency detection
- ✅ Duplicate UID prefix detection
- ✅ Entity/property naming conventions
- ✅ Best practice recommendations

**Example Output:**
```bash
$ pnpm run validate:domains

🔍 Validating domain configurations...

✅ custom-domains/automotive/domain.config.json - Valid
❌ custom-domains/retail/domain.config.json - Invalid
   - Invalid color: #ZZZZZZ (must be valid hex)
   - Entity "Product" missing uidPrefix
   💡 Use 6-digit hex format, e.g., "#DC2626" or "#3B82F6"

1/2 domains valid
❌ 2 error(s) found
```

**Exit Codes:**
- `0`: All domains valid
- `1`: Validation errors found

### Domain Linting

#### `lint-domains.ts`
Lints domain configurations for best practices and code quality.

```bash
pnpm run lint:domains
```

**Linting Rules:**

**Naming Conventions:**
- Domain names use `snake_case`
- Entity types use `PascalCase` with underscores
- Property names use `snake_case`
- UID prefixes match entity types

**Format Standards:**
- Hex colors use consistent case
- Icons are single emoji
- Descriptions have proper punctuation
- Version follows semantic versioning

**Best Practices:**
- String properties have `maxLength`
- Number properties have `min`/`max` constraints
- Enums have at least 2 values
- Entities have `displayName` and descriptions
- Metadata fields are present (version, author, tags)

**Common Mistakes:**
- Reserved property names (`type`, `name`, `id`)
- Pure white/black colors
- Missing property descriptions
- Overly large domains (>20 entities)

**Example Output:**
```bash
$ pnpm run lint:domains

🔍 Linting domain configurations...

✅ custom-domains/automotive/domain.config.json - No issues
⚠️  custom-domains/retail/domain.config.json - 3 warning(s), 2 info
   ⚠️  [property-naming] Property "camelCase" uses camelCase. Use snake_case.
      💡 Rename to "camel_case"
      🔧 Auto-fixable
   ℹ️  [metadata-completeness] Domain missing version field
      💡 Add version field for tracking changes (e.g., "1.0.0")

📊 Lint Summary:
   Files: 2
   Issues: 5
   ⚠️  Warnings: 3
   ℹ️  Info: 2
```

**Exit Codes:**
- `0`: No errors (warnings/info allowed)
- `1`: Linting errors found

### Domain Scanning

#### `scan-domains.ts`
Auto-discovers domain configurations and generates TypeScript.

```bash
pnpm run scan:domains
```

**Features:**
- Discovers all `domain.config.json` files in `custom-domains/`
- Validates each domain configuration
- Generates TypeScript domain configs with Zod schemas
- Creates registry for automatic domain registration
- Runs automatically on `build` and `dev`

**Generated Files:**
- `.generated/custom-domains/{domain_name}.ts` - TypeScript domain config
- `.generated/custom-domains/registry.ts` - Domain registry

**Example Output:**
```bash
$ pnpm run scan:domains

🔍 Scanning for domain configurations...

✅ custom-domains/automotive/domain.config.json
✅ custom-domains/retail/domain.config.json

📊 Found 2 valid domain(s)

🔨 Generating TypeScript domain configs...

   ├─ Generated: automotive.ts
   ├─ Generated: retail.ts

✅ Generated: registry.ts
```

## Integration with Build Process

Domain validation is integrated into the build pipeline:

### Pre-build Hook
```json
{
  "prebuild": "pnpm run scan:domains",
  "predev": "pnpm run scan:domains"
}
```

The scanner automatically runs before:
- `pnpm run build` - Production build
- `pnpm run dev` - Development server

### CI/CD Integration

GitHub Actions workflow validates domains on:
- Push to `custom-domains/**/*.json`
- Pull requests modifying domain files

**Workflow:** `.github/workflows/domain-validation.yml`

```yaml
- name: Validate domain configurations
  run: pnpm run validate:domains

- name: Lint domain configurations
  run: pnpm run lint:domains

- name: Scan and generate TypeScript
  run: pnpm run scan:domains
```

## Testing

### Test Suites

#### `__tests__/validate-domains.test.ts`
Unit tests for validation rules:
- Schema validation
- Format validation
- Semantic validation
- Error message quality

#### `__tests__/lint-domains.test.ts`
Unit tests for linting rules:
- Naming conventions
- Color consistency
- Description quality
- Property validation
- Common mistakes

#### `__tests__/scan-domains.test.ts`
Integration tests for domain scanning:
- Domain discovery
- TypeScript generation
- Registry generation
- Error handling

### Test Fixtures

**Valid Fixtures:**
- `fixtures/valid-minimal.json` - Minimal valid domain
- `fixtures/valid-complete.json` - Complete domain with all features

**Invalid Fixtures:**
- `fixtures/invalid-missing-displayname.json` - Missing required field
- `fixtures/invalid-bad-color.json` - Invalid hex color
- `fixtures/invalid-entity-naming.json` - Incorrect naming conventions
- `fixtures/invalid-circular-dependency.json` - Circular dependency

**Warning Fixtures:**
- `fixtures/warning-large-domain.json` - Too many entities

### Running Tests

```bash
# All tests
pnpm test scripts/__tests__/

# Specific test file
pnpm test scripts/__tests__/validate-domains.test.ts

# Watch mode
pnpm test scripts/ --watch

# Coverage
pnpm test:coverage scripts/__tests__/
```

## Best Practices

### When to Validate

1. **Before committing:** Run `pnpm run validate:domains`
2. **After creating:** Use `pnpm run create:domain` (validates automatically)
3. **During development:** `pnpm run dev` validates on start
4. **In CI/CD:** Automatic validation on push/PR

### When to Lint

1. **During development:** Fix linting issues as you go
2. **Before PR:** Run `pnpm run lint:domains`
3. **For quality:** Regular linting improves consistency

### Writing Custom Domains

1. Start with a template: `pnpm run create:domain`
2. Customize entities and properties
3. Validate: `pnpm run validate:domains`
4. Lint: `pnpm run lint:domains`
5. Scan: `pnpm run scan:domains` (or just run `pnpm run dev`)

## Troubleshooting

### Validation Fails

**Problem:** `Invalid hex color: #ZZZZZZ`
- **Solution:** Use valid 6-digit hex color (e.g., `#DC2626`)

**Problem:** `Entity type "lowercase_entity" must start with uppercase`
- **Solution:** Use PascalCase (e.g., `Lowercase_Entity`)

**Problem:** `Circular dependency detected: A → B → A`
- **Solution:** Remove `extendsFrom` or restructure inheritance

### Linting Warnings

**Problem:** `Property "camelCase" uses camelCase`
- **Solution:** Rename to `snake_case` (e.g., `camel_case`)

**Problem:** `Domain missing version field`
- **Solution:** Add `"version": "1.0.0"` to domain config

**Problem:** `String property has no maxLength`
- **Solution:** Add `"maxLength"` constraint for validation

### Scanner Issues

**Problem:** `No domain configurations found`
- **Solution:** Ensure `domain.config.json` exists in `custom-domains/*/`

**Problem:** `Failed to parse JSON`
- **Solution:** Validate JSON syntax at https://jsonlint.com/

## Resources

- **JSON Schema:** `custom-domains/schema.json`
- **Templates:** `custom-domains/_templates/`
- **Documentation:** `docs/developer/domain-system/`
- **Examples:** `custom-domains/automotive/`

## Related Tasks

- **RAB-14:** JSON Domain Schema Specification
- **RAB-15:** Auto-Discovery Domain Scanner
- **RAB-16:** Build-time TypeScript Generation
- **RAB-18:** JSON Domain Templates
- **RAB-20:** Domain Validation and Linting Tooling
