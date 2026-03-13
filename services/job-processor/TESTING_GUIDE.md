# Job Processor Testing Guide

## Overview

This guide covers how to test the Sidequest.js job processor for YouTube video processing and text extraction.

## Prerequisites

1. **Required Services Running:**

   ```bash
   # PostgreSQL (for Sidequest job queue)
   docker-compose up -d postgres

   # Neo4j (for entity storage)
   docker-compose -f docker-compose.neo4j.yml up -d

   # MinIO (for file storage)
   docker-compose up -d minio

   # YouTube Processor microservice (for YouTube jobs)
   docker-compose up -d youtube-processor
   ```

2. **Environment Variables:**

   ```bash
   # PostgreSQL (Sidequest backend)
   DATABASE_URL=postgresql://user:password@localhost:5432/rabbit_hole

   # Neo4j
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=evidencegraph2024

   # MinIO
   MINIO_ENDPOINT=http://localhost:9000
   MINIO_PORT=9000
   MINIO_USE_SSL=false
   MINIO_ACCESS_KEY=minio
   MINIO_SECRET_KEY=minio123

   # API URL (for job status updates)
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

## Testing Options

### Option 1: Docker Compose (Recommended)

**Start the job processor service:**

```bash
docker-compose -f docker-compose.jobs.yml up job-processor
```

**View logs:**

```bash
docker-compose -f docker-compose.jobs.yml logs -f job-processor
```

**Expected output:**

```
job-processor | 🚀 Job Processor Server starting...
job-processor | 📋 Registering job classes...
job-processor | ✅ Job classes registered:
job-processor |   - TextExtractionJob (queue: file-processing)
job-processor |   - YouTubeProcessingJob (queue: youtube-processing)
job-processor | 🎯 Sidequest initialized with queues: file-processing, youtube-processing
job-processor | ✅ Sidequest server started on port 8678
job-processor | 📊 Dashboard: http://localhost:8678
```

### Option 2: Local Development

**Install dependencies:**

```bash
cd services/job-processor
pnpm install
```

**Build:**

```bash
pnpm build
```

**Run:**

```bash
pnpm start
# or for development with watch mode:
pnpm dev
```

## Enqueue Test Jobs

### Method 1: Direct to Job Processor API (Recommended for Testing)

**YouTube Processing Job:**

```bash
curl -X POST http://localhost:8680/enqueue/youtube \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "quality": "720p",
    "userId": "user_test",
    "orgId": null,
    "workspaceId": "ws_test"
  }'
```

**Response:**

```json
{ "success": true, "jobId": "2", "queue": "youtube-processing" }
```

**Text Extraction Job:**

```bash
curl -X POST http://localhost:8680/enqueue/text-extraction \
  -H "Content-Type: application/json" \
  -d '{
    "fileUid": "file_test123",
    "canonicalKey": "evidence-raw/test-file.txt",
    "mediaType": "text/plain",
    "fileName": "test-file.txt"
  }'
```

### Method 2: Via Next.js API (Requires Authentication)

**YouTube Job:**

```bash
curl -X POST http://localhost:3000/api/jobs/enqueue-youtube \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "quality": "720p",
    "workspaceId": "test_workspace"
  }'
```

**Check Job Status:**

```bash
# Check via Next.js API
curl http://localhost:3000/api/jobs/status/2

# Check directly in database
docker exec postgres-jobs psql -U jobqueue -d sidequest -c \
  "SELECT id, queue, status, attempts FROM sidequestjs.jobs WHERE id = 2;"
```

**Note:** Completed jobs are cleaned up by Sidequest immediately. Status API may return 404. Verify result in Neo4j instead:

```bash
docker exec evidencegraph-neo4j cypher-shell -u neo4j -p evidencegraph2024 \
  "MATCH (v:Video) RETURN v.videoId, v.title ORDER BY v.createdAt DESC LIMIT 3;"
```

### Method 3: Via Sidequest Dashboard

1. Open http://localhost:8678
2. Navigate to queue: `youtube-processing` or `file-processing`
3. Click "Add Job"
4. Enter job data and submit

**WARNING:** Direct PostgreSQL inserts are NOT supported:

- ❌ Workers won't pick them up (job class not registered)
- ❌ Bypasses Sidequest's job management
- ✅ Use HTTP API (Method 1) or Dashboard (Method 3) instead

## Monitoring Job Execution

### Sidequest Dashboard

Open http://localhost:8678 to monitor:

- Job queue status
- Active jobs
- Completed jobs
- Failed jobs
- Job execution time
- Retry attempts

### Docker Logs

```bash
# Real-time logs
docker-compose -f docker-compose.jobs.yml logs -f job-processor

