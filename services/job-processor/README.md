# Job Processor Service

Standalone Sidequest.js background job processor for async workflows (YouTube, transcription, file extraction).

**Real-Time Notifications:** Job completions trigger PostgreSQL NOTIFY events, enabling sub-100ms client notifications via Server-Sent Events.

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Browser                               │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────────┐│
│  │ YouTubePlaygrd │  │ JobStatusTracker │  │ SSE Connection       ││
│  │   Component    │  │   Component      │  │ /api/jobs/subscribe  ││
│  └────────┬───────┘  └────────┬─────────┘  └──────────┬───────────┘│
│           │                   │                        │             │
└───────────┼───────────────────┼────────────────────────┼─────────────┘
            │                   │                        │
            │ POST enqueue      │ GET /api/jobs/status/:id
            │                   │ (polling fallback)     │ Real-time events
            ▼                   ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Next.js App (Port 3000)                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ API Routes                                                    │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────────┐  │   │
│  │  │ /api/jobs/          │  │ /api/jobs/                   │  │   │
│  │  │  enqueue-youtube    │  │  subscribe (SSE)             │  │   │
│  │  │                     │  │  ┌────────────────────┐      │  │   │
│  │  │  ↓ HTTP POST        │  │  │ LISTEN              │      │  │   │
│  │  │                     │  │  │ 'job_completion'    │      │  │   │
│  │  └─────────────────────┘  │  └──────────┬─────────┘      │  │   │
│  │                            │             │ pg_notify()    │  │   │
│  │  ┌─────────────────────┐  └──────────────┬──────────────┘  │   │
│  │  │ /api/jobs/status/:id│                  │                 │   │
│  │  │  1. getJobCompletion│◄─────┐          │                 │   │
│  │  │  2. getJobStatus    │      │          │                 │   │
│  │  └─────────────────────┘      │          │                 │   │
│  └──────────────────────────────┬┴──────────┴─────────────────┘   │
└─────────────────────────────────┼──┬──────────┬────────────────────┘
                                  │  │          │
                                  │  │          │
        ┌─────────────────────────┘  │          │
        │                            │          │
        │ ┌──────────────────────────┘          │
        │ │                                     │
        │ │  ┌──────────────────────────────────┘
        │ │  │
        ▼ ▼  ▼
┌───────────────────────────────────────────────────────────────────────┐
│       PostgreSQL Job Queue (Port 5433) - Separate Instance           │
│  ┌────────────────────────┐  ┌──────────────────────────────────┐   │
│  │ sidequest_jobs         │  │ sidequest_job_completions        │   │
│  │ (auto-created)         │  │ (migration 016)                  │   │
│  ├────────────────────────┤  ├──────────────────────────────────┤   │
│  │ id, status, queue      │  │ job_id, status, result           │   │
│  │ data, result, error    │  │ user_id, workspace_id            │   │
│  │ created_at, attempts   │  │ completed_at, notified           │   │
│  └────────┬───────────────┘  └──────────────────────────────────┘   │
│           │                           ▲                               │
│           │  ┌───────────────────────┴──────────────────┐            │
│           │  │ TRIGGER: notify_job_completion()         │            │
│           │  │  ON UPDATE status → 'completed'/'failed' │            │
│           │  │   1. INSERT INTO sidequest_job_completions│           │
│           │  │   2. PERFORM pg_notify('job_completion') │            │
│           │  └──────────────────────────────────────────┘            │
│           │                                                           │
│  Schema: public (Sidequest convention)                                │
│  Network: evidence-stack (shared with all services)                   │
└───────────┼───────────────────────────────────────────────────────────┘
            │ Poll for jobs
            │ status='pending'
            ▼
┌───────────────────────────────────────────────────────────────────────┐
│           Job Processor Service (Port 8680)                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ HTTP API Server                                               │   │
│  │  POST /enqueue/youtube → Sidequest.build().enqueue()         │   │
│  │  GET  /health                                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Sidequest Workers (3 concurrent)                              │   │
│  │  ┌────────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │ YouTubeProcessingJob   │  │ TextExtractionJob        │   │   │
│  │  │  - Fetch video         │  │  - Extract text from file│   │   │
│  │  │  - Create Neo4j entity │  │  - Update Neo4j node     │   │   │
│  │  │  - Update status       │  │  - Update status         │   │   │
│  │  └────────────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Job Lifecycle

