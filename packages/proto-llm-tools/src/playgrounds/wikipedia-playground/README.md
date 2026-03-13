# Wikipedia Playground

Interactive testing component for Wikipedia API integration.

## Overview

The Wikipedia Playground provides a visual interface for testing Wikipedia search and content fetching using the `useWikipedia` React Query hooks.

## Features

- Real-time Wikipedia search with configurable parameters
- Multi-language support (10 languages)
- Page content preview with metadata
- Category browsing
- Image thumbnails
- Direct Wikipedia links
- Automatic caching (5 min for search, 1 hour for pages)
- Error handling and loading states

## Usage

### In Storybook

```bash
pnpm storybook
```

Navigate to: **Tools > Wikipedia Playground**

### In Application

```tsx
import { WikipediaPlayground } from "@/components/wikipedia-playground";

export default function Page() {
  return (
    <WikipediaPlayground
      defaultQuery="Albert Einstein"
      defaultLanguage="en"
    />
  );
}
```

## Hook Usage

The playground demonstrates React Query hook patterns:

```tsx
import { useWikipediaQuery, useWikipediaPage } from "@proto/llm-tools/client";

function MyComponent() {
  const { mutate, isPending, data } = useWikipediaQuery();
  const { data: page } = useWikipediaPage(pageId);

  const handleSearch = () => {
    mutate({
      query: "Quantum physics",
      language: "en",
      topKResults: 2,
    });
  };

  return <button onClick={handleSearch}>Search</button>;
}
```

## Available Hooks

### `useWikipediaQuery`
Full query with search + content (mutation)

### `useWikipediaSearch`
Search only, no content (mutation)

### `useWikipediaPage`
Fetch specific page by ID (query with caching)

### `useWikipediaSearchQuery`
Search with automatic caching (query)

### `useWikipediaConfig`
Access configuration and defaults

## Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Chinese (zh)
- Russian (ru)
- Portuguese (pt)
- Italian (it)
- Arabic (ar)

## Configuration

Defaults from `wikipediaConfig`:
- Top K Results: 2
- Max Content Length: 4000 characters
- Max Summary Length: 500 characters
- Include Images: true
- Include Categories: true
- Reliability Score: 0.85

## Examples

The playground includes pre-configured examples:
- Person (Marie Curie)
- Place (Paris)
- Concept (Quantum mechanics)
- Event (Apollo 11)

## Requirements

- Internet connection for Wikipedia API
- React Query provider in component tree

## Related Files

- `packages/proto-llm-tools/src/hooks/useWikipedia.ts` - React Query hooks
- `packages/proto-llm-tools/src/config/wikipedia-config.ts` - API client and config
- `docs/developer/REACT_QUERY_PATTERNS.md` - Pattern documentation

