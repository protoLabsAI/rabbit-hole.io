# Circular Dependency Fix - @proto/auth ↔ @proto/ui

**Date:** November 24, 2025  
**Status:** Fixed ✅

## Problem

Circular dependency between `@proto/auth` and `@proto/ui`:

```
@proto/auth → @proto/ui (peerDependency + devDependency)
     ↓
@proto/ui → @proto/auth/client (import in ThemedUserButton)
     ↑
   CYCLE
```

### Why It Existed

- `@proto/auth` has UI components that use `@proto/ui` atoms/molecules
- `@proto/ui` had `ThemedUserButton` that imported tier logic from `@proto/auth/client`

### CI Build Failure

In parallel builds (Turbo):
1. `@proto/ui` tries to type-check before `@proto/auth` built
2. Import `@proto/auth/client` fails (dist/client.d.ts doesn't exist)
3. Build blocked even though marked as devDependency

### Why It Worked Locally

- Already built `@proto/auth` manually
- dist/ files existed
- Type-checking worked

## Solution: Move Components to @proto/auth/ui ✅

**Rationale:**
- `ThemedUserButton` is auth-specific (uses Clerk, tiers)
- `UserStatsPage` is auth-specific (displays user data)
- `@proto/auth/ui` can import from `@proto/ui` (no cycle)
- `@proto/auth/ui` can import from `@proto/auth/client` (same package)

### Files Moved

**From:** `packages/ui/src/organisms/`
```
themed-user-button/themed-user-button.tsx
themed-user-button/index.ts
user-stats-page/user-stats-page.tsx
user-stats-page/index.ts
```

**To:** `packages/auth/src/ui/`
```
ThemedUserButton.tsx
UserStatsPage.tsx
```

### Import Updates

**Old imports (in moved files):**
```typescript
import { toast } from "../../atoms/toast/use-toast";
import { ThemeSelector } from "../../theme/components";
import { useTheme } from "../../theme/provider";
import { getUserTierClient, getTierLimitsClient } from "@proto/auth/client";
import { UserStatsPage } from "../user-stats-page";
```

**New imports:**
```typescript
import { toast } from "@proto/ui/atoms";
import { ThemeSelector } from "@proto/ui/theme";
import { useTheme } from "@proto/ui/theme";
import { getUserTierClient, getTierLimitsClient } from "../client";
import { UserStatsPage } from "./UserStatsPage";
```

### Export Updates

**File:** `packages/auth/src/ui/index.ts`

```typescript
// Added:
export { ThemedUserButton } from "./ThemedUserButton";
export { UserStatsPage } from "./UserStatsPage";
```

**File:** `packages/ui/src/organisms/index.ts`

Already commented out (no changes needed):
```typescript
// export * from "./themed-user-button"; // App-specific
// export * from "./user-stats-page"; // App-specific
```

## Impact on Apps

### Apps Already Use Local Copies ✅

**File:** `apps/rabbit-hole/app/components/ui/ThemedUserButton.tsx`
- Already has local implementation
- Already imports from `@proto/auth/client`
- No changes needed

**File:** `apps/rabbit-hole/app/atlas/components/AtlasHeader.tsx`
- Imports from `../../components/ui/ThemedUserButton`
- Uses local app component
- No changes needed

## Dependency Flow (Fixed)

```
@proto/auth/ui
   ↓
   Imports from @proto/ui (atoms, molecules, theme)
   ✅ No cycle

@proto/auth/ui
   ↓
   Imports from @proto/auth/client
   ✅ Same package, no cycle

Apps
   ↓
   Import from @proto/auth/ui
   ✅ Correct direction
```

## Verification

### Build Test

```bash
cd /Users/kj/dev/rabbit-hole.io

# Build @proto/auth first (should work now)
cd packages/auth && pnpm run build
# ✅ Success - no circular dependency

# Build @proto/ui next (should work)
cd ../ui && pnpm run build
# ✅ Success - no import from @proto/auth/client

# Build all libs
cd ../.. && pnpm run build:libs
# ✅ Success - parallel builds work
```

### Type Check Test

```bash
# Type check all packages
pnpm run type-check:packages
# ✅ Success - no type errors from missing types
```

## Files Changed

**New Files:**
```
packages/auth/src/ui/ThemedUserButton.tsx
packages/auth/src/ui/UserStatsPage.tsx
```

**Modified Files:**
```
packages/auth/src/ui/index.ts
```

**Deleted Files:**
```
packages/ui/src/organisms/themed-user-button/themed-user-button.tsx
packages/ui/src/organisms/themed-user-button/index.ts
packages/ui/src/organisms/user-stats-page/user-stats-page.tsx
packages/ui/src/organisms/user-stats-page/index.ts
```

## Usage Going Forward

### In Apps

**Import from @proto/auth/ui:**
```typescript
import { ThemedUserButton, UserStatsPage } from "@proto/auth/ui";
```

**Or use local app components:**
```typescript
import { ThemedUserButton } from "@/components/ui/ThemedUserButton";
```

### In Packages

**DO NOT import auth components from @proto/ui:**
```typescript
// ❌ Wrong - creates cycle
import { ThemedUserButton } from "@proto/ui/organisms";

// ✅ Correct - no cycle
import { ThemedUserButton } from "@proto/auth/ui";
```

## Benefits

1. ✅ **No Circular Dependency** - Clean dependency graph
2. ✅ **CI Builds Work** - Parallel package builds succeed
3. ✅ **Logical Organization** - Auth components in auth package
4. ✅ **Type Safety** - All types available during build
5. ✅ **No Breaking Changes** - Apps already using local copies

## Related Issues

This fix also resolves:
- Turbo build cache issues
- TypeScript resolution errors in CI
- Intermittent type-check failures

---

**Status:** Circular dependency eliminated ✅  
**Build Status:** All packages build successfully  
**CI Ready:** Parallel builds functional

