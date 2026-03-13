# Hosted Mode Setup Guide

## Overview

Hosted mode allows users to test LLM providers without providing their own API keys. Usage is tracked server-side for billing purposes.

## Configuration

### Environment Variables

Add to `.env` or deployment environment:

```bash
# Required for hosted mode
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Optional
OLLAMA_BASE_URL=http://localhost:11434
```

### Mode Toggle

Users can switch between:

- **Hosted (Paid)**: Uses server API keys, usage tracked
- **BYOK (Free)**: Users provide their own keys, no tracking

## Usage Tracking Implementation

### Current State

API routes include TODO markers for usage tracking:

```typescript
// app/api/llm-playground/chat/route.ts
if (useHosted) {
  // TODO: Track token usage for user billing
  // await trackUsage({ userId, provider, category, tokensUsed });
}
```

### Implementation Guide

Create usage tracking service:

```typescript
// lib/usage-tracking.ts
interface UsageRecord {
  userId: string;
  provider: string;
  category: string;
  tokensUsed: number;
  timestamp: Date;
  model: string;
}

export async function trackUsage(record: UsageRecord) {
  // Insert into PostgreSQL
  await sql`
    INSERT INTO llm_usage_tracking
      (user_id, provider, category, tokens_used, model, created_at)
    VALUES
      (${record.userId}, ${record.provider}, ${record.category}, 
       ${record.tokensUsed}, ${record.model}, ${record.timestamp})
  `;
}

export async function getUserUsage(
  userId: string,
  startDate: string,
  endDate: string
) {
  return await sql`
    SELECT
      provider,
      category,
      SUM(tokens_used) as total_tokens,
      COUNT(*) as request_count,
      AVG(tokens_used) as avg_tokens_per_request
    FROM llm_usage_tracking
    WHERE user_id = ${userId}
      AND created_at >= ${startDate}
      AND created_at < ${endDate}
    GROUP BY provider, category
    ORDER BY total_tokens DESC
  `;
}
```

### Database Schema

```sql
CREATE TABLE llm_usage_tracking (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  INDEX idx_user_date (user_id, created_at),
  INDEX idx_provider (provider)
);
```

### Integration Points

1. **Chat API**: Track after successful response
2. **User Dashboard**: Display usage stats
3. **Billing System**: Calculate costs from usage
4. **Rate Limiting**: Prevent abuse

## Pricing Structure

### Example Pricing

Based on actual provider costs with markup:

```typescript
const PRICING = {
  openai: {
    "gpt-4o": { input: 0.000005, output: 0.000015 },
    "gpt-3.5-turbo": { input: 0.0000015, output: 0.000002 },
  },
  anthropic: {
    "claude-3-5-sonnet": { input: 0.000003, output: 0.000015 },
    "claude-3-haiku": { input: 0.00000025, output: 0.00000125 },
  },
  groq: {
    "llama-3.3-70b": { input: 0.00000059, output: 0.00000079 },
  },
};

function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  const pricing = PRICING[provider]?.[model];
  if (!pricing) return 0;

  return inputTokens * pricing.input + outputTokens * pricing.output;
}
```

## User Experience

### Mode Indicator

- Header shows current mode (Hosted/BYOK)
- Badge shows connection status
- Clear visual distinction

### API Keys Tab

- **Hosted Mode**: Shows "Using hosted API keys" message
- **BYOK Mode**: Shows key input fields
- Toggle between modes updates UI instantly

### Billing Integration

- Track usage per request in hosted mode
- Display cumulative usage in user dashboard
- Generate monthly invoices from usage data
- Allow users to export usage reports

## Security

### Hosted Mode

- Server keys never sent to client
- Keys stored as environment variables
- Rotation managed server-side
- No user access to actual keys

### BYOK Mode

- User keys only in browser memory
- Never persisted to database
- Cleared on page refresh
- Not included in logs or analytics

## Rate Limiting

### Recommended Limits

```typescript
const RATE_LIMITS = {
  hosted: {
    requestsPerMinute: 10,
    tokensPerDay: 100000,
  },
  byok: {
    requestsPerMinute: 60, // Provider's actual limit
    tokensPerDay: Infinity, // No limit on BYOK
  },
};
```

### Implementation

```typescript
// middleware or API route
const usage = await getUserDailyUsage(userId);
if (useHosted && usage.tokens > RATE_LIMITS.hosted.tokensPerDay) {
  return NextResponse.json(
    { error: "Daily token limit exceeded" },
    { status: 429 }
  );
}
```

## Testing

### Test Hosted Mode

1. Set server environment variables
2. Toggle to "Hosted" mode
3. Send message
4. Verify server keys used (check logs)

### Test BYOK Mode

1. Toggle to "BYOK" mode
2. Add API key
3. Send message
4. Verify user key used

### Test Mode Switching

1. Send message in Hosted mode
2. Switch to BYOK mode
3. Verify status badge updates
4. Verify API Keys tab shows correctly

## Future Enhancements

- [ ] Usage dashboard for users
- [ ] Cost estimation before sending
- [ ] Monthly spending caps
- [ ] Usage alerts and notifications
- [ ] Detailed usage breakdown by model
- [ ] Export usage to CSV
- [ ] Real-time cost tracking in UI

## Related Files

- API Chat: `app/api/llm-playground/chat/route.ts`
- API Models: `app/api/llm-playground/models/route.ts`
- Component: `app/components/llm-provider-playground/LLMProviderPlayground.tsx`