```
1. ENQUEUE
   Client → POST /api/jobs/enqueue-youtube
   → Job Processor HTTP API (port 8680)
   → INSERT INTO sidequestjs.jobs (status='pending')

2. PROCESSING
   Job Processor Worker polls database
   → Claims job (status='active')
   → Executes YouTubeProcessingJob
   → Updates job (status='completed' or 'failed')

3. TRIGGER FIRES
   PostgreSQL trigger detects status change
   → INSERT INTO sidequestjs.job_completions
   → PERFORM pg_notify('job_completion', {...})

4. REAL-TIME NOTIFICATION
   SSE endpoint receives pg_notify event
   → Filters by userId
   → Streams to connected clients via EventSource
   → Client receives completion in <100ms

5. POLLING FALLBACK
   If SSE disconnected:
   → Client polls GET /api/jobs/status/:id
   → Checks job_completions cache first
   → Falls back to jobs table
   → Exponential backoff: 500ms → 5s
```

### Database Schema

**PostgreSQL Instance:** Separate postgres-jobs (port 5433)

**Jobs Table (`sidequest_jobs`)**

- Primary table managed by Sidequest.js (auto-created on startup)
- Schema: `public` (Sidequest convention)
- Stores active and pending jobs
- Auto-cleaned after completion

**Job Completions Cache (`sidequest_job_completions`)**

- Created by migration `016_job_completions.sql.managed`
- Schema: `public` (same as Sidequest tables)
- Persists completion state for 7 days
- Prevents 404 errors after Sidequest cleanup
- Powers completion history queries
- Enables real-time notifications via trigger

**Isolated & Scalable Design:**

- Dedicated PostgreSQL instance (postgres-jobs:5433, separate from app database)
- Sidequest auto-creates tables in `public` schema (`sidequest_jobs`, `sidequest_queues`)
- Job completion cache added via migration (`sidequest_job_completions`)
- All services on shared Docker network (`evidence-stack`) for inter-service communication
- Job processor can reach: youtube-processor, minio, neo4j, postgres (app database)
- Separate Docker service from Next.js app
- Multi-app compatible (can serve rabbit-hole, portfolio, blog, etc.)
- Horizontal scaling ready
- Real-time completion cache + notifications (PostgreSQL LISTEN/NOTIFY)

## Quick Start

**1. Start the full infrastructure stack:**

```bash
docker compose -f docker-compose.neo4j.yml up -d
```

This starts all services on shared `evidence-stack` network:

- postgres-jobs (5433) - Job queue database
- postgres-complete (5432) - App database
- job-processor (8678/8679/8680)
- youtube-processor (8001)
- neo4j, minio, redis, etc.

**2. Run migrations:**

```bash
# Job completion cache (migration runs automatically on postgres-jobs init)
docker exec -i postgres-jobs psql -U jobqueue -d sidequest < migrations/postgresql/016_job_completions.sql.managed
```

**3. Configure Next.js app environment:**

```bash
# .env.local

# Job processor HTTP API endpoint
JOB_PROCESSOR_URL=http://localhost:8680

# Job queue database for status queries (separate instance!)
JOB_QUEUE_DATABASE_URL=postgresql://jobqueue:changeme@localhost:5433/sidequest

# App database
APP_DATABASE_URL=postgresql://app_user:changeme@localhost:5432/rabbit_hole_app
```

**4. Enqueue a test job:**

```bash
curl -X POST http://localhost:3000/api/jobs/enqueue-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "quality": "720p",
    "workspaceId": "ws_test"
  }'
```

**5. Monitor:**

- Dashboard: http://localhost:8678
- Health Check: http://localhost:8679/health
- Job API: http://localhost:8680/health
- All services running: `docker compose -f docker-compose.neo4j.yml ps`

**Services:**

