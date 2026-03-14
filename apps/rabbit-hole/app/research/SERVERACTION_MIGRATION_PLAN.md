# Research Page - Server Actions Migration Plan

**Date:** October 10, 2025  
**Goal:** Migrate from API routes to Server Actions + React Query  
**Status:** Planning Phase

---

## Executive Summary

Research page currently uses **15 API endpoints**. Plan is to:

1. **Convert 11 endpoints → Server Actions** (mutations)
2. **Keep 4 endpoints as API routes** (real-time/streaming)
3. **Add React Query** for client-side caching and optimistic updates

---

## Current Endpoint Audit

### 1. Collaboration Sessions (8 endpoints)

#### Should Convert to Server Actions:

- ✅ `POST /api/collaboration/sessions` - Create session
- ✅ `POST /api/collaboration/sessions/create-tab` - Create session from new tab
- ✅ `POST /api/collaboration/sessions/initialize-from-tab` - Initialize with data
- ✅ `POST /api/collaboration/sessions/[id]/end` - End session
- ✅ `DELETE /api/collaboration/sessions/[id]` - Delete session

**Rationale:** These are mutations with auth/tier enforcement. Perfect for Server Actions.

#### Keep as API Routes:

- 🔄 `GET /api/collaboration/sessions/my-sessions` - List user sessions
- 🔄 `GET /api/collaboration/sessions/[id]` - Get session details
- 🔄 `GET /api/collaboration/sessions/[id]/metadata` - Get session metadata

**Rationale:**

- Real-time data (frequently polled)
- Can be cached with React Query
- API routes better for repeated GET requests

---

### 2. Draft Management (3 endpoints)

#### Convert to Server Actions:

- ✅ `POST /api/workspaces/draft/create` - Create draft
- ✅ `POST /api/workspaces/draft/publish` - Publish draft
- ✅ `POST /api/workspaces/draft/discard` - Discard draft

**Rationale:**

- Clear user-initiated mutations
- Benefit from Server Actions' automatic revalidation
- No polling/streaming needed

---

### 3. Research Data (1 endpoint)

#### Convert to Server Actions:

- ✅ `POST /api/research/merge` - Merge research to Neo4j

**Rationale:**

- One-time mutation
- Heavy database operation (better on server)
- Already used in form submission context

---

### 4. Entity/Graph Data (3 endpoints - Referenced but not directly used)

#### Keep as API Routes:

- 🔄 `GET /api/entity-v2/[uid]` - Entity details
- 🔄 `GET /api/graph-tiles/ego/[uid]` - Ego network
- 🔄 `GET /api/geographic-entities` - Map markers

**Rationale:**

- Read-heavy operations
- Cached with React Query
- May need streaming for large graphs (future)

---

## Proposed Architecture

### Stack Decision Matrix

| Feature             | API Routes     | Server Actions  | React Query          |
| ------------------- | -------------- | --------------- | -------------------- |
| **Mutations**       | ❌ Verbose     | ✅ Preferred    | ✅ Mutation hooks    |
| **Reads (Single)**  | ✅ Good        | ⚠️ OK           | ✅ Caching + polling |
| **Reads (Polling)** | ✅ Better      | ❌ No           | ✅ Automatic refetch |
| **Streaming**       | ✅ Only option | ❌ No           | ❌ No                |
| **Optimistic UI**   | ⚠️ Manual      | ✅ Revalidation | ✅ Built-in          |
| **Type Safety**     | ✅ Good        | ✅ Excellent    | ✅ Excellent         |

### Recommended Pattern

```typescript
// 1. Server Actions for mutations
"use server";
export async function createCollaborationSession(data: CreateSessionRequest) {
  const { userId } = await auth();
  // ... mutation logic
  revalidatePath("/research");
  return { session, shareLink };
}

// 2. API Routes for reads
export async function GET(request: NextRequest) {
  // ... query logic
  return NextResponse.json({ data });
}

// 3. React Query for client state
function useCollaborationSession(sessionId: string) {
  return useQuery({
    queryKey: ["collaboration-session", sessionId],
    queryFn: () =>
      fetch(`/api/collaboration/sessions/${sessionId}`).then((r) => r.json()),
    refetchInterval: 5000, // Poll every 5s
    staleTime: 1000,
  });
}

// 4. React Query mutations for Server Actions
function useCreateSession() {
  return useMutation({
    mutationFn: createCollaborationSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
  });
}
```

