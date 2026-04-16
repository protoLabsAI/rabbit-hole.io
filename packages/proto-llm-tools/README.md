# @protolabsai/llm-tools

LLM workflow tools and graph operations for the Proto project.

## Overview

This package contains LangGraph workflow implementations that can be used across the application without direct OpenAI dependencies in API routes. The workflows handle complex AI operations while providing fallback mechanisms when AI services are unavailable.

## Features

- **Universal Entity Research Workflow**: LangGraph-based research for all entity types (Person, Organization, Platform, Movement, Event)
- **Person Research Workflow**: Specialized person entity research with Wikipedia integration
- **AI-Powered Extraction**: LangExtract service integration with Gemini 2.5 Flash
- **Rabbit Hole Schema Compliance**: 100% compatible bundle generation for `/api/ingest-bundle`
- **Entity-Specific Tools**: Specialized research tools for each entity type
- **Confidence Scoring**: Reliability assessment and evidence attribution
- **Knowledge Graph Integration**: Compatible with existing Neo4j schema and Atlas visualization

## Usage

### Universal Entity Research (NEW)

```typescript
import { entityResearchTool } from "@protolabsai/llm-tools";

// Research any entity type - auto-detects or specify explicitly
const result = await entityResearchTool.invoke({
  targetEntityName: "Tesla Inc.",
  entityType: "Organization", // Optional - auto-detects if not provided
  researchDepth: "detailed",
  rawData: [
    {
      content: "Tesla Inc. is an electric vehicle company...",
      source: "Company Website",
      sourceType: "corporate_website",
      reliability: 0.9,
    },
  ],
});

// Returns Rabbit Hole compatible bundle:
// { entities: [...], relationships: [...], evidence: [...] }
```

### Person Research (Existing)

```typescript
import { personResearchGraph } from "@protolabsai/llm-tools/person-research";

// Specialized person research workflow
const result = await personResearchGraph.invoke({
  targetPersonName: "Jane Doe",
  rawData: [
    {
      content: "Jane Doe is a software engineer...",
      source: "Company Bio",
      sourceType: "user_provided",
    },
  ],
});
```

## Current Workflows

### Universal Entity Research (`entity-research`) - NEW

- **Input**: Entity name + optional entity type + raw data sources
- **Output**: Rabbit Hole schema compatible bundle (entities, relationships, evidence)
- **Entity Types**: Person, Organization, Platform, Movement, Event
- **Features**: Auto-detection, AI extraction, confidence scoring
- **Schema**: Proper UID generation (`org:tesla_inc`, `platform:twitter`, etc.)
- **Performance**: 87% confidence scores, 100% schema compliance
- **Integration**: Direct compatibility with `/api/ingest-bundle`

### Person Research (`person-research`) - Existing

- **Input**: Person name + optional raw data sources
- **Output**: Structured person entity data with biographical information
- **Features**: Wikipedia integration, relationship discovery
- **Schema**: Uses `person:name` ID format
- **Status**: Unchanged and fully compatible

## LangExtract Service Configuration

### Centralized Service URL Management

The package provides utilities for configuring the LangExtract microservice connection:

```typescript
import {
  langextractConfig,
  getLangExtractServiceUrl,
  isLangExtractAvailable,
  getLangExtractModels,
} from "@protolabsai/llm-tools";

// Get configured service URL
const serviceUrl = getLangExtractServiceUrl();
// Returns: LANGEXTRACT_URL env var || "http://localhost:8000"

// Access endpoints
console.log(langextractConfig.getExtractUrl()); // http://localhost:8000/extract
console.log(langextractConfig.getHealthUrl()); // http://localhost:8000/health

// Check service availability
const available = await isLangExtractAvailable();

// Get available models
const models = await getLangExtractModels();
// Returns: { gemini_models: [...], openai_models: [...], ollama_models: [...] }
```

### Environment Variables

**Server-side (API routes, agents):**

```bash
LANGEXTRACT_URL=http://langextract:8000  # Docker container name
# or
LANGEXTRACT_URL=http://localhost:8000    # Local development
```

**Client-side (browser):**

```bash
NEXT_PUBLIC_LANGEXTRACT_URL=http://localhost:8000
```

### Docker Compose Configuration

```yaml
services:
  nextjs:
    environment:
      - LANGEXTRACT_URL=http://langextract:8000 # Container-to-container

  agent-server:
    environment:
      - LANGEXTRACT_URL=http://langextract:8000 # Container-to-container
```

### Default Configuration

```typescript
langextractConfig.defaults = {
  modelId: "gemini-2.5-flash",
  provider: "gemini",
  includeSourceGrounding: true,
  temperature: 0.1,
  maxTokens: 8192,
};
```