- Port 8678: Sidequest dashboard (queue monitoring, job history)
- Port 8679: Health check endpoint (Docker healthcheck)
- Port 8680: HTTP API for job enqueueing (Next.js → Job Processor)

## Environment Variables

### Job Processor Service (Docker)

```bash
# Job queue database (Sidequest tables)
DATABASE_URL=postgresql://jobqueue:changeme@postgres-jobs:5432/sidequest

# Application database (user data, share tokens, etc.)
APP_DATABASE_URL=postgresql://app_user:changeme@host.docker.internal:5432/rabbit_hole_app

# Neo4j (for entity creation)
NEO4J_URI=bolt://host.docker.internal:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=changeme

# MinIO (file storage)
MINIO_ENDPOINT=host.docker.internal:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=changeme
MINIO_SECURE=false

# Job processor config
JOB_WORKERS=3
LOG_LEVEL=INFO
DASHBOARD_PORT=8678
HEALTH_PORT=8679
```

### Next.js App (.env.local)

```bash
# Main app database
APP_DATABASE_URL=postgresql://app_user:changeme@localhost:5432/rabbit_hole_app

# Job queue database (separate, isolated)
JOB_QUEUE_DATABASE_URL=postgresql://jobqueue:changeme@localhost:5433/sidequest
```

## Database Schema

### Jobs Table (`sidequestjs.jobs`)

Primary table managed by Sidequest.js (migration `015_sidequest_tables.sql.managed`).

### Job Completions Cache (`sidequestjs.job_completions`)

Persists completion state after Sidequest cleanup (7-day retention). Eliminates 404 errors.

**Key Features:**

- Automatic population via PostgreSQL trigger
- User/workspace filtering for queries
- PostgreSQL NOTIFY 'job_completion' on insert
- Powers real-time SSE notifications to clients

**Migration:** `016_job_completions.sql.managed`

## Job Classes

### YouTubeProcessingJob

**Queue:** `youtube-processing`  
**Purpose:** Download YouTube videos, extract audio, create Neo4j entities

**Input:**

```typescript
{
  url: string; // YouTube URL
  quality: "720p" | "1080p";
  userId: string; // Clerk user ID
  orgId: string | null; // Clerk org ID
  workspaceId: string; // Workspace context
}
```

**Flow:**

1. Calls youtube-processor microservice
2. Creates Neo4j Video entity
3. Updates storage quota (TODO)

### TextExtractionJob

**Queue:** `file-processing`  
**Purpose:** Extract text from uploaded files (TXT, MD, HTML)

**Input:**

```typescript
{
  fileUid: string; // Neo4j file UID
  canonicalKey: string; // MinIO object key
  mediaType: string; // MIME type
  fileName: string; // Original filename
}
```

**Flow:**

1. Downloads file from MinIO
2. Extracts text based on media type
3. Updates Neo4j file node with extracted content
4. Updates processing state

**Supported Types:**

- ✅ text/plain
- ✅ text/markdown
- ✅ text/html (strips tags)
- ❌ application/pdf (not yet implemented)

## API Integration

### Architecture: HTTP API Pattern

**Why HTTP API?**

Sidequest must be enqueued via `Sidequest.build().enqueue()` (not direct SQL inserts), but Next.js cannot import Sidequest due to Turbopack/node-cron bundling issues.

**Solution:** Job processor exposes HTTP API that Next.js calls:

```
Next.js API Route
  ↓ HTTP POST
Job Processor API (port 8680)
  ↓ Sidequest.build().enqueue()
PostgreSQL sidequestjs.jobs
  ↓
Worker picks up and executes
```

### From Next.js API Routes

```typescript
import { enqueueYouTubeJob } from "@protolabsai/sidequest-utils/server";

export async function POST(request: Request) {
  // Internally calls: POST http://localhost:8680/enqueue/youtube
  const job = await enqueueYouTubeJob({
    url: "https://youtube.com/watch?v=...",
    quality: "720p",
    userId: "user_123",
    orgId: "org_123",
    workspaceId: "ws_123",
  });

  return Response.json({ jobId: job.jobId });
}
```

### Job Processor HTTP API

