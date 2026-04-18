# @protolabsai/agent

## 0.2.0

### Minor Changes

- 5dfe62b: First tagged release of the rabbit-hole.io researcher agent as a proper A2A endpoint.

  The `@protolabsai/agent` package ships a spec-compliant A2A server per the protoWorkstacean [build-an-a2a-agent](https://protolabsai.github.io/protoWorkstacean/guides/build-an-a2a-agent/) guide: all 10 mandatory JSON-RPC methods on `/a2a`, SSE streaming with `kind` discriminators and the terminal 2-event sequence, atomic cancel, TTL eviction, SSRF-guarded webhooks with an allowlist for internal workstacean hostnames, and X-API-Key auth enforcement gated on `RESEARCHER_API_KEY`.

  The agent image is now published to `ghcr.io/protolabsai/rabbit-hole/agent` with the A2A discovery labels (`a2a.protoworkstacean/agent=true`, `name=researcher`, `version=<tag>`) so the fleet's `SkillBrokerPlugin` can enumerate the container from metadata alone. Skill producers for `search` and `deep_research` are currently echo stubs; real integrations will replace them in follow-up releases using the same `ctx.pushText/finish/fail` contract.

## 0.1.8

### Patch Changes

- c0435ce: Security: Patch Next.js CVE-2025-66478 (RCE)
- Updated dependencies [c0435ce]
  - @protolabsai/llm-tools@0.1.7
  - @protolabsai/utils@0.3.0

## 0.1.7

### Patch Changes

- Updated dependencies [64668b6]
  - @protolabsai/llm-tools@0.1.6

## 0.1.6

### Patch Changes

- 4e91339: Fixed CopilotKit integration errors in WritingAgent
  - Fixed Anthropic API error from orphaned tool_use blocks by routing CopilotKit frontend actions to END instead of tools node
  - Fixed message coercion errors by skipping state emission when backend tool calls are pending
  - Added state emission after tool execution to properly stream todo updates to frontend

## 0.1.5

### Patch Changes

- Updated dependencies [e8b671f]
  - @protolabsai/llm-tools@0.1.5
  - @protolabsai/utils@0.3.0

## 0.1.4

### Patch Changes

- @protolabsai/llm-tools@0.1.4

## 0.1.3

### Patch Changes

- @protolabsai/utils@0.3.0
- @protolabsai/llm-tools@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [f8f13f8]
  - @protolabsai/utils@0.3.0
  - @protolabsai/llm-tools@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [44db068]
  - @protolabsai/utils@0.2.0
  - @protolabsai/llm-tools@0.1.1

## 0.1.0

### Minor Changes

- # Initial v0.1.0 Release

  This is the first versioned release of all packages, services, and applications in the Proto monorepo.

  ## Features
  - Complete workspace package system with TypeScript support
  - Next.js 15 application (Rabbit Hole) with React 19
  - LangGraph agent system for research and entity extraction
  - Job processor service for background task processing
  - YJS collaboration server for real-time multi-user editing
  - Docker containerization with GitHub Actions CI/CD
  - Comprehensive UI component library with Tailwind CSS
  - Chart visualization components
  - Icon system with dynamic loading
  - Authentication and database utilities
  - LLM provider integrations (OpenAI, Anthropic, Groq, etc.)
  - Freehand drawing capabilities for graph visualization
  - Real-time collaboration with presence tracking

  ## Infrastructure
  - Self-hosted GitHub Actions runners
  - Docker images published to ghcr.io/proto-labs-ai/proto-starter
  - Coolify staging deployment configuration
  - PostgreSQL, Neo4j, Redis, MinIO integration
  - Comprehensive monitoring and observability setup

### Patch Changes

- Updated dependencies
  - @protolabsai/llm-providers@0.1.0
  - @protolabsai/llm-tools@0.1.0
  - @protolabsai/types@0.1.0
  - @protolabsai/utils@0.1.0
