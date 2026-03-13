# Migration Guide: @proto/llm-providers

Step-by-step guide for migrating from hardcoded LLM instances to the centralized provider system.

## Why Migrate?

**Before**: Hardcoded models scattered across codebase
```typescript
const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.1 });
```

**After**: Centralized configuration
```typescript
const model = getModel("smart");
```

**Benefits**:
- Switch providers without code changes
- A/B test models easily
- Environment-specific configurations
- Centralized cost management
- Zero-cost testing with fake provider

## Migration Steps

### Step 1: Add Dependency

```bash
# For agents
pnpm add @proto/llm-providers --filter @proto/agent

# For main app (if needed)
pnpm add @proto/llm-providers
```

### Step 2: Set Environment Variables

Add to `.env`:

```bash
# Existing (keep these)
OPENAI_API_KEY=sk-...

# New (optional - for additional providers)
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Configuration (optional)
LLM_DEFAULT_PROVIDER=openai
LLM_DEFAULT_CATEGORY=smart
```

### Step 3: Update Imports

**Before**:
```typescript
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  temperature: 0.1,
  model: "gpt-4o",
});
```

**After**:
```typescript
import { getModel } from "@proto/llm-providers";

const model = getModel("smart", "openai", { temperature: 0.1 });
```

### Step 4: Create Agent Config (Recommended)

**File**: `agent/src/config/llm-config.ts`

```typescript
import { getModel } from "@proto/llm-providers";

export const agentLLMConfig = {
  research: () => getModel("smart", "openai", { temperature: 0.1 }),
  chat: () => getModel("fast", "groq"),
  reasoning: () => getModel("reasoning", "openai"),
  coding: () => getModel("coding", "openai", { temperature: 0.3 }),
};
```

Then use in agent nodes:

```typescript
import { agentLLMConfig } from "../../config/llm-config";

const model = agentLLMConfig.research();
```

### Step 5: Test

```bash
# Build package
pnpm --filter @proto/llm-providers build

# Build agent
pnpm --filter @proto/agent build

# Test agent
cd agent && pnpm run dev
```

## Migration Examples

### Research Agent

**Before**: `agent/src/research-agent/graph/nodes.ts`
```typescript
import { ChatOpenAI } from "@langchain/openai";

const researchModel = new ChatOpenAI({
  temperature: 0.1,
  model: "gpt-4o",
});
```

**After**:
```typescript
import { agentLLMConfig } from "../../config/llm-config";

const researchModel = agentLLMConfig.research();
```

### Person Research Agent

**Before**: `agent/src/person-research-agent/graph/nodes.ts`
```typescript
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ temperature: 0.1, model: "gpt-4o" });
```

**After**:
```typescript
import { agentLLMConfig } from "../../config/llm-config";

const model = agentLLMConfig.research();
```

## Rollback Plan

If issues occur:

### 1. Revert Imports

```typescript
import { ChatOpenAI } from "@langchain/openai";
const model = new ChatOpenAI({ model: "gpt-4o" });
```

### 2. Remove Dependency

```bash
pnpm remove @proto/llm-providers --filter @proto/agent
```

### 3. Restore Files

```bash
git checkout agent/src/config/llm-config.ts
git checkout agent/src/research-agent/graph/nodes.ts
git checkout agent/src/person-research-agent/graph/nodes.ts
```

## Common Issues

### Issue: "Provider not found"
**Solution**: Check provider name spelling and ensure it's enabled in config

### Issue: "API key not found"
**Solution**: Verify environment variable is set correctly

### Issue: "No models configured for category"
**Solution**: Check category name and ensure provider has models for that category

### Issue: Type errors with BaseChatModel
**Solution**: Ensure `@langchain/core` version matches provider requirements

## Testing Your Migration

### 1. Test with Fake Provider

```bash
# Set environment
export LLM_DEFAULT_PROVIDER=fake

# Run agent
cd agent && pnpm run dev

# Test endpoint
curl -X POST http://localhost:8123/research_agent/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{"targetEntityName":"Test"}}'
```

### 2. Test with Real Provider

```bash
# Unset test env
unset LLM_DEFAULT_PROVIDER

# Ensure API key is set
export OPENAI_API_KEY=sk-...

# Run and test
cd agent && pnpm run dev
```

### 3. Test Provider Switching

```bash
# Try different providers
export LLM_DEFAULT_PROVIDER=groq
export GROQ_API_KEY=gsk_...

cd agent && pnpm run dev
```

## Advanced Usage

### Custom Configuration

Create `config/llm-custom.json`:

```json
{
  "defaultProvider": "anthropic",
  "defaultCategory": "smart",
  "providers": {
    "anthropic": {
      "enabled": true,
      "models": {
        "smart": [
          {
            "name": "claude-3-5-sonnet-20240620",
            "temperature": 0.3,
            "maxTokens": 4000
          }
        ]
      }
    }
  }
}
```

Use it:

```bash
export LLM_CONFIG_PATH=./config/llm-custom.json
```

### Runtime Provider Selection

```typescript
import { LLMProviderFactory } from "@proto/llm-providers";

// Get factory with custom config
const factory = LLMProviderFactory.getInstance({
  defaultProvider: "groq",
});

const model = factory.getModel("fast");
```

## Next Steps

1. **Explore Playground**: Navigate to `/playground` → "LLM Providers"
2. **Test Providers**: Try different providers and compare
3. **Monitor Metrics**: Track token usage and performance
4. **Optimize Costs**: Switch to cheaper providers for simple tasks
5. **Add Providers**: Configure additional providers as needed

## Related Documentation

- **Configuration**: `config/llm-providers.config.json`
- **Testing**: Use fake provider for unit tests
- **Playground**: Interactive testing at `/playground`
- **Agent Config**: `agent/src/config/llm-config.ts`
