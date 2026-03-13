# LangChain/LangGraph Domain

Custom domain for representing LangChain agent systems as knowledge graph entities.

## Overview

This domain enables mapping agent architectures, understanding system relationships, and visualizing multi-agent workflows in the `/research` workspace.

**Use Cases:**

- Agent system documentation
- Workflow visualization
- Dependency tracking
- Architecture analysis
- Research system meta-analysis

## Entity Types

### Agent

Represents a LangChain agent (coordinator, subagent, or standalone).

**Properties:**

- `agent_type`: coordinator | subagent | standalone | react | function_calling
- `category`: research | data-processing | analysis | generation
- `version`: Semantic version string
- `prompt_template`: System prompt
- `max_tokens`: Token limit (100-200000)
- `temperature`: Model temperature (0-2)
- `recursion_limit`: Max recursion depth (1-1000)
- `config_path`: Path to config file

**Example:**

```json
{
  "uid": "agent:deep_agent_researcher",
  "name": "Deep Agent Researcher",
  "type": "Agent",
  "properties": {
    "agent_type": "coordinator",
    "category": "research",
    "version": "1.0.0",
    "max_tokens": 4096,
    "temperature": 0.7
  }
}
```

### Graph

Represents a LangGraph StateGraph definition.

**Properties:**

- `graph_type`: state_graph | message_graph | workflow
- `compiled`: Whether graph is compiled
- `node_count`: Number of nodes
- `edge_count`: Number of edges

### Node

Represents an executable unit within a graph.

**Properties:**

- `node_type`: agent | tool | function | router | start | end
- `is_entry_point`: Whether this is the graph entry
- `is_terminal`: Whether this is a terminal node

### Tool

Represents a LangChain tool capability.

**Properties:**

- `tool_type`: builtin | custom | task | retrieval | api
- `is_async`: Whether tool is asynchronous
- `requires_approval`: Whether requires human approval
- `schema_definition`: Zod schema string

### State

Represents agent state structure.

**Properties:**

- `state_type`: annotation | messages | custom
- `field_count`: Number of state fields
- `has_reducers`: Whether uses custom reducers

### Model

Represents LLM configuration.

**Properties:**

- `provider`: openai | anthropic | groq | google | ollama
- `model_name`: Model identifier
- `supports_streaming`: Streaming support
- `supports_tools`: Function calling support
- `context_window`: Max context size (1000-2000000)

### StateField

Represents individual state field.

**Properties:**

- `field_type`: string | number | array | object | messages
- `reducer_type`: merge | replace | append | custom
- `has_default`: Whether has default value

### Checkpointer

Represents state persistence mechanism.

**Properties:**

- `checkpointer_type`: memory | postgres | sqlite | custom
- `supports_branching`: Whether supports state branching

## Relationships

- `HAS_GRAPH`: Agent → Graph
- `USES_MODEL`: Agent → Model
- `HAS_STATE`: Agent → State
- `USES_CHECKPOINTER`: Agent → Checkpointer
- `DELEGATES_TO`: Agent → Agent (subagent)
- `CONTAINS_NODE`: Graph → Node
- `CONNECTED_TO`: Node → Node
- `USES_TOOL`: Agent/Node → Tool
- `HAS_FIELD`: State → StateField
- `COMPILED_FROM`: Graph → Config
- `EXTENDS_STATE`: State → State
- `WRAPS_SUBGRAPH`: Node → Graph

## Usage

### Import Test Bundle

```bash
# Load example agent architecture
curl -X POST http://localhost:3000/api/research/import \
  -H "Content-Type: application/json" \
  -d @test-data/langchain-agents-bundle.json
```

### Query Examples

**Agent delegation hierarchy:**

```cypher
MATCH (coordinator:Agent {agent_type: "coordinator"})
MATCH (coordinator)-[:DELEGATES_TO]->(subagent:Agent)
MATCH (subagent)-[:USES_TOOL]->(tool:Tool)
RETURN coordinator.name, subagent.name, collect(tool.name) as tools
```

**Tool usage analysis:**

```cypher
MATCH (agent:Agent)-[:USES_TOOL]->(tool:Tool)
RETURN tool.name, tool.tool_type, count(agent) as agent_count
ORDER BY agent_count DESC
```

**Model distribution:**

```cypher
MATCH (agent:Agent)-[:USES_MODEL]->(model:Model)
RETURN model.provider, count(agent) as usage_count
```

**Graph structure:**

```cypher
MATCH (graph:Graph)-[:CONTAINS_NODE]->(node:Node)
RETURN graph.name, graph.node_count, collect(node.name) as nodes
```

**Complex states:**

```cypher
MATCH (state:State {has_reducers: true})
RETURN state.name, state.field_count
ORDER BY state.field_count DESC
```

**Agent capabilities by category:**

```cypher
MATCH (agent:Agent)
WHERE agent.category = "research"
MATCH (agent)-[:USES_TOOL]->(tool:Tool)
RETURN agent.name, collect(tool.tool_type) as tool_types
```

## Reference Agent Configs

Production agent configurations using this domain:

- `agent/src/deep-agent-researcher/config.json` - Multi-agent entity research
- `agent/src/person-research-agent/` - Biographical research
- `agent/src/research-agent/` - Multi-entity graph building

## Agent Config Schema

Agents in this domain map to JSON configs in the `@proto/deep-agent` package:

```json
{
  "name": "agent-name",
  "version": "1.0.0",
  "category": "research",
  "coordinator": {
    "prompt": "...",
    "tools": ["task"]
  },
  "subagents": [
    {
      "name": "worker",
      "prompt": "...",
      "tools": ["tool1", "tool2"]
    }
  ],
  "config": {
    "model": "smart",
    "maxTokens": 4096
  }
}
```

## Visualization

**Colors:**

- Domain: `#10B981` (Emerald)
- Agent: 🤖
- Graph: 🕸️
- Node: ⚙️
- Tool: 🔧
- State: 📊
- Model: 🧠
- StateField: 📝
- Checkpointer: 💾

**Layout Tips:**

- Use force layout for agent networks
- Color by `agent_type` or `category`
- Size by `recursion_limit` or `max_tokens`
- Group subagents near coordinators

## Integration

### Agent Builder Export

Export agent configs to knowledge graph:

```typescript
import { exportAgentToGraph } from "@/lib/agent-graph-export";

const graphData = exportAgentToGraph(agentConfig);
// graphData contains entities and relationships
```

### Live Monitoring

Track running agents (future feature):

```typescript
const execution = {
  uid: `execution:${threadId}`,
  type: "AgentExecution",
  properties: {
    agent_uid: "agent:deep_agent_researcher",
    status: "running",
    started_at: new Date().toISOString(),
  },
};
```

## Development

**Validate domain:**

```bash
pnpm run validate:domains
```

**Regenerate TypeScript:**

```bash
pnpm run scan:domains
```

**Location:**

- Config: `custom-domains/langchain/domain.config.json`
- Generated: `.generated/custom-domains/langchain.ts`
- Test Data: `test-data/langchain-agents-bundle.json`

## Next Steps

See `handoffs/2025-10-24_LANGCHAIN_DOMAIN_AUTOMATION.md` for:

- Automated agent config scanning
- Config version history tracking
- Real-time execution monitoring
- Agent performance analytics
