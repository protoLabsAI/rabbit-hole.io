# LangExtract Playground

Interactive testing component for the LangExtract microservice integration.

## Overview

The LangExtract Playground provides a visual interface for testing structured information extraction from unstructured text. Supports both direct extraction and job queue processing.

## Features

- **Dual Processing Modes:**
  - Job Queue (recommended) - Background processing with rate limiting
  - Direct Processing - Immediate response for testing
- **Schema Control:**
  - Full examples array with input/output pairs
  - Custom JSON Schema support
  - Output format validation
- **Advanced Settings:**
  - Temperature control (0.0-2.0)
  - Source grounding toggle
  - Schema constraints enforcement
- Service health monitoring
- Multiple pre-configured examples across domains
- Support for all LangExtract models (Gemini, OpenAI, Ollama)
- JSON output visualization with metadata and source grounding
- Real-time job status tracking

## Usage

### In Storybook

```bash
pnpm storybook
```

Navigate to: **Tools > LangExtract Playground**

### In Application

```tsx
import { LangExtractPlayground } from "@/components/langextract-playground/LangExtractPlayground";

export default function Page() {
  return (
    <LangExtractPlayground
      defaultText="Your text here"
      defaultPrompt="Extract specific information"
      defaultModelId="gemini-2.5-flash-lite"
    />
  );
}
```

## Hook Usage

### Job Queue (Recommended)

```tsx
import { useEnqueueLangExtract } from "@proto/sidequest-utils/client";
import { JobStatusTracker } from "@proto/sidequest-utils/components";

function MyComponent() {
  const [jobId, setJobId] = useState(null);
  const { mutate: enqueue, isPending } = useEnqueueLangExtract();

  const handleExtract = () => {
    enqueue(
      {
        textContent: "Text to analyze",
        extractionPrompt: "Describe what to extract",
        workspaceId: "demo",
        modelId: "gemini-2.5-flash-lite",
        examples: [
          {
            input_text: "Example input",
            expected_output: { field: "value" },
          },
        ],
        temperature: 0.0,
        includeSourceGrounding: true,
        useSchemaConstraints: true,
      },
      {
        onSuccess: (data) => setJobId(data.jobId),
      }
    );
  };

  return (
    <>
      <button onClick={handleExtract} disabled={isPending}>
        {isPending ? "Enqueueing..." : "Extract"}
      </button>
      {jobId && (
        <JobStatusTracker
          jobId={jobId}
          onComplete={(result) => console.log(result)}
        />
      )}
    </>
  );
}
```

### Direct Processing (Testing Only)

```tsx
import { useLangExtract } from "@proto/llm-tools/client";

function MyComponent() {
  const {
    mutate: extract,
    isPending,
    data,
  } = useLangExtract({
    onSuccess: (result) => console.log(result),
  });

  const handleExtract = () => {
    extract({
      textOrDocuments: ["Text to analyze"],
      promptDescription: "Describe what to extract",
      modelId: "gemini-2.5-flash-lite",
      examples: [
        {
          input_text: "Example",
          expected_output: { field: "value" },
        },
      ],
    });
  };

  return (
    <button onClick={handleExtract} disabled={isPending}>
      {isPending ? "Extracting..." : "Extract"}
    </button>
  );
}
```

## Examples

The playground includes pre-configured examples for:

- Person information
- Company details
- Event data
- Medical/disease information
- Geographic locations
- Products and technology
- Research and academic content
- Multiple entity extraction
- Complex nested data structures

## Requirements

**For Job Queue Mode (Recommended):**

- Job processor service running on port 8680
- PostgreSQL job queue database (port 5433)
- LangExtract service (port 8000)

**For Direct Mode (Testing):**

- LangExtract service running (default: http://localhost:8000)
- Valid API keys for Gemini, OpenAI, or Ollama

## Configuration

Environment variables:

```env
# LangExtract service
LANGEXTRACT_URL=http://localhost:8000
NEXT_PUBLIC_LANGEXTRACT_URL=http://localhost:8000

# Job processor
JOB_PROCESSOR_URL=http://localhost:8680

# Job queue database
DATABASE_URL=postgresql://jobqueue:jobs2024@localhost:5433/sidequest
```

## Schema Control

**Priority order:** customSchema > examples > outputFormat

1. **Examples (Recommended):**

```json
[
  {
    "input_text": "Marie Curie was a physicist...",
    "expected_output": {
      "name": "Marie Curie",
      "profession": "physicist",
      "achievements": ["discovered radium"]
    }
  }
]
```

2. **Custom JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "profession": { "type": "string" }
  },
  "required": ["name"]
}
```

## Advanced Settings

- **Temperature** (0.0-2.0): Controls randomness. Lower = more deterministic.
- **Source Grounding**: Returns text spans supporting each extraction
- **Schema Constraints**: Enforces strict schema validation
- **Workspace ID**: Organizes jobs by workspace

## Related Files

- `packages/sidequest-utils/src/client/hooks.ts` - Job queue hooks
- `packages/sidequest-utils/src/server/pollForJobCompletion.ts` - Polling utility
- `packages/proto-llm-tools/src/utils/enqueueLangExtract.ts` - Server-side enqueue
- `services/job-processor/jobs/LangExtractJob.ts` - Job implementation
- `services/langextract-service/` - LangExtract microservice

## Documentation

- `handoffs/2025-10-28_JOB_QUEUE_POLLING_UNIFICATION.md` - Architecture & fixes
- `handoffs/2025-10-28_LANGEXTRACT_SCHEMA_FIX.md` - Schema format details
- `handoffs/2025-10-27_LANGEXTRACT_JOB_QUEUE_COMPLETE.md` - Job queue implementation
