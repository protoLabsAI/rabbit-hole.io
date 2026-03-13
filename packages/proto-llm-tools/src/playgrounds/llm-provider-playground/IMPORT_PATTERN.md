# Import Pattern for Components

## The Issue

Components in `app/components/` encounter import resolution issues with the `@/` alias depending on context (app vs Storybook).

## Solutions

### Option 1: Use Correct @ Alias (Recommended for App Code)

```tsx
// ✅ Correct - @ maps to ./app/
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ❌ Wrong - Double nesting
import { Button } from "@/app/components/ui/button";
```

**When**: App components outside Storybook

### Option 2: Relative Imports (Recommended for Storybook + ui/)

```tsx
// ✅ Correct - Works everywhere
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

// ❌ Wrong - Webpack issues in Storybook
import { cn } from "@/lib/utils";
```

**When**: 
- ui/ components (ai-conversation, ai-message, etc.)
- Storybook stories
- Components that need to work in both contexts

### Option 3: Require for Storybook Stories Only

```tsx
// ✅ For .stories.tsx files only
const { Button } = require("../ui/button");
const { Card } = require("../ui/card");
```

**When**: Storybook has webpack resolution issues

## Path Alias Configuration

**tsconfig.json**:
```json
{
  "paths": {
    "@/*": ["./app/*"]  // @ maps to app directory
  }
}
```

**Result**:
- `@/components` → `./app/components`
- `@/lib` → `./app/lib`
- `@/app/components` → `./app/app/components` ❌

## Component Location Patterns

### Components in app/components/ui/
Use **relative imports** for maximum compatibility:
```tsx
import { cn } from "../../lib/utils";
import { Button } from "./button";
```

### Components in app/components/[feature]/
Use **@ alias** for cleaner imports:
```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
```

### Storybook Stories
Use **relative imports** to avoid webpack issues:
```tsx
const { Component } = require("../path/to/component");
// or
import { Component } from "../path/to/component";
```

## Quick Reference

| Location | Import Style | Example |
|----------|--------------|---------|
| `app/components/ui/` | Relative | `import { cn } from "../../lib/utils"` |
| `app/components/[feature]/` | @ alias | `import { Button } from "@/components/ui/button"` |
| `*.stories.tsx` | Relative | `import { Button } from "../ui/button"` |
| `app/[page]/` | @ alias | `import { Card } from "@/components/ui/card"` |

## Fix LLM Provider Playground

Current location: `app/components/llm-provider-playground/`

**Change from**:
```tsx
import { Button } from "@/app/components/ui/button";
```

**Change to**:
```tsx
import { Button } from "@/components/ui/button";
```