# Last 100 lines
docker-compose -f docker-compose.jobs.yml logs --tail=100 job-processor
```

### Expected Log Output

**YouTube Job Success:**

```
🎥 Processing YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ at 720p
✅ Video downloaded: Rick Astley - Never Gonna Give You Up
✅ Created Neo4j video entity: dQw4w9WgXcQ
✅ YouTube video processed: Rick Astley - Never Gonna Give You Up
```

**Text Extraction Success:**

```
🔍 Starting text extraction for file_test123 (test-file.txt)
📥 Downloading file from MinIO: evidence-raw/test-file.txt
✅ Text extraction completed for file_test123
```

## Verify Results

### Neo4j Verification

**Check YouTube video entity:**

```cypher
MATCH (v:Video:YouTubeVideo {videoId: "dQw4w9WgXcQ"})
RETURN v
```

**Check extracted text:**

```cypher
MATCH (f:File {uid: "file_test123"})
RETURN f.processingState, f.extractedText
```

### PostgreSQL Job Status

```sql
SELECT
  id,
  queue,
  status,
  attempts,
  max_attempts,
  data->>'url' as youtube_url,
  result,
  error,
  created_at,
  started_at,
  completed_at
FROM sidequestjs.jobs
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Job Stuck in Pending

**Check processor is running:**

```bash
docker-compose -f docker-compose.jobs.yml ps job-processor
```

**Check queue names match:**

- YouTube jobs: `youtube-processing`
- Text extraction: `file-processing`

### Job Failed

**View error in dashboard:**

- http://localhost:8678 → Failed Jobs

**View error in PostgreSQL:**

```sql
SELECT error, result
FROM sidequestjs.jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 1;
```

**Common errors:**

1. **YouTube processor unavailable:**

   ```
   Error: fetch failed to http://youtube-processor:8001/process
   ```

   **Fix:** Start youtube-processor service

2. **Neo4j connection failed:**

   ```
   Error: Failed to connect to Neo4j
   ```

   **Fix:** Verify NEO4J_URI and credentials

3. **MinIO file not found:**

   ```
   Error: MinIO download failed: NotFound
   ```

   **Fix:** Verify canonicalKey exists in MinIO bucket

4. **PDF extraction error:**
   ```
   Error: PDF extraction not yet implemented
   ```
   **Fix:** PDF support removed - use text files for now

### Health Check

**Job processor health:**

```bash
curl http://localhost:8678/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "queues": ["youtube-processing", "file-processing"]
}
```

## Performance Testing

### Load Test with Multiple Jobs

```bash
# Enqueue 10 YouTube jobs
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/jobs/enqueue-youtube \
    -H "Content-Type: application/json" \
    -d "{
      \"url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\",
      \"quality\": \"720p\",
      \"userId\": \"user_test${i}\",
      \"orgId\": \"org_test\",
      \"workspaceId\": \"workspace_test\"
    }"
  sleep 1
done
```

**Monitor throughput in dashboard:**

- Jobs processed per minute
- Average execution time
- Success/failure rate

## Clean Up

**Stop job processor:**

```bash
docker-compose -f docker-compose.jobs.yml down
```

**Clear job queue:**

```sql
TRUNCATE TABLE sidequestjs.jobs;
```

**Remove test Neo4j entities:**

```cypher
MATCH (v:Video {uid: "youtube_dQw4w9WgXcQ"})
DETACH DELETE v;
```

## Next Steps

1. **Production Deployment:**
   - Set production environment variables
   - Configure proper authentication
   - Set up monitoring/alerting
   - Scale horizontally with multiple workers

2. **Add More Job Types:**
   - PDF extraction (when implemented)
   - Audio transcription
   - Image analysis
   - Video analysis

3. **Advanced Features:**
   - Job prioritization
   - Scheduled jobs
   - Job dependencies
   - Dead letter queue

## References

- [Sidequest.js Documentation](https://github.com/valtech-sd/sidequest.js)
- [Job Processor README](./README.md)
- [Docker Compose Configuration](../../docker-compose.jobs.yml)