All tools (`langextractClientTool`, research tools, workflows) automatically use these configurations.

## React Hooks

**Powered by React Query** - All hooks use `@tanstack/react-query` for:

- Automatic request caching and deduplication
- Smart background refetching
- Retry logic with exponential backoff
- Optimistic updates support
- Built-in loading and error states

**Important:** Import hooks from `@protolabsai/llm-tools/client` to avoid bundling server-side dependencies (LangChain, LangGraph) in your browser bundle.

```typescript
// ✅ Correct - Browser-safe import
import { useLangExtract } from "@protolabsai/llm-tools/client";

// ❌ Wrong - Pulls in Node.js dependencies
import { useLangExtract } from "@protolabsai/llm-tools";
```

### useLangExtract

React Query mutation hook for calling the LangExtract service from client components.

```typescript
import { useLangExtract } from "@protolabsai/llm-tools/client";

function MyComponent() {
  const { mutate, isPending, error, data, reset } = useLangExtract({
    onSuccess: (result) => console.log("Success:", result),
    onError: (error) => console.error("Error:", error),
  });

  const handleExtract = () => {
    mutate({
      textOrDocuments: "Elon Musk is CEO of Tesla and SpaceX",
      promptDescription: "Extract person information including name, occupation, companies",
      modelId: "gemini-2.5-flash",
      examples: [{
        input_text: "Sample person text",
        expected_output: { name: "...", occupation: "...", companies: [] }
      }],
    });
  };

  return (
    <button onClick={handleExtract} disabled={isPending}>
      {isPending ? "Extracting..." : "Extract"}
      {data && <pre>{JSON.stringify(data.data, null, 2)}</pre>}
    </button>
  );
}
```

**Hook API (React Query):**

- `mutate(variables)` - Trigger extraction
- `isPending` - Loading state boolean
- `error` - Error object or null
- `data` - Extraction result or undefined
- `reset()` - Clear mutation state

**Variables:**

- `textOrDocuments` - Text or array of texts (required)
- `promptDescription` - What to extract (required)
- `modelId` - LLM model (optional, default: `gemini-2.5-flash`)
- `serviceUrl` - Service URL (optional, default: from env)
- `includeSourceGrounding` - Citations (optional, default: `true`)
- `examples` - Output format examples (optional)

### useLangExtractHealth

React Query hook to check LangExtract service availability.

```typescript
import { useLangExtractHealth } from "@protolabsai/llm-tools/client";

function ServiceStatus() {
  const { data: isAvailable, isLoading, refetch } = useLangExtractHealth();

  return (
    <button onClick={() => refetch()} disabled={isLoading}>
      {isLoading ? "Checking..." : "Check Service"}
      {isAvailable !== undefined && (
        <span>{isAvailable ? "Online" : "Offline"}</span>
      )}
    </button>
  );
}
```

**Features:**

- Automatic caching (30s stale time)
- Refetch on window focus
- Single retry on failure

### useLangExtractModels

React Query hook to fetch available models from LangExtract service.

```typescript
import { useLangExtractModels } from "@protolabsai/llm-tools/client";

function ModelSelector() {
  const { data: models, isLoading, error, refetch } = useLangExtractModels({
    enabled: false, // Manual fetch
  });

  useEffect(() => {
    refetch(); // Fetch on mount
  }, [refetch]);

  if (isLoading) return <div>Loading models...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <select>
      {models?.gemini_models.map(model => (
        <option key={model} value={model}>{model}</option>
      ))}
    </select>
  );
}
```

**Features:**

- Long cache (5 min stale time - models rarely change)
- Manual fetch by default (`enabled: false`)
- Automatic retry on failure

### useWikipediaQuery

React Query mutation for querying Wikipedia (search + content).

```typescript
import { useWikipediaQuery } from "@protolabsai/llm-tools/client";

function WikipediaSearch() {
  const { mutate, isPending, data } = useWikipediaQuery({
    onSuccess: (result) => {
      console.log(`Found ${result.pages.length} pages`);
    },
  });

  const handleSearch = () => {
    mutate({
      query: "Albert Einstein",
      language: "en",
      topKResults: 2,
      maxContentLength: 4000,
    });
  };

  return (
    <div>
      <button onClick={handleSearch} disabled={isPending}>
        Search
      </button>
      {data?.pages.map(page => (
        <div key={page.pageId}>
          <h3>{page.title}</h3>
          <p>{page.summary}</p>
        </div>
      ))}
    </div>
  );
}
```

### useWikipediaPage

React Query hook for fetching a specific Wikipedia page with automatic caching.