**Location:** `services/job-processor/api-server.ts`

```typescript
export function createAPIServer(port = 8680) {
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/enqueue/youtube") {
      const data = await parseBody(req);

      // Uses proper Sidequest.build() pattern
      const job = await Sidequest.build(YouTubeProcessingJob)
        .queue("youtube-processing")
        .timeout(300000)
        .maxAttempts(3)
        .enqueue(data);

      res.writeHead(202);
      res.end(JSON.stringify({ success: true, jobId: job.id }));
    }
  });

  server.listen(port);
  return server;
}
```

**Critical:**

- ❌ Never import `sidequest` in Next.js (Turbopack build errors)
- ✅ Always use HTTP API to job processor
- ✅ Job processor uses `Sidequest.build().enqueue()` (proper pattern)
- ❌ Never insert directly into `sidequestjs.jobs` (bypasses Sidequest)

### From React Components

```typescript
import { useEnqueueYouTube, useJobStatus } from "@protolabsai/sidequest-utils/client";

function MyComponent() {
  const { mutate: enqueue } = useEnqueueYouTube();
  const { data: job } = useJobStatus(jobId, { refetchInterval: 2000 });

  return <button onClick={() => enqueue({ url, quality, workspaceId })}>
    Process Video
  </button>;
}
```

## Database Architecture

### Why Separate Database?

**Isolation:**

- Job queue operations don't impact app queries
- Independent scaling (add read replicas to app DB without affecting jobs)
- Different backup/retention policies

**Multi-App Support:**

- Single job processor serves multiple apps (rabbit-hole, portfolio, blog)
- Each app enqueues to same central queue
- Apps reference job IDs but don't manage workers

**Performance:**

- Job polling doesn't contend with app transactions
- Dedicated connection pool for queue operations
- Can optimize postgres-jobs config for high-throughput inserts

### Connection Flow

```
App 1 (rabbit-hole.io)  ──┐
App 2 (portfolio)       ──┼──> postgres-jobs:5433 (sidequestjs.jobs)
App 3 (blog)            ──┘       ↓
                              Job Processor Workers
                                  ↓
                          Neo4j / MinIO / Services
```

## Monitoring

**Sidequest Dashboard:** http://localhost:8678

- Job queue status
- Active/pending/completed/failed jobs
- Execution times
- Retry attempts

**Health Endpoint:** http://localhost:8679/health

```json
{
  "status": "healthy",
  "timestamp": "2025-10-19T...",
  "uptime": 3600
}
```

**PostgreSQL Queries:**

```sql
-- Job counts by status
SELECT status, COUNT(*)
FROM sidequestjs.jobs
GROUP BY status;

-- Recent failures
SELECT id, queue, error, created_at
FROM sidequestjs.jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Queue backlog
SELECT queue, COUNT(*) as pending
FROM sidequestjs.jobs
WHERE status = 'pending'
GROUP BY queue;
```

## Development

**Local development:**

```bash
cd services/job-processor
pnpm install
pnpm dev  # Watch mode with tsx
```

**Build:**

```bash
pnpm build  # Compiles TypeScript to dist/
```

**Type check:**

```bash
pnpm type-check
```

## Production Deployment

**Scale workers horizontally:**

```yaml
job-processor:
  deploy:
    replicas: 3 # Multiple workers
    resources:
      limits:
        cpus: "2"
        memory: 2G
```

**Configure concurrency per queue:**

```typescript
// In index.ts
const sidequest = new Sidequest({
  backend: postgresBackend,
  workers: parseInt(process.env.JOB_WORKERS || "3"),
  queues: [
    { name: "youtube-processing", concurrency: 2 },
    { name: "file-processing", concurrency: 3 },
    { name: "transcription", concurrency: 1 },
  ],
});
```

## Troubleshooting

**Tables don't exist:**

- Start job-processor once - Sidequest auto-creates schema
- Or run Phase 2 migration (015_sidequest_tables.sql.managed)

**Port conflicts:**

- Sidequest dashboard: 8678
- Health check: 8679
- PostgreSQL: 5433

**Jobs not processing:**

