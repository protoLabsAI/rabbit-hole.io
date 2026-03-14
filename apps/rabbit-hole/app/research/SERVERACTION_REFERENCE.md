# Server Actions + React Query - Quick Reference

**Target Audience:** Developers working on research page migration  
**Last Updated:** October 10, 2025

---

## Pattern Comparison

### Before: API Route + fetch()

```typescript
// ❌ OLD: API Route
// app/api/collaboration/sessions/route.ts
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  const body = await request.json();

  // ... mutation logic ...

  return NextResponse.json({ session });
}

// ❌ OLD: Client component
function Component() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collaboration/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      // Manual cache invalidation
      mutate("/api/collaboration/sessions/my-sessions");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return <button onClick={handleCreate} disabled={loading}>Create</button>;
}
```

### After: Server Action + React Query

```typescript
// ✅ NEW: Server Action
// app/research/actions/collaboration-sessions.ts
"use server";
export async function createCollaborationSession(workspaceId: string) {
  const { userId } = await auth();

  // ... mutation logic ...

  revalidatePath("/research");
  return { session };
}

// ✅ NEW: React Query hook
// app/research/hooks/queries/useCollaborationSessions.ts
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCollaborationSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-sessions"] });
    },
  });
}

// ✅ NEW: Client component
function Component() {
  const createSession = useCreateSession();

  const handleCreate = () => {
    createSession.mutate(workspaceId);
  };

  return (
    <button
      onClick={handleCreate}
      disabled={createSession.isPending}
    >
      {createSession.isPending ? "Creating..." : "Create"}
    </button>
  );
}
```

**Savings:** 60% less code, automatic loading states, automatic cache invalidation

---

## When to Use What

### Use Server Actions For:

✅ **Mutations** (POST, PUT, DELETE, PATCH)

- Creating/updating/deleting records
- Form submissions
- User-initiated actions

✅ **Heavy Computations**

- Large data transformations
- Complex business logic
- Multi-step workflows

✅ **Sensitive Operations**

- Operations requiring secrets
- Database writes
- Third-party API calls

### Use API Routes For:

✅ **Reads (GET)** - Especially if:

- Data needs frequent polling
- Caching with React Query
- Used by multiple components

✅ **Streaming**

- Server-Sent Events
- Streaming responses
- Real-time updates

✅ **Webhooks**

- External services calling your app
- No auth context available

✅ **Third-Party Integrations**

- OAuth callbacks
- Stripe webhooks
- Clerk webhooks

---

## React Query Patterns

### 1. Simple Query (Polling)

```typescript
export function useActiveSessions() {
  return useQuery({
    queryKey: ["collaboration-sessions", "active"],
    queryFn: async () => {
      const res = await fetch("/api/collaboration/sessions/my-sessions");
      return res.json();
    },
    refetchInterval: 10000, // Poll every 10s
    staleTime: 5000, // Consider fresh for 5s
  });
}

// Usage
function Component() {
  const { data, isLoading, error } = useActiveSessions();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState />;

  return <SessionList sessions={data.sessions} />;
}
```

### 2. Dependent Query

```typescript
export function useSessionDetails(sessionId: string | null) {
  return useQuery({
    queryKey: ["collaboration-session", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/collaboration/sessions/${sessionId}`);
      return res.json();
    },
    enabled: !!sessionId, // Only fetch if sessionId exists
  });
}
```

### 3. Mutation with Optimistic Update

```typescript
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCollaborationSession,

    // Optimistic update (instant UI feedback)
    onMutate: async (workspaceId) => {
      await queryClient.cancelQueries({ queryKey: ["my-sessions"] });

      const previousSessions = queryClient.getQueryData(["my-sessions"]);

      // Optimistically add new session
      queryClient.setQueryData(["my-sessions"], (old: any) => ({
        ...old,
        sessions: [
          ...old.sessions,
          { id: "temp-id", workspaceId, status: "creating" },
        ],
      }));

      return { previousSessions };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(["my-sessions"], context.previousSessions);
      toast.error("Failed to create session");
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
      toast.success("Session created!");
    },
  });
}
```

### 4. Mutation with Manual Cache Update

```typescript
export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: endCollaborationSession,
    onSuccess: (_, sessionId) => {
      // Update my-sessions cache
      queryClient.setQueryData(["my-sessions"], (old: any) => ({
        ...old,
        sessions: old.sessions.filter((s) => s.id !== sessionId),
      }));

      // Remove individual session cache
      queryClient.removeQueries({
        queryKey: ["collaboration-session", sessionId],
      });
    },
  });
}
```

### 5. Parallel Queries

```typescript
function Component({ sessionIds }: { sessionIds: string[] }) {
  const queries = useQueries({
    queries: sessionIds.map(id => ({
      queryKey: ["collaboration-session", id],
      queryFn: () => fetchSession(id),
    })),
  });

  const isLoading = queries.some(q => q.isLoading);
  const hasError = queries.some(q => q.error);

  return <SessionGrid sessions={queries.map(q => q.data)} />;
}
```

---

## Server Action Patterns

### 1. Basic Action

```typescript
"use server";

