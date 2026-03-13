# @proto/ui Migration Guide

## Version 2.0.0 - Atomic Design Migration

### Overview

@proto/ui has been restructured using Atomic Design principles. All components are now organized in `atoms/`, `molecules/`, `organisms/`, and `templates/` directories.

---

## Import Path Changes

### Before (v1.x)

```tsx
import { PanelHub } from "@proto/ui";
```

### After (v2.0.0)

```tsx
// Recommended: Import by atomic level
import { Button, Badge } from "@proto/ui/atoms";
import { StatusBadge } from "@proto/ui/molecules";
import { PaidFeaturePopover } from "@proto/ui/organisms";
import { PanelHub } from "@proto/ui/templates";

// Still works: Import from root (all re-exported)
import { Button, PanelHub } from "@proto/ui";
```

---

## Migration Strategy

### Phase 1: Audit Current Imports

```bash
# Find all @proto/ui imports
grep -r "@proto/ui" app/ packages/ --include="*.tsx" --include="*.ts"
```

### Phase 2: Update Imports by Atomic Level

No breaking changes if importing from root (`@proto/ui`), but for better tree-shaking:

**Atoms** (from `app/components/ui/`):

```tsx
// Old
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// New
import { Button, Badge } from "@proto/ui/atoms";
```

**Molecules:**

```tsx
// Old
import { StatusBadge } from "@/components/ui/status-badge";

// New
import { StatusBadge } from "@proto/ui/molecules";
```

**Organisms:**

```tsx
// Old
import { PaidFeaturePopover } from "@/components/ui/PaidFeaturePopover";
import { DiffView } from "@/components/ui/DiffView";

// New
import { PaidFeaturePopover, DiffView } from "@proto/ui/organisms";
```

**Templates:**

```tsx
// Old
import { ResizableChatLayout } from "@/components/layouts/ResizableChatLayout";

// New
import { ResizableChatLayout } from "@proto/ui/templates";
```

---

## Component Mapping

### Atoms

All shadcn/ui primitives from `app/components/ui/`:

| Old Path                 | New Import        |
| ------------------------ | ----------------- |
| `@/components/ui/button` | `@proto/ui/atoms` |
| `@/components/ui/badge`  | `@proto/ui/atoms` |
| `@/components/ui/input`  | `@proto/ui/atoms` |
| `@/components/ui/card`   | `@proto/ui/atoms` |
| `@/components/ui/dialog` | `@proto/ui/atoms` |
| `@/components/ui/form`   | `@proto/ui/atoms` |
| `@/components/ui/select` | `@proto/ui/atoms` |
| `@/components/ui/toast`  | `@proto/ui/atoms` |
| ...all shadcn primitives | `@proto/ui/atoms` |

### Molecules

| Old Path                               | New Import            |
| -------------------------------------- | --------------------- |
| `@/components/ui/announcement`         | `@proto/ui/molecules` |
| `@/components/ui/avatar-stack`         | `@proto/ui/molecules` |
| `@/components/ui/cursor`               | `@proto/ui/molecules` |
| `@/components/ui/info-box`             | `@proto/ui/molecules` |
| `@/components/ui/marquee`              | `@proto/ui/molecules` |
| `@/components/ui/status-badge`         | `@proto/ui/molecules` |
| `@/components/ui/ProcessingStateBadge` | `@proto/ui/molecules` |

### Organisms

| Old Path                             | New Import            |
| ------------------------------------ | --------------------- |
| `@/components/ui/ai-conversation`    | `@proto/ui/organisms` |
| `@/components/ui/ai-message`         | `@proto/ui/organisms` |
| `@/components/ui/ai-prompt-input`    | `@proto/ui/organisms` |
| `@/components/ui/ai-reasoning`       | `@proto/ui/organisms` |
| `@/components/ui/ai-sources`         | `@proto/ui/organisms` |
| `@/components/ui/ai-loader`          | `@proto/ui/organisms` |
| `@/components/ui/PaidFeaturePopover` | `@proto/ui/organisms` |
| `@/components/ui/TierGatedMenuItem`  | `@proto/ui/organisms` |
| `@/components/ui/ConditionalDialog`  | `@proto/ui/organisms` |
| `@/components/ui/ConfirmPopover`     | `@proto/ui/organisms` |
| `@/components/ui/DiffView`           | `@proto/ui/organisms` |
| `@/components/ui/EntitySearch`       | `@proto/ui/organisms` |

### Templates

| Old Path                                     | New Import            |
| -------------------------------------------- | --------------------- |
| `@/components/layouts/ResizableChatLayout`   | `@proto/ui/templates` |
| `@/components/layouts/ResizableUtilityPanel` | `@proto/ui/templates` |
| `@/components/layouts/SideNavigationPanel`   | `@proto/ui/templates` |
| `@proto/ui` (PanelHub)                       | `@proto/ui/templates` |

---

## Components Remaining in App

These components have app-specific dependencies and must stay in `app/components/ui/`:

- **DialogRegistry** - Uses app dialog hooks (useFamilyAnalysisDialog, etc.)
- **DialogHistoryNavigation** - Uses useDialogHistory hook
- **FileUploadButton** - Uses useSharedFileUpload hook
- **ThemeSelector** - Uses app ThemeProvider
- **ThemedUserButton** - Uses app theme + Clerk integration
- **UserStatsPage** - Uses useUserStats hook

**No migration needed** - continue importing from `@/components/ui/`

---

## Automated Migration Script

```bash
#!/bin/bash
# migrate-ui-imports.sh

# Atoms
find app packages -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  's|from "@/components/ui/button"|from "@proto/ui/atoms"|g'

find app packages -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  's|from "@/components/ui/badge"|from "@proto/ui/atoms"|g'

# Add more as needed...

# Organisms
find app packages -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  's|from "@/components/ui/PaidFeaturePopover"|from "@proto/ui/organisms"|g'

# Templates
find app packages -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  's|from "@/components/layouts/ResizableChatLayout"|from "@proto/ui/templates"|g'

echo "✅ Migration complete - run type-check"
pnpm type-check
```

---

## Rollback Plan

If migration causes issues:

1. Revert `packages/ui/package.json` version to 1.0.0
2. Checkout original `app/components/ui/` from git
3. Run `pnpm install`

```bash
git checkout HEAD -- packages/ui/package.json
git checkout HEAD -- app/components/ui/
pnpm install
```

---

## Verification Checklist

After migration:

- [ ] `pnpm build` succeeds across all packages
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] Storybook shows atomic design categories
- [ ] No console errors in browser
- [ ] Components render correctly
- [ ] No duplicate imports (mixing old/new paths)

---

## Support

For issues or questions:

- See COMPONENT_AUDIT.md for component classification
- Check README.md for usage examples
- Review Storybook stories for patterns

## Timeline

- **2025-10-19**: Initial migration to @proto/ui v2.0.0
- **Next**: Gradual import updates across codebase
