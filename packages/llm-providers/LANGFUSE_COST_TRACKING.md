# Langfuse Cost Tracking in @proto/llm-providers

## Current Implementation Status ✅

**Token Tracking:** Fully Enabled  
**Cost Tracking:** Enabled via Langfuse Model Definitions  
**Provider Coverage:** All providers (OpenAI, Anthropic, Google, Groq, Ollama)

## How It Works

### Automatic Token Capture

All providers use LangChain base classes that automatically include token usage in responses:

```typescript
// Response from LangChain models includes:
response.usage_metadata = {
  input_tokens: 123,
  output_tokens: 456,
  total_tokens: 579,
}
```

### Agent Layer (LangChain CallbackHandler)

**File:** `agent/src/config/langfuse.ts`

LangChain's `CallbackHandler` automatically captures:
- Token usage from all LLM calls
- Model name
- Input/output content
- Latency

**No additional code needed** - tokens are tracked automatically when using the handler:

```typescript
const langfuseHandler = createLangfuseHandler({
  agentName: "research-coordinator",
  userId: state.sharedGraphState?.sessionId,
  sessionId: state.sharedGraphState?.sessionId,
});

const response = await model.invoke(messages, {
  callbacks: [langfuseHandler], // Auto-captures tokens
});
```

### API Route Layer (Manual Tracking)

**File:** `apps/rabbit-hole/app/api/llm-playground/chat/route.ts`

Explicit usage tracking for API routes:

```typescript
// Extract usage from LangChain response
const usageMetadata = response.usage_metadata as {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

// Pass to Langfuse with correct format
generation.end({
  output: response.content,
  usage: {
    input: usageMetadata?.input_tokens || 0,
    output: usageMetadata?.output_tokens || 0,
    total: totalTokens,
  },
  model: modelName,
});
```

## Cost Calculation

### Automatic via Model Definitions

Langfuse automatically calculates costs when:
1. **Token usage is tracked** (we do this ✅)
2. **Model name is provided** (we do this ✅)
3. **Model definition exists** in Langfuse

**Supported Out-of-Box:**
- OpenAI models (gpt-4, gpt-3.5-turbo, gpt-4o, etc.)
- Anthropic models (claude-3-*, claude-3.5-sonnet, etc.)
- Google models (gemini-*, palm, etc.)

### Custom Model Definitions

For models not in Langfuse's predefined list, add custom definitions:

**Via Langfuse UI:**
1. Go to Project Settings → Models
2. Click "+" to add model
3. Enter:
   - Match Pattern: `^your-model-name$` (regex)
   - Input Cost: USD per 1M tokens
   - Output Cost: USD per 1M tokens
   - Tokenizer: (optional, for usage inference)

**Via API:**
```bash
POST /api/public/models
{
  "matchPattern": "^custom-gpt-4$",
  "startDate": "2024-01-01T00:00:00Z",
  "unit": "TOKENS",
  "inputPrice": 10.00,  // USD per 1M tokens
  "outputPrice": 30.00,
  "tokenizerId": "gpt-4"  // Use OpenAI tokenizer
}
```

## Provider-Specific Tracking

### OpenAI
**Models:** gpt-4, gpt-4o, gpt-3.5-turbo, o1-preview, o1-mini

**Token Usage:** Automatically captured via `usage_metadata`

**Cost:** Auto-calculated by Langfuse (predefined pricing)

**Special Cases:**
- **o1 models**: Include `reasoning_tokens` in output
- **Vision models**: Include `image_tokens` if used

### Anthropic
**Models:** claude-3-*, claude-3.5-sonnet

**Token Usage:** Automatically captured

**Cost:** Auto-calculated by Langfuse

**Special Cases:**
- **Prompt Caching**: `cache_read_input_tokens` tracked separately
- **Extended Thinking**: Claude 3.7+ includes thinking tokens

### Google
**Models:** gemini-pro, gemini-ultra, palm

**Token Usage:** Captured via `usage_metadata`

**Cost:** Auto-calculated for standard models

**Note:** May require custom model definitions for newer models

### Groq
**Models:** Various (llama, mixtral, gemma)

**Token Usage:** Captured when available

**Cost:** Add custom model definitions (Groq pricing varies)

### Ollama
**Models:** User-defined local models

**Token Usage:** May not be available (depends on model)

**Cost:** Typically $0 (self-hosted)

**Recommendation:** Add custom definitions with $0 pricing for tracking

