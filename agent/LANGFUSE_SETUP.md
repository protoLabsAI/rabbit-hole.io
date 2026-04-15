# Langfuse Integration Guide

## Overview

Both LangGraph agents are instrumented with Langfuse for LLM observability:

- **Research Agent** - Entity research with 6 specialized subagents
- **Writing Agent** - Document editing and content generation

> Note: As of November 2025, the agents were consolidated from 5 to 2. The deep-agent-researcher, entity-extraction-agent, and human-loop-extraction-agent functionality was merged into the research_agent.

## Setup

### 1. Environment Variables

Create or update `agent/.env`:

```bash
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://your-langfuse-instance.com
```

### 2. Get API Keys

**This guide assumes a self-hosted Railway deployment.**

**Self-Hosted (Railway)**:

1. Open your Railway deployment: https://your-langfuse-instance.com
2. Log in to admin panel
3. Go to Settings → API Keys
4. Copy secret and public keys
5. Add to `.env` files in both `agent/` and `apps/rabbit-hole/`

**Cloud (Alternative)**:
If using Langfuse Cloud instead:

1. Set `LANGFUSE_BASE_URL=https://cloud.langfuse.com`
2. Get keys from cloud.langfuse.com dashboard
3. View traces at cloud.langfuse.com (not Railway URL)

## Architecture

### OpenTelemetry Initialization

File: `agent/src/instrumentation.ts`

- Initializes OTEL SDK with LangfuseSpanProcessor
- MUST be imported FIRST in all agent entry points
- Handles graceful shutdown on SIGTERM/SIGINT

### Handler Factory

File: `agent/src/config/langfuse.ts`

- Creates standardized Langfuse CallbackHandlers
- Includes rich metadata (agent, user, session, workspace)
- Graceful degradation when Langfuse unavailable
- Circuit breaker pattern with periodic health checks

### Agent Integration

Each agent coordinator node:

1. Creates Langfuse handler with metadata
2. Passes handler to LLM via `callbacks` array
3. Automatically traces tool calls, tokens, latency

## Graceful Degradation

If Langfuse is not configured or unavailable:

- Agents continue functioning normally
- Handler factory returns `undefined`
- No callbacks passed to LLM
- Warning logged once

## Viewing Traces

**For Self-Hosted (Railway)**:

1. Log in to your instance: https://your-langfuse-instance.com
2. Select your project
3. Navigate to **Traces** tab
4. Filter by:
   - Agent name (tag: `research-coordinator`, `writing-coordinator`, etc.)
   - User/session ID
   - Date range

**For Cloud**:

1. Log in to Langfuse Cloud: https://cloud.langfuse.com
2. Follow same steps as above

## What Gets Traced

### Automatically Captured

- All LLM calls (model, provider, parameters)
- Token usage (input, output, total)
- Cost per call
- Latency per step
- Tool calls and results
- Subagent delegation
- Error traces with stack traces

### Custom Metadata

- Agent name and type
- User ID (from session)
- Session ID (for trace grouping)
- Workspace ID
- Entity/document context
- Tags for filtering

## Performance

- **Latency Overhead**: <20ms per agent run
- **CPU Overhead**: <1%
- **Memory**: +50MB for SDK
- **Network**: ~1KB per trace (compressed, batched)

## Troubleshooting

### No traces appearing

```bash
# Check environment variables
echo $LANGFUSE_SECRET_KEY
echo $LANGFUSE_PUBLIC_KEY

# Check logs for OTEL initialization
tail -f agent/logs/*.log | grep OTEL

# Verify handler creation
tail -f agent/logs/*.log | grep Langfuse
```

### High latency

```bash
# Enable debug mode
LANGFUSE_DEBUG=true pnpm dev

# Check flush interval (default 1s)
LANGFUSE_FLUSH_INTERVAL=1000
```

### Disable temporarily

```bash
# Remove keys from environment
unset LANGFUSE_SECRET_KEY
unset LANGFUSE_PUBLIC_KEY

# Agents will gracefully degrade
```

## Testing

```bash
# Run unit tests
cd agent
pnpm test langfuse

# Test agent with tracing
pnpm dev
# Trigger test agent run
# Check Langfuse UI for trace
```

## Files Modified

**New:**

- `agent/src/instrumentation.ts`
- `agent/src/config/langfuse.ts`
- `agent/src/config/langfuse.test.ts`

**Modified (Post-November 2025 Consolidation):**

- `agent/src/research-agent/index.ts` (unified research agent)
- `agent/src/research-agent/graph/nodes.ts`
- `agent/src/writing-agent/index.ts`
- `agent/src/writing-agent/graph/nodes.ts`
- `agent/package.json`

> Note: `deep-agent-researcher`, `entity-extraction-agent`, and `human-loop-extraction-agent` were consolidated into `research-agent` in November 2025.

## Resources

- [Langfuse Docs](https://langfuse.com/docs)
- [LangChain Integration](https://langfuse.com/docs/integrations/langchain)
- [Implementation Handoff](../handoffs/2025-11-23_LANGFUSE_INTEGRATION_HANDOFF.md)
