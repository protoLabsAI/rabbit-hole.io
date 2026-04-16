# @protolabsai/rabbit-hole

## 0.4.2

### Patch Changes

- c0435ce: Security: Patch Next.js CVE-2025-66478 (RCE)
- Updated dependencies [c0435ce]
  - @protolabsai/llm-tools@0.1.7
  - @protolabsai/sidequest-utils@0.1.6
  - @protolabsai/ui@0.3.3
  - @protolabsai/auth@2.0.4
  - @protolabsai/charts@0.1.5
  - @protolabsai/forms@0.3.3
  - @protolabsai/freehand-drawing@0.1.7
  - @protolabsai/graph-editor@0.1.6
  - @protolabsai/utils@0.3.0
  - @protolabsai/api-utils@0.1.6

## 0.4.1

### Patch Changes

- 64668b6: Improved Research Agent playground UI with collapsible panels and better graph visualization
  - Playground Hub sidebar is now fully collapsible with smooth transitions
  - Research Agent panel converted to collapsible design with fade animations
  - Removed chat sidebar in favor of streamlined control panel
  - Force graph nodes now spawn with more spacing (improved layout parameters)
  - Fixed stale entity cleanup when research completes (bundle is now authoritative)
  - Removed Card wrapper from progress card for cleaner appearance

- Updated dependencies [64668b6]
  - @protolabsai/llm-tools@0.1.6

## 0.4.0

### Minor Changes

- 4e91339: Added agent task progress panel to Writing Playground
  - Added AgentTodoPanel component displaying writing agent's task progress in real-time
  - Panel shows todo status (pending/in_progress/completed/failed) with visual indicators
  - Collapsible floating panel in top-right corner, separate from user's todo list
  - Uses useCoAgent hook to track agent state similar to ResearchChatInterface pattern

## 0.3.2

### Patch Changes

- Updated dependencies [e8b671f]
- Updated dependencies [e8b671f]
  - @protolabsai/ui@0.3.2
  - @protolabsai/llm-tools@0.1.5
  - @protolabsai/auth@2.0.3
  - @protolabsai/charts@0.1.4
  - @protolabsai/forms@0.3.2
  - @protolabsai/freehand-drawing@0.1.6
  - @protolabsai/graph-editor@0.1.5
  - @protolabsai/sidequest-utils@0.1.5
  - @protolabsai/utils@0.3.0
  - @protolabsai/api-utils@0.1.5

## 0.3.1

### Patch Changes

- Updated dependencies [f36511a]
  - @protolabsai/sidequest-utils@0.1.4
  - @protolabsai/llm-tools@0.1.4

## 0.3.0

### Minor Changes

- 49780c5: Added utility panel toggle button and improved panel layout behavior
  - Added toolbar toggle button to show/hide utility panel in research workspace
  - Fixed utility panel overlay issue by implementing proper vertical ResizablePanelGroup
  - Utility panel now properly shares vertical space with graph canvas instead of overlaying
  - Panel starts collapsed by default for cleaner initial view
  - Resize handle hidden when using toolbar toggle (toggle-only mode)
  - Panel state persists across sessions via localStorage

## 0.2.5

### Patch Changes

- 7425c2e: Fixed utility panel overlaying graph canvas and added toolbar toggle

  **Bug Fixes:**
  - Utility panel now properly shares vertical space with graph instead of overlaying
  - Resize handle hides when panels are collapsed to prevent visual clutter
  - Fixed potential hydration mismatch by initializing activeTab to empty string (effect sets correct tab after mount)

  **Enhancements:**
  - Added utility panel toggle button to horizontal toolbar (panel-bottom icon)
  - Utility panel opens at maximum height (75%) when toggled on
  - Removed manual resize handles from both chat and utility panels (toggle-only mode)
  - Panel collapse state properly syncs with toolbar button visual state

  **Technical Changes:**
  - Wrapped graph and utility panel in vertical ResizablePanelGroup
  - Converted UtilityPanel from absolute positioning to ResizablePanel child
  - Added ImperativePanelHandle ref for programmatic panel control
  - Deferred ref manipulation to useEffect to avoid render-time updates
  - Removed unused size props (defaultSize/minSize/maxSize) from UtilityPanel interface

