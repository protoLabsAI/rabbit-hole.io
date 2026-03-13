# Testing Multi-Phase Extraction

Quick guide to testing the extraction workflow.

## Quick Start

```bash
cd packages/proto-llm-tools

# Test discover mode (quick, 1 API call)
pnpm exec tsx test.ts discover

# Test deep dive mode (with relationships)
pnpm exec tsx test.ts deep_dive

# Test all modes (waits 60s between modes)
pnpm exec tsx test.ts all
```

## Extraction Modes

### `discover` - Quick Entity Scan

- **Purpose**: Find all entities mentioned in text
- **Output**: Entity names grouped by type (person, organization, location, etc.)
- **API Calls**: 1
- **Time**: ~5s for 3000 chars
- **Use When**: Quick preview of what's in the text

```bash
pnpm exec tsx test.ts discover
```

### `structure` - Required Fields

- **Purpose**: Extract core entity data (uid, type, name)
- **Output**: Structured entities with required fields
- **API Calls**: 1 + N (where N = entity types found)
- **Time**: ~10-15s
- **Use When**: Need validated entity data

```bash
pnpm exec tsx test.ts structure
```

### `enrich` - Complete Profiles

- **Purpose**: Add optional fields (dates, descriptions, metadata)
- **Output**: Full entity profiles
- **API Calls**: 1 + N + M (M = entities)
- **Time**: ~20-30s
- **Use When**: Building comprehensive knowledge graph

```bash
pnpm exec tsx test.ts enrich
```

### `deep_dive` - Including Relationships

- **Purpose**: Full extraction with entity relationships
- **Output**: Entities + relationships with temporal data
- **API Calls**: 1 + N + M + 1
- **Time**: ~30-40s
- **Use When**: Need complete intelligence picture

```bash
pnpm exec tsx test.ts deep_dive
```

### `all` - Full Test Suite

- **Purpose**: Test all modes sequentially
- **Output**: Complete results for all 4 modes
- **API Calls**: Many (waits 60s between modes)
- **Time**: ~5 minutes total
- **Use When**: Comprehensive testing

```bash
pnpm exec tsx test.ts all
```

## Expected Output

### Discover Mode

```
✅ Phase 1 complete: Found 21 entities

📊 Discovered Entities: 21
   person: Albert Einstein, Einstein, Adolf Hitler, Franklin D. Roosevelt
   location: German Empire, Switzerland, Zurich, Berlin, United States
   organization: Swiss Patent Office, University of Zurich, Prussian Academy
```

### Structure Mode

```
🏗️  Structured Entities: 16
   person:albert_einstein: Albert Einstein (Person)
   org:university_of_zurich: University of Zurich (Organization)
   location:berlin: Berlin (Location)
```

### Enrich Mode

```
✨ Enriched Entities: 16
   person:albert_einstein:
      Name: Albert Einstein
      Type: Person
      Fields: 8
      Sample data:
        birth_date: 1879-03-14
        nationality: German
        occupation: theoretical physicist
```

### Deep Dive Mode

```
🔗 Relationships: 12
   person:albert_einstein → EMPLOYED_BY → org:university_of_zurich
      Period: 1912 to 1914
      Evidence: "Einstein worked at the University of Zurich from 1912..."
      Confidence: 92%

   person:albert_einstein → CONTRIBUTED_TO → research:theory_of_relativity
      Confidence: 95%
```

## Rate Limit Solutions

### Option 1: Wait Between Tests (Current)

The test automatically waits 60s between modes when using `all`:

```bash
pnpm exec tsx test.ts all
# Runs discover, waits 60s, runs structure, waits 60s, etc.
```

### Option 2: Use Ollama (No Rate Limits)

Ollama runs locally with no API limits.

**Setup**:

```bash
# Install Ollama
brew install ollama  # macOS
# or download from https://ollama.com

# Pull a model
ollama pull gemma2:2b

# Start Ollama (runs on localhost:11434)
ollama serve
```

**Configure LangExtract**:

Edit `services/langextract-service/.env`:

```env
# Switch from Gemini to Ollama
DEFAULT_MODEL=gemma2:2b
OLLAMA_BASE_URL=http://localhost:11434
```

Restart langextract-service:

```bash
cd services/langextract-service
python main.py
```

Now test without rate limits:

```bash
pnpm exec tsx test.ts all  # No waits needed!
```

### Option 3: Upgrade Gemini API

Gemini paid tier:

