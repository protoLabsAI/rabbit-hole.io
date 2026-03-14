# Langfuse Session Tracking Guide

## Overview

Sessions in Langfuse group related interactions across multiple traces, enabling:

- **Conversation Replay**: View entire chat history across multiple requests
- **User Attribution**: Track which user initiated each session
- **Session Analytics**: Analyze conversation patterns, token usage, costs per session
- **Debugging**: Trace issues across entire conversations, not just individual requests

## Implementation

### API Routes (LLM Playground)

**Location:** `apps/rabbit-hole/app/api/llm-playground/chat/route.ts`

**Session ID Generation:**

```typescript
// Read session ID from header (persists across requests)
const sessionId =
  request.headers.get("x-session-id") ||
  `playground-${userId || "anonymous"}-${Date.now()}`;
```

**User ID from Clerk:**

```typescript
const { userId } = await auth();
```

**Trace Configuration:**

```typescript
const trace = langfuse?.trace({
  name: "llm-playground-chat",
  sessionId: sessionId, // Groups all traces in this conversation
  userId: userId || undefined, // Links to Clerk user
  tags: ["playground", config.provider, config.category],
  metadata: {
    /* ... */
  },
});
```

**Response Includes:**

- `traceUrl`: Individual trace for this request
- `sessionUrl`: Full conversation view (all traces in session)
- `sessionId`: Persistent session identifier

### Frontend (Playground UI)

**Location:** `packages/proto-llm-tools/src/playgrounds/llm-provider-playground/hooks/useLLMChat.ts`

**Session Persistence:**

```typescript
const [sessionId, setSessionId] = useState<string>(() => {
  // Generate persistent session ID for this chat
  return `playground-${Date.now()}-${Math.random().toString(36).substring(7)}`;
});
```

**Session Header:**

```typescript
const response = await fetch("/api/llm-playground/chat", {
  headers: {
    "Content-Type": "application/json",
    "x-session-id": sessionId, // Same ID for entire conversation
  },
  // ...
});
```

**Clear Chat = New Session:**

```typescript
const clearChat = useCallback(() => {
  setMessages([]);
  // Generate new session ID for fresh conversation
  setSessionId(
    `playground-${Date.now()}-${Math.random().toString(36).substring(7)}`
  );
}, []);
```

### Agent Layer (LangGraph)

**Location:** `agent/src/config/langfuse.ts`

**Already Configured:**

```typescript
const handler = new CallbackHandler({
  sessionId: metadata.sessionId, // From CopilotKit state
  userId: metadata.userId, // From CopilotKit state
  tags: [
    /* ... */
  ],
});
```

**Session Logging:**

```typescript
if (metadata.sessionId) {
  console.log(
    `[Langfuse] Session tracking: ${metadata.sessionId} (user: ${metadata.userId || "anonymous"})`
  );
}
```

## Session ID Sources

### Playground

- **Generated:** Client-side in `useLLMChat` hook
- **Format:** `playground-{timestamp}-{random}`
- **Lifecycle:** Persists until "Clear Chat" clicked
- **Propagation:** Via `x-session-id` header

### Agents (CopilotKit)

- **Source:** `state.sharedGraphState?.sessionId`
- **Format:** CopilotKit-generated session ID
- **Lifecycle:** Entire CopilotKit session
- **Propagation:** Via LangChain CallbackHandler

### Custom Implementation

For other endpoints:

```typescript
// Option 1: User-based persistent session
const sessionId = `user-${userId}-${featureName}`;

// Option 2: Request-scoped session
const sessionId = `request-${Date.now()}-${uuid()}`;

// Option 3: Frontend-provided session
const sessionId = request.headers.get("x-session-id");
```

## User ID Sources

### Clerk Authentication

```typescript
// auth import removed (Clerk removed)

const { userId } = await auth();
// Returns: "user_xyz..." or null
```

### Anonymous Users

```typescript
userId: userId || undefined; // Don't pass "anonymous" string
```

## Viewing Sessions in Langfuse

### Individual Trace

**URL Format:**

```
https://cloud.langfuse.com/trace/{traceId}
```

**Shows:**

- Single request/response
- Model parameters
- Token usage
- Latency
- Cost

