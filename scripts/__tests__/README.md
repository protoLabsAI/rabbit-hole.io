# Domain Scanner Tests

Comprehensive test suite for RAB-15 (Auto-Discovery) and RAB-16 (TypeScript Generation).

## Test Files

### `scan-domains.test.ts`

Unit tests for domain scanner functionality:

- **Domain Discovery** - Finding and validating domain.config.json files
- **Validation** - JSON schema validation and error handling
- **TypeScript Generation** - Zod schema generation for all property types
- **Registry Generation** - Synchronous registration function
- **Error Handling** - Clear error messages and exit codes

**Coverage:**

- 15 test cases
- All property types (string, number, boolean, date, array, object, enum)
- Validation rules (min, max, required, pattern, etc.)
- Multi-domain discovery
- Error scenarios

### `integration.test.ts`

End-to-end integration tests:

- **Full Flow** - JSON → TypeScript → Registration
- **Complex Domains** - All property types in single domain
- **TypeScript Compilation** - Verifies generated code compiles
- **Validator Functionality** - Tests UID validation logic
- **Zod Schema Validation** - Runtime type checking

**Coverage:**

- 5 integration test cases
- Real file I/O operations
- Scanner execution
- Generated code imports
- Runtime validation

## Test Fixtures

Located in `fixtures/`:

- `minimal-domain.json` - Minimal valid domain
- `complete-domain.json` - Domain with all optional fields
- `invalid-missing-displayname.json` - Missing required field
- `invalid-color.json` - Invalid hex color format

## Running Tests

```bash
# Run all scanner tests
pnpm test scripts/__tests__/scan-domains.test.ts

# Run integration tests
pnpm test scripts/__tests__/integration.test.ts

# Run all script tests
pnpm test scripts/

# Watch mode
pnpm test scripts/ --watch
```

## Test Environment

Tests use Node environment with:

- File system operations
- Child process execution (execSync)
- Dynamic imports for generated files
- Temporary test directories (auto-cleaned)

## Known Issues

Tests create temporary directories:

- `custom-domains/__test__/` - Unit tests
- `custom-domains/__integration_test__/` - Integration tests

These are automatically cleaned up before/after each test.

## Coverage Areas

### Property Type Generation

- ✅ String (with minLength, maxLength, pattern)
- ✅ Number (with min, max, integer, positive)
- ✅ Boolean
- ✅ Date (YYYY-MM-DD and ISO8601 formats)
- ✅ Array (string[], number[], enum arrays)
- ✅ Object (records with typed values)
- ✅ Enum (with multiple values)

### Validation Rules

- ✅ Required vs optional fields
- ✅ Min/max constraints
- ✅ Regex patterns
- ✅ Hex color validation
- ✅ UID prefix validation

### Scanner Features

- ✅ Recursive directory scanning
- ✅ Multi-domain discovery
- ✅ Empty domain handling
- ✅ Synchronous registration
- ✅ Error messages with file paths
- ✅ Exit code 1 on validation failure

## Debugging Tests

If tests fail, check:

1. Vitest config includes `scripts/**/*.test.ts`
2. Generated files in `.generated/custom-domains/`
3. Test directories cleaned up properly
4. Scanner script is executable: `tsx scripts/scan-domains.ts`

## Future Improvements

- Add snapshot testing for generated TypeScript
- Test watch mode integration (RAB-17)
- Test CLI tool integration (RAB-19)
- Add performance benchmarks
- Test error recovery scenarios