---

## Migration Plan

### Phase 1: Setup Infrastructure (Week 1)

**1. Install React Query**

```bash
pnpm add @tanstack/react-query
```

**2. Create Query Provider**

```typescript
// app/research/providers/QueryProvider.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

export function ResearchQueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**3. Create Actions Directory**

```
app/research/actions/
  ├── collaboration-sessions.ts  # Session CRUD
  ├── research-merge.ts          # Merge to Neo4j
  └── types.ts                   # Shared types
```

---

### Phase 2: Collaboration Sessions ✅ COMPLETE

**Status:** All 5 actions implemented and integrated  
**Files:**

- `app/research/actions/collaboration-sessions.ts` (654 lines)
- `app/research/hooks/queries/useCollaborationSessions.ts` (220 lines)

**Components Updated:**

- `TabCollaborationMenu.tsx` - Uses React Query hooks
- `WorkspaceContainer.tsx` - Automatic polling with useActiveSessions()

#### Step 1: Create Server Actions (DONE)

```typescript
// app/research/actions/collaboration-sessions.ts
"use server";

// auth import removed (Clerk removed)
import { revalidatePath } from "next/cache";
import { Pool } from "pg";
import { getUserTier, getTierLimits } from "@proto/auth";

export async function createCollaborationSession(
  workspaceId: string,
  visibility: "edit" | "view" = "edit"
) {
  const { userId, orgId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return { error: "Unauthorized", status: 401 };
  }

  // Tier enforcement
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);

  if (limits.maxActiveSessions === 0) {
    return {
      error: "Collaboration requires Basic tier or higher",
      limitType: "maxActiveSessions",
      tier,
      upgradeUrl: "/pricing",
      status: 402,
    };
  }

  // Check active session count
  const pool = new Pool({ connectionString: process.env.APP_DATABASE_URL });
  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM collaboration_sessions 
     WHERE owner_id = $1 AND status = 'active'`,
    [userId]
  );

  if (countResult.rows[0].count >= limits.maxActiveSessions) {
    return {
      error: `Maximum ${limits.maxActiveSessions} active sessions for ${tier} tier`,
      limitType: "maxActiveSessions",
      status: 402,
    };
  }

  // Create session
  const sessionId = randomUUID();
  const roomId = `session:${sessionId}`;
  const now = Date.now();
  const expiresAt = now + 12 * 60 * 60 * 1000; // 12 hours

  await pool.query(
    `INSERT INTO collaboration_sessions (
      id, owner_id, owner_workspace_id, room_id, 
      created_at, last_activity_at, expires_at, 
      status, visibility
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      sessionId,
      userId,
      workspaceId,
      roomId,
      now,
      now,
      expiresAt,
      "active",
      visibility,
    ]
  );

  await pool.end();

  // Revalidate paths that show sessions
  revalidatePath("/research");
  revalidatePath(`/research?workspaceId=${workspaceId}`);

  return {
    session: {
      id: sessionId,
      ownerId: userId,
      ownerWorkspaceId: workspaceId,
      roomId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
      status: "active",
      visibility,
    },
    shareLink: `${process.env.NEXT_PUBLIC_BASE_URL}/session/${sessionId}`,
    status: 200,
  };
}

export async function endCollaborationSession(sessionId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized", status: 401 };
  }

  const pool = new Pool({ connectionString: process.env.APP_DATABASE_URL });

  // Verify ownership
  const checkResult = await pool.query(
    `SELECT owner_id FROM collaboration_sessions WHERE id = $1`,
    [sessionId]
  );

  if (checkResult.rows.length === 0) {
    return { error: "Session not found", status: 404 };
  }

  if (checkResult.rows[0].owner_id !== userId) {
    return { error: "Not session owner", status: 403 };
  }

  // End session
  await pool.query(
    `UPDATE collaboration_sessions SET status = 'ended' WHERE id = $1`,
    [sessionId]
  );

  await pool.end();

  revalidatePath("/research");

  return { success: true, status: 200 };
}
```

#### Step 2: Create React Query Hooks

```typescript
// app/research/hooks/queries/useCollaborationSessions.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCollaborationSession,
  endCollaborationSession,
} from "@/research/actions/collaboration-sessions";