## 0.2.4

### Patch Changes

- 981fbff: Added Merge to Neo4j dialog for super admins

  **New Features:**
  - Super admin-only context menu action to merge local research graphs to Neo4j
  - Preview dialog showing entity and relationship counts by type
  - Role-based menu filtering (requiredRole support in context menu system)
  - Success/error feedback with detailed merge results
  - Direct navigation to Atlas after successful merge

  **Implementation:**
  - Created MergeToNeo4jDialog component with preview stats and warnings
  - Added useMergeToNeo4jDialog hook for state management
  - Extended context menu system with requiredRole field for admin-only actions
  - Integrated with existing mergeResearchToNeo4j server action
  - Added "View in Atlas" action in success state

  **Note:** Preview shows totals only - cannot distinguish new vs existing entities without Neo4j check. See enhancement handoff for accurate duplicate detection.

## 0.2.3

### Patch Changes

- 6e85161: Fix collaboration session and confirm dialog context issues
  - Fixed ConfirmDialogProvider context availability by moving to outermost provider level in research page
  - Added ConfirmDialogProvider to session host and view pages to prevent "useConfirmDialog must be used within ConfirmDialogProvider" errors
  - Added last_pruned_at, pruning_enabled, and history_retention_days columns to yjs_documents table migration
  - Removed "Waiting for Data" overlay from collaboration sessions to allow all participants to start with blank canvas
  - Fixed import paths for ConfirmDialogProvider using correct @/ alias resolution

  These changes ensure collaboration sessions work properly from the start and context providers are available wherever graph components are rendered.

## 0.2.2

### Patch Changes

- 8501e1b: Add ConfirmDialogProvider to session pages
  - Wrapped HostSessionClient with ConfirmDialogProvider to fix "useConfirmDialog must be used within ConfirmDialogProvider" error
  - Wrapped ViewSessionClient with ConfirmDialogProvider for consistency
  - Fixes context error when GraphCanvasIntegrated (which uses useConfirmDialog) is rendered in session routes
  - Ensures all routes using graph components have proper provider context

## 0.2.1

### Patch Changes

- 8e01f95: Fix useConfirmDialog context provider availability and add fallback
  - Reorganized provider hierarchy to ensure ConfirmDialogProvider wraps all components that use useConfirmDialog hook
  - Added defensive fallback to native window.confirm() when provider context is unavailable
  - Prevents "useConfirmDialog must be used within ConfirmDialogProvider" crashes with graceful degradation
  - Added development warnings to help identify provider mounting issues

## 0.2.0

### Minor Changes

- 383d973: Add modern dialog system to replace native browser alerts and confirms

  Migrated all native browser `alert()` and `confirm()` dialogs to modern, accessible UI components:
  - Added `ConfirmDialog` component with provider-based context API for promise-based confirmations
  - Replaced blocking native dialogs with non-blocking styled components from @protolabsai/ui
  - Improved UX with keyboard navigation (Tab, ESC) and screen reader support
  - Updated research workspace (graph operations, version history, entity cards)
  - Updated dashboard (session management with ConfirmPopover)
  - Updated Atlas graph viewer (Toast notifications for feedback)
  - Updated extraction playground (error handling with Toast)

  **User Impact:**
  - Better accessibility and keyboard navigation
  - Non-blocking confirmations (no page freeze)
  - Consistent design system styling
  - Clearer error messages and feedback
  - Mobile-responsive dialogs

### Patch Changes

- 383d973: Add automated database migration checking and running to dev-start-full.sh script. The development startup now checks if critical database tables exist and prompts to run migrations if missing. A new standalone migration runner script is also available via `pnpm run dev:migrate` for running migrations without restarting services.

## 0.1.5

### Patch Changes

