# @protolabsai/auth

Centralized authentication middleware for API routes with Clerk integration.

## Features

- **Standardized Auth**: Consistent authentication patterns across all routes
- **Error Handling**: Unified error responses and logging
- **Admin Support**: Admin-only route protection (future)
- **Development Mode**: Skip auth for testing and development
- **Action Logging**: Automatic request logging with user context

## Quick Start

```typescript
import { withAuthAndLogging } from "@protolabsai/auth";

export const POST = withAuthAndLogging("create entity")(async (
  request: NextRequest,
  user: AuthenticatedUser
) => {
  // user.userId is guaranteed to exist
  console.log("Authenticated user:", user.userId);

  // Your route logic here
  return NextResponse.json({ success: true });
});
```

## API

### Basic Authentication

```typescript
import { withAuth } from "@protolabsai/auth";

export const GET = withAuth(async (request, user) => {
  // Protected route logic
  return NextResponse.json({ userId: user.userId });
});
```

### With Logging

```typescript
import { withAuthAndLogging } from "@protolabsai/auth";

export const DELETE = withAuthAndLogging("delete sensitive data")(async (
  request,
  user
) => {
  // Automatically logs: "🔒 delete sensitive data from authenticated user: user123"
  return NextResponse.json({ deleted: true });
});
```

### Admin Only (Future)

```typescript
import { withAdminAuth } from "@protolabsai/auth";

export const POST = withAdminAuth("system maintenance")(async (
  request,
  user
) => {
  // Only admin users can access
  return NextResponse.json({ maintenance: "started" });
});
```

### Public Routes

```typescript
import { withLogging } from "@protolabsai/auth";

export const GET = withLogging("public data access")(async (request, user) => {
  // No auth required, but still logged
  // user.userId will be "anonymous"
  return NextResponse.json({ public: true });
});
```

## Migration

**Before:**

```typescript
// Duplicated in every route
const { userId } = await auth();

if (!userId) {
  return NextResponse.json(
    { success: false, error: "Authentication required" },
    { status: 401 }
  );
}

console.log("Action from user:", userId);
```

**After:**

```typescript
// Single wrapper, automatic handling
export const POST = withAuthAndLogging("my action")(async (request, user) => {
  // user.userId guaranteed, logging automatic
});
```

## Benefits

- **Eliminates Duplication**: Removes auth boilerplate from 15+ routes
- **Consistent Errors**: Standardized authentication error responses
- **Better Logging**: Centralized request logging with user context
- **Security**: Prevents auth bypass bugs through wrapper pattern
- **Maintainability**: Single place to update authentication logic

## UI Components

### TierBadge

Display user's current subscription tier.

```typescript
import { TierBadge } from "@protolabsai/auth/ui";

<TierBadge />
```

### UpgradePromptModal

Modal prompting users to upgrade their subscription.

```typescript
import { UpgradePromptModal } from "@protolabsai/auth/ui";

<UpgradePromptModal 
  isOpen={showUpgrade}
  onClose={() => setShowUpgrade(false)}
  feature="Advanced Analytics"
  requiredTier="Pro"
/>
```

### ClientRoleGuard

Conditionally render content based on user roles.

```typescript
import { ClientRoleGuard } from "@protolabsai/auth/ui";

<ClientRoleGuard minimumRole="admin">
  <AdminOnlyFeature />
</ClientRoleGuard>
```

### RoleManager

UI for managing user roles (admin feature).

```typescript
import { RoleManager } from "@protolabsai/auth/ui";

<RoleManager 
  showPermissions={true}
  showRoleSelector={true}
/>
```
