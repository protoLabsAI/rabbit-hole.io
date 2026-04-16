# @protolabsai/sidequest-utils

Shared utilities and React hooks for Sidequest.js job queue processing.

## Installation

This package is part of the Proto monorepo workspace and automatically available to all packages.

## Architecture Overview

This package provides three separate entry points:

1. **`@protolabsai/sidequest-utils`** - Base types (server-safe, no imports)
2. **`@protolabsai/sidequest-utils/client`** - React hooks (client-side only)
3. **`@protolabsai/sidequest-utils/server`** - Server utilities (Next.js API routes)

## Critical: Next.js API Route Pattern

**Never import `sidequest` directly in Next.js API routes.** The Sidequest library includes `node-cron` as a transitive dependency through `@sidequest/engine`, which Turbopack cannot bundle.

### ❌ Incorrect (Causes Build Errors)

```typescript
// app/api/jobs/enqueue/route.ts
import { Sidequest } from "sidequest"; // ❌ Breaks Turbopack
import { YouTubeProcessingJob } from "../../../../services/job-processor/jobs/YouTubeProcessingJob";

export async function POST(request: Request) {
  const job = await Sidequest.build(YouTubeProcessingJob)
    .queue("youtube-processing")
    .enqueue(data);
  // Error: Module not found node-cron daemon.js
}
```

### ✅ Correct (HTTP API to Job Processor)

```typescript
// app/api/jobs/enqueue-youtube/route.ts
import { enqueueYouTubeJob } from "@protolabsai/sidequest-utils/server";

export async function POST(request: Request) {
  const job = await enqueueYouTubeJob({
    url,
    quality: "720p",
    userId,
    orgId,
    workspaceId,
  });

  return Response.json({
    success: true,
    jobId: job.jobId,
  });
}
```

**Why this works:** Server utilities call the job processor HTTP API (port 8680) which uses `Sidequest.build(JobClass).enqueue()` - the proper Sidequest pattern. The job processor service (separate Docker container) handles execution.

## Usage

### Server-Side (Next.js API Routes)

```typescript
import {
  enqueueYouTubeJob,
  enqueueTextExtractionJob,
  getJobStatus,
  listJobs,
} from "@protolabsai/sidequest-utils/server";

// Enqueue jobs
const job = await enqueueYouTubeJob({
  url: "https://youtube.com/watch?v=...",
  quality: "720p",
  userId: "user_123",
  orgId: "org_123",
  workspaceId: "ws_123",
});

// Get job status
const status = await getJobStatus(job.jobId);

// List jobs
const { jobs, count } = await listJobs({
  queue: "youtube-processing",
  status: "pending",
  limit: 20,
});
```

### Client-Side (React Hooks)

```typescript
import {
  useEnqueueYouTube,
  useJobStatus,
  useJobList,
  useJobNotifications,
} from "@protolabsai/sidequest-utils/client";

function MyComponent() {
  const [jobId, setJobId] = useState<string | null>(null);

  // Enqueue job
  const { mutate: enqueue, isPending } = useEnqueueYouTube();

  // Track job status with automatic polling
  const { data: job } = useJobStatus(jobId, {
    refetchInterval: 2000,
  });

  const handleSubmit = () => {
    enqueue(
      { url, quality: "720p", workspaceId },
      {
        onSuccess: (data) => setJobId(data.jobId),
      }
    );
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={isPending}>
        Process Video
      </button>
      {job && <div>Status: {job.status}</div>}
    </div>
  );
}
```

### Type Imports

```typescript
import type {
  Job,
  JobStatus,
  YouTubeJobData,
  TextExtractionJobData,
} from "@protolabsai/sidequest-utils";
```

## API Reference

### Server Utilities

#### `enqueueYouTubeJob(data, options?)`

Enqueue a YouTube processing job directly to PostgreSQL.

**Parameters:**

- `data: YouTubeJobData` - Job data
- `options?: EnqueueOptions` - Optional configuration
  - `maxAttempts?: number` - Max retry attempts (default: 3)
  - `priority?: number` - Job priority (default: 0)
  - `delay?: number` - Delay in milliseconds before job runs

**Returns:** `Promise<{ id: string; jobId: string }>`

**Example:**

```typescript
const job = await enqueueYouTubeJob(
  {
    url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
    quality: "720p",
    userId: "user_123",
    orgId: "org_123",
    workspaceId: "ws_123",
  },
  { maxAttempts: 5, priority: 1 }
);
```

#### `enqueueTextExtractionJob(data, options?)`

Enqueue a text extraction job.

**Parameters:**

- `data: TextExtractionJobData`
- `options?: EnqueueOptions`

**Returns:** `Promise<{ id: string; jobId: string }>`

#### `getJobStatus(jobId)`

Get job status by ID.

**Parameters:**

- `jobId: string` - The job ID

**Returns:** `Promise<Job | null>`

**Example:**

