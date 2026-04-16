# @protolabsai/forms

## 0.3.3

### Patch Changes

- Updated dependencies [c0435ce]
  - @protolabsai/ui@0.3.3

## 0.3.2

### Patch Changes

- Updated dependencies [e8b671f]
  - @protolabsai/ui@0.3.2

## 0.3.1

### Patch Changes

- Updated dependencies [fb1e4be]
  - @protolabsai/ui@0.3.1

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

### Patch Changes

- Updated dependencies [f8f13f8]
  - @protolabsai/ui@0.3.0

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

### Patch Changes

- Updated dependencies [44db068]
  - @protolabsai/ui@0.2.0
