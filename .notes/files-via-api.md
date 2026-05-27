# Files via API — design note

**Status**: planned, not yet shipped
**Goal**: let API clients submit files (and URLs) for processing and use the extracted content in subsequent search.

## What exists today (Apr 2026)

The Next.js app already has the building blocks; they're not exposed under `/v1`:

| Endpoint | Purpose |
|---|---|
| `POST /api/files/sign-put` | Returns a presigned MinIO PUT URL |
| `POST /api/jobs/enqueue` | Enqueues a `TextExtractionJob` for a file already in MinIO |
| `GET /api/jobs/status/:id` | Polls Sidequest job state |
| `GET /api/jobs/completion?jobId=:id` | Returns final result |

Job-processor service handles PDF / audio / video / text / HTML / markdown / docx via its adapters (`services/job-processor/src/adapters/*`).

## Gap

For an OpenAI-compatible API, we should add:

```
POST   /v1/files                       multipart  →  202 { id, object: "file", status: "processing" }
                                        json    →  same, with { type: "url", url }
GET    /v1/files/:id                                {  id, object, status, content?, error? }
DELETE /v1/files/:id                                ok
```

And let messages reference uploaded files:

```jsonc
{
  "role": "user",
  "content": [
    { "type": "text", "text": "summarize this paper" },
    { "type": "file", "file": { "id": "file-abc123" } }
  ]
}
```

## Implementation sketch (~150 lines)

1. **`POST /v1/files`** (Next.js route)
   - **Multipart branch**: stream upload to MinIO `evidence-temp` bucket directly via S3 SDK; record `fileUid` + `canonicalKey`.
   - **URL branch**: `fetch` the URL server-side, stream into MinIO, same record.
   - Either way: call `enqueueTextExtractionJob` with the resulting metadata.
   - Return 202 with `{ id: jobId, object: "file", status: "processing", filename, bytes, created_at }`.

2. **`GET /v1/files/:id`**
   - `getJobStatus(id)` from `@protolabsai/sidequest-utils/server`.
   - When `state === "completed"`, attach the extraction result (text + metadata) inline OR via a `content_url` to MinIO if too large.

3. **Agent integration**
   - When `/v1/chat/completions` request contains `content: [{type: "file", file: {id}}]`, look up the file's extracted text and prepend it to the system context (or insert as a synthetic tool-result in the conversation history).
   - Limit per-message file count and size; budget for prompt tokens.

4. **CORS / size limits**
   - Multipart upload size cap (e.g. 50 MB) to avoid runaway processing on free tier.
   - Per-API-key rate limit on `/v1/files` (Phase 2 alongside Postgres-backed limiter).

## Why deferred

- MinIO S3 SDK + multipart streaming + Next.js route handler is an hour-plus of plumbing.
- Agent file-context injection needs prompt-budget logic that we haven't designed yet.
- Currently can't test end-to-end without a real LLM key burning real tokens.

## Workaround until then

API users can:
1. Get a presigned MinIO URL via `POST /api/files/sign-put`.
2. Upload binary directly to MinIO with that URL.
3. Call `POST /api/jobs/enqueue` with the canonical key.
4. Poll `GET /api/jobs/status/:id` until done.
5. Fetch extracted text from MinIO via the canonical results path, OR copy/paste the extracted text into a follow-up `/v1/chat/completions` call.

That works but is rough; replacing it is the goal.