- Check worker logs: `docker-compose -f docker-compose.jobs.yml logs -f job-processor`
- Verify queue names match
- Check service connectivity (Neo4j, MinIO, youtube-processor)

**Connection refused from Next.js:**

- Set `JOB_QUEUE_DATABASE_URL` in .env.local
- Port 5433 must be accessible from host

## Files

```
services/job-processor/
├── index.ts              # Sidequest initialization + queue config
├── server.ts             # Main server (starts all services)
├── api-server.ts         # HTTP API for job enqueueing (port 8680)
├── job-registry.ts       # Global job class registration
├── jobs/
│   ├── index.ts          # Job enqueue helpers
│   ├── TextExtractionJob.ts
│   └── YouTubeProcessingJob.ts
├── Dockerfile            # Multi-stage build
├── package.json
├── tsconfig.json
├── README.md             # This file
└── TESTING_GUIDE.md      # Test instructions
```

### Key Files Explained

**`job-registry.ts`** - Registers job classes in global scope for Sidequest workers:

```typescript
export const JOB_REGISTRY = {
  YouTubeProcessingJob,
  TextExtractionJob,
};

export function registerJobClasses() {
  for (const [name, JobClass] of Object.entries(JOB_REGISTRY)) {
    (global as any)[name] = JobClass;
  }
}
```

**`api-server.ts`** - HTTP API that Next.js calls (avoids Turbopack issues):

```typescript
// Exposes endpoints that use Sidequest.build() internally
POST / enqueue / youtube;
POST / enqueue / text - extraction;
GET / health;
```

**`index.ts`** - Sidequest configuration:

```typescript
// Queue configuration (not job class config)
queues: [
  { name: "youtube-processing", concurrency: 2 },
  { name: "file-processing", concurrency: 3 },
];
```

## Related Documentation

- [Testing Guide](./TESTING_GUIDE.md) - How to test the job processor
- [@protolabsai/sidequest-utils](../../packages/sidequest-utils/README.md) - Client/server utilities
- [Sidequest.js Docs](https://github.com/valtech-sd/sidequest.js)

## Graceful Shutdown

Job processor handles shutdown signals automatically:

```bash
# Send SIGTERM (Docker stop, Kubernetes scale down)
docker-compose -f docker-compose.jobs.yml stop job-processor

# What happens:
# 1. Sidequest stops accepting new jobs
# 2. Running jobs continue until completion (up to timeout)
# 3. Connections cleaned up (PostgreSQL, Neo4j)
# 4. Process exits gracefully
```

**Stale Job Recovery:**

If jobs are forcefully terminated (kill -9, crash):

- Stale job detection runs every 60 minutes
- Jobs running > 10 minutes are released and retried
- Jobs claimed > 1 minute are released

**Configure timeouts:**

```typescript
// In job classes
const job = await Sidequest.build(YouTubeProcessingJob)
  .timeout(300000) // 5 minute max execution
  .maxAttempts(3) // Retry twice on failure
  .enqueue(data);
```

## Job Completion & Notifications

**Current Status:** Jobs complete successfully but are immediately cleaned up by Sidequest, causing 404 errors when polling status.

**Solutions:** See `handoffs/2025-10-19_JOB_COMPLETION_NOTIFICATIONS.md`

**Three approaches:**

1. **PostgreSQL LISTEN/NOTIFY + SSE** (< 100ms latency) - Recommended
2. **Hocuspocus Awareness** (< 200ms, reuses infrastructure)
3. **Enhanced Polling** (30min implementation, good enough)

**Quick fix:** Create `job_completions` cache table to persist results after Sidequest cleanup.

## Next Steps

1. **✅ Phase 1 Complete:** Docker Compose + HTTP API + Working jobs
2. **✅ Phase 2 Complete:** PostgreSQL migration (015_sidequest_tables.sql.managed)
3. **Next:** Job completion notifications (see handoff above)
4. **Future:** Auto-enqueueing middleware (Phase 3)
5. **Future:** TranscriptionJob implementation (Phase 4)
6. **Future:** Complete service documentation (RAB-68)
7. **Future:** Monitoring playground component (RAB-75)