```typescript
const job = await getJobStatus("123");
if (job?.status === "completed") {
  console.log("Job done:", job.result);
}
```

#### `listJobs(options)`

List jobs with filtering.

**Parameters:**

- `options.queue?: string` - Filter by queue name
- `options.status?: JobStatus` - Filter by status
- `options.limit?: number` - Max results (default: 50)
- `options.offset?: number` - Pagination offset (default: 0)

**Returns:** `Promise<{ jobs: Job[]; count: number }>`

### Client Hooks

### `useEnqueueYouTube()`

Enqueue a YouTube processing job.

**Returns:** `UseMutationResult<EnqueueResponse, Error, EnqueueYouTubeParams>`

**Example:**

```typescript
const { mutate, isPending, data, error } = useEnqueueYouTube();

mutate({
  url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  quality: "720p",
  workspaceId: "ws_123",
});
```

### `useJobStatus(jobId, options)`

Poll a job's status with automatic refetching.

**Parameters:**

- `jobId: string | null` - The job ID to track
- `options?: { refetchInterval?: number; enabled?: boolean }`

**Returns:** `UseQueryResult<Job, Error>`

**Example:**

```typescript
const { data: job, isLoading } = useJobStatus(jobId, {
  refetchInterval: 2000, // Poll every 2 seconds
  enabled: !!jobId,
});

if (job?.status === "completed") {
  console.log("Job completed:", job.result);
}
```

### `useJobList(options)`

List jobs with optional filtering.

**Parameters:**

- `options?: { queue?: string; status?: JobStatus; limit?: number }`

**Returns:** `UseQueryResult<JobListResponse, Error>`

**Example:**

```typescript
const { data } = useJobList({
  queue: "youtube-processing",
  status: "failed",
  limit: 20,
});

console.log(`Found ${data.count} failed jobs`);
```

### `useJobNotifications(options)`

Subscribe to real-time job completion notifications via Server-Sent Events (SSE). Uses PostgreSQL LISTEN/NOTIFY for sub-100ms latency.

**Parameters:**

- `options?: { enabled?: boolean; onNotification?: (notif) => void }`

**Returns:** `{ notifications: JobCompletionNotification[]; isConnected: boolean; error: string | null }`

**Example:**

```typescript
const { notifications, isConnected } = useJobNotifications({
  onNotification: (notif) => {
    toast.success(`Job ${notif.jobId} completed!`);
  },
});
```

**How It Works:**

1. Establishes SSE connection to `/api/jobs/subscribe`
2. PostgreSQL trigger fires on job completion
3. NOTIFY sends completion event to SSE endpoint
4. Notification received by all connected clients in <100ms
5. Automatic reconnection on disconnect

### `useJobCompletionNotification(jobId, onComplete)`

Subscribe to a specific job's completion notification.

**Example:**

```typescript
useJobCompletionNotification(jobId, (notification) => {
  console.log("Job completed:", notification);
  refetchData();
});
```

## Type Definitions

### `Job`

```typescript
interface Job {
  jobId: string;
  status: JobStatus;
  queue: string;
  data?: any;
  result?: any;
  error?: string | null;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
}
```

### `JobStatus`

```typescript
type JobStatus = "pending" | "active" | "completed" | "failed";
```

### `EnqueueResponse`

```typescript
interface EnqueueResponse {
  success: boolean;
  jobId: string;
  status: string;
  message: string;
  data: any;
}
```

## Features

- **Real-Time Notifications**: Sub-100ms job completion notifications via PostgreSQL LISTEN/NOTIFY + SSE
- **Completion Cache**: Persists job results after Sidequest cleanup (eliminates 404 errors)
- **Exponential Backoff**: Polling starts at 500ms and scales to 5s automatically
- **Next.js Compatible**: Server utilities avoid Sidequest library imports that break Turbopack
- **Direct PostgreSQL**: Enqueue jobs by inserting directly into `sidequestjs.jobs` table
- **React Query Integration**: Built on top of React Query for optimal caching and state management
- **Automatic Polling**: Job status automatically polls until completion or failure (SSE fallback)
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Robust error handling with detailed error messages
- **Query Invalidation**: Automatic cache invalidation on job state changes

## How It Works

### Job Enqueueing Flow

```
Next.js API Route
  ↓
@protolabsai/sidequest-utils/server
  ↓
PostgreSQL (sidequestjs.jobs table)
  ↓
Job Processor Service (Sidequest.js)
  ↓
Execute YouTubeProcessingJob/TextExtractionJob
  ↓
PostgreSQL Trigger → NOTIFY 'job_completion'
  ↓
SSE Endpoint → All Connected Clients (<100ms)
```

1. **API Route**: Validates request, calls server utility
2. **Server Utility**: Inserts job into PostgreSQL with status="pending"
3. **Job Processor**: Polls PostgreSQL, picks up pending jobs
4. **Execution**: Runs job class, updates status to completed/failed
5. **Trigger**: PostgreSQL function caches completion + sends NOTIFY
6. **Notification**: SSE streams completion to clients in real-time
7. **Fallback**: Client polls API if SSE disconnected (exponential backoff)

