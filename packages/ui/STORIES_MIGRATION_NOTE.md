# Storybook Stories Migration Note

**Issue:** Dialog system stories depend on app-specific components

---

## Stories Removed from @proto/ui

The following stories were copied but then removed because they depend on app-specific hooks/components:

### Dialog System Stories (4 files)

- `dialog-registry.stories.tsx` - Uses DialogRegistry (app-specific)
- `dialog-navigation.stories.tsx` - Uses DialogHistoryNavigation + useDialogHistory
- `conditional-dialogs.stories.tsx` - Uses dialog hooks + DialogRegistry
- `dialog-system-overview.stories.tsx` - Uses all dialog hooks + DialogRegistry
- `stories/DialogStoryUtils.tsx` - Utility file importing DialogRegistry

**Reason:** These stories showcase the complete dialog system which is tightly coupled to app context:

- useFamilyAnalysisDialog
- useBiographicalAnalysisDialog
- useResearchReportDialog
- useEntityMergeDialog
- useFileUploadDialog
- DialogRegistry component

**Action:** Kept in `app/components/ui/` with original import paths

---

## Stories Successfully Migrated

### Organisms

- ✅ `ai-chat/ai-chat.stories.tsx` - AI chat interface (portable)
- ✅ `feature-gating/paid-feature-popover.stories.tsx` - Feature gating (portable)
- ✅ `diff-view/diff-view.stories.tsx` - Diff visualization (portable)

### Templates

- ✅ `resizable-chat-layout/resizable-chat-layout.stories.tsx` - Layout (portable)
- ✅ `panel-hub/PanelHub.stories.tsx` - Panel system (already existed)

---

## Dialog System in App

The dialog system stories remain in `app/components/ui/` because:

1. **DialogRegistry** is app-specific (not in @proto/ui)
2. **Dialog hooks** are app-specific (useFamilyAnalysisDialog, etc.)
3. **Stories** showcase complete integration with app features

These stories continue to work from their original location.

---

## Storybook Organization

### From @proto/ui

```
Organisms/
├── AI Chat/
│   └── Chat Interface
├── Feature Gating/
│   └── Paid Feature Popover
└── Diff View

Templates/
├── Resizable Chat Layout
└── Panel Hub
```

### From app/components/ui (unchanged)

```
System/Dialogs/
├── Dialog Registry
├── Dialog Navigation
├── Conditional Dialogs
└── Dialog System Overview
```

---

## Why This Makes Sense

**@proto/ui stories:**

- Showcase portable, reusable components
- No app dependencies
- Can be used in any project

**app/ stories:**

- Showcase app-specific integrations
- Use app hooks and context
- Demonstrate real use cases

---

## Resolution

Storybook errors resolved by removing app-dependent stories from @proto/ui package.

**Status:** ✅ Fixed - Build successful
