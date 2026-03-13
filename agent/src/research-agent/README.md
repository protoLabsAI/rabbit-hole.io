# Research Agent

Autonomous entity research with CopilotKit real-time streaming.

**⚠️ IMPORTANT:** Uses consolidated single-source-of-truth architecture.  
**Reference:** `docs/developer/deep-agent-entity-researcher/MULTI_AGENT_DELEGATION_PATTERN.md`

## Architecture

**Consolidated Pattern (November 2025):**
All graph building logic lives in `@proto/llm-tools`. Agent only customizes coordinator for CopilotKit streaming.

```
agent/src/research-agent/
├── index.ts              # Imports buildDeepAgentGraph, adds memory checkpointer
├── state.ts              # State annotation with CopilotKit integration
├── graph/
│   └── nodes.ts          # Custom coordinator with copilotkitEmitState
├── tools/
│   └── index.ts          # Re-exports from @proto/llm-tools
├── subagents/
│   └── index.ts          # Re-exports from @proto/llm-tools
└── prompts/
    └── index.ts          # Re-exports from @proto/llm-tools

packages/proto-llm-tools/tools/deep-agent-entity-researcher/
└── graph/
    └── index.ts          # buildDeepAgentGraph - SINGLE SOURCE OF TRUTH
```

## 6 Specialized Subagents

1. **Evidence Gatherer** - Wikipedia/web evidence collection
2. **Entity Extractor** - Identifies entities from evidence
3. **Field Analyzer** - Analyzes entity field mappings
4. **Entity Creator** - Structures entity data
5. **Relationship Mapper** - Maps relationships between entities
6. **Bundle Assembler** - Assembles final research bundle

**Key Design:**

- ✅ Library owns graph building and tool restrictions
- ✅ Agent owns CopilotKit integration
- ✅ No duplication possible
- ✅ Tool restriction enforced architecturally

## Configuration

**LangGraph Deployment:**

```json
{
  "graphs": {
    "research_agent": "./src/research-agent/index.ts:graph"
  }
}
```

**API Endpoint:** `/api/research/agent`

## Frontend Usage

```typescript
import { useCoAgent, useCoAgentStateRender } from "@copilotkit/react-core";
import { CopilotKit } from "@copilotkit/react-core";

function ResearchAgentPlayground() {
  const { state, setState } = useCoAgent<ResearchAgentState>({
    name: "research_agent",
    initialState: {
      todos: [],
      files: {},
      confidence: 0,
      completeness: 0,
    },
  });

  // Trigger research
  setState({ entityName: "Einstein", entityType: "Person" });

  // Read real-time updates
  return (
    <div>
      {state.todos.map(todo => (
        <div>{todo.status} {todo.content}</div>
      ))}
      <div>Confidence: {state.confidence}%</div>
    </div>
  );
}

// Wrap with CopilotKit provider
export default () => (
  <CopilotKit runtimeUrl="/api/research/agent">
    <ResearchAgentPlayground />
  </CopilotKit>
);
```

## Real-Time Features

- **Progress Streaming:** Todos update as agent executes
- **File Tracking:** Workspace files appear instantly
- **Quality Metrics:** Confidence/completeness stream live
- **Tool Visualization:** File creation events in chat
- **State Rendering:** Progress cards in chat UI

## Development

```bash
# Build all packages
pnpm run build:libs

# Start agent server
cd agent && pnpm dev

# Verify
curl http://localhost:8123/research_agent/docs
```

## Implementation Details

**State:** CopilotKitStateAnnotation integration
**Tools:** Shared from proto-llm-tools (write_todos with copilotkitEmitMessage)
**Streaming:** copilotkitEmitState for intermediate updates
**Sub-Agents:** 6 specialized agents via task delegation
**Auth:** Basic+ tier required
