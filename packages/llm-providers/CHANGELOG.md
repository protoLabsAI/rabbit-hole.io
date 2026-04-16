# @protolabsai/llm-providers

## Unreleased

### Added

- **Type Generation System**: Auto-generated TypeScript types from `default-config.ts` for enhanced IDE autocomplete
  - Provider names (`ProviderName` type)
  - Model categories (`ModelCategory` type)
  - Model names per provider (e.g., `OpenaiModelName`, `AnthropicModelName`)
  - Provider metadata with runtime utilities
  - New `codegen` script to regenerate types from config
  - Pre-build hook ensures types are always fresh
- Type-safe function signatures for `getModel()`, `getProvider()`, and `getModelByName()`
- Helper functions: `getProviderInfo()`, `isValidProviderName()`, `isValidModelCategory()`
- Autocomplete test file for manual verification

### Changed

- `ModelCategory` type now re-exported from generated types (backwards compatible)
- Function signatures updated to use `ProviderName` and `ModelName` for better autocomplete
- Config loader uses type assertions for environment variable overrides

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
