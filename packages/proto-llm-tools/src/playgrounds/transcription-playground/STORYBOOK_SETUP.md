# Transcription Playground - Storybook Setup

## Quick Start

### 1. Configure Environment

```bash
# .env (server-side only)
GROQ_API_KEY=gsk_...
```

### 2. Start Next.js Dev Server

```bash
pnpm dev
# Must be running on http://localhost:3000
```

### 3. Start Storybook (in separate terminal)

```bash
pnpm storybook
# Opens on http://localhost:6006
```

### 4. Navigate to Playground

Storybook → Tools → Transcription Playground

---

## How It Works

Storybook (port 6006) calls Next.js API routes (port 3000):

```
Storybook :6006
  └─→ fetch("http://localhost:3000/api/transcribe")
       └─→ Next.js server proxies to Groq
            └─→ Returns transcription
```

**Requirement:** Next.js dev server must be running for Storybook to work.

---

## Troubleshooting

### "404 Not Found" on /api/transcribe

**Cause:** Next.js dev server not running

**Solution:**

```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm storybook
```

### "Connection Refused" errors

**Cause:** Next.js not on port 3000

**Solution:** Check `next.config.js` - should use default port 3000

### "Service Offline" badge

**Cause:** GROQ_API_KEY not set in `.env`

**Solution:**

```bash
echo "GROQ_API_KEY=gsk_..." >> .env
# Restart Next.js dev server
```

---

## Alternative: Test in Next.js Directly

Skip Storybook, create test page:

```typescript
// app/test-transcription/page.tsx
import { TranscriptionPlayground } from "@/components/transcription-playground";

export default function TestPage() {
  return <TranscriptionPlayground />;
}
```

Visit: http://localhost:3000/test-transcription
