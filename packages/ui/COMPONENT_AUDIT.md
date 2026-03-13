# UI Component Audit - Atomic Design Classification

**Date:** 2025-10-19
**Status:** Complete
**Total Components:** 61

## Classification Criteria

- **ATOMS**: Pure UI primitives, no business logic, single responsibility
- **MOLECULES**: 2-3 atoms combined, minimal state/logic
- **ORGANISMS**: Complex features with state, multiple molecules/atoms
- **TEMPLATES**: Page-level layouts, composition patterns

---

## ATOMS (27 components)

Basic building blocks from shadcn/ui and simple primitives.

### Base Primitives

- `alert.tsx` - Alert component with variants
- `avatar.tsx` - User avatar display
- `badge.tsx` - Status/label badge
- `button.tsx` - Button with variants
- `card.tsx` - Card container (Card, CardHeader, CardTitle, CardContent, CardFooter)
- `checkbox.tsx` - Checkbox input
- `collapsible.tsx` - Collapsible wrapper
- `input.tsx` - Text input field
- `label.tsx` - Form label
- `popover.tsx` - Popover container
- `progress.tsx` - Progress bar
- `scroll-area.tsx` - Scrollable container
- `separator.tsx` - Visual separator
- `slider.tsx` - Range slider
- `switch.tsx` - Toggle switch
- `textarea.tsx` - Multi-line text input

### Form Primitives

- `form.tsx` - Form utilities (FormProvider, FormField, etc.)
- `select.tsx` - Select dropdown

### Layout Primitives

- `tabs.tsx` - Tab navigation
- `resizable.tsx` - Resizable panels primitive
- `sheet.tsx` - Slide-out panel

### Navigation Primitives

- `context-menu.tsx` - Right-click context menu
- `dropdown-menu.tsx` - Dropdown menu
- `dialog.tsx` - Modal dialog primitive

### Feedback Primitives

- `toast.tsx` - Toast notification
- `toaster.tsx` - Toast container

### Other

- `table.tsx` - Table components

---

## MOLECULES (8 components)

Simple compositions of atoms with minimal logic.

- `announcement.tsx` - Announcement banner (badge + text)
- `avatar-stack.tsx` - Multiple avatars stacked
- `cursor.tsx` - Collaboration cursor indicator
- `info-box.tsx` - Alert wrapper with styling
- `marquee.tsx` - Scrolling text container
- `status-badge.tsx` - Badge with status logic
- `ProcessingStateBadge.tsx` - File processing status display
- `shadcn-io/avatar-group.tsx` - Avatar grouping (similar to avatar-stack)

**Note:** `shadcn-io/cursor.tsx` is duplicate of `cursor.tsx` - consolidate during migration

---

## ORGANISMS (24 components)

Complex UI systems with significant state and business logic.

### AI Chat System (7 components)

- `ai-conversation.tsx` - Scrollable chat container with auto-scroll
- `ai-message.tsx` - Message display with role-based styling
- `ai-prompt-input.tsx` - Input with keyboard shortcuts
- `ai-reasoning.tsx` - Collapsible AI reasoning display
- `ai-sources.tsx` - Source citation display
- `ai-loader.tsx` - Loading states for AI
- `ai-chat-example.stories.tsx` - Complete chat interface story

**Documentation:** `AI_CHAT_COMPONENTS.md`

### Dialog System (4 components)

- `DialogRegistry.tsx` - Centralized dialog manager
- `DialogHistoryNavigation.tsx` - Back/forward navigation
- `ConditionalDialog.tsx` - Permission-based dialogs
- `ConfirmPopover.tsx` - Confirmation popover

**Stories:** Remain in `app/components/ui/` (app-specific dependencies)

### Feature Gating (2 components)

- `PaidFeaturePopover.tsx` - Tier-based feature access
- `TierGatedMenuItem.tsx` - Menu items with tier restrictions

**Stories:** `PaidFeaturePopover.stories.tsx`

### Theme System (2 components)

- `ThemeSelector.tsx` - Theme picker component
- `ThemedUserButton.tsx` - Clerk UserButton with theme integration

### Complex Utilities (5 components)

- `DiffView.tsx` - Diff visualization with field changes
- `EntitySearch.tsx` - Entity search with autocomplete
- `FileUploadButton.tsx` - File upload with state management
- `UserStatsPage.tsx` - User statistics display

**Stories:** `DiffView.stories.tsx`

### Story Utilities

- `stories/DialogStoryUtils.tsx` - Shared story utilities and mock data

---

## TEMPLATES (4 components)

Page-level layouts and composition patterns.

From `app/components/layouts/`:

- `ResizableChatLayout.tsx` - Resizable chat interface layout
- `ResizableUtilityPanel.tsx` - Utility panel with resize
- `SideNavigationPanel.tsx` - Side navigation layout

**Stories:** `ResizableChatLayout.stories.tsx`

**Documentation:** `README.md`, `ResizableUtilityPanel.md`, `SideNavigationPanel.md`

From `packages/ui/src/panel-hub/`:

- `PanelHub.tsx` - Already migrated

---

## Special Cases

### Tests

- `__tests__/DialogRegistry.test.tsx` - Migrate with DialogRegistry

### Barrel Exports

- `index.ts` - Will be replaced with atomic exports

### Documentation

- `AI_CHAT_COMPONENTS.md` - Migrate to `packages/ui/src/organisms/ai-chat/README.md`

---

## Migration Priority

1. **Phase 1 - Atoms** (27): Foundation, no dependencies
2. **Phase 2 - Molecules** (8): Depend on atoms only
3. **Phase 3 - Organisms** (24): Complex, depend on atoms + molecules
4. **Phase 4 - Templates** (4): Highest level, depend on everything

---

## Dependencies to Consider

### Internal Dependencies

- `@proto/icon-system` - Icon components
- `@proto/auth/client` - User roles and permissions
- `@proto/utils/atlas` - Entity utilities

### External Dependencies

- `@radix-ui/*` - UI primitives
- `@clerk/nextjs` - Authentication (ThemedUserButton)
- `react-resizable-panels` - Resizable layouts
- `nuqs` - URL state (PanelHub)
- `@tanstack/react-query` - Data fetching (PanelHub)

---

## Total Component Count by Level

- **Atoms:** 27 (44%)
- **Molecules:** 8 (13%)
- **Organisms:** 24 (39%)
- **Templates:** 4 (7%)

**Total:** 61 components (excluding tests and utilities)

---

## Next Steps

1. Set up atomic directory structure in `packages/ui/src/`
2. Begin migration with atoms (no dependencies)
3. Update stories to use atomic titles (`Atoms/Button`, etc.)
4. Configure package.json exports
5. Update imports across codebase