```typescript
import { useWikipediaPage } from "@protolabsai/llm-tools/client";

function PageViewer({ pageId }: { pageId: number }) {
  const { data: page, isLoading } = useWikipediaPage(pageId, {
    language: "en",
  });

  if (isLoading) return <div>Loading...</div>;
  if (!page) return <div>Page not found</div>;

  return (
    <article>
      <h1>{page.title}</h1>
      <p>{page.content}</p>
      <a href={page.url} target="_blank">View on Wikipedia</a>
    </article>
  );
}
```

**Features:**
- Automatic caching (1 hour stale time)
- Supports all Wikipedia languages
- Includes metadata, categories, images
- Smart refetching on window focus

### Interactive Playgrounds

Test the hooks interactively in Storybook:

```bash
pnpm storybook
# Navigate to: Tools > LangExtract Playground
# Navigate to: Tools > Wikipedia Playground
```

Or import components directly:

```typescript
import { LangExtractPlayground } from "@/components/langextract-playground";
import { WikipediaPlayground } from "@/components/wikipedia-playground";

export default function Page() {
  return (
    <>
      <LangExtractPlayground />
      <WikipediaPlayground />
    </>
  );
}
```

## YouTube Processor Service

The YouTube Processor service provides video downloading, processing, and audio extraction capabilities.

### React Query Hooks

#### useYouTubeProcess

Process YouTube videos (extract audio, upload to storage).

```typescript
import { useYouTubeProcess } from "@protolabsai/llm-tools/client";

function ProcessButton({ url, workspaceId }: { url: string, workspaceId: string }) {
  const { mutate, isPending, data, error } = useYouTubeProcess({
    onSuccess: (result) => console.log("Processed:", result),
  });

  const handleProcess = () => {
    mutate({
      url,
      userId: "user_123",
      workspaceId,
      quality: "720p" // optional
    });
  };

  return (
    <button onClick={handleProcess} disabled={isPending}>
      {isPending ? "Processing..." : "Process Video"}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </button>
  );
}
```

#### useYouTubeUpload

Upload video files directly (no YouTube URL required).

```typescript
import { useYouTubeUpload } from "@protolabsai/llm-tools/client";

function UploadButton({ file, workspaceId }: { file: File, workspaceId: string }) {
  const { mutate, isPending, data } = useYouTubeUpload({
    onSuccess: (result) => console.log("Uploaded:", result),
  });

  const handleUpload = () => {
    mutate({
      file,
      userId: "user_123",
      workspaceId
    });
  };

  return (
    <button onClick={handleUpload} disabled={isPending}>
      {isPending ? "Uploading..." : "Upload Video"}
    </button>
  );
}
```

#### useYouTubeDownloadURL

Download videos from generic URLs (mp4, webm, etc).

```typescript
import { useYouTubeDownloadURL } from "@protolabsai/llm-tools/client";

function DownloadButton({ url, workspaceId }: { url: string, workspaceId: string }) {
  const { mutate, isPending, data } = useYouTubeDownloadURL({
    onSuccess: (result) => console.log("Downloaded:", result),
  });

  const handleDownload = () => {
    mutate({
      url,
      userId: "user_123",
      workspaceId
    });
  };

  return (
    <button onClick={handleDownload} disabled={isPending}>
      {isPending ? "Downloading..." : "Download Video"}
    </button>
  );
}
```

#### useYouTubeProcessorHealth

Check YouTube processor service availability.

```typescript
import { useYouTubeProcessorHealth } from "@protolabsai/llm-tools/client";

function ServiceStatus() {
  const { data, isLoading, refetch } = useYouTubeProcessorHealth();

  return (
    <div>
      Status: {data ? "Online" : "Offline"}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### API Endpoints

**Next.js API Routes:**

- `POST /api/youtube/process` - Process YouTube video
- `POST /api/youtube/upload` - Upload video file
- `POST /api/youtube/download-url` - Download from URL
- `GET /api/youtube/health` - Service health check

**Python Service Endpoints:**

- `POST /process` - YouTube video processing
- `POST /upload` - Direct file upload
- `POST /download-url` - Generic URL download
- `GET /health` - Health check with FFmpeg/FFprobe status

### Configuration

Set environment variable for YouTube processor service:

```bash
YOUTUBE_PROCESSOR_URL=http://localhost:8001
```

### Video Format Support

**Supported Formats:**
- MP4, WebM, MKV, MOV

**Supported Codecs:**
- H.264, H.265 (HEVC), VP9, VP8, AV1

**Default Limits:**
- Max file size: 500MB
- Max duration: 2 hours (7200 seconds)

## Installation

```bash
pnpm add @protolabsai/llm-tools
```

The package is automatically included in the workspace via `pnpm-workspace.yaml`.
