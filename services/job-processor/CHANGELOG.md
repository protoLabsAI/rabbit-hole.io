# @services/job-processor

## 0.1.6

### Patch Changes

- c0435ce: Security: Patch Next.js CVE-2025-66478 (RCE)
- Updated dependencies [c0435ce]
  - @proto/sidequest-utils@0.1.6
  - @proto/utils@0.3.0

## 0.1.5

### Patch Changes

- @proto/sidequest-utils@0.1.5
- @proto/utils@0.3.0

## 0.1.4

### Patch Changes

- f36511a: Fixed module resolution errors in Docker/ESM environments by enabling Sidequest manual job resolution

  Added manual job resolution configuration to bypass automatic script path detection which was capturing TypeScript source paths (../../src/job/job.ts) instead of compiled JavaScript outputs, causing ERR_MODULE_NOT_FOUND errors in production containers. Job processor now uses explicit job registry (sidequest.jobs.js) that imports from compiled dist/jobs/\*.js files.

- Updated dependencies [f36511a]
  - @proto/sidequest-utils@0.1.4

## 0.1.3

### Patch Changes

- @proto/utils@0.3.0
- @proto/sidequest-utils@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [f8f13f8]
  - @proto/utils@0.3.0
  - @proto/sidequest-utils@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [44db068]
  - @proto/utils@0.2.0
  - @proto/sidequest-utils@0.1.1

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
  - @proto/database@0.1.0
  - @proto/sidequest-utils@1.1.0
  - @proto/types@0.1.0
  - @proto/utils@0.1.0
