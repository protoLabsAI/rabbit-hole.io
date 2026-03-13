# Agent Server

A modular LangGraph agent with CopilotKit integration for building conversational AI applications.

## Overview

This agent server provides a clean, modular architecture for building LangGraph-based conversational agents. It features seamless integration with CopilotKit for frontend AI assistance and follows best practices for maintainable, extensible agent development.

## Architecture

The agent is organized into distinct modules for better separation of concerns:

```
src/
├── shared/                # Shared components across agents
│   └── tools/            # Reusable tools for multiple agents
│       ├── theme.ts      # Theme color changing tool
│       └── index.ts      # Shared tools exports
├── sample-agent/          # Full-featured sample agent
│   ├── tools/            # Agent-specific and shared tools
│   │   ├── weather.ts    # Weather tool implementation
│   │   └── index.ts      # Tool exports and registry
│   ├── graph/            # Workflow graph and node definitions
│   │   ├── nodes.ts      # Node implementations (chat_node, etc.)
│   │   ├── workflow.ts   # Graph structure and flow control
│   │   └── index.ts      # Compiled graph exports
│   ├── prompts/          # System messages and prompt templates
│   │   └── index.ts      # Prompt creation utilities
│   ├── state.ts          # State management and type definitions
│   └── index.ts          # Main module exports
├── proto-agent/          # Minimal theme-focused agent
│   ├── tools/            # Proto agent tools (imports shared)
│   ├── graph/            # Simplified graph structure
│   ├── prompts/          # Theme-focused prompts
│   ├── state.ts          # Minimal state definition
│   ├── index.ts          # Proto agent exports
│   └── README.md         # Proto agent documentation
├── person-research-agent/ # Specialized person entity research
│   ├── tools/            # Wikipedia integration, person research
│   ├── graph/            # Person research workflow
│   ├── prompts/          # Person-specific research prompts
│   ├── state.ts          # Person research state management
│   └── index.ts          # Person research agent exports
├── entity-research-agent/ # Universal entity research (NEW)
│   └── index.ts          # Multi-entity type research (Organization, Platform, etc.)
├── agent.ts              # Main entry point (sample agent)
└── index.ts              # Server exports (all agents)
```

## Features

- **Modular Design**: Clean separation between tools, graph logic, prompts, and state
- **Multiple Agents**: Sample agent (full-featured), Proto agent (theme-focused), Person research agent, and Universal entity research agent
- **Universal Entity Research**: AI-powered research for all entity types (Person, Organization, Platform, Movement, Event)
- **Shared Tools**: Reusable tools across different agents (theme colors, research tools, etc.)
- **CopilotKit Integration**: Seamless frontend AI assistance capabilities
- **Type Safety**: Full TypeScript support with proper type definitions
- **Memory Management**: Built-in conversation memory with checkpointing
- **LangGraph Workflows**: Enterprise-grade AI processing pipelines with state management
- **Extensible Tools**: Easy-to-add tool system for expanding agent capabilities
- **Flow Control**: Sophisticated routing between agent nodes and tool execution
- **Custom Endpoints**: Direct API access to individual agents

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- OpenAI API key

### Installation

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   # Create .env file or set environment variables
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Build the project:**
   ```bash
   pnpm build
   ```

### Usage

#### Basic Agent Usage

```typescript
import { graph, AgentState } from "./src/agent";

// Initialize agent state
const initialState: Partial<AgentState> = {
  messages: [],
  language: "english",
  proverbs: [],
};

// Run the agent
const result = await graph.invoke(initialState, {
  configurable: { thread_id: "conversation-1" },
});
```

#### With CopilotKit Actions

The agent automatically integrates with CopilotKit actions passed through the state:

```typescript
const stateWithActions: Partial<AgentState> = {
  messages: [
    /* your messages */
  ],
  copilotkit: {
    actions: [
      // CopilotKit actions from frontend
    ],
  },
};
```

## Development

### Adding New Tools

#### Shared Tools (Recommended for multi-agent use)

1. **Create a shared tool** in `src/shared/tools/`:

   ```typescript
   // src/shared/tools/my-shared-tool.ts
   import { tool } from "@langchain/core/tools";
   import { z } from "zod";

   export const mySharedTool = tool(
     (args) => {
       // Tool implementation
       return "Tool result";
     },
     {
       name: "mySharedTool",
       description: "Description of what this tool does",
       schema: z.object({
         param: z.string().describe("Parameter description"),
       }),
     }
   );
   ```

