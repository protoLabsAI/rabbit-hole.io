# LangExtract Service Usage Examples

## Quick Start

### 1. Environment Setup

```bash
# .env.local (for Next.js app)
LANGEXTRACT_URL=http://localhost:8000
JOB_PROCESSOR_URL=http://localhost:8680
DATABASE_URL=postgresql://jobqueue:changeme@localhost:5433/sidequest

# docker-compose.yml
services:
  nextjs:
    environment:
      - LANGEXTRACT_URL=http://langextract:8000
      - JOB_PROCESSOR_URL=http://job-processor:8680
```

### 2. Recommended: Job Queue Pattern (Server-Side)

```typescript
import { enqueueLangExtract } from "@protolabsai/llm-tools";

// Server-side API route
export async function POST(request: NextRequest) {
  const { text, prompt } = await request.json();

  // Enqueue job and poll for completion
  const result = await enqueueLangExtract({
    textContent: text,
    extractionPrompt: prompt,
    workspaceId: "workspace_123",
    modelId: "gemini-2.5-flash-lite",
    examples: [{
      input_text: "Example text",
      expected_output: { field: "value" }
    }],
    includeSourceGrounding: true,
    useSchemaConstraints: true,
  });

  return NextResponse.json(result.data);
}
```

### 3. Alternative: Direct Processing (Legacy)

```typescript
import { langextractClientTool } from "@protolabsai/llm-tools";

// Direct call (not recommended for production)
const result = await langextractClientTool.invoke({
  textOrDocuments: ["Elon Musk is the CEO of Tesla and SpaceX"],
  promptDescription: "Extract person name and companies they lead",
});

console.log(result.extractedData);
// { name: "Elon Musk", occupation: "CEO", company: "Tesla and SpaceX" }
```

### 3. Check Service Health

```typescript
import { isLangExtractAvailable, getLangExtractModels } from "@protolabsai/llm-tools";

// Health check
const healthy = await isLangExtractAvailable();
if (!healthy) {
  console.error("LangExtract service not available");
  // Fallback to alternative extraction method
}

// Get available models
const models = await getLangExtractModels();
console.log(models.gemini_models); // ["gemini-2.5-flash", ...]
```

### 4. Configuration Override

```typescript
import { langextractClientTool, langextractConfig } from "@protolabsai/llm-tools";

// Use default config (recommended)
const result1 = await langextractClientTool.invoke({
  textOrDocuments: ["..."],
  promptDescription: "Extract data",
  // serviceUrl automatically configured
  // modelId defaults to gemini-2.5-flash
});

// Override specific options
const result2 = await langextractClientTool.invoke({
  textOrDocuments: ["..."],
  promptDescription: "Extract data",
  serviceUrl: "http://custom-langextract:9000", // Override if needed
  modelId: "gpt-4o-mini", // Use OpenAI instead
});
```

## Integration Examples

### API Route (Job Queue Pattern)

```typescript
// app/api/extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import { enqueueLangExtract } from "@protolabsai/llm-tools";

export const maxDuration = 300; // 5 minutes for polling

export async function POST(request: NextRequest) {
  const { text, prompt, examples } = await request.json();

  // Enqueue job and poll for completion
  const result = await enqueueLangExtract({
    textContent: text,
    extractionPrompt: prompt,
    examples,
    workspaceId: "default",
    modelId: "gemini-2.5-flash-lite",
    includeSourceGrounding: true,
    pollOptions: {
      pollInterval: 2000,
      timeout: 300000,
    },
  });

  return NextResponse.json(result);
}
```

### LangGraph Workflow

```typescript
// Using in a LangGraph node
import { StateGraph } from "@langchain/langgraph";
import { langextractClientTool } from "@protolabsai/llm-tools";

const workflow = new StateGraph({
  channels: {
    documents: { value: () => [] },
    extracted: { value: () => null },
  },
});

workflow.addNode("extract", async (state) => {
  // Automatic service configuration
  const result = await langextractClientTool.invoke({
    textOrDocuments: state.documents,
    promptDescription: "Extract entity information",
  });

  return { extracted: result.extractedData };
});
```

