# @protolabsai/logger

Pino-based structured logging with user engagement tracking.

## Installation

Already configured as workspace dependency.

## Usage

```typescript
import {
  logger,
  logPageView,
  logUserAction,
  logFeatureUsage,
  logAuth,
} from "@protolabsai/logger";

// Page view
logPageView({
  page: "/research",
  userId,
  tier,
  sessionId,
  referrer: document.referrer,
  userAgent: navigator.userAgent,
});

// User action
logUserAction({
  action: "graph_export",
  page: "/research",
  userId,
  tier,
  sessionId,
  target: "workspace-123",
  value: { entityCount: 50 },
});

// Feature usage
logFeatureUsage({
  feature: "drawing_tools",
  page: "/research",
  userId,
  tier,
  sessionId,
  blocked: true,
  reason: "requires_basic_tier",
});

// Auth events
logAuth({
  event: "signup",
  userId,
  tier: "free",
  method: "clerk_webhook",
  metadata: { email: "user@example.com" },
});

// Direct logging
logger.info({ userId, action }, "User performed action");
logger.error({ error, userId }, "Operation failed");
```

## Log Levels

- `debug` - Development only
- `info` - Normal operations
- `warn` - Unexpected but handled
- `error` - Errors
- `fatal` - Critical failures

## Environment Behavior

- **Development:** Pretty-printed to console
- **Production:** JSON to stdout (collected by Loki)
- **Test:** Silent

## See Also

- [Logging Guide](/docs/developer/LOGGING_GUIDE.md)
- [Dashboard Queries](/docs/developer/OBSERVABILITY_DASHBOARDS.md)
