# Job Processing System Test Guide

## Quick Validation Steps

### 1. Start Services

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Install dependencies
pnpm install

# Check service status
docker ps | grep -E "(postgres|job-processor|neo4j|minio)"
```

### 2. Verify Dashboard Access

- **Sidequest Dashboard:** http://localhost:8678
- **Neo4j Browser:** http://localhost:7474
- **Next.js App:** http://localhost:3000
- **MinIO Console:** http://localhost:9001

### 3. Test File Upload Workflow

1. **Navigate to Atlas:** http://localhost:3000/atlas
2. **Click Upload Button** (📎 in header)
3. **Upload a PDF file** or text document
4. **Check Success Dialog** - should show file entity created

### 4. Monitor Job Processing

1. **Open Sidequest Dashboard:** http://localhost:8678
2. **Check Queues Tab** - should show "file-processing" queue
3. **Look for Jobs** - should see TextExtractionJob entries
4. **Monitor Status** - jobs should transition from queued → processing → completed

### 5. Verify State Updates

**In Neo4j Browser (http://localhost:7474):**

```cypher
// Check file processing states
MATCH (f:File)
RETURN f.name, f.processingState, f.extractedText, f.processedAt
ORDER BY f.uploadedAt DESC
LIMIT 10
```

**Expected Results:**

- Files should show `processingState: "processed"`
- Text files should have `extractedText` populated
- `processedAt` timestamp should be set

### 6. Check Job Logs

```bash
# Job processor logs
docker logs job-processor-dev

# Next.js application logs
docker logs rabbit-hole-ui-dev

# PostgreSQL logs
docker logs postgres-jobs-dev
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

- Check Neo4j connectivity from job processor
- Verify API endpoint accessibility
- Check authentication/authorization

## Expected Performance

- **Small text files:** <5 seconds end-to-end
- **PDF documents:** 10-30 seconds depending on size
- **Job enqueueing:** <1 second after file upload
- **Dashboard updates:** Real-time