### Session View

**URL Format:**

```
https://cloud.langfuse.com/project/{projectId}/sessions/{sessionId}
```

**Shows:**

- All traces in conversation
- Timeline view
- Cumulative token usage
- Total cost
- User information
- Session replay

### UI Links

Playground messages now show:

- **"Trace →"** - Individual request trace
- **"Session →"** - Full conversation view

## Session Analytics

### Available in Langfuse UI

1. **Session List**
   - Filter by user, tags, date range
   - Sort by duration, cost, message count
   - Search by session ID

2. **Session Details**
   - Complete message history
   - Token usage per message
   - Cost breakdown
   - Performance metrics
   - Error tracking

3. **Session Metrics**
   - Average session length
   - Messages per session
   - Cost per session
   - Popular conversation flows

## Best Practices

### Session ID Format

- **Unique**: Globally unique across all sessions
- **Descriptive**: Include context (e.g., `playground-`, `agent-`, `research-`)
- **Trackable**: Include user ID or feature name when possible
- **Max Length**: Under 200 characters (ASCII)

### User Attribution

- **Always track**: Link sessions to users when authenticated
- **Privacy**: Hash user IDs if needed for compliance
- **Anonymous**: Use `undefined` rather than "anonymous" string

### Session Lifecycle

- **Start**: Generate ID on first message
- **Continue**: Persist ID across requests
- **End**: Generate new ID on clear/reset
- **Timeout**: Consider auto-expiry for inactive sessions

### Metadata

Include relevant context:

```typescript
metadata: {
  provider: "openai",
  mode: "byok",
  feature: "playground",
  environment: "production",
  // ... other contextual data
}
```

## Troubleshooting

### Sessions Not Grouping

**Issue:** Traces appear separate in Langfuse

**Solutions:**

1. Verify session ID is same across requests
2. Check session ID under 200 characters
3. Ensure session ID is ASCII characters only
4. Confirm session ID passed to trace/handler

### User ID Not Showing

**Issue:** Sessions not attributed to users

**Solutions:**

1. Check Clerk auth working: `const { userId } = await auth();`
2. Verify user logged in
3. Pass `userId` to trace: `userId: userId || undefined`
4. Check Langfuse UI filters

### Session Links Not Working

**Issue:** Session URL returns 404

**Solutions:**

1. Set `LANGFUSE_PROJECT_ID` environment variable
2. Verify session exists in Langfuse
3. Check URL encoding for special characters
4. Confirm Langfuse keys configured

## Environment Variables

Required for session tracking:

```bash
# Core (required)
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...

# Optional
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_PROJECT_ID=your-project-id  # For session URLs
```

## Testing

### Manual Testing

1. Open playground: http://localhost:3000/playground/llm-provider
2. Send first message
3. Note session ID in console: `[Langfuse] Session tracking: playground-...`
4. Send second message (should use same session ID)
5. Click "Session →" link
6. Verify both messages appear in Langfuse session view
7. Click "Clear Chat"
8. Send new message (should generate new session ID)

### Validation Checklist

- [ ] Session ID persists across messages
- [ ] New session ID on clear chat
- [ ] User ID tracked when logged in
- [ ] Trace URL works
- [ ] Session URL works
- [ ] Multiple messages grouped in Langfuse
- [ ] Session metadata correct
- [ ] Console logs show session tracking

## Future Enhancements

### Potential Improvements

1. **Session Persistence**: Save to localStorage/database
2. **Session Resume**: Resume previous sessions
3. **Session Sharing**: Share session URLs with team
4. **Session Bookmarks**: Mark important sessions
5. **Session Annotations**: Add notes to sessions
6. **Session Export**: Download conversation history
7. **Session Analytics**: Dashboard for session metrics

### API Routes to Instrument

Consider adding session tracking to:

- Entity research playground
- Extraction workflows
- Other chat/interactive features

## References

- [Langfuse Sessions Docs](https://langfuse.com/docs/sessions)
- [Langfuse JS SDK](https://langfuse.com/docs/sdk/typescript/guide)
- [CallbackHandler Docs](https://js.langchain.com/docs/modules/callbacks/)
- [Clerk Auth](https://clerk.com/docs)
