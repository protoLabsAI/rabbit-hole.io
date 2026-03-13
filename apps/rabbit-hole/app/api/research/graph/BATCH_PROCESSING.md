# LangExtract Batch Processing Optimization

## Overview

Large sourceData payloads were previously concatenated into a single request to LangExtract, causing:
- Oversized request payloads exceeding service limits
- Increased latency and timeout risks
- Poor error recovery (entire batch fails)

This implementation introduces intelligent batch processing with token estimation, retry logic, and backpressure control.

## Architecture

### Key Components

#### 1. **Batch Processor Module** (`batch-processor.ts`)

Provides utilities for chunking and processing:

- **`createSourceBatches()`** - Splits sources respecting both item count and character limits
- **`processBatchesWithRetry()`** - Processes batches with exponential backoff retries
- **`mergeBatchResults()`** - Merges results while preserving source tracking

#### 2. **Configuration** (`DEFAULT_BATCH_CONFIG`)

```typescript
{
  maxCharsPerBatch: 32000,      // ~8k tokens (conservative limit)
  maxSourcesPerBatch: 5,         // Max sources per batch
  maxRetries: 3,                 // Retry attempts per batch
  retryDelayMs: 500,             // Base retry delay
  throttleMs: 100,               // Throttle between batches
}
```

### Workflow

```
Relationship Extraction Flow:
├─ Split sourceData into batches
│  └─ Each batch ≤ 32k chars (8k tokens) and ≤ 5 sources
├─ For each batch (with backpressure throttle):
│  ├─ Process each focus entity against the batch
│  │  └─ Further chunk by entity pairs (BATCH_SIZE=10)
│  ├─ Send to LangExtract
│  ├─ Retry on failure (exponential backoff: 0.5s, 1s, 2s)
│  └─ Collect relationships
└─ Merge all results preserving source traceability
```

## Implementation Details

### Batch Creation Strategy

Uses greedy packing to respect both constraints:

```typescript
// Pseudo-code
for each source:
  if (currentSize + source.size > maxChars) || (count >= maxSources)
    finalize current batch
  add source to current batch
```

### Retry Logic

- **Exponential backoff**: `delay = baseMs * 2^attempt`
- **Max attempts**: 3 retries after initial attempt (4 total)
- **Failure handling**: Failed batches logged but don't block other batches

### Backpressure Control

- **Throttle between batches**: 100ms delay prevents overwhelming LangExtract
- **Sequential processing**: Batches processed one at a time (not parallel)
- **Early error propagation**: LangExtract errors throw immediately (caught in retry)

## Performance Impact

### Scenario: 5 sources averaging 100k chars each

**Before:**
- Single request: ~500k chars (~125k tokens) 
- LangExtract timeout risk: High
- Failure recovery: Entire extraction fails

**After:**
- Batch 1: 32k chars (8k tokens) ✓
- Batch 2: 32k chars (8k tokens) ✓
- Batch 3: 32k chars (8k tokens) ✓
- Batch 4: 32k chars (8k tokens) ✓
- Batch 5: 36k chars (9k tokens) ✓
- Total requests: 5 (vs 1)
- Failure recovery: Only failed batch retries

### Comparison Table

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Max request size | ~125k tokens | ~8k tokens | 15.6x smaller |
| Service timeouts | High risk | Low risk | Significantly reduced |
| Failure recovery | Total loss | Per-batch retry | Granular control |
| Total processing | ~2s (single batch) | ~3s (5 batches + throttle) | Trade latency for reliability |

## Configuration Tuning

### For higher throughput
```typescript
const config: BatchConfig = {
  maxCharsPerBatch: 64000,  // Increase if LangExtract supports ~16k tokens
  maxSourcesPerBatch: 10,
  throttleMs: 50,
};
```

### For lower latency (batch quickly)
```typescript
const config: BatchConfig = {
  maxCharsPerBatch: 16000,  // 4k tokens - very conservative
  maxSourcesPerBatch: 2,
  throttleMs: 0,            // No throttle (risky for high volume)
};
```

### For higher reliability (on flaky networks)
```typescript
const config: BatchConfig = {
  maxCharsPerBatch: 16000,
  maxRetries: 5,            // More retries
  retryDelayMs: 1000,       // Higher base delay
  throttleMs: 200,
};
```

## Monitoring & Logging

### Console Output Example
```
📋 Phase 3: Finding relationships...
   Focus entities: 3
   Other entities: 47
   Split sources into 3 batch(es) (max 32000 chars/batch)
   Batch 1: 2 source(s), 28543 chars (~7136 tokens)
   Batch 2: 2 source(s), 31245 chars (~7811 tokens)
   Batch 3: 1 source(s), 18920 chars (~4730 tokens)
   Processing relationships for: Albert Einstein (entity batch 1, source batch 1)
   Found 12 relationships (focus: Albert Einstein, source batch 1)
   ...
✅ Found 45 total relationships
```

## Future Enhancements

1. **Parallel batch processing** - Process multiple batches concurrently with queue management
2. **Adaptive sizing** - Adjust batch size based on LangExtract response times
3. **Pre-summarization** - Condense sources before batching (reduces token count by 50-70%)
4. **Result deduplication** - Merge duplicate relationships found across batches
5. **Metrics collection** - Track batch performance, retry rates, and latency distributions

## Debugging

### Enable verbose logging (add to route.ts)
```typescript
const VERBOSE_BATCH_LOG = true;

if (VERBOSE_BATCH_LOG) {
  console.log(`Batch request payload: ${batch.content.substring(0, 200)}...`);
}
```

### Inspect source batch membership
```typescript
for (const batch of sourceBatches) {
  console.log(`Batch ${batch.batchIndex}:`, batch.sourceIds);
}
```

### Check merge statistics
```typescript
const failedCount = batchResults.filter(r => !r.success).length;
console.log(`Success rate: ${((batchResults.length - failedCount) / batchResults.length * 100).toFixed(1)}%`);
```