export function useActiveSessions() {
  return useQuery({
    queryKey: ["collaboration-sessions", "active"],
    queryFn: async () => {
      const res = await fetch("/api/collaboration/sessions/my-sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    refetchInterval: 10000, // Poll every 10s
    staleTime: 5000,
  });
}

export function useSessionDetails(sessionId: string | null) {
  return useQuery({
    queryKey: ["collaboration-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await fetch(`/api/collaboration/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Session not found");
      return res.json();
    },
    enabled: !!sessionId,
    refetchInterval: 5000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      visibility,
    }: {
      workspaceId: string;
      visibility?: "edit" | "view";
    }) => createCollaborationSession(workspaceId, visibility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-sessions"] });
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => endCollaborationSession(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-sessions"] });
      queryClient.removeQueries({
        queryKey: ["collaboration-session", sessionId],
      });
    },
  });
}
```

#### Step 3: Update Components

```typescript
// app/research/components/workspace/TabCollaborationMenu.tsx
"use client";

import { useCreateSession, useEndSession } from "@/research/hooks/queries/useCollaborationSessions";

export function TabCollaborationMenu({ workspaceId, tabId }: Props) {
  const createSession = useCreateSession();
  const endSession = useEndSession();

  const handleStartCollaboration = async () => {
    const result = await createSession.mutateAsync({
      workspaceId,
      visibility: "edit",
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Collaboration session created!");
    onSessionCreated?.(result.session.id, result.shareLink);
  };

  const handleEndSession = async () => {
    if (!activeSessionId) return;

    const result = await endSession.mutateAsync(activeSessionId);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Session ended");
    onEndSession?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button size="sm" variant="outline">
          <Icon name="users" size={16} />
          Collaborate
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {!activeSessionId ? (
          <DropdownMenuItem
            onClick={handleStartCollaboration}
            disabled={createSession.isPending}
          >
            {createSession.isPending ? "Creating..." : "Start Session"}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={handleEndSession}
            disabled={endSession.isPending}
          >
            {endSession.isPending ? "Ending..." : "End Session"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### Phase 3: Draft Management ❌ CANCELLED

**Status:** Feature removed October 11, 2025

Draft management was never integrated into the application. All related code has been removed:

- API routes deleted
- Hooks deleted
- UI components updated to remove draft props

See ROADMAP.md Week 4 for full removal details.

---

### Phase 4: Research Merge (Week 4)

Convert `POST /api/research/merge` to Server Action:

```typescript
// app/research/actions/research-merge.ts
"use server";

// auth import removed (Clerk removed)
import { getGlobalNeo4jClient } from "@proto/database";
import { createNeo4jClientWithIntegerConversion } from "@proto/utils";

export async function mergeResearchToNeo4j(bundle: ResearchBundle) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized", status: 401 };
  }

  const baseClient = getGlobalNeo4jClient();
  const client = createNeo4jClientWithIntegerConversion(baseClient);

  const results = {
    totalCreated: 0,
    totalUpdated: 0,
    totalSkipped: 0,
  };

  // Merge entities
  for (const entity of bundle.entities) {
    const result = await client.executeWrite(
      `MERGE (e:Entity {uid: $uid})
       ON CREATE SET e += $properties, e.createdAt = timestamp()
       ON MATCH SET e += $properties, e.updatedAt = timestamp()
       RETURN e`,
      { uid: entity.uid, properties: entity }
    );

    if (result.records.length > 0) {
      results.totalCreated++;
    }
  }

  // Merge relationships
  for (const rel of bundle.relationships) {
    await client.executeWrite(
      `MATCH (source {uid: $sourceUid})
       MATCH (target {uid: $targetUid})
       MERGE (source)-[r:${rel.type}]->(target)
       SET r += $properties
       RETURN r`,
      {
        sourceUid: rel.source,
        targetUid: rel.target,
        properties: rel.properties,
      }
    );
  }

  revalidatePath("/atlas");
  revalidatePath("/research");

  return {
    success: true,
    results,
    idMapping: {},
    status: 200,
  };
}
```

---

## Benefits of Migration

### Developer Experience

- ✅ **Less Boilerplate**: No `NextResponse`, no manual error handling
- ✅ **Type Safety**: Direct function calls = better TypeScript inference
- ✅ **Automatic Revalidation**: `revalidatePath()` vs manual cache management
- ✅ **Progressive Enhancement**: Forms work without JS

### User Experience

- ✅ **Optimistic Updates**: Instant feedback via React Query
- ✅ **Better Loading States**: Built-in `isPending` from mutations
- ✅ **Automatic Retry**: Configurable retry logic
- ✅ **Background Refetching**: Keep data fresh automatically

### Performance

- ✅ **Reduced Bundle Size**: No client-side fetch wrapper duplication
- ✅ **Better Caching**: React Query's intelligent cache
- ✅ **Parallel Queries**: React Query batching

---

## Migration Risks & Mitigation

### Risk 1: Hocuspocus Integration

**Issue:** Hocuspocus server expects API routes for auth  
**Mitigation:** Keep `/api/collaboration/room` as API route (it's for WebSocket auth)

### Risk 2: Polling Requirements

**Issue:** Some data needs real-time updates  
**Mitigation:**

- Keep GET endpoints as API routes
- Use React Query's `refetchInterval` for polling
- Consider Server-Sent Events for future

### Risk 3: Error Handling Changes

**Issue:** Server Actions return values, not Response objects  
**Mitigation:**

- Standardize return type: `{ data?, error?, status }`
- Handle in React Query's `onError` / `onSuccess`

### Risk 4: Testing Changes

**Issue:** Current tests expect `fetch()` calls  
**Mitigation:**

- Mock Server Actions in tests
- Use MSW for API route tests
- Keep existing API route tests until migration complete

---

## Testing Strategy

### Unit Tests

```typescript
// Test Server Actions directly
import { createCollaborationSession } from "@/research/actions/collaboration-sessions";

describe("createCollaborationSession", () => {
  it("enforces tier limits", async () => {
    const result = await createCollaborationSession("ws-123");
    expect(result.error).toContain("tier");
  });
});
```

### Integration Tests

```typescript
// Test React Query hooks
import { renderHook, waitFor } from "@testing-library/react";
import { useCreateSession } from "@/research/hooks/queries/useCollaborationSessions";

it("creates session and invalidates cache", async () => {
  const { result } = renderHook(() => useCreateSession());

  await result.current.mutateAsync({ workspaceId: "ws-123" });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
});
```

---

## Timeline

| Phase   | Duration | Deliverables                          |
| ------- | -------- | ------------------------------------- |
| Phase 1 | 1 week   | React Query setup, QueryProvider      |
| Phase 2 | 1 week   | Collaboration Server Actions + hooks  |
| Phase 3 | 1 week   | Draft management migration            |
| Phase 4 | 1 week   | Research merge migration              |
| Testing | 1 week   | Full integration tests, rollback plan |

**Total:** 5 weeks

---

## Rollback Plan

1. Keep old API routes until migration verified
2. Feature flag: `ENABLE_SERVER_ACTIONS=true/false`
3. A/B test with 10% traffic for 1 week
4. Full rollout if <1% error rate
5. Delete old API routes after 2 weeks stable

---

## Success Metrics

- ✅ Zero regressions in existing functionality
- ✅ 20% reduction in client bundle size
- ✅ 30% faster mutation response times (no double network hop)
- ✅ 50% less boilerplate code (API route → Server Action)
- ✅ Improved DX scores from team survey

---

## Next Steps

1. **Review this plan** - Get team approval
2. **Spike React Query** - 1-day POC with one endpoint
3. **Setup infrastructure** - QueryProvider, types, conventions
4. **Start Phase 2** - Collaboration sessions migration
5. **Iterate** - Gather feedback, adjust approach

---

**Questions? Concerns?** Drop in #engineering-research-mode
