# @proto/ui

Shared UI component library organized by Atomic Design principles.

## Overview

**@proto/ui** is a monorepo-wide design system providing reusable components from basic primitives to complex organisms and templates. All components are built on shadcn/ui with full TypeScript support and Storybook documentation.

## Architecture: Atomic Design

Components are organized into four levels:

- **Atoms** (27): Basic UI primitives (button, input, badge, etc.)
- **Molecules** (7): Simple compositions (status-badge, avatar-stack, etc.)
- **Organisms** (13): Complex features (AI chat, feature gating, diff-view, etc.)
- **Templates** (4): Layout patterns (resizable panels, chat layouts, etc.)

## Installation

```bash
# Already installed in monorepo
pnpm install
```

## Usage

### Import by Atomic Level (Recommended)

```tsx
// Atoms - basic primitives
import { Button, Badge, Input } from "@proto/ui/atoms";

// Molecules - simple compositions
import { StatusBadge, AvatarStack } from "@proto/ui/molecules";

// Organisms - complex features
import {
  AILoader,
  Conversation,
  PaidFeaturePopover,
} from "@proto/ui/organisms";

// Templates - layouts
import { ResizableChatLayout, PanelHub } from "@proto/ui/templates";
```

### Import Everything (Tree-shakeable)

```tsx
import { Button, StatusBadge, PanelHub } from "@proto/ui";
```

## Theming System

@proto/ui includes a complete whitelabel theming system:

```tsx
import {
  ThemeProvider,
  useTheme,
  ThemeGenerator,
  getTheme,
  type ThemeConfig,
} from "@proto/ui/theme";

// Wrap app
<ThemeProvider defaultThemeName="corporate-blue">{children}</ThemeProvider>;

// Use theme
const { themeName, setTheme, toggleColorScheme } = useTheme();
```

**Features:**

- 🎨 Dynamic CSS variable generation
- 🌗 Light/dark mode with system preference
- ✨ View Transitions API animations
- 🏢 Whitelabel branding (logo, favicon, colors)
- 🎯 5 built-in themes
- 🔒 Zod v4 validation

**Built-in Themes:** default, corporate-blue, nature-green, dev-environment, prod-environment

**Documentation:** [Theme README](./src/theme/README.md) · [Theme Creation Guide](./src/theme/THEME_CREATION.md)

## Component Catalog

### Atoms (27)

**Base Primitives:**

- `Alert` - Alert component with variants
- `Avatar` - User avatar display
- `Badge` - Status/label badge
- `Button` - Button with variants
- `Card` - Card container with header/footer
- `Checkbox` - Checkbox input
- `Icon` - Lucide icon wrapper (kebab-case names)
- `Input` - Text input field
- `Label` - Form label
- `Separator` - Visual separator
- `Switch` - Toggle switch
- `Textarea` - Multi-line input

**Form:**

- `Form` - Form utilities (FormProvider, FormField)
- `Select` - Select dropdown

**Layout:**

- `Tabs` - Tab navigation
- `Resizable` - Resizable panels
- `Sheet` - Slide-out panel
- `ScrollArea` - Scrollable container

**Navigation:**

- `ContextMenu` - Right-click menu
- `DropdownMenu` - Dropdown menu
- `Dialog` - Modal dialog

**Feedback:**

- `Toast` - Toast notifications
- `Progress` - Progress bar
- `Slider` - Range slider

**Data Display:**

- `Table` - Table components
- `Collapsible` - Collapsible wrapper
- `Popover` - Popover container

### Molecules (7)

- `Announcement` - Announcement banner
- `AvatarStack` - Multiple avatars
- `Cursor` - Collaboration cursor
- `InfoBox` - Alert wrapper
- `Marquee` - Scrolling container
- `StatusBadge` - Status display
- `ProcessingStateBadge` - File processing states

### Organisms (13)

**AI Chat System (7):**

- `Conversation` - Chat container with auto-scroll
- `Message` - Message display
- `PromptInput` - Input with shortcuts
- `Reasoning` - AI reasoning display
- `Sources` - Source citations
- `AILoader` - Loading states

**Feature Gating (2):**

- `PaidFeaturePopover` - Tier-based access
- `TierGatedMenuItem` - Menu with tier gates

**Utilities (4):**

- `DiffView` - Field change visualization
- `EntitySearch` - Entity autocomplete
- `ConditionalDialog` - Permission-based dialogs
- `ConfirmPopover` - Confirmation popover

### Templates (4)

- `ResizableChatLayout` - Chat interface layout
- `ResizableUtilityPanel` - Utility panel layout
- `SideNavigationPanel` - Side nav layout
- `PanelHub` - Dynamic panel system

## Storybook

All components include co-located stories organized by atomic hierarchy:

```
Storybook
├── Atoms/
│   ├── Button
│   ├── Badge
│   └── ...
├── Molecules/
│   ├── Status Badge
│   └── ...
├── Organisms/
│   ├── AI Chat/
│   │   └── Chat Interface
│   ├── Dialog System/
│   │   ├── Conditional Dialogs
│   │   └── Confirm Popover
│   ├── Feature Gating/
│   │   └── Paid Feature Popover
│   └── Diff View
└── Templates/
    ├── Resizable Chat Layout
    └── Panel Hub
```

Run Storybook:

```bash
pnpm storybook
```

## Package Structure

```
packages/ui/src/
├── atoms/          # 27 primitives
├── molecules/      # 7 compositions
├── organisms/      # 13 complex features
├── templates/      # 4 layouts
├── theme/          # Theming system ⭐
│   ├── config/     # Theme configuration
│   ├── generator/  # CSS generation
│   ├── registry/   # Theme registry + examples
│   ├── transitions/# View Transitions
│   ├── provider/   # React Context
│   └── components/ # Theme UI
└── lib/            # Shared utilities
```

## Dependencies

### Required

- `react` ^19.0.0
- `react-dom` ^19.0.0
- `zod` ^4.1.12 - Schema validation
- `@radix-ui/*` - UI primitives
- `class-variance-authority` - Variant styling
- `clsx` + `tailwind-merge` - Class utilities

### Peer Dependencies

- `@proto/auth` - (some components only)
- `@proto/utils` - Utility functions
- `@proto/types` - (theme domain integration only)

## Development

```bash
# Build package
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check

# Lint
pnpm lint
```

## App-Specific Components

Some components remain in `app/components/ui/` due to app-specific dependencies:

- `DialogRegistry` - Depends on app dialog hooks
- `DialogHistoryNavigation` - Depends on useDialogHistory
- `FileUploadButton` - Depends on useSharedFileUpload
- `ThemedUserButton` - Depends on app theme + Clerk

These components are documented in the package but not exported. Copy them to your app when needed.

**Note:** ThemeSelector and ThemeProvider are now available in `@proto/ui/theme`.

## Migration Status

✅ **Complete** - All portable components migrated  
📝 **Documented** - Full component catalog in COMPONENT_AUDIT.md  
🎨 **Storybook** - All stories use atomic design categories  
📦 **Exports** - Subpath exports configured for tree-shaking

## Contributing

Follow Atomic Design principles when adding components:

1. **Atoms**: Single-purpose, no business logic
2. **Molecules**: 2-3 atoms combined, minimal state
3. **Organisms**: Complex features with state
4. **Templates**: Page-level layouts

See COMPONENT_AUDIT.md for classification guidelines.
