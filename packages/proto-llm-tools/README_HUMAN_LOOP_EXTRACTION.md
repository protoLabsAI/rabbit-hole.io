# Human-in-the-Loop Extraction

Interactive multi-phase entity extraction with user review and correction at each step.

## Quick Start

```typescript
import { useHumanLoopExtraction } from "@protolabsai/proto-llm-tools/hooks/useHumanLoopExtraction";

function MyComponent() {
  const { startExtraction, resumeExtraction, currentState, isWaitingForReview } =
    useHumanLoopExtraction();

  const handleStart = () => startExtraction({
    text: "Your content here",
    domains: ["social", "academic"],
    mode: "deep_dive",
  });

  const handleApprove = () => resumeExtraction({
    approvals: { discover: true },
  });

  return isWaitingForReview ? (
    <ReviewPanel data={currentState?.reviewData} onApprove={handleApprove} />
  ) : (
    <button onClick={handleStart}>Start</button>
  );
}
```

## Architecture

```
Input Text
    ↓
DISCOVER → [User Review: Merge duplicates] →
STRUCTURE → [User Review: Fix fields] →
ENRICH → [User Review: Add data] →
RELATE → [User Review: Validate relationships] →
FINALIZE → Bundle Export
```

## API Actions

### Start Extraction

```typescript
POST /api/extraction-workflow-interactive
{
  action: "start",
  text: string,
  domains: string[],
  mode: "discover" | "structure" | "enrich" | "deep_dive"
}
```

### Resume with Decisions

```typescript
POST /api/extraction-workflow-interactive
{
  action: "resume",
  threadId: string,
  merges: EntityMerge[],
  corrections: Record<string, any>,
  approvals: Record<string, boolean>
}
```

### Get Current State

```typescript
POST /api/extraction-workflow-interactive
{ action: "getState", threadId: string }
```

## User Decision Types

### Entity Merge

```typescript
{
  sourceUids: ["person:einstein", "person:a_einstein"],
  targetUid: "person:albert_einstein",
  mergedName: "Albert Einstein",
  keepAliases: ["Einstein", "A. Einstein"]
}
```

### Field Correction

```typescript
{
  "person:einstein": {
    birth_date: "1879-03-14",
    nationality: "German"
  }
}
```

### Phase Approval

```typescript
{
  discover: true,
  structure: true
}
```

## Examples

See `examples/human-loop-extraction-example.tsx` for complete examples:

- Basic start/approve workflow
- Entity merging with duplicate detection
- Field corrections
- Session management

## Testing

```bash
# Unit tests
pnpm test human-loop-extraction

# Integration tests
INTEGRATION=true pnpm test human-loop-integration

# Interactive demo (simulates full workflow)
cd packages/proto-llm-tools
pnpm test:human-loop "Albert Einstein"
pnpm test:human-loop "Marie Curie"
```

## Session Management

**Thread ID Format**: `extraction:userId:timestamp:random`

**Lifecycle**:

- MemorySaver (current): In-memory, lost on restart
- PostgreSQL (planned): Persistent, 24-hour TTL

## Performance

- **Duplicate Detection**: Levenshtein distance, O(n²) worst case
- **Batch Operations**: Single API call for multiple corrections
- **Session Size**: ~500KB per session

## Migration Path

1. ✅ MemorySaver implementation
2. ⏳ PostgreSQL checkpointer (drop-in replacement)
3. ⏳ Session cleanup cron
4. ⏳ Multi-server deployment

## Related Files

- Graph: `src/workflows/human-loop-extraction-graph.ts`
- API: `apps/rabbit-hole/app/api/extraction-workflow-interactive/route.ts`
- Hook: `src/hooks/useHumanLoopExtraction.ts`
- Tests: `src/workflows/__tests__/human-loop-*.test.ts`
- Examples: `src/examples/human-loop-extraction-example.tsx`
