# @proto/forms

## 0.3.3

### Patch Changes

- Updated dependencies [c0435ce]
  - @proto/ui@0.3.3

## 0.3.2

### Patch Changes

- Updated dependencies [e8b671f]
  - @proto/ui@0.3.2

## 0.3.1

### Patch Changes

- Updated dependencies [fb1e4be]
  - @proto/ui@0.3.1

## 0.3.0

### Minor Changes

- f8f13f8: Extracted reusable components from app to workspace packages

  **New Package:**
  - Created `@proto/forms` with domain entity form system (77 entity types)
  - Includes EntityForm, DomainFormSelector, DynamicFormFields, mock data generation

  **Extended Packages:**
  - `@proto/ui`: Added DataTable component to organisms/data-table export
  - `@proto/auth`: Added UI components (TierBadge, UpgradePromptModal, ClientRoleGuard, RoleManager) via ./ui export
  - `@proto/utils`: Added React utilities (lazy loading, error boundaries, tier-aware HOC) via ./react/lazy-loading export

  **Fixes:**
  - Fixed yjs-history `groupVersionsByDate` calculation for "yesterday" grouping
  - Fixed SSR compatibility in utils by properly externalizing React dependencies
  - Resolved circular dependency by moving React component deps to optional peerDependencies

  **App Changes:**
  - Updated 8 files to import from workspace packages instead of local components
  - Removed 6 component directories (forms, data, layouts, auth, billing, lazy-loading)

### Patch Changes

- Updated dependencies [f8f13f8]
  - @proto/ui@0.3.0

## 0.2.0

### Minor Changes

- 44db068: # Component Extraction

  Extracted reusable components from app to workspace packages with comprehensive fixes for dependencies, build order, and Storybook integration.

  **New Package:**
  - Created `@proto/forms` with domain entity form system (77 entity types)
  - Includes EntityForm, DomainFormSelector, DynamicFormFields, mock data generation, Storybook utilities

  **Extended Packages:**
  - `@proto/ui`: Added DataTable component to organisms/data-table export, EntitySearch with optional icon provider
  - `@proto/auth`: Added UI components (TierBadge, UpgradePromptModal, ClientRoleGuard, RoleManager) via ./ui export
  - `@proto/utils`: Added React utilities (lazy loading, error boundaries, tier-aware HOC) via ./react/lazy-loading export

  **Dependency Fixes:**
  - Added missing workspace dependencies: `@proto/types` and `@proto/icon-system` to `@proto/ui`
  - Added `@proto/utils` to `@proto/llm-tools` (4 files importing from utils)
  - Resolved circular dependency (@proto/utils ↔ @proto/ui) by making EntitySearch accept optional `getEntityIcon` prop
  - Fixed yjs-history `groupVersionsByDate` calculation for "yesterday" grouping
  - Fixed SSR compatibility in utils by properly externalizing React dependencies

  **Build & Docker:**
  - Replaced manual package build ordering with Turbo dependency resolution in Dockerfiles
  - Updated `agent/Dockerfile` and `services/job-processor/Dockerfile` to use `pnpm turbo run build --filter=<target>...`
  - Eliminates manual build order maintenance, automatically handles dependencies

  **Storybook:**
  - Fixed 24 story files importing from old paths
  - Standardized on `@rabbit-hole` alias for app imports (consistency)
  - Extracted components use `@proto/*` workspace packages
  - Added `@/` and `@proto/forms` aliases to webpack config
  - ResizableChatLayout story now imports from `@proto/ui/templates`
  - Added missing exports (DOMAIN_SELECTOR_ARG, STORY_ENTITY_TYPES_BY_DOMAIN) to @proto/forms

  **Git Hooks:**
  - Enhanced pre-push hook with comprehensive package type-checking and clear error messages
  - Added `validate-dependencies.sh` script for staged-file dependency validation (warnings only)
  - Fixed timeout cleanup in SessionLinkModal to prevent memory leaks

  **App Changes:**
  - Updated 8 files to import from workspace packages instead of local components
  - Updated timeline/EntitySelector to pass `getEntityImage` prop to EntitySearch
  - Removed 6 component directories (forms, data, layouts, auth, billing, lazy-loading)
  - Fixed import order in auto-generated `.generated/custom-domains/registry.ts`

### Patch Changes

- Updated dependencies [44db068]
  - @proto/ui@0.2.0