- Updated dependencies [8a48e27]
  - @protolabsai/auth@2.0.2
  - @protolabsai/api-utils@0.1.4
  - @protolabsai/freehand-drawing@0.1.5
  - @protolabsai/graph-editor@0.1.4
  - @protolabsai/utils@0.3.0

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

- Updated dependencies [c355041]
  - @protolabsai/freehand-drawing@0.1.4

## 0.1.3

### Patch Changes

- fb1e4be: Enabled freehand drawing for all users and fixed eraser sync
  - Removed tier restrictions - freehand drawing now available to all users (Free, Basic, Pro, Team, Enterprise)
  - Fixed eraser tool not syncing deletions to remote users via Yjs
  - Added Yjs deletion sync in handleNodesChange for freehand nodes
  - Updated Free tier limits to include hasDrawingTools: true
  - Fixed cursor sync wrapper intercepting freehand deletions

- fb1e4be: Fixed remote cursor synchronization in collaboration sessions
  - Fixed cursor position desync by removing double-positioning bug (wrapper + transform)
  - Fixed viewport-to-canvas coordinate conversion in cursor tracking
  - Added optional `style` prop to Cursor component for opacity transitions
  - Optimized expanded nodes set comparison (O(n log n) → O(n))

- Updated dependencies [fb1e4be]
- Updated dependencies [fb1e4be]
  - @protolabsai/freehand-drawing@0.1.3
  - @protolabsai/auth@2.0.1
  - @protolabsai/ui@0.3.1
  - @protolabsai/api-utils@0.1.3
  - @protolabsai/graph-editor@0.1.3
  - @protolabsai/utils@0.3.0
  - @protolabsai/charts@0.1.3
  - @protolabsai/forms@0.3.1
  - @protolabsai/llm-tools@0.1.3
  - @protolabsai/sidequest-utils@0.1.3

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

- Updated dependencies [f8f13f8]
  - @protolabsai/forms@0.3.0
  - @protolabsai/ui@0.3.0
  - @protolabsai/auth@2.0.0
  - @protolabsai/utils@0.3.0
  - @protolabsai/yjs-history@0.1.2
  - @protolabsai/charts@0.1.2
  - @protolabsai/freehand-drawing@0.1.2
  - @protolabsai/graph-editor@0.1.2
  - @protolabsai/llm-tools@0.1.2
  - @protolabsai/sidequest-utils@0.1.2
  - @protolabsai/api-utils@0.1.2
  - @protolabsai/collab@0.1.2

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

- Updated dependencies [44db068]
  - @protolabsai/forms@0.2.0
  - @protolabsai/ui@0.2.0
  - @protolabsai/auth@1.0.0
  - @protolabsai/utils@0.2.0
  - @protolabsai/yjs-history@0.1.1
  - @protolabsai/charts@0.1.1
  - @protolabsai/freehand-drawing@0.1.1
  - @protolabsai/graph-editor@0.1.1
  - @protolabsai/llm-tools@0.1.1
  - @protolabsai/sidequest-utils@0.1.1
  - @protolabsai/api-utils@0.1.1
  - @protolabsai/collab@0.1.1

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
  - @protolabsai/api-utils@0.1.0
  - @protolabsai/assets@0.1.0
  - @protolabsai/auth@0.1.0
  - @protolabsai/charts@0.2.0
  - @protolabsai/collab@0.1.0
  - @protolabsai/database@0.1.0
  - @protolabsai/freehand-drawing@0.1.0
  - @protolabsai/graph-editor@0.2.0
  - @protolabsai/icon-system@0.1.0
  - @protolabsai/llm-providers@0.1.0
  - @protolabsai/llm-tools@0.1.0
  - @protolabsai/logger@0.1.0
  - @protolabsai/prompts@0.1.0
  - @protolabsai/sidequest-utils@1.1.0
  - @protolabsai/types@0.1.0
  - @protolabsai/ui@2.2.0
  - @protolabsai/utils@0.1.0
  - @protolabsai/workspace@0.2.0
  - @protolabsai/yjs-history@1.1.0
