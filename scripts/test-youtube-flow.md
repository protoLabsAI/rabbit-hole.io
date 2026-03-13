# YouTube Processing Flow Test

Test the complete YouTube → Transcription → Summarization pipeline.

## Test Video

**URL:** https://www.youtube.com/watch?v=R_TnZJpCULI

## Prerequisites

1. **Job Processor Running:**
   ```bash
   docker compose -f docker-compose.jobs.yml up -d
   ```

2. **MinIO Running:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d minio
   ```

3. **Next.js App Running:**
   ```bash
   cd apps/rabbit-hole
   pnpm dev
   ```
   - Required for `/api/jobs/status/:id` endpoint
   - Required for `/api/transcribe` endpoint

4. **Environment Variables:**
   ```bash
   # .env.local
   GROQ_API_KEY=your_groq_api_key_here
   MINIO_ENDPOINT=http://localhost:9000
   MINIO_ACCESS_KEY=minio
   MINIO_SECRET_KEY=minio123
   NEXT_PUBLIC_URL=http://localhost:3000
   ```

5. **Services Accessible:**
   - Job processor: `http://localhost:8680` (check: `curl http://localhost:8680/health`)
   - Next.js app: `http://localhost:3000`
   - MinIO: `http://localhost:9000`

## Running the Test

### Option 1: Vitest (Unit Test)

```bash
cd /Users/kj/dev/rabbit-hole.io
pnpm test packages/proto-llm-tools/src/tools/writing-agent-tools/__tests__/media-processing-flow.test.ts
```

**Note:** The test is marked as `.skip` by default. Remove `.skip` to run it.

### Option 2: Manual Script (Recommended)

```bash
cd /Users/kj/dev/rabbit-hole.io
pnpm tsx scripts/test-youtube-flow.ts
```

### Option 3: Custom Video

```bash
TEST_VIDEO_URL="https://www.youtube.com/watch?v=YOUR_VIDEO_ID" pnpm tsx scripts/test-youtube-flow.ts
```

## Expected Flow

1. **Enqueue Job** (~1s)
   - Sends YouTube URL to job processor
   - Returns `jobId` and `videoId`

2. **Wait for Completion** (~1-3 minutes)
   - Job processor downloads video
   - Extracts audio track
   - Uploads to MinIO
   - Returns `audioKey` and `videoKey`

3. **Transcribe Audio** (~30s - 2 minutes)
   - Fetches audio from MinIO
   - Sends to Groq API
   - Returns transcript with segments

4. **Generate Summary** (~5-15s)
   - Processes transcript in chunks
   - Uses LLM to generate concise summary
   - Returns summary with metadata

5. **Submit Output** (~instant)
   - Validates final result structure
   - Returns success confirmation

## Expected Output

```
================================================================================
🎬 YouTube Processing Flow Test
================================================================================

📥 Step 1: Enqueuing YouTube job...
   Video: https://www.youtube.com/watch?v=R_TnZJpCULI

✅ Job enqueued successfully!
   Job ID: job_abc123
   Video ID: R_TnZJpCULI

⏳ Step 2: Waiting for job completion...
   (This may take 1-3 minutes for video download)

   [1/60] Status: pending
   [2/60] Status: running
   ...
   [15/60] Status: completed

✅ Job completed!
   Title: Example Video Title
   Audio Key: by-hash/sha256/aa/bb/abc123...
   Video Key: by-hash/sha256/cc/dd/def456...

🎤 Step 3: Transcribing audio...
   Provider: Groq (FREE)
   Model: whisper-large-v3

✅ Transcription complete!
   Language: en
   Duration: 45.67s
   Text length: 2340 characters
   Segments: 12

📝 Step 4: Generating summary...

✅ Summary generated!
   Summary length: 456 characters
   Compression: 0.19x
   Chunks processed: 1

📤 Step 5: Submitting output...

✅ Output submitted successfully!

================================================================================
📊 FINAL RESULTS
================================================================================

🎥 Video Information:
   URL: https://www.youtube.com/watch?v=R_TnZJpCULI
   Title: Example Video Title
   Duration: 45.67s
   Language: en

📝 Transcript (first 500 chars):
   This is the full transcript of the video...

📋 Summary (first 500 chars):
   This video discusses...

✨ Metadata:
   Audio Key: by-hash/sha256/aa/bb/abc123...
   Video Key: by-hash/sha256/cc/dd/def456...
   Transcription Provider: Groq
   Summary Chunks: 1
   Compression Ratio: 0.19x

================================================================================
✅ All tests passed!
================================================================================
```

## Troubleshooting

### Job Processor Not Running

```
Error: Failed to check job status: connect ECONNREFUSED 127.0.0.1:3000
```

**Solution:**
```bash
# Start job processor
docker compose -f docker-compose.jobs.yml up -d

# Start Next.js app (required for API routes)
cd apps/rabbit-hole && pnpm dev

# Check services
curl http://localhost:8680/health  # Job processor
curl http://localhost:3000/api/health  # Next.js app
```

### Groq API Error

```
Error: Transcription failed: 401 Unauthorized
```

**Solution:** Check `GROQ_API_KEY` in `.env.local`

### MinIO Connection Error

```
Error: getaddrinfo ENOTFOUND localhost
```

**Solution:**
```bash
docker compose -f docker-compose.dev.yml up -d minio
# Check MinIO is accessible
curl http://localhost:9000/minio/health/live
```

### Video Download Fails

```
Job failed: Unable to download video
```

**Solution:** 
- Check internet connection
- Try different video URL
- Check YouTube processor service logs

## Performance Benchmarks

- **Short video (<1 min):** ~2-3 minutes total
- **Medium video (1-5 min):** ~3-5 minutes total
- **Long video (5-10 min):** ~5-8 minutes total

**Bottlenecks:**
- YouTube download: ~60-120s
- Groq transcription: ~30-90s (FREE tier)
- Summary generation: ~5-15s

