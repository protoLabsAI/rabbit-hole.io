# Migration Validation

Automated validation for PostgreSQL migration scripts.

## Quick Start

```bash
pnpm run lint:migrations
```

## What Gets Validated

### 1. Shell Script Syntax (ShellCheck)
- Syntax errors
- Undefined variables
- Quoting issues
- Best practices

### 2. SQL Syntax Patterns
- **RAISE outside DO blocks** (most common error)
- Unmatched dollar quotes
- Missing semicolons
- Unquoted COMMENT statements

## Common Fix: RAISE Statement Error

**Error:**
```
ERROR:  syntax error at or near "RAISE"
```

**Cause:** `RAISE NOTICE` must be inside a PL/pgSQL block.

**Fix:**
```sql
-- ❌ Wrong
RAISE NOTICE 'Migration complete';

-- ✅ Correct
DO $$
BEGIN
    RAISE NOTICE 'Migration complete';
END $$;
```

## Local Testing

Run before pushing migrations:

```bash
pnpm run lint:migrations
```

## Installation (Optional)

For faster local validation:

```bash
brew install shellcheck
```

Otherwise uses Docker automatically.

## Files

- `scripts/validate-migrations.sh` - Validation script
- `migrations/postgresql/017_sidequest_migrations.sh` - Fixed migration

## Notes

- Warnings (semicolons) don't fail validation
- Local-only tool (no CI/pre-commit hooks)
- Uses Docker fallback if shellcheck not installed