2. **Export the shared tool** in `src/shared/tools/index.ts`:

   ```typescript
   export { mySharedTool } from "./my-shared-tool";

   // Add to shared tools array
   export const sharedTools = [changeThemeColor, mySharedTool];
   ```

3. **Use in any agent** by importing in the agent's tools index:

   ```typescript
   // src/sample-agent/tools/index.ts or src/proto-agent/tools/index.ts
   import { mySharedTool } from "../../shared/tools";
   export const tools = [existingTools..., mySharedTool];
   ```

#### Agent-Specific Tools

For tools that only apply to one agent, create them in the agent's tools directory:

1. **Create tool** in `src/[agent-name]/tools/my-tool.ts`
2. **Export** in `src/[agent-name]/tools/index.ts`

### Modifying Agent Behavior

#### Custom Prompts

Update `src/sample-agent/prompts/index.ts` to modify system messages:

```typescript
export function createSystemMessage(language?: string): SystemMessage {
  return new SystemMessage({
    content: `Your custom system prompt here. Language: ${
      language || "english"
    }.`,
  });
}
```

#### Adding New Nodes

Extend the graph by adding nodes in `src/sample-agent/graph/nodes.ts` and updating the workflow in `workflow.ts`.

#### State Management

Extend the agent state in `src/sample-agent/state.ts`:

```typescript
export const AgentStateAnnotation = Annotation.Root({
  proverbs: Annotation<string[]>,
  language: Annotation<string>,
  // Add your custom fields here
  customField: Annotation<YourType>,
  ...CopilotKitStateAnnotation.spec,
});
```

### Testing

```bash
# Run tests
pnpm test

# Run with watch mode
pnpm test:watch
```

### Building

```bash
# Development build
pnpm build

# Production build
pnpm build:prod
```

## Configuration

### Environment Variables

| Variable            | Description                     | Default  |
| ------------------- | ------------------------------- | -------- |
| `OPENAI_API_KEY`    | OpenAI API key for model access | Required |
| `MODEL_NAME`        | OpenAI model to use             | `gpt-4o` |
| `MODEL_TEMPERATURE` | Model temperature setting       | `0`      |

### LangGraph Configuration

The agent uses `langgraph.json` for configuration. See [LangGraph documentation](https://langchain-ai.github.io/langgraph/) for advanced configuration options.

## Integration with CopilotKit

This agent is designed to work seamlessly with CopilotKit:

1. **Frontend Actions**: Actions defined in your frontend are automatically available to the agent
2. **State Synchronization**: Agent state integrates with CopilotKit's state management
3. **Tool Routing**: Intelligent routing between agent tools and CopilotKit actions

For CopilotKit integration examples, see the [CopilotKit documentation](https://docs.copilotkit.ai/).

## Available Agents

### Sample Agent (Default)

- **Purpose**: Full-featured conversational agent with multiple tools
- **Tools**: Weather information, theme color changing
- **Endpoint**: Uses CopilotKit integration (see main `/api/copilotkit`)
- **Use Case**: General conversational AI with multiple capabilities

### Proto Agent

- **Purpose**: Minimal theme-focused agent for UI customization
- **Tools**: Theme color changing
- **Endpoint**: `/api/proto-agent` (direct API access)
- **Use Case**: Simple theme customization, testing new tools
- **Documentation**: See `src/proto-agent/README.md`

## API Reference

### Core Exports

- `graph`: Sample agent compiled LangGraph workflow
- `protoGraph`: Proto agent compiled workflow
- `AgentState`: Sample agent TypeScript type
- `ProtoAgentState`: Proto agent TypeScript type
- `sharedTools`: All shared tools available across agents

### Module Exports

- `sampleAgent`: Complete sample agent module
- `protoAgent`: Complete proto agent module
- `sharedTools`: Shared tools and utilities

## Contributing

1. Follow the modular architecture patterns
2. Add TypeScript types for all new functionality
3. Include tests for new tools and nodes
4. Update this README for any architectural changes

## Troubleshooting

### Common Issues

1. **Missing OpenAI API Key**: Ensure `OPENAI_API_KEY` is set
2. **Build Errors**: Check TypeScript configuration and dependencies
3. **Memory Issues**: Verify checkpointer configuration in graph compilation

### Debug Mode

Enable debug logging:

```bash
DEBUG=langgraph:* pnpm start
```

## License

See LICENSE file in the project root.
