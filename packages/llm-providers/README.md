# @protolabsai/llm-providers

Multi-provider LLM configuration system with category-based model selection for flexible, vendor-neutral AI development.

## Features

- 🔄 **No Vendor Lock-in**: Switch providers without code changes
- 🎯 **Category-Based Selection**: Choose by capability (fast/smart/reasoning)
- ⚙️ **Configuration-Driven**: Update models via JSON config
- 🌍 **Environment-Aware**: Different configs per deployment
- 🔒 **Type-Safe**: Full TypeScript support
- 🧪 **Testing-Friendly**: Built-in fake provider for zero-cost testing
- 📦 **6 Providers**: OpenAI, Anthropic, Groq, Ollama, Bedrock, Custom

## Quick Start

### Installation

```bash
pnpm add @protolabsai/llm-providers
```

### Basic Usage

```typescript
import { getModel } from "@protolabsai/llm-providers";

// Get default smart model from default provider
const model = getModel("smart");

// Use with LangChain
const response = await model.invoke("What is TypeScript?");
console.log(response.content);
```

### Specify Provider

```typescript
// Get smart model from Anthropic
const claudeModel = getModel("smart", "anthropic");

// Get fast model from Groq
const groqModel = getModel("fast", "groq");
```

### Override Options

```typescript
const creativeModel = getModel("smart", "openai", {
  temperature: 0.9,
  maxTokens: 4000,
});
```

## Type Generation

This package uses **auto-generated types** for enhanced autocomplete and type safety.

### Generated Types

Provider names, model categories, and model names are automatically generated from the configuration file:

```typescript
import {
  getModel,
  type ProviderName,
  type ModelCategory,
} from "@protolabsai/llm-providers/server";

// ✅ Full autocomplete for category and provider
const model = getModel("smart", "anthropic");
```

### Regenerating Types

Types are automatically regenerated before each build. To manually regenerate:

```bash
pnpm run codegen
```

This creates `src/generated/config-types.ts` with all provider names, model categories, and model names from `default-config.ts`.

## Configuration

### Environment Variables

```bash
# Default provider and category
LLM_DEFAULT_PROVIDER=openai
LLM_DEFAULT_CATEGORY=smart

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Base URLs (optional)
OLLAMA_BASE_URL=http://localhost:11434
CUSTOM_OPENAI_BASE_URL=https://your-api.com/v1

# AWS Bedrock (optional)
BEDROCK_AWS_ACCESS_KEY_ID=...
BEDROCK_AWS_SECRET_ACCESS_KEY=...
BEDROCK_AWS_REGION=us-east-1
```

### Custom Config File

```bash
LLM_CONFIG_PATH=./config/my-llm-config.json
```

```json
{
  "defaultProvider": "openai",
  "defaultCategory": "smart",
  "providers": {
    "openai": {
      "enabled": true,
      "models": {
        "smart": [
          {
            "name": "gpt-4o",
            "temperature": 0.5,
            "maxTokens": 2000
          }
        ]
      }
    }
  }
}
```

## Model Categories

- **fast**: Quick responses, lower quality (gpt-3.5-turbo, claude-haiku)
- **smart**: Balanced quality/speed (gpt-4o, claude-sonnet)
- **reasoning**: Complex reasoning (o1-preview, claude-opus)
- **vision**: Multimodal image input (gpt-4o, claude-opus)
- **long**: Long context windows (claude-opus-200k)
- **coding**: Code generation/analysis (gpt-4o, codellama)

## Supported Providers

### OpenAI

- **Models**: gpt-3.5-turbo, gpt-4o, o1-preview
- **Requires**: `OPENAI_API_KEY`

### Anthropic

- **Models**: claude-3-haiku, claude-3-sonnet, claude-3-opus
- **Requires**: `ANTHROPIC_API_KEY`

### Groq

- **Models**: llama-3.3-70b-versatile
- **Requires**: `GROQ_API_KEY`

### Ollama (Local)

- **Models**: llama3.2:3b, llama3:8b, codellama:13b
- **Requires**: Ollama running locally

### AWS Bedrock

- **Models**: anthropic.claude-3-sonnet, anthropic.claude-3-opus
- **Requires**: AWS credentials

### Fake (Testing)

- **Models**: Configurable with predefined responses
- **Requires**: Nothing - always available

## Testing

### Using Fake Provider

```typescript
import { setupFakeProvider, testScenarios } from "@protolabsai/llm-providers/testing";

// Quick setup
setupFakeProvider({
  responses: ["Test response 1", "Test response 2"],
  sleep: 500, // Simulate 500ms latency
});

// Or use preset scenarios
setupFakeProvider(testScenarios.research());
```

### Test Scenarios

```typescript
testScenarios.fast(); // Instant responses
testScenarios.realistic(); // 500ms latency
testScenarios.slow(); // 3s latency
testScenarios.conversation(); // Multiple varied responses
testScenarios.research(); // Research-specific JSON
testScenarios.error(); // Error responses
```

## API Reference

### getModel()

```typescript
function getModel(
  category: ModelCategory,
  provider?: string,
  options?: ModelOptions
): BaseChatModel;
```

### getProvider()

```typescript
function getProvider(name: string): LLMProvider;
```

### listProviders()

```typescript
function listProviders(): string[];
```

### LLMProviderFactory

```typescript
const factory = LLMProviderFactory.getInstance(customConfig);
const model = factory.getModel("smart", "openai");
```

## Examples

### Agent Integration

```typescript
// agent/src/config/llm-config.ts
import { getModel } from "@protolabsai/llm-providers";

export const agentLLMConfig = {
  research: () => getModel("smart", "openai", { temperature: 0.1 }),
  chat: () => getModel("fast", "groq"),
  reasoning: () => getModel("reasoning", "openai"),
  coding: () => getModel("coding", "openai", { temperature: 0.3 }),
};
```

### Dynamic Provider Selection

```typescript
const provider = process.env.LLM_PROVIDER || "openai";
const model = getModel("smart", provider);
```

### Health Checking

```typescript
const openai = getProvider("openai");
if (await openai.isAvailable()) {
  const models = await openai.listModels();
  console.log("Available models:", models);
}
```

## Troubleshooting

### "API key not found"

Set the appropriate environment variable:

```bash
export OPENAI_API_KEY=sk-...
```

### "Provider not found in configuration"

Check provider is enabled in config and name is correct.

### "No models configured for category"

Ensure the provider has models defined for that category in config.

### Ollama not connecting

Verify Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

## Migration

See `MIGRATION_GUIDE.md` for step-by-step migration instructions.

## Related

- **Playground**: `/playground` → LLM Providers
- **Config**: `packages/llm-providers/config/llm-providers.config.json`
- **Agents**: `agent/src/config/llm-config.ts`
