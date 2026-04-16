# Theme Creation Guide

Complete guide to creating custom themes for @protolabsai/ui.

## Theme Structure

Every theme requires:

1. **Metadata** - Name, version, description
2. **Branding** - Logo, favicon, app name
3. **Colors** - Light and dark mode color scales
4. **Optional** - Typography, spacing, border radius

## Basic Theme Template

```tsx
import { ThemeConfig } from "@protolabsai/ui/theme";

export const myTheme: ThemeConfig = {
  // Metadata
  name: "my-theme",
  displayName: "My Theme",
  description: "A custom theme for my app",
  version: "1.0.0",

  // Branding
  branding: {
    name: "My App",
    tagline: "Tagline here",
    logo: "🚀",
    favicon: "data:image/svg+xml,<svg>...</svg>",
    homeUrl: "/",
  },

  // Colors (required)
  colors: {
    light: {
      // See color scales section below
    },
    dark: {
      // See color scales section below
    },
  },
};
```

## Color Scales

Each color must have 11 steps (50-950):

```tsx
primary: {
  50: "#eff6ff",   // Lightest
  100: "#dbeafe",
  200: "#bfdbfe",
  300: "#93c5fd",
  400: "#60a5fa",
  500: "#3b82f6",  // Base color
  600: "#2563eb",
  700: "#1d4ed8",
  800: "#1e40af",
  900: "#1e3a8a",
  950: "#172554",  // Darkest
}
```

### Required Color Scales

**Brand Colors:**

- `primary` (required) - Main brand color
- `secondary` (optional) - Secondary brand
- `accent` (optional) - Accent highlights

**Semantic Colors:**

- `success` (required) - Green for success states
- `warning` (required) - Yellow/orange for warnings
- `error` (required) - Red for errors
- `info` (required) - Blue for info messages

**Neutrals:**

- `gray` (required) - Gray scale for text/borders

**Layout Colors:**

- `background` - { primary, secondary, tertiary, muted }
- `foreground` - { primary, secondary, muted, inverse }
- `border` - { primary, secondary, muted }
- `overlay` - { light, medium, dark }

## Color Generation Tools

### Using Tailwind Palette Generator

```bash
npx tailwindcss colors
# or use: https://uicolors.app/create
```

### Dark Mode Colors

For dark mode, **invert the scale**:

```tsx
light: {
  primary: {
    50: "#eff6ff",  // Lightest in light mode
    500: "#3b82f6", // Base
    950: "#172554", // Darkest in light mode
  }
}

dark: {
  primary: {
    50: "#172554",  // Darkest becomes lightest
    500: "#3b82f6", // Base stays same
    950: "#eff6ff", // Lightest becomes darkest
  }
}
```

## Example: Corporate Theme

```tsx
import { ThemeConfig } from "@protolabsai/ui/theme";

export const corporateTheme: ThemeConfig = {
  name: "corporate",
  displayName: "Corporate",
  version: "1.0.0",

  branding: {
    name: "ACME Corp",
    tagline: "Enterprise Solutions",
    logo: "🏢",
    favicon: "data:image/svg+xml,<svg>...</svg>",
  },

  colors: {
    light: {
      primary: {
        50: "#eff6ff",
        100: "#dbeafe",
        200: "#bfdbfe",
        300: "#93c5fd",
        400: "#60a5fa",
        500: "#3b82f6", // Corporate blue
        600: "#2563eb",
        700: "#1d4ed8",
        800: "#1e40af",
        900: "#1e3a8a",
        950: "#172554",
      },
      success: {
        // Green scale 50-950
      },
      warning: {
        // Orange scale 50-950
      },
      error: {
        // Red scale 50-950
      },
      info: {
        // Blue scale 50-950
      },
      gray: {
        // Gray scale 50-950
      },
      background: {
        primary: "#ffffff",
        secondary: "#f8f9fa",
        tertiary: "#f0f1f2",
        muted: "#f3f4f6",
      },
      foreground: {
        primary: "#1a1a1a",
        secondary: "#2a2a2a",
        muted: "#525252",
        inverse: "#ffffff",
      },
      border: {
        primary: "rgba(0, 0, 0, 0.2)",
        secondary: "rgba(0, 0, 0, 0.1)",
        muted: "rgba(0, 0, 0, 0.05)",
      },
      overlay: {
        light: "rgba(255, 255, 255, 0.25)",
        medium: "rgba(255, 255, 255, 0.4)",
        dark: "rgba(0, 0, 0, 0.5)",
      },
    },
    dark: {
      // Inverted color scales
    },
  },
};
```

