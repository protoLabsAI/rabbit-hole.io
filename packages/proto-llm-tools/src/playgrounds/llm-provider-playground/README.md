# LLM Provider Playground

Interactive testing environment for the `@protolabsai/llm-providers` system.

## Architecture

**Refactored**: October 19, 2025 - Modular hook and component based architecture

### Structure

- **Main Component**: 218 lines (orchestrator)
- **Hooks**: 6 custom hooks for state management
- **Components**: 6 feature components (chat, metrics, settings, etc.)
- **Shared Types**: Available via `@protolabsai/types/llm-playground`

## Features

### Provider Testing

- **Multiple Providers**: OpenAI, Anthropic, Groq, Ollama, Fake
- **Category Selection**: Fast, Smart, Reasoning, Vision, Coding
- **Live Configuration**: Adjust parameters in real-time

### Parameter Controls

- Temperature (0-2)
- Max Tokens (100-4000)
- Top P (0-1)
- Frequency Penalty (-2 to 2)
- Presence Penalty (-2 to 2)

### Real-Time Metrics

- **Token Count**: Total tokens consumed
- **Response Time**: Average response latency
- **Message Count**: Total messages sent
- **Per-Message Stats**: Tokens used, response time, tokens/second

### Security

- **In-Memory Keys**: API keys never persisted
- **Session-Only**: Keys cleared on page refresh
- **Show/Hide**: Toggle key visibility

## Usage

### In Playground Hub

Navigate to `/playground` and select "LLM Providers"

### Standalone

```tsx
import { LLMProviderPlayground } from "@/app/components/llm-provider-playground";

<LLMProviderPlayground />;
```

## API Keys

### Environment Variables (Preferred)

```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_GROQ_API_KEY=gsk_...
```

### In-Memory (Development)

1. Navigate to "API Keys" tab
2. Enter key for desired provider
3. Click "Save"
4. Keys stored in component state only

## Testing Workflow

1. **Select Provider**: Choose from dropdown
2. **Select Category**: Pick model capability
3. **Configure Parameters**: Adjust sliders
4. **Send Message**: Test the configuration
5. **View Metrics**: Check performance stats
6. **Compare**: Switch providers and repeat

## Metrics Explained

- **Total Tokens**: Sum of all tokens used (input + output)
- **Avg Response**: Mean response time across all messages
- **Tokens/s**: Output generation speed
- **Response Time**: Time from request to complete response

## Provider Status

Indicators show if provider is ready:

- 🟢 **Connected**: API key available
- 🔴 **API Key Required**: Missing credentials

## Tips

- Use **Fake** provider for zero-cost testing
- Start with **Fast** category for quick responses
- Compare **Smart** vs **Reasoning** for quality differences
- Monitor token usage to optimize costs
- Test temperature variations to find optimal settings

## Related

- Package: `packages/llm-providers`
- API Route: `app/api/llm-playground/chat/route.ts`
- Documentation: `packages/llm-providers/README.md`