export async function createSession(workspaceId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", status: 401 };
  }

  // ... logic ...

  revalidatePath("/research");
  return { session, status: 200 };
}
```

### 2. Action with Validation

```typescript
"use server";

import { z } from "zod";

const CreateSessionSchema = z.object({
  workspaceId: z.string().uuid(),
  visibility: z.enum(["edit", "view"]),
});

export async function createSession(input: unknown) {
  // Validate input
  const parsed = CreateSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Invalid input",
      details: parsed.error.flatten(),
      status: 400,
    };
  }

  const { workspaceId, visibility } = parsed.data;

  // ... logic ...
}
```

### 3. Action with Tier Enforcement

```typescript
"use server";

export async function createSession(workspaceId: string) {
  const { userId } = await auth();
  const user = await currentUser();

  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  if (limits.maxActiveSessions === 0) {
    return {
      error: "Requires Basic tier",
      tier,
      upgradeUrl: "/pricing",
      status: 402,
    };
  }

  // Check current usage
  const activeCount = await countActiveSessions(userId);
  if (activeCount >= limits.maxActiveSessions) {
    return {
      error: `Max ${limits.maxActiveSessions} sessions for ${tier} tier`,
      status: 402,
    };
  }

  // ... proceed ...
}
```

### 4. Action with Database Transaction

```typescript
"use server";

import { Pool } from "pg";

export async function publishDraft(draftId: string) {
  const pool = new Pool({ connectionString: process.env.APP_DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Copy draft to workspace
    await client.query(
      `INSERT INTO workspaces SELECT * FROM drafts WHERE id = $1`,
      [draftId]
    );

    // Delete draft
    await client.query(`DELETE FROM drafts WHERE id = $1`, [draftId]);

    await client.query("COMMIT");

    revalidatePath("/research");
    return { success: true, status: 200 };
  } catch (error) {
    await client.query("ROLLBACK");
    return { error: "Transaction failed", status: 500 };
  } finally {
    client.release();
    await pool.end();
  }
}
```

### 5. Action with Neo4j

```typescript
"use server";

import { getGlobalNeo4jClient } from "@proto/database";
import { createNeo4jClientWithIntegerConversion } from "@proto/utils";

export async function mergeEntity(entity: Entity) {
  const { userId } = await auth();

  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);

  const result = await client.executeWrite(
    `MERGE (e:Entity {uid: $uid})
     SET e += $properties
     RETURN e`,
    {
      uid: entity.uid,
      properties: entity,
    }
  );

  revalidatePath("/atlas");
  return { entity: result.records[0].get("e"), status: 200 };
}
```

---

## Error Handling

### Server Action Error Pattern

```typescript
"use server";

export async function createSession(workspaceId: string) {
  try {
    const { userId } = await auth();

    // Return structured errors (not throw)
    if (!userId) {
      return { error: "Unauthorized", status: 401 };
    }

    // ... logic ...

    return { session, status: 200 };
  } catch (error) {
    console.error("Create session error:", error);
    return {
      error: "Internal server error",
      status: 500,
      // Don't leak internal error details to client
    };
  }
}
```

### React Query Error Handling

```typescript
function Component() {
  const createSession = useCreateSession();

  const handleCreate = async () => {
    const result = await createSession.mutateAsync(workspaceId);

    // Check for error in return value
    if (result.error) {
      if (result.status === 402) {
        // Tier limit - show upgrade modal
        showUpgradeModal(result.tier);
      } else {
        toast.error(result.error);
      }
      return;
    }

    // Success path
    toast.success("Session created!");
  };

  return (
    <button onClick={handleCreate} disabled={createSession.isPending}>
      Create
    </button>
  );
}
```

### Global Error Boundary

```typescript
// app/research/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        // Log to monitoring service
        console.error("Mutation error:", error);

        // Show generic error toast
        toast.error("Something went wrong. Please try again.");
      },
    },
    queries: {
      onError: (error) => {
        console.error("Query error:", error);
      },
      retry: (failureCount, error: any) => {
        // Don't retry 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry 5xx errors up to 3 times
        return failureCount < 3;
      },
    },
  },
});
```

---

## Type Safety

### Shared Types

```typescript
// app/research/actions/types.ts
export type ActionResult<T = void> =
  | { data: T; status: 200 }
  | { error: string; status: 400 | 401 | 402 | 403 | 404 | 500 };

