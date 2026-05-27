# Job Processing System Test Guide

> **Note:** Neo4j has been removed; the canonical stack is `docker-compose.yml` (no `docker-compose.dev.yml`, no Neo4j browser). Extracted content now feeds the search corpus (pgvector on Postgres), not a graph. Steps below have been pointed at the current stack.

## Quick Validation Steps

### 1. Start Services

```bash
# Start all services
docker compose up -d

# Install dependencies
pnpm install

# Check service status
docker ps | grep -E "(postgres|job-processor|minio)"
```

### 2. Verify Dashboard Access

- **Sidequest Dashboard:** http://localhost:8678
- **Next.js App:** http://localhost:3399
- **MinIO Console:** http://localhost:9001

### 3. Test File Upload Workflow

1. **Open the app:** http://localhost:3399
2. **Click Upload Button** (📎 in the search input)
3. **Upload a PDF file** or text document
4. **Check Success Dialog** - should show the file queued for ingestion

### 4. Monitor Job Processing

1. **Open Sidequest Dashboard:** http://localhost:8678
2. **Check Queues Tab** - should show "file-processing" queue
3. **Look for Jobs** - should see TextExtractionJob entries
4. **Monitor Status** - jobs should transition from queued → processing → completed

### 5. Verify State Updates

Check the ingest job result via the job-processor API:

```bash
# List recent ingestion jobs
curl http://localhost:8680/ingest

# Inspect a completed job's extraction result
curl http://localhost:8680/ingest/<jobId>/result
```

**Expected Results:**

- Job status transitions to `completed`
- Text files have extracted content in the result payload
- Extracted content is stored to MinIO/Postgres for the search corpus

### 6. Check Job Logs

```bash
# Job processor logs
docker compose logs job-processor

# Next.js application logs
docker compose logs rabbit-hole

# PostgreSQL (job queue) logs
docker compose logs postgres-jobs
```

## Test Cases

### ✅ Happy Path

- Upload PDF → Job enqueued → Text extracted → State updated to "processed"

### ✅ Unsupported File Type

- Upload image/video → No job enqueued → State remains "unprocessed"

### ✅ Job Failure Recovery

- Corrupt file → Job fails → State updated to "failed" with error message

### ✅ Service Restart

- Stop job processor → Upload file → Restart processor → Job processes correctly

## Troubleshooting

### Jobs Not Appearing

- Check if PostgreSQL is running
- Verify DATABASE_URL in job processor
- Check file upload completion

### Jobs Failing

- Check MinIO accessibility
- Verify file integrity
- Review job processor logs for errors

### State Not Updating

- Check Postgres/MinIO connectivity from job processor
- Verify API endpoint accessibility
- Check authentication/authorization

## Expected Performance

- **Small text files:** <5 seconds end-to-end
- **PDF documents:** 10-30 seconds depending on size
- **Job enqueueing:** <1 second after file upload
- **Dashboard updates:** Real-time
