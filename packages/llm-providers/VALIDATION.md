# Model Validation

Validate configured models against provider APIs with fuzzy matching suggestions.

## CLI Validation

```bash
cd packages/llm-providers
pnpm run validate-models
```

### Output Example

```
🔍 Validating LLM Provider Models...

📦 Validating openai...
✅ All models validated successfully

📦 Validating anthropic...
❌ Validation Errors:
  [anthropic/smart] Model "claude-3-sonnet-20240620" not found in anthropic available models
    → Did you mean "claude-3-5-sonnet-20240620"? (similarity: 95%)

📦 Validating google...
✅ All models validated successfully

📦 Validating groq...
✅ All models validated successfully

📦 Validating ollama...
⚠️  Warnings:
  [ollama] Could not fetch available models from provider API

============================================================
❌ Validation completed with errors

To fix:
1. Update packages/llm-providers/src/config/default-config.ts
2. Use suggested model names from errors above
3. Run 'pnpm run validate-models' again
```

## Programmatic Validation

```typescript
import { getProvider, validateProviderModels } from "@proto/llm-providers";

const provider = getProvider("openai");
const result = await validateProviderModels(provider, {
  smart: [{ name: "gpt-4o" }],
  fast: [{ name: "gpt-3.5-turbo" }],
});

if (!result.valid) {
  console.log("Errors found:");
  for (const error of result.errors) {
    console.log(`  ${error.message}`);
    if (error.suggestion) {
      console.log(`  → ${error.suggestion}`);
    }
  }
}
```

## Fuzzy Matching

The validator uses Levenshtein distance to find similar model names:

- **Similarity threshold**: 60% (configurable)
- **Max suggestions**: 1 (closest match)
- **Case insensitive**: Yes

### Examples

| Configured        | Actual                       | Similarity | Suggested?       |
| ----------------- | ---------------------------- | ---------- | ---------------- |
| `gpt-4o`          | `gpt-4o`                     | 100%       | ✅ Exact match   |
| `claude-3-sonnet` | `claude-3-5-sonnet-20240620` | 85%        | ✅ Yes           |
| `gemini-pro`      | `gemini-1.5-pro`             | 75%        | ✅ Yes           |
| `llama3`          | `llama-3.3-70b-versatile`    | 40%        | ❌ Too different |

## Playground Integration

The playground includes inline validation:

1. Select provider and category
2. Send a message to get current model name
3. Click "Validate" button next to model name
4. See validation result with suggestions

### Validation Display

**Valid Model**:

```
✅ Valid
```

**Invalid Model**:

```
❌ Invalid: claude-3-sonnet-20240620
   Suggestion: claude-3-5-sonnet-20240620 (95% match)
```

## API Endpoint

**POST** `/api/llm-playground/validate`

```typescript
{
  provider: "openai",
  configuredModels: {
    smart: [{ name: "gpt-4o" }]
  },
  apiKey?: "sk-..." // Optional for BYOK mode
  useHosted?: true   // Use server keys
}
```

**Response**:

```typescript
{
  valid: boolean,
  provider: string,
  results: [{
    category: "smart",
    model: "gpt-4o",
    valid: true,
    suggestion?: "gpt-4o-2024-05-13",
    similarity?: 85
  }],
  availableModels: [...]
}
```

## Use Cases

### Development

- Catch typos in configuration
- Detect deprecated models
- Find renamed models
- Verify API access

### Production

- Pre-deployment validation
- Configuration auditing
- Model catalog updates
- Breaking change detection

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Validate LLM Models
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
    GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
  run: |
    cd packages/llm-providers
    pnpm run validate-models
```

## Error Codes

- **Model Not Found**: Configured model doesn't exist in provider catalog
- **Provider Unavailable**: API key missing or provider unreachable
- **API Error**: Provider API returned error
- **No Matches**: No similar models found (distance too high)

## Best Practices

1. **Run before deployment**: Catch config errors early
2. **Update regularly**: Model catalogs change
3. **Check suggestions**: Fuzzy matches may not be perfect
4. **Use BYOK for testing**: Avoid server key requirements during dev
5. **Review warnings**: API failures may indicate connectivity issues

## Troubleshooting

### "API key not found"

Set environment variable for provider:

```bash
export OPENAI_API_KEY=sk-...
```

### "Could not fetch available models"

- Check network connectivity
- Verify API key is valid
- Check provider status page

### "No similar models found"

- Model may be completely deprecated
- Check provider documentation
- Browse available models in playground

## Related

- CLI Script: `packages/llm-providers/scripts/validate-models.ts`
- Validator: `packages/llm-providers/src/utils/model-validator.ts`
- API Route: `app/api/llm-playground/validate/route.ts`
- Playground: `/playground` → LLM Providers → Validate button