## Verification Checklist

### Current Implementation ✅

- [x] **Token extraction** from `usage_metadata`
- [x] **Input tokens** tracked separately
- [x] **Output tokens** tracked separately
- [x] **Total tokens** calculated correctly
- [x] **Model name** included in generation
- [x] **Usage passed** to Langfuse generation.end()
- [x] **Format compatible** with Langfuse API

### Langfuse Configuration Required

- [ ] **Model definitions** exist for all models used
- [ ] **Custom models** added for fine-tuned/custom models
- [ ] **Pricing accurate** for cost calculations
- [ ] **Tokenizers configured** for usage inference (fallback)

## Usage Details Format

### Standard Format (Recommended)

```typescript
{
  input: 100,           // Input tokens
  output: 50,           // Output tokens
  total: 150,           // Total tokens (optional, auto-calculated)
}
```

### Extended Format (For Advanced Models)

```typescript
{
  input: 100,
  output: 50,
  cache_read_input_tokens: 25,  // Anthropic prompt caching
  reasoning_tokens: 30,          // OpenAI o1 models
  audio_tokens: 10,              // Future multimodal models
  image_tokens: 5,               // Vision models
  total: 220,
}
```

## Cost Details Format (Optional)

If you want to override Langfuse's auto-calculation:

```typescript
generation.end({
  usage: { input: 100, output: 50 },
  costDetails: {
    input: 0.0015,              // USD for input tokens
    output: 0.0030,             // USD for output tokens
    total: 0.0045,              // Total USD
  }
});
```

**Note:** Typically not needed - Langfuse auto-calculates based on model pricing.

## Testing Token Tracking

### 1. Verify Token Extraction

```typescript
// In API route, log the usage metadata
console.log("Usage metadata:", response.usage_metadata);
console.log("Response metadata:", response.response_metadata);
```

Expected output:
```json
{
  "input_tokens": 123,
  "output_tokens": 456,
  "total_tokens": 579
}
```

### 2. Check Langfuse Generation

After making a request:
1. Click "Trace →" link
2. Navigate to generation span
3. Verify "Usage" section shows:
   - Input tokens: 123
   - Output tokens: 456
   - Total: 579

### 3. Verify Cost Calculation

In Langfuse trace:
1. Check "Cost" field
2. Should show USD amount if model definition exists
3. If $0.00, add model definition with pricing

### 4. Test Each Provider

```bash
# Test OpenAI
curl -X POST http://localhost:3000/api/llm-playground/chat \
  -d '{"config":{"provider":"openai","category":"fast"},"messages":[...]}'

# Check response includes tokens
# Click trace link, verify cost appears
```

## Common Issues

### Issue: No Cost Showing

**Symptoms:**
- Tokens tracked correctly
- Cost shows $0.00 or missing

**Solutions:**
1. **Add model definition** in Langfuse UI:
   - Go to Settings → Models
   - Add model with pricing
   - Match pattern to your model name

2. **Check model name** matches definition:
   ```typescript
   console.log("Model name:", modelName);
   // Should match Langfuse model definition regex
   ```

3. **Verify pricing** in model definition:
   - Input cost per 1M tokens
   - Output cost per 1M tokens

### Issue: No Tokens Showing

**Symptoms:**
- Langfuse shows 0 tokens
- Response worked correctly

**Solutions:**
1. **Check LangChain version** (requires >=1.0):
   ```bash
   pnpm list @langchain/core
   ```

2. **Verify usage_metadata** in response:
   ```typescript
   console.log("Usage:", response.usage_metadata);
   ```

3. **Check provider** supports usage metadata:
   - OpenAI: ✅ Always includes
   - Anthropic: ✅ Always includes  
   - Google: ✅ Usually includes
   - Groq: ⚠️ May not include
   - Ollama: ❌ Often missing

### Issue: Incorrect Token Counts

**Symptoms:**
- Tokens tracked but numbers seem wrong
- Cost calculations incorrect

**Solutions:**
1. **Verify extraction logic:**
   ```typescript
   // Should prioritize usage_metadata over response_metadata
   const tokens = usageMetadata?.input_tokens || 
                  responseMetadata?.tokenUsage?.totalTokens || 0;
   ```

2. **Check for cached tokens:**
   - Anthropic includes `cache_read_input_tokens`
   - Should be added to total

3. **Add detailed logging:**
   ```typescript
   console.log({
     input: usageMetadata?.input_tokens,
     output: usageMetadata?.output_tokens,
     total: totalTokens,
   });
   ```

