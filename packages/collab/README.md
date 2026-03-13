# @proto/collab

Enterprise-tier voice and video collaboration built on Jitsi Meet with Clerk authentication.

## Features

- 🎥 **Video Conferencing** - HD video calls with up to 50 participants (Enterprise)
- 🎤 **Voice Chat** - Low-latency audio-only mode
- 🖥️ **Screen Sharing** - Share screens for collaboration
- 🔒 **Org-Scoped Rooms** - Multi-tenant isolation with Clerk organizations
- 🎫 **JWT Authentication** - Secure token-based access control
- 🚪 **Plan Gating** - Enterprise-only feature with super admin override
- 📊 **Seat Limits** - Enforced participant limits by plan tier

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Browser)                                            │
│  ├─ JitsiMeet Component (React)                             │
│  ├─ useCollaboration Hook                                   │
│  └─ Jitsi Meet External API                                 │
└─────────────────────────────────────────────────────────────┘
                          ↕ HTTPS + JWT
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Route                                           │
│  ├─ /api/collaboration/room (POST)                          │
│  ├─ Clerk auth validation                                   │
│  ├─ Plan tier gating                                        │
│  └─ JWT token generation                                    │
└─────────────────────────────────────────────────────────────┘
                          ↕ WebRTC
┌─────────────────────────────────────────────────────────────┐
│  Jitsi Meet Server (Docker)                                 │
│  ├─ jitsi-meet (Web UI)                                     │
│  ├─ jicofo (Focus component)                                │
│  ├─ jvb (Video bridge)                                      │
│  └─ prosody (XMPP server)                                   │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Add to workspace
pnpm add @proto/collab --filter @proto/collab

# Build package
pnpm --filter @proto/collab build
```

## Usage

### Server-Side (API Route)

```typescript
// app/api/collaboration/room/route.ts
import { createCollaborationRoom } from "@proto/collab/server";
import { auth } from "@clerk/nextjs/server";
import { getOrgPlan } from "@proto/utils/tenancy-server";

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  const { sessionId, roomType } = await request.json();

  // Get org plan
  const plan = await getOrgPlan(orgId);

  // Create room with JWT
  const roomConfig = await createCollaborationRoom(
    { sessionId, roomType },
    {
      clerkUserId: userId,
      clerkOrgId: orgId,
      plan,
      isModerator: true,
    },
    {
      domain: process.env.JITSI_DOMAIN!,
      appId: process.env.JITSI_APP_ID!,
      appSecret: process.env.JITSI_APP_SECRET!,
      jwtExpiration: 3600,
    }
  );

  return Response.json(roomConfig);
}
```

### Client-Side (React Component)

```typescript
// app/research/components/CollaborationPanel.tsx
"use client";

import { JitsiMeet, useCollaboration } from "@proto/collab/client";

export function CollaborationPanel({ sessionId }: { sessionId: string }) {
  const { roomConfig, loading, error } = useCollaboration({
    sessionId,
    roomType: "video",
  });

  if (loading) return <div>Loading collaboration...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!roomConfig) return null;

  return (
    <div className="h-full w-full">
      <JitsiMeet
        roomConfig={roomConfig}
        width="100%"
        height="100%"
        onReady={() => console.log("Joined room")}
      />
    </div>
  );
}
```

## Environment Variables

```bash
# Jitsi Configuration
JITSI_DOMAIN=meet.jitsi           # Your Jitsi server domain
JITSI_APP_ID=rabbit-hole          # Application identifier
JITSI_APP_SECRET=your_secret_key  # JWT signing secret

# Super Admin Override (optional)
SUPER_ADMIN_USER_IDS=user_abc123,user_xyz789
```

## Room ID Pattern

Rooms follow the same pattern as Yjs collaboration:

```
org:{clerkOrgId}:{roomType}:{sessionId}

Examples:
- org:org_2abc123:video:research_session_1
- org:org_2abc123:voice:research_session_2
```

## Plan Gating

| Feature      | Free | Pro | Enterprise |
| ------------ | ---- | --- | ---------- |
| Voice        | ❌   | ❌  | ✅         |
| Video        | ❌   | ❌  | ✅         |
| Screen Share | ❌   | ❌  | ✅         |
| Recording    | ❌   | ❌  | ✅         |

Super admins can bypass plan restrictions.

## Seat Limits

- **Free:** 1 participant
- **Pro:** 5 participants
- **Enterprise:** 50 participants

## Docker Deployment

See `docker-compose.neo4j.yml` for Jitsi Meet stack configuration.

## Security

- JWT tokens expire after 1 hour
- Rooms scoped to Clerk organizations
- Token validation on connection
- Moderator permissions for first user
- Super admin override capability

## API Reference

### Server

- `createCollaborationRoom(request, context, jitsiConfig)` - Create room with JWT
- `generateJitsiToken(config, jitsiConfig)` - Generate JWT token
- `hasFeatureAccess(plan, feature)` - Check plan feature access
- `validateRoomAccess(roomId, clerkOrgId)` - Validate room access

### Client

- `<JitsiMeet roomConfig={...} />` - Embed Jitsi Meet
- `useCollaboration({ sessionId, roomType })` - Fetch room config