- **Requests**: 1000/minute (vs 10/minute free)
- **Cost**: Pay-per-token
- **Setup**: https://ai.google.dev/pricing

Update `services/langextract-service/.env`:

```env
GEMINI_API_KEY=your-paid-tier-key
```

### Option 4: Use OpenAI

OpenAI has higher rate limits on paid tier.

**Configure**:

```env
# In services/langextract-service/.env
DEFAULT_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

---

## Troubleshooting

### "Rate limit exceeded"

```
❌ LangExtract Error: 429 RESOURCE_EXHAUSTED
Quota exceeded for metric: generate_content_free_tier_requests
Please retry in 44s
```

**Solutions**:

1. Wait 60 seconds and retry
2. Use `pnpm exec tsx test.ts all` (auto-waits)
3. Switch to Ollama (see Option 2 above)
4. Upgrade to paid tier

### "Connection refused"

```
❌ fetch failed: connect ECONNREFUSED 127.0.0.1:8000
```

**Solution**: Start langextract-service

```bash
cd services/langextract-service
python main.py
```

### "No entities found"

Check that:

1. Wikipedia returned content
2. Domains are valid: `["social", "academic", "geographic"]`
3. LangExtract service is responding

### "0 relationships found"

This is expected for modes other than `deep_dive`.

Only `deep_dive` mode runs Phase 4 (relationships).

---

## Advanced Testing

### Test Specific Domains

Edit `test.ts` line 86:

```typescript
const result = await extractionGraph.invoke({
  inputText: testText,
  mode,
  domains: ["medical", "academic"], // Change domains
  // ...
});
```

### Filter Entity Types

```typescript
const result = await extractionGraph.invoke({
  inputText: testText,
  mode,
  domains: ["social", "academic"],
  includeEntityTypes: ["Person", "University"], // Only these
  // ...
});
```

### Custom Confidence Thresholds

```typescript
const result = await extractionGraph.invoke({
  inputText: testText,
  mode,
  domains: ["social"],
  confidenceThresholds: {
    discover: 0.6, // More lenient
    structure: 0.9, // More strict
    enrich: 0.7,
    relate: 0.8,
  },
});
```

---

## Performance Benchmarks

Target vs Actual (3000-char document):

| Phase     | Target             | Actual  | Status   |
| --------- | ------------------ | ------- | -------- |
| Discover  | < 3s               | ~5s     | ⚠️ Close |
| Structure | < 5s/type          | TBD     | ⏸️       |
| Enrich    | < 3s/entity        | TBD     | ⏸️       |
| Relate    | < 8s (10 entities) | TBD     | ⏸️       |
| **Total** | **< 30s**          | **TBD** | ⏸️       |

_TBD = Blocked by rate limits, need to test with Ollama or paid tier_

---

## Continuous Testing Script

For development, create `test-loop.sh`:

```bash
#!/bin/bash
# Test each mode with delays

modes=("discover" "structure" "enrich" "deep_dive")

for mode in "${modes[@]}"; do
  echo "Testing $mode mode..."
  pnpm exec tsx test.ts "$mode"

  if [ "$mode" != "deep_dive" ]; then
    echo "Waiting 60s..."
    sleep 60
  fi
done
```

Run:

```bash
chmod +x test-loop.sh
./test-loop.sh
```

---

## Integration Tests

Create `test-integration.ts` for automated testing:

```typescript
import { extractionGraph } from "./src/workflows/multi-phase-extraction";

const testCases = [
  {
    name: "Biography",
    text: "Marie Curie was a Polish-French physicist...",
    domains: ["social", "academic"],
    expectedEntities: ["Person", "Organization", "Location"],
  },
  {
    name: "News Article",
    text: "Tesla CEO announced $500M funding...",
    domains: ["social", "economic", "technology"],
    expectedEntities: ["Person", "Company", "Currency"],
  },
];

for (const testCase of testCases) {
  const result = await extractionGraph.invoke({
    inputText: testCase.text,
    domains: testCase.domains,
    mode: "enrich",
  });

  // Assert entities were found
  assert(result.enrichedEntities.size > 0);
}
```

---

## Next: Production Testing

Once rate limits are resolved:

1. **Full pipeline test**: All 4 modes on real documents
2. **Performance benchmarking**: Measure against targets
3. **Accuracy testing**: Validate extracted data quality
4. **Relationship testing**: Verify temporal data extraction
5. **Batch processing**: Test with multiple documents
