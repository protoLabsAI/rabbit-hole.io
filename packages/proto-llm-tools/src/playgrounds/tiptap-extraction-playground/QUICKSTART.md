# Quick Start Guide

Get the Tiptap Extraction Playground running in 5 minutes.

## Prerequisites

- LangExtract service running at `http://localhost:8003`
- Next.js app running (`pnpm dev`)
- Tiptap dependencies installed

## Installation

```bash
# Install dependencies
cd packages/proto-llm-tools
pnpm install

# Build the package
pnpm run build

# Start the app
cd ../../apps/rabbit-hole
pnpm dev
```

## Basic Usage

### 1. Import the Playground

```tsx
import { TiptapExtractionPlayground } from "@proto/llm-tools/playgrounds";

export default function Page() {
  return <TiptapExtractionPlayground />;
}
```

### 2. With Default Content

```tsx
<TiptapExtractionPlayground
  defaultText="Albert Einstein was a German-born theoretical physicist who developed the theory of relativity."
  defaultDomains={["social", "academic"]}
  defaultMode="enrich"
/>
```

## Extraction Workflow

### Step 1: Enter Text

Type or paste text into the Tiptap editor.

### Step 2: Select Domains

Choose which types of entities to extract:

- 👥 Social (people, organizations)
- 🌍 Geographic (locations, places)
- 🎓 Academic (publications, concepts)
- ⚕️ Medical (conditions, treatments)
- 💻 Technology (companies, products)
- 💰 Economic (markets, transactions)
- 🎨 Cultural (art, movements)

### Step 3: Choose Mode

- **Discover**: Quick entity scan
- **Structure**: Core data extraction
- **Enrich**: Full entity profiles
- **Deep Dive**: Including relationships

### Step 4: Run Extraction

Click "Extract Entities" and wait for processing.

### Step 5: Review Results

- Entities are highlighted in the text
- Click highlights to view details
- Check confidence scores
- Review extraction stats

## Example Sessions

### Biography Analysis

```tsx
const biographyText = `
Marie Curie (1867-1934) was a Polish-French physicist and chemist who 
conducted pioneering research on radioactivity. She was the first woman 
to win a Nobel Prize, the first person to win the Nobel Prize twice, and 
the only person to win the Nobel Prize in two scientific fields.

She studied at the University of Paris (Sorbonne), where she later became 
the first woman professor. Her work with her husband Pierre Curie led to 
the discovery of polonium and radium.
`;

<TiptapExtractionPlayground
  defaultText={biographyText}
  defaultDomains={["social", "academic", "geographic"]}
  defaultMode="deep_dive"
/>;
```

Expected results:

- **Entities**: Marie Curie (person), Pierre Curie (person), University of Paris (org), Sorbonne (org), polonium (concept), radium (concept)
- **Relationships**: MARRIED_TO (Marie → Pierre), EMPLOYED_BY (Marie → Sorbonne), DISCOVERED (Marie → polonium, radium)

### News Article

```tsx
const newsText = `
Tesla CEO Elon Musk announced today that the company will invest $500 million 
in expanding its Gigafactory in Austin, Texas. The expansion is expected to 
create 2,000 new jobs by 2026.
`;

<TiptapExtractionPlayground
  defaultText={newsText}
  defaultDomains={["social", "economic", "technology", "geographic"]}
  defaultMode="deep_dive"
/>;
```

Expected results:

- **Entities**: Elon Musk (person), Tesla (org), Gigafactory (location), Austin (location), Texas (location)
- **Relationships**: CEO_OF (Elon Musk → Tesla), LOCATED_IN (Gigafactory → Austin), LOCATED_IN (Austin → Texas)

## API Usage (Programmatic)

If you want to use the extraction workflow without the UI:

```typescript
import { extractionGraph } from "@proto/llm-tools";

const result = await extractionGraph.invoke({
  inputText: "Your text here...",
  mode: "enrich",
  domains: ["social", "academic"],
  confidenceThresholds: {
    discover: 0.7,
    structure: 0.8,
    enrich: 0.6,
    relate: 0.75,
  },
});

console.log(result.enrichedEntities);
console.log(result.relationships);
```

## React Hook Usage

```typescript
import { useExtractionWorkflow } from "@proto/llm-tools";

function MyComponent() {
  const { mutate, isPending, data } = useExtractionWorkflow();

  const handleExtract = () => {
    mutate({
      text: "Your text...",
      domains: ["social"],
      mode: "enrich",
    });
  };

  return (
    <div>
      <button onClick={handleExtract} disabled={isPending}>
        Extract
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

## Troubleshooting

### "LangExtract service error"

- Ensure langextract-service is running: `cd services/langextract-service && python main.py`
- Check service URL in config: `packages/proto-llm-tools/src/config/langextract-config.ts`

### Extraction takes too long

- Try "discover" mode first for quick testing
- Reduce number of selected domains
- Check LangExtract service logs for bottlenecks

### Low confidence scores

- Use "enrich" or "deep_dive" modes for better accuracy
- Provide more context in the input text
- Adjust confidence threshold slider

### Entities not highlighted

- Check that annotations were generated: `data.allAnnotations`
- Ensure Tiptap editor is initialized
- Verify EntityHighlight extension is loaded

## Configuration

### Change Service URL

Edit `packages/proto-llm-tools/src/config/langextract-config.ts`:

```typescript
const serviceUrl =
  process.env.NEXT_PUBLIC_LANGEXTRACT_SERVICE_URL || "http://localhost:8003";
```

### Adjust Confidence Thresholds

```typescript
<TiptapExtractionPlayground
  defaultText="..."
  defaultDomains={["social"]}
  defaultMode="enrich"
  // Pass through to workflow via UI controls
/>
```

Or programmatically:

```typescript
await extractionGraph.invoke({
  inputText: "...",
  confidenceThresholds: {
    discover: 0.6, // More lenient
    structure: 0.9, // More strict
    enrich: 0.5,
    relate: 0.8,
  },
});
```

## Next Steps

- Read the [full README](./README.md) for detailed API documentation
- Check the [implementation summary](../../../../../handoffs/2025-10-25_IMPLEMENTATION_SUMMARY.md)
- Review [main handoff document](../../../../../handoffs/2025-10-25_MULTI_PHASE_ENTITY_EXTRACTION_TIPTAP_PLAYGROUND.md)

## Support

- Check logs: Browser console and terminal
- Verify LangExtract service health: `curl http://localhost:8003/health`
- Review extraction result structure in Network tab

Happy extracting! 🚀