### Why Not Import Sidequest Directly?

Sidequest.js depends on `@sidequest/engine` which includes `node-cron`. This library uses server-relative imports that Turbopack (Next.js 15) cannot resolve:

```
Module not found: Can't resolve './ROOT/node_modules/.pnpm/node-cron@4.2.1/node_modules/node-cron/dist/esm/tasks/background-scheduled-task/daemon.js'
```

**Solution:** Separate concerns:

- **Next.js API routes**: Use `@protolabsai/sidequest-utils/server` (PostgreSQL only)
- **Job processor service**: Imports Sidequest.js (runs in Docker)

## Development

```bash
# Build package
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check
```

## Package Structure

```
@protolabsai/sidequest-utils/
├── src/
│   ├── types.ts                # Shared types (server-safe)
│   ├── index.ts                # Re-export types only
│   ├── client/
│   │   ├── hooks.ts            # React Query hooks
│   │   └── index.ts            # Client exports
│   └── server/
│       ├── enqueue.ts          # Job enqueueing (PostgreSQL)
│       ├── status.ts           # Job status queries (PostgreSQL)
│       └── index.ts            # Server exports
└── dist/
    ├── index.mjs               # Base types
    ├── client/index.mjs        # Client bundle
    └── server/index.mjs        # Server bundle
```

**Import Patterns:**

```typescript
// Types only (works anywhere)
import type { Job } from "@protolabsai/sidequest-utils";

// Client hooks (React components only)
import { useJobStatus } from "@protolabsai/sidequest-utils/client";

// Server utilities (API routes, server components)
import { enqueueYouTubeJob } from "@protolabsai/sidequest-utils/server";
```

## Dependencies

- `@protolabsai/database` - PostgreSQL pool for job status queries
- `@tanstack/react-query` - React hooks state management
- `react` (peer) - Required for client hooks

**Notable:**

- Server utilities call job processor HTTP API (no Sidequest import)
- Uses native `fetch()` for HTTP communication
- No direct PostgreSQL inserts (uses Sidequest.build() via API)

## Related Packages

- **@protolabsai/database** - PostgreSQL and Neo4j clients
- **@protolabsai/types** - Shared type definitions
- **@protolabsai/ui** - UI components (JobStatusTracker)
- **services/job-processor** - Background job execution service

## Environment Variables

```bash
# Job Processor HTTP API endpoint (default: http://localhost:8680)
JOB_PROCESSOR_URL=http://localhost:8680

# Job Queue Database for status queries (default: localhost:5433)
JOB_QUEUE_DATABASE_URL=postgresql://jobqueue:changeme@localhost:5433/sidequest
```

## Architecture Details

### Job Processor HTTP API

The job processor exposes three endpoints:

```bash
# Enqueue YouTube job
POST http://localhost:8680/enqueue/youtube
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=...",
  "quality": "720p",
  "userId": "user_123",
  "orgId": "org_123",
  "workspaceId": "ws_123"
}

# Enqueue text extraction job
POST http://localhost:8680/enqueue/text-extraction
Content-Type: application/json

{
  "fileUid": "file:123",
  "canonicalKey": "by-hash/ab/cd/file.txt",
  "mediaType": "text/plain",
  "fileName": "file.txt"
}

# Health check
GET http://localhost:8680/health
Response: {"status":"healthy","timestamp":"2025-10-19T..."}
```

### Graceful Shutdown

Sidequest handles graceful shutdown automatically:

1. **SIGTERM/SIGINT received** → Stop accepting new jobs
2. **Running jobs continue** → Wait for completion (up to timeout)
3. **Clean shutdown** → Close connections, exit process

**Stale Job Recovery:**

- Jobs that timeout are automatically retried
- Stale job detection runs every 60 minutes
- Running jobs >10min are released and retried
- Claimed jobs >1min are released

## Completion Notifications

**Current:** Polling-based with 2-second intervals

**Limitation:** Sidequest cleans up completed jobs immediately, causing 404 errors

**Future Enhancement:** See `handoffs/2025-10-19_JOB_COMPLETION_NOTIFICATIONS.md` for:

- PostgreSQL LISTEN/NOTIFY + SSE (recommended, < 100ms latency)
- Hocuspocus awareness integration (reuses infrastructure)
- Enhanced polling with exponential backoff (quick win)

## Documentation

- [Job Processor Overview](../../services/job-processor/README.md)
- [Job Processor Testing Guide](../../services/job-processor/TESTING_GUIDE.md)
- [Job Completion Notifications](../../handoffs/2025-10-19_JOB_COMPLETION_NOTIFICATIONS.md)
- [Sidequest.js Documentation](https://github.com/valtech-sd/sidequest.js)
- [Sidequest.js Graceful Shutdown](https://docs.sidequestjs.com/engine/graceful-shutdown)
