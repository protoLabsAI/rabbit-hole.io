# @proto/freehand-drawing

## 0.1.7

### Patch Changes

- Updated dependencies [c0435ce]
  - @proto/ui@0.3.3
  - @proto/auth@2.0.4
  - @proto/utils@0.3.0

## 0.1.6

### Patch Changes

- Updated dependencies [e8b671f]
  - @proto/ui@0.3.2
  - @proto/auth@2.0.3
  - @proto/utils@0.3.0

## 0.1.5

### Patch Changes

- Updated dependencies [8a48e27]
  - @proto/auth@2.0.2
  - @proto/utils@0.3.0

## 0.1.4

### Patch Changes

- c355041: Fixed freehand drawing persistence and tab isolation

  Critical fixes:
  - Fixed freehand drawings appearing across all workspace tabs (now properly scoped per tab using `tabId`)
  - Added position and resize persistence (drawings now persist after drag/resize operations)
  - Improved UX: Drawings only draggable/resizable when selected, preventing accidental movement

  Performance optimizations:
  - Event-based persistence (1 update per drag/resize instead of 100+ continuous updates)
  - Reference counter pattern for echo prevention (handles rapid successive Yjs updates)
  - Selection-based draggability updates only when selection changes

  Technical changes:
  - Added `tabId` parameter to scope freehand drawings per workspace tab (format: `freehandDrawings-${tabId}`)
  - Added `onResizeEnd` callback to `useFreehandDrawing` hook
  - Implemented controlled resize with `NodeResizer.onResizeEnd`
  - Replaced boolean echo flag with reference counter (`isApplyingYjsCountRef`)
  - Freehand nodes default to `draggable: false`, dynamically enabled on selection

## 0.1.3

### Patch Changes

- fb1e4be: Enabled freehand drawing for all users and fixed eraser sync
  - Removed tier restrictions - freehand drawing now available to all users (Free, Basic, Pro, Team, Enterprise)
  - Fixed eraser tool not syncing deletions to remote users via Yjs
  - Added Yjs deletion sync in handleNodesChange for freehand nodes
  - Updated Free tier limits to include hasDrawingTools: true
  - Fixed cursor sync wrapper intercepting freehand deletions

- Updated dependencies [fb1e4be]
- Updated dependencies [fb1e4be]
  - @proto/auth@2.0.1
  - @proto/ui@0.3.1
  - @proto/utils@0.3.0

## 0.1.2

### Patch Changes

- Updated dependencies [f8f13f8]
  - @proto/ui@0.3.0
  - @proto/auth@2.0.0
  - @proto/utils@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [44db068]
  - @proto/ui@0.2.0
  - @proto/auth@1.0.0
  - @proto/utils@0.2.0

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
  - @proto/auth@0.1.0
  - @proto/icon-system@0.1.0
  - @proto/ui@2.2.0
  - @proto/utils@0.1.0
