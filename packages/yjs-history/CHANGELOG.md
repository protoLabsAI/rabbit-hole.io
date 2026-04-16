# @protolabsai/yjs-history

## 0.1.2

### Patch Changes

- f8f13f8: Extracted reusable components from app to workspace packages

  **New Package:**
  - Created `@protolabsai/forms` with domain entity form system (77 entity types)
  - Includes EntityForm, DomainFormSelector, DynamicFormFields, mock data generation

  **Extended Packages:**
  - `@protolabsai/ui`: Added DataTable component to organisms/data-table export
  - `@protolabsai/auth`: Added UI components (TierBadge, UpgradePromptModal, ClientRoleGuard, RoleManager) via ./ui export
  - `@protolabsai/utils`: Added React utilities (lazy loading, error boundaries, tier-aware HOC) via ./react/lazy-loading export

  **Fixes:**
  - Fixed yjs-history `groupVersionsByDate` calculation for "yesterday" grouping
  - Fixed SSR compatibility in utils by properly externalizing React dependencies
  - Resolved circular dependency by moving React component deps to optional peerDependencies

  **App Changes:**
  - Updated 8 files to import from workspace packages instead of local components
  - Removed 6 component directories (forms, data, layouts, auth, billing, lazy-loading)

## 0.1.1

### Patch Changes

- 44db068: # Component Extraction

  Extracted reusable components from app to workspace packages with comprehensive fixes for dependencies, build order, and Storybook integration.

  **New Package:**
  - Created `@protolabsai/forms` with domain entity form system (77 entity types)
  - Includes EntityForm, DomainFormSelector, DynamicFormFields, mock data generation, Storybook utilities

  **Extended Packages:**
  - `@protolabsai/ui`: Added DataTable component to organisms/data-table export, EntitySearch with optional icon provider
  - `@protolabsai/auth`: Added UI components (TierBadge, UpgradePromptModal, ClientRoleGuard, RoleManager) via ./ui export
  - `@protolabsai/utils`: Added React utilities (lazy loading, error boundaries, tier-aware HOC) via ./react/lazy-loading export

  **Dependency Fixes:**
  - Added missing workspace dependencies: `@protolabsai/types` and `@protolabsai/icon-system` to `@protolabsai/ui`
  - Added `@protolabsai/utils` to `@protolabsai/llm-tools` (4 files importing from utils)
  - Resolved circular dependency (@protolabsai/utils ↔ @protolabsai/ui) by making EntitySearch accept optional `getEntityIcon` prop
  - Fixed yjs-history `groupVersionsByDate` calculation for "yesterday" grouping
  - Fixed SSR compatibility in utils by properly externalizing React dependencies

  **Build & Docker:**
  - Replaced manual package build ordering with Turbo dependency resolution in Dockerfiles
  - Updated `agent/Dockerfile` and `services/job-processor/Dockerfile` to use `pnpm turbo run build --filter=<target>...`
  - Eliminates manual build order maintenance, automatically handles dependencies

  **Storybook:**
  - Fixed 24 story files importing from old paths
  - Standardized on `@rabbit-hole` alias for app imports (consistency)
  - Extracted components use `@protolabsai/*` workspace packages
  - Added `@/` and `@protolabsai/forms` aliases to webpack config
  - ResizableChatLayout story now imports from `@protolabsai/ui/templates`
  - Added missing exports (DOMAIN_SELECTOR_ARG, STORY_ENTITY_TYPES_BY_DOMAIN) to @protolabsai/forms

  **Git Hooks:**
  - Enhanced pre-push hook with comprehensive package type-checking and clear error messages
  - Added `validate-dependencies.sh` script for staged-file dependency validation (warnings only)
  - Fixed timeout cleanup in SessionLinkModal to prevent memory leaks

  **App Changes:**
  - Updated 8 files to import from workspace packages instead of local components
  - Updated timeline/EntitySelector to pass `getEntityImage` prop to EntitySearch
  - Removed 6 component directories (forms, data, layouts, auth, billing, lazy-loading)
  - Fixed import order in auto-generated `.generated/custom-domains/registry.ts`

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
