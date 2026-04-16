# @protolabsai/ui Changelog

## 0.3.3

### Patch Changes

- c0435ce: Security: Patch Next.js CVE-2025-66478 (RCE)

## 0.3.2

### Patch Changes

- e8b671f: Added Noto theme for AI-powered writing assistant

  New theme optimized for long-form writing with:
  - Warm, paper-like color palette
  - Clean typography for extended reading
  - Comfortable dark mode for night writing
  - Purple accent for AI features

  Theme available as `noto` in theme registry.

## 0.3.1

### Patch Changes

- fb1e4be: Fixed remote cursor synchronization in collaboration sessions
  - Fixed cursor position desync by removing double-positioning bug (wrapper + transform)
  - Fixed viewport-to-canvas coordinate conversion in cursor tracking
  - Added optional `style` prop to Cursor component for opacity transitions
  - Optimized expanded nodes set comparison (O(n log n) → O(n))

## 0.3.0

### Minor Changes

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

## 0.2.0

### Minor Changes

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

## [2.1.0] - 2025-10-19

### Added

**Theme System (`@protolabsai/ui/theme`)**

- Complete whitelabel theming system migrated from `themes/` and `app/context/`
- ThemeProvider with React Context and hooks
- ThemeGenerator for dynamic CSS variable generation
- View Transitions API for smooth theme switching
- 5 built-in themes (default, corporate-blue, nature-green, dev-environment, prod-environment)
- Theme validation with Zod v4.1.12
- Full TypeScript support

**New Exports:**

- `@protolabsai/ui/theme` - Subpath export for theming system

**Dependencies:**

- Added `zod` ^4.1.12

**Documentation:**

- `src/theme/README.md` - Complete API reference
- `src/theme/THEME_CREATION.md` - Custom theme guide

**Compatibility:**

- Zero breaking changes
- `themes/index.ts` provides compatibility re-export
- Updated 3 app files to use new import paths

**Bundle Size:**

- Theme: 61.49 KB (CJS) / 58.42 KB (ESM)
- Type definitions: 8.14 KB

## [2.0.0] - 2025-10-19

### Breaking Changes

- **Atomic Design Migration**: Complete restructure using Atomic Design principles
  - Components now organized in `atoms/`, `molecules/`, `organisms/`, `templates/`
  - New import paths: `@protolabsai/ui/atoms`, `@protolabsai/ui/molecules`, etc.
  - Storybook categories updated to reflect atomic hierarchy

### Added

**Atoms (28 components):**

- All shadcn/ui primitives: Button, Badge, Input, Card, Dialog, etc.
- Icon component: Lucide icon wrapper (no @protolabsai/icon-system dependency)
- Form components: Form, Select
- Layout primitives: Tabs, Resizable, Sheet, ScrollArea
- Navigation: ContextMenu, DropdownMenu
- Feedback: Toast, Progress, Slider
- Data display: Table, Collapsible, Popover

**Molecules (7 components):**

- `Announcement` - Banner component
- `AvatarStack` - Multi-user avatars
- `Cursor` - Collaboration cursor
- `InfoBox` - Alert wrapper
- `Marquee` - Scrolling text
- `StatusBadge` - Status indicator
- `ProcessingStateBadge` - File processing states

**Organisms (13 components):**

- **AI Chat System** (7): Complete chat interface
  - Conversation, Message, PromptInput, Reasoning, Sources, AILoader
- **Feature Gating** (2): PaidFeaturePopover, TierGatedMenuItem
- **Utilities** (4): DiffView, EntitySearch, ConditionalDialog, ConfirmPopover

**Templates (4 components):**

- `ResizableChatLayout` - Chat interface layout
- `ResizableUtilityPanel` - Utility panel
- `SideNavigationPanel` - Side navigation
- `PanelHub` - Dynamic panel system (existing)

### Features

- **Atomic Design Architecture**: Clear component hierarchy
- **Tree-shakeable Exports**: Subpath exports for optimal bundling
- **Co-located Stories**: All stories live with components
- **Storybook Categories**: Organized by Atoms/Molecules/Organisms/Templates
- **Full TypeScript**: Type definitions for all components
- **Module Resolution**: Bundler mode for modern imports

### Dependencies

**Added:**

- `@radix-ui/*` packages for UI primitives
- `class-variance-authority` (^0.7.0)
- `clsx` (^2.1.1)
- `tailwind-merge` (^2.5.4)
- `react-resizable-panels` (^2.1.7)

**Peer Dependencies:**

- `@protolabsai/auth` (workspace:\*)
- `@protolabsai/utils` (workspace:\*)

### Infrastructure

- **Build System**: tsup with multi-entry support
- **Module Resolution**: Bundler mode for modern imports
- **TypeScript**: Module set to esnext
- **Exports**: Subpath exports for `/atoms`, `/molecules`, `/organisms`, `/templates`

### Documentation

- Updated README.md with atomic design guide
- Created COMPONENT_AUDIT.md with full classification
- AI Chat system documentation in `organisms/ai-chat/README.md`
- Template documentation in respective README files

### Migration Notes

App-specific components (with context/hook dependencies) remain in `app/components/ui/`:

- DialogRegistry, DialogHistoryNavigation
- FileUploadButton, ThemeSelector, ThemedUserButton
- UserStatsPage

These are documented but not exported from @protolabsai/ui.

---

## [1.0.0] - 2025-10-19

### Initial Release

- PanelHub component and utilities
- Basic infrastructure