## Enhanced Tracking (Optional)

### Provider-Level Wrapper

For automatic tracking of ALL LLM calls (not just agents):

**File:** `packages/llm-providers/src/server/providers/openai.ts`

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { observeOpenAI } from "langfuse";

export class OpenAIProvider extends BaseLLMProvider {
  getModel(category: ModelCategory, options?: ModelOptions): ChatOpenAI {
    const model = new ChatOpenAI({
      apiKey: this.getApiKey("OPENAI_API_KEY"),
      model: modelConfig.name,
      // ... other options
    });

    // Optional: Wrap with Langfuse for automatic tracking
    if (process.env.LANGFUSE_ENABLE_PROVIDER_WRAPPER === "true") {
      return observeOpenAI(model) as ChatOpenAI;
    }

    return model;
  }
}
```

**When to use:**
- API routes that don't create explicit traces
- One-off LLM calls outside agent context
- Fallback tracking layer

**When NOT needed:**
- Already using CallbackHandler (agents) ✅
- Already creating manual traces (playground API) ✅
- Would create duplicate traces

**Current Status:** Not needed - we have comprehensive tracking via handlers and manual traces.

## Cost Optimization Tips

### 1. Track by Feature

Use tags to segment costs:
```typescript
const trace = langfuse.trace({
  tags: ["playground", "research-agent", "writing-agent"],
  // ...
});
```

Then filter in Langfuse UI by tag to see cost per feature.

### 2. Track by User

Already implemented via `userId`:
```typescript
const trace = langfuse.trace({
  userId: userId,
  // ...
});
```

Filter by user in Langfuse to see per-user costs.

### 3. Set Budget Alerts

In Langfuse:
1. Go to Settings → Alerts
2. Add alert: "Daily cost > $X"
3. Configure webhook to Slack/email

### 4. Use Cheaper Models for Simple Tasks

Review cost dashboard to identify:
- High-cost, low-value operations
- Opportunities to use "fast" vs "smart" models
- Caching opportunities

## Model Definition Recommendations

### Priority Models to Define

1. **OpenAI** (predefined by Langfuse ✅)
   - gpt-4o, gpt-4-turbo, gpt-3.5-turbo
   - o1-preview, o1-mini

2. **Anthropic** (predefined by Langfuse ✅)
   - claude-3-5-sonnet-20240620
   - claude-3-opus, claude-3-sonnet, claude-3-haiku

3. **Google** (predefined by Langfuse ✅)
   - gemini-1.5-pro, gemini-1.5-flash

4. **Custom/Fine-tuned** (add manually)
   - Any fine-tuned models
   - Self-hosted models
   - Custom endpoints

### Pricing Sources

- **OpenAI**: https://openai.com/api/pricing/
- **Anthropic**: https://www.anthropic.com/pricing
- **Google**: https://ai.google.dev/pricing
- **Groq**: https://groq.com/pricing/

## Next Steps

### Immediate Actions

1. **Verify token tracking working:**
   ```bash
   # Test playground with Langfuse enabled
   # Check trace shows tokens and cost
   ```

2. **Add model definitions** in Langfuse:
   - Review models used in config
   - Add any missing definitions
   - Set accurate pricing

3. **Monitor costs:**
   - Create cost dashboard
   - Set budget alerts
   - Review weekly/monthly

### Future Enhancements

1. **Advanced Usage Types:**
   - Add support for `cache_read_input_tokens` (Anthropic)
   - Add support for `reasoning_tokens` (OpenAI o1)
   - Add support for `audio_tokens` (future models)

2. **Cost Attribution:**
   - Tag by workspace
   - Tag by research depth
   - Tag by entity type

3. **Billing Integration:**
   - Use Daily Metrics API for billing
   - Calculate user-specific costs
   - Implement rate limiting by cost

## References

- [Langfuse Cost Tracking Docs](https://langfuse.com/docs/model-usage-and-cost)
- [Model Definitions](https://cloud.langfuse.com/project/clkpwwm0m000gmm094odg11gi/models)
- [Daily Metrics API](https://langfuse.com/docs/analytics/daily-metrics-api)
- [LangChain Token Usage](https://js.langchain.com/docs/modules/model_io/)

---

**Status:** Token tracking fully functional  
**Cost tracking:** Enabled (requires model definitions in Langfuse)  
**Next:** Configure model definitions and verify costs appear in traces