export type CreateSessionInput = {
  workspaceId: string;
  visibility?: "edit" | "view";
};

export type SessionData = {
  id: string;
  ownerId: string;
  workspaceId: string;
  roomId: string;
  createdAt: number;
  expiresAt: number;
  status: "active" | "ended";
};
```

### Typed Server Action

```typescript
"use server";

export async function createSession(
  input: CreateSessionInput
): Promise<ActionResult<{ session: SessionData; shareLink: string }>> {
  // ... logic ...

  return {
    data: { session, shareLink },
    status: 200,
  };
}
```

### Typed React Query Hook

```typescript
export function useCreateSession() {
  return useMutation<
    ActionResult<{ session: SessionData; shareLink: string }>,
    Error,
    CreateSessionInput
  >({
    mutationFn: createSession,
  });
}
```

---

## Testing

### Test Server Action

```typescript
import { createSession } from "@/research/actions/collaboration-sessions";
// auth import removed (Clerk removed)

// jest.mock for Clerk removed

describe("createSession", () => {
  it("returns error if unauthorized", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });

    const result = await createSession({ workspaceId: "ws-123" });

    expect(result.error).toBe("Unauthorized");
    expect(result.status).toBe(401);
  });

  it("creates session successfully", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-123" });

    const result = await createSession({ workspaceId: "ws-123" });

    expect(result.data).toBeDefined();
    expect(result.data.session.id).toBeDefined();
  });
});
```

### Test React Query Hook

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateSession } from "@/research/hooks/queries/useCollaborationSessions";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("useCreateSession", () => {
  it("creates session", async () => {
    const { result } = renderHook(() => useCreateSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ workspaceId: "ws-123" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

---

## Debugging

### Enable React Query DevTools

```typescript
// app/research/providers/QueryProvider.tsx
"use client";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function ResearchQueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Log Server Actions

```typescript
"use server";

import { logger } from "@proto/logger";

export async function createSession(input: CreateSessionInput) {
  logger.info("Creating session", { input });

  try {
    // ... logic ...

    logger.info("Session created", { sessionId: session.id });
    return { data: { session }, status: 200 };
  } catch (error) {
    logger.error("Create session failed", { error, input });
    return { error: "Failed", status: 500 };
  }
}
```

### Inspect Cache

```typescript
import { useQueryClient } from "@tanstack/react-query";

function DebugComponent() {
  const queryClient = useQueryClient();

  const handleDump = () => {
    const cache = queryClient.getQueryCache().getAll();
    console.table(cache.map(q => ({
      key: JSON.stringify(q.queryKey),
      state: q.state.status,
      dataUpdatedAt: new Date(q.state.dataUpdatedAt),
    })));
  };

  return <button onClick={handleDump}>Dump Cache</button>;
}
```

---

## Migration Checklist

When converting an endpoint:

- [ ] Create Server Action in `app/research/actions/`
- [ ] Add input validation (Zod schema)
- [ ] Add auth check
- [ ] Add tier enforcement (if applicable)
- [ ] Add `revalidatePath()` calls
- [ ] Return structured result (not throw)
- [ ] Create React Query hook in `app/research/hooks/queries/`
- [ ] Add cache invalidation logic
- [ ] Update component to use new hook
- [ ] Remove old `fetch()` call
- [ ] Add tests for Server Action
- [ ] Add tests for React Query hook
- [ ] Update API endpoint to show deprecation warning
- [ ] Deploy with feature flag
- [ ] Monitor for errors
- [ ] Delete old API endpoint after 2 weeks

---

## Resources

- [Next.js Server Actions Docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [React Query Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Migration Plan](./SERVERACTION_MIGRATION_PLAN.md)

**Questions?** Ask in #engineering-research-mode