### Agent Tool

```typescript
// agent/src/tools/custom-extraction.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { langextractClientTool } from "@protolabsai/llm-tools";

export const customExtractionTool = tool(
  async (input) => {
    // Delegate to LangExtract with automatic config
    const result = await langextractClientTool.invoke({
      textOrDocuments: input.documents,
      promptDescription: input.extractionGoal,
    });

    return result;
  },
  {
    name: "customExtraction",
    description: "Extract structured data from documents",
    schema: z.object({
      documents: z.array(z.string()),
      extractionGoal: z.string(),
    }),
  }
);
```

## Advanced Usage

### With Few-Shot Examples

```typescript
import { langextractClientTool } from "@protolabsai/llm-tools";

const result = await langextractClientTool.invoke({
  textOrDocuments: [
    "Dr. Sarah Johnson is a 34-year-old cardiologist at Mayo Clinic.",
  ],
  promptDescription: "Extract detailed person information",
  examples: [
    {
      input_text: "John Smith, age 45, works as a software engineer at Google.",
      expected_output: {
        name: "John Smith",
        age: 45,
        occupation: "software engineer",
        company: "Google",
      },
    },
  ],
});
```

### Error Handling

```typescript
import {
  langextractClientTool,
  isLangExtractAvailable,
} from "@protolabsai/llm-tools";

async function extractWithFallback(text: string) {
  // Check availability first
  const available = await isLangExtractAvailable();

  if (!available) {
    console.warn("LangExtract not available, using fallback");
    return fallbackExtraction(text);
  }

  try {
    const result = await langextractClientTool.invoke({
      textOrDocuments: [text],
      promptDescription: "Extract information",
    });

    return result.extractedData;
  } catch (error) {
    console.error("LangExtract failed:", error);
    return fallbackExtraction(text);
  }
}
```

## Configuration Reference

### Environment Variables Priority

1. `LANGEXTRACT_URL` (server-side)
2. `NEXT_PUBLIC_LANGEXTRACT_URL` (client-side)
3. `http://localhost:8000` (default)

### Default Model Configuration

```typescript
{
  modelId: "gemini-2.5-flash",  // Fast, high-quality, free tier
  provider: "gemini",
  includeSourceGrounding: true,
  temperature: 0.1,              // Low for consistent extraction
  maxTokens: 8192,
}
```

### Available Models

**Gemini (Recommended):**

- `gemini-2.5-flash` (Primary - Fast & Free)
- `gemini-1.5-pro` (Higher quality)
- `gemini-1.5-flash` (Faster)

**OpenAI:**

- `gpt-4o` (Highest quality)
- `gpt-4o-mini` (Cost-effective)
- `gpt-4-turbo` (Balanced)

**Ollama (Local/Privacy):**

- `gemma2:2b` (Fast local)
- `llama3:8b` (Quality local)
- `mistral:7b` (Alternative)

## Troubleshooting

### Service Not Available

```bash
# Check if service is running
curl http://localhost:8000/health

# Check Docker logs
docker compose logs langextract

# Verify environment variable
echo $LANGEXTRACT_URL
```

### Connection Errors

```typescript
// Add timeout and retry logic
import { langextractConfig } from "@protolabsai/llm-tools";

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

try {
  const response = await fetch(langextractConfig.getExtractUrl(), {
    method: "POST",
    signal: controller.signal,
    body: JSON.stringify(request),
  });
} finally {
  clearTimeout(timeout);
}
```

### Wrong Service URL

```bash
# Debug: Check what URL is being used
node -e "
const { getLangExtractServiceUrl } = require('@protolabsai/llm-tools');
console.log('Service URL:', getLangExtractServiceUrl());
"
```
