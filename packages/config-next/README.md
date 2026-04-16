# @protolabsai/config-next

Shared Next.js configuration for all apps in the monorepo.

## Overview

This package provides a base Next.js configuration that includes:

- Production-ready defaults
- **Hot reload for workspace packages** via `transpilePackages`
- Server package exclusions
- Turbopack optimizations

## Usage

```js
// apps/my-app/next.config.js
import baseConfig from "@protolabsai/config-next/base.config.js";

export default {
  ...baseConfig,

  // App-specific overrides
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};
```

## What's Included

### transpilePackages (Hot Reload)

```js
transpilePackages: [
  "@protolabsai/ui", // Instant HMR for UI components
  "@protolabsai/charts", // Instant HMR for charts
  "@protolabsai/icon-system", // Instant HMR for icons
];
```

**Result:** Changes to these packages hot reload in <1s without manual rebuild.

### serverExternalPackages

```js
serverExternalPackages: [
  // Native dependencies
  "neo4j-driver",
  "pg",
  "pino",
  "yjs",

  // Server-only packages
  "@protolabsai/database",
  "@protolabsai/auth",
  "@protolabsai/llm-providers",
];
```

**Result:** Server packages remain external, avoiding bundling issues with native code.

### Turbopack Configuration

```js
turbopack: {
  resolveAlias: {
    "neo4j-driver": "neo4j-driver",
  },
}
```

**Result:** Prevents dynamic require issues with Neo4j driver.

## Adding New Apps

```bash
# 1. Create app
mkdir apps/my-app
cd apps/my-app

# 2. Install config package
pnpm add -D @protolabsai/config-next

# 3. Create next.config.js
import baseConfig from "@protolabsai/config-next/base.config.js";

export default {
  ...baseConfig,
  // App-specific config
};

# 4. Enjoy instant hot reload ✅
```

## Modifying Base Config

**File:** `packages/config-next/base.config.js`

**When to modify:**

- Adding new client package to transpilePackages
- Adding new server package to serverExternalPackages
- Changing Turbopack aliases

**Impact:** All apps inheriting from base config get the changes.

## Related Documentation

- **Hot Reload Guide:** `docs/developer/PACKAGE_HOT_RELOAD.md`
- **Implementation Handoff:** `handoffs/2025-10-20_MONOREPO_PACKAGE_HOT_RELOAD.md`

---

**Created:** October 20, 2025  
**Version:** 1.0.0
