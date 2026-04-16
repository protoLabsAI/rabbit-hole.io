# @protolabsai/charts Changelog

## 0.1.5

### Patch Changes

- Updated dependencies [c0435ce]
  - @protolabsai/ui@0.3.3

## 0.1.4

### Patch Changes

- Updated dependencies [e8b671f]
  - @protolabsai/ui@0.3.2
  - @protolabsai/utils@0.3.0

## 0.1.3

### Patch Changes

- Updated dependencies [fb1e4be]
  - @protolabsai/ui@0.3.1
  - @protolabsai/utils@0.3.0

## 0.1.2

### Patch Changes

- Updated dependencies [f8f13f8]
  - @protolabsai/ui@0.3.0
  - @protolabsai/utils@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [44db068]
  - @protolabsai/ui@0.2.0
  - @protolabsai/utils@0.2.0

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
  - @protolabsai/icon-system@0.1.0
  - @protolabsai/types@0.1.0
  - @protolabsai/ui@2.2.0
  - @protolabsai/utils@0.1.0

## [0.1.0] - 2025-10-19

### Added

- Initial release of @protolabsai/charts package
- Gantt chart components with atomic design architecture
- Full TypeScript support
- Drag-and-drop functionality
- Timeline visualization (daily, monthly, quarterly)
- Performance optimizations with memoization
- Comprehensive test coverage

### Components

- 4 Atoms: GanttColumn, GanttMarker, GanttToday, GanttAddFeatureHelper
- 4 Molecules: GanttHeader, GanttSidebarItem, GanttFeatureCard, GanttDragHelper
- 4 Organisms: GanttSidebar, GanttTimeline, GanttFeatureList, GanttFeatureRow
- 2 Templates: GanttProvider, GanttChart

### Migration

Migrated from `components/ui/shadcn-io/gantt/` (1,467-line monolithic component)
to modular package structure.