## Adding Theme to Registry

1. Create theme file in `packages/ui/src/theme/registry/examples/`
2. Import in `theme-registry.ts`:

```tsx
import { myTheme } from "./examples/my-theme.theme";

export const availableThemes = {
  // ... existing
  "my-theme": myTheme,
} as const;

export const themeNameSchema = z.enum([
  // ... existing
  "my-theme",
]);
```

3. Add metadata in `theme-metadata.ts`:

```tsx
export const themeDisplayInfo = {
  // ... existing
  "my-theme": {
    name: "My Theme",
    description: "Description here",
    category: "Custom",
  },
} as const;
```

## Validation

```tsx
import { validateTheme } from "@protolabsai/ui/theme";

const errors = validateTheme(myTheme);
if (errors.length > 0) {
  console.error("Theme validation failed:", errors);
}
```

## Testing Your Theme

```tsx
import { ThemeGenerator } from "@protolabsai/ui/theme";

// 1. Validate configuration
const errors = validateTheme(myTheme);
console.assert(errors.length === 0, "Theme has errors", errors);

// 2. Generate CSS
const css = ThemeGenerator.generateCSSVariables(myTheme);
console.log("Generated CSS:", css);

// 3. Validate generated CSS
const cssErrors = validateGeneratedCSS(css, myTheme);
console.assert(cssErrors.length === 0, "CSS has errors", cssErrors);

// 4. Apply in browser
const { applyTheme } = useTheme();
applyTheme(myTheme);
```

## Color Accessibility

Ensure WCAG 2.1 AA contrast ratios:

- **Normal text**: 4.5:1 minimum
- **Large text (18pt+)**: 3:1 minimum
- **UI components**: 3:1 minimum

Use tools:

- https://webaim.org/resources/contrastchecker/
- https://contrast-ratio.com/

## Best Practices

1. **Use established color palettes** - Tailwind, Material, etc.
2. **Test in both modes** - Light and dark
3. **Validate before deployment** - Run validation functions
4. **Document your theme** - Add comments explaining color choices
5. **Test with real content** - Not just lorem ipsum
6. **Check mobile** - Themes should work on all screen sizes

## Reference Themes

Study these examples:

- [corporate-blue.theme.ts](./registry/examples/corporate-blue.theme.ts) - Enterprise theme
- [nature-green.theme.ts](./registry/examples/nature-green.theme.ts) - Environmental theme
- [dev-environment.theme.ts](./registry/examples/dev-environment.theme.ts) - Dev environment

## Troubleshooting

### Theme not applying

```tsx
// Check if theme name is valid
import { isValidThemeName } from "@protolabsai/ui/theme";
console.log(isValidThemeName("my-theme")); // true/false
```

### Colors look wrong

```tsx
// Inspect generated CSS variables
const css = ThemeGenerator.generateCSSVariables(myTheme);
console.log(css);

// Check in DevTools
console.log(
  getComputedStyle(document.documentElement).getPropertyValue("--primary-500")
);
```

### Type errors

```tsx
// Ensure all required fields are present
import type { ThemeConfig } from "@protolabsai/ui/theme";

const theme: ThemeConfig = {
  // TypeScript will show errors for missing fields
};
```

## Advanced Features

### Domain-Specific Overrides

```tsx
domainOverrides: {
  "person": {
    color: "#FF5733",
    iconColor: "#FF5733",
  },
}
```

### Custom Typography

```tsx
typography: {
  fontFamily: {
    sans: ["Inter", "system-ui", "sans-serif"],
    serif: ["Merriweather", "Georgia", "serif"],
    mono: ["Fira Code", "monospace"],
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    // ...
  },
}
```

### Custom Spacing

```tsx
spacing: {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
}
```

### Custom Border Radius

```tsx
borderRadius: {
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
}
```

## Support

For issues or questions:

- Check [README.md](./README.md) for API reference
- Review example themes in `registry/examples/`
- Validate with `validateTheme()` and `validateGeneratedCSS()`
