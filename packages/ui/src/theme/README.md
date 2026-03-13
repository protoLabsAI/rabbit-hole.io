# @proto/ui/theme

Complete whitelabel theming system with dynamic CSS variables, View Transitions API animations, and React integration.

## Features

- 🎨 **Dynamic Theming** - Runtime CSS variable generation
- 🌗 **Light/Dark Mode** - Automatic system preference detection
- ✨ **Smooth Transitions** - View Transitions API animations
- 🏢 **Whitelabel Branding** - Logo, colors, typography
- 🎯 **shadcn/ui Compatible** - Works seamlessly with existing components
- 📦 **Tree-shakeable** - Import only what you need
- 🔒 **Type-safe** - Full TypeScript support with Zod validation

## Installation

Already included in @proto/ui. Import the theme subpath:

```tsx
import { ThemeProvider, useTheme } from "@proto/ui/theme";
```

## Quick Start

### 1. Wrap App with ThemeProvider

```tsx
// app/layout.tsx
import { ThemeProvider } from "@proto/ui/theme";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider defaultThemeName="default">{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

### 2. Use Theme Hook

```tsx
"use client";

import { useTheme } from "@proto/ui/theme";

export function MyComponent() {
  const { themeName, colorScheme, setTheme, toggleColorScheme } = useTheme();

  return (
    <div>
      <p>Current theme: {themeName}</p>
      <p>Color scheme: {colorScheme}</p>
      <button onClick={() => setTheme("corporate-blue")}>
        Switch to Corporate Blue
      </button>
      <button onClick={toggleColorScheme}>Toggle Dark/Light</button>
    </div>
  );
}
```

### 3. Add Theme Selector UI

```tsx
import { ThemeSelector, CompactThemeSelector } from "@proto/ui/theme";

// Full theme selector
<ThemeSelector showColorSchemeToggle />

// Compact toggle for nav bars
<CompactThemeSelector />
```

## API Reference

### ThemeProvider

```tsx
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultThemeName?: AvailableThemeName;
}
```

**Props:**

- `defaultThemeName` - Initial theme (default: "default")

### useTheme Hook

```tsx
const {
  currentTheme, // Full theme configuration
  themeName, // Current theme name
  colorScheme, // "light" | "dark" | "system"
  branding, // Logo, favicon, app name
  setTheme, // Switch themes
  setColorScheme, // Set color scheme
  toggleColorScheme, // Cycle through schemes
  availableThemeNames, // All theme names
  applyTheme, // Apply theme config directly
} = useTheme();
```

### ThemeGenerator

```tsx
import { ThemeGenerator } from "@proto/ui/theme";

// Generate CSS variables
const css = ThemeGenerator.generateCSSVariables(myTheme);

// Generate complete globals.css
const globalCSS = ThemeGenerator.generateGlobalCSS(defaultTheme);
```

### Theme Registry

```tsx
import {
  getTheme, // Get theme by name
  getThemeNames, // Get all theme names
  isValidThemeName, // Validate theme name
  availableThemes, // Theme registry
  themeDisplayInfo, // UI metadata
} from "@proto/ui/theme";

const theme = getTheme("corporate-blue");
const names = getThemeNames(); // ["default", "corporate-blue", ...]
```

### View Transitions

```tsx
import { startThemeTransition, useThemeTransition } from "@proto/ui/theme";

// Manual transition
await startThemeTransition(() => updateTheme(), {
  variant: "polygon",
  duration: 500,
});

// Hook-based transition
const { startTransition, isSupported } = useThemeTransition({ duration: 300 });
await startTransition(() => updateTheme());
```

## Creating Custom Themes

See [THEME_CREATION.md](./THEME_CREATION.md) for detailed guide.

**Quick Example:**

```tsx
import { ThemeConfig } from "@proto/ui/theme";

export const myTheme: ThemeConfig = {
  name: "my-theme",
  displayName: "My Theme",
  version: "1.0.0",
  branding: {
    name: "My App",
    tagline: "Powered by custom theme",
    logo: "🚀",
    favicon: "data:image/svg+xml,...",
    homeUrl: "/",
  },
  colors: {
    light: {
      primary: { 50: "#...", 100: "#...", ... },
      // ... see examples
    },
    dark: {
      // Mirror of light with inverted values
    },
  },
};
```

## Built-in Themes

- **default** - Clean, modern design system
- **corporate-blue** - Professional blue for enterprise
- **nature-green** - Earth-friendly green theme
- **dev-environment** - High-contrast for development
- **prod-environment** - Professional for production

## Export Structure

```
@proto/ui/theme/
├── config/          # ThemeConfig, ColorScale, ThemeBranding
├── generator/       # CSS generation, validation, color conversion
├── registry/        # Theme registry, example themes, metadata
├── transitions/     # View Transitions API
├── provider/        # ThemeProvider, useTheme
└── components/      # ThemeSelector UI
```

## Migration from Old Imports

**Before:**

```tsx
import { getTheme } from "../../themes";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ThemeGenerator } from "../../themes/generator";
```

**After:**

```tsx
import { getTheme, ThemeProvider, ThemeGenerator } from "@proto/ui/theme";
```

## Advanced Usage

### Custom Theme Application

```tsx
import { ThemeGenerator, type ThemeConfig } from "@proto/ui/theme";

const customTheme: ThemeConfig = {...};

// Validate theme
const errors = validateTheme(customTheme);
if (errors.length > 0) {
  console.error("Invalid theme:", errors);
}

// Generate and inject CSS
const css = ThemeGenerator.generateCSSVariables(customTheme);
const style = document.createElement("style");
style.id = "custom-theme";
style.textContent = css;
document.head.appendChild(style);
```

### Domain-Specific Overrides

```tsx
const theme: ThemeConfig = {
  name: "my-theme",
  // ... base config
  domainOverrides: {
    person: {
      color: "#FF5733",
      iconColor: "#FF5733",
    },
    organization: {
      color: "#00BFFF",
    },
  },
};
```

## TypeScript Support

Full type definitions included:

```tsx
import type {
  ThemeConfig,
  ThemeColors,
  ColorScale,
  ThemeBranding,
  AvailableThemeName,
} from "@proto/ui/theme";
```

## Browser Support

- **View Transitions**: Chrome 111+, Edge 111+, Safari 18+ (graceful fallback for older browsers)
- **CSS Variables**: All modern browsers
- **Dark Mode**: All browsers supporting `prefers-color-scheme`

## Resources

- [Theme Creation Guide](./THEME_CREATION.md)
- [View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions/)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
