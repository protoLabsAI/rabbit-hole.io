# Search Functions

All search utilities live in `apps/rabbit-hole/app/lib/search.ts`. Both the chat API and deep research pipeline import from here — it's the single source of truth.

## `searchWeb`

Calls SearXNG.

```typescript
async function searchWeb(
  query: string,
  maxResults?: number,          // default: 6
  options?: WebSearchOptions
): Promise<WebSearchResult[]>
```

### `WebSearchOptions`

```typescript
interface WebSearchOptions {
  categories?: string;   // "general" | "social media" | "it" | "science" | "news"
  engines?: string;      // comma-separated engine names, overrides categories
  pageno?: number;       // 1-based page number, default: 1
  timeRange?: "day" | "week" | "month" | "year";
}
```

### `WebSearchResult`

```typescript
interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;         // up to 800 chars
  engines?: string[];      // which engines returned this result
  publishedDate?: string;  // ISO date string if available
}
```

### Notes

- Sends `language=en` with every request
- Deduplicates results by URL
- `engines` overrides `categories` when both are provided
- Returns empty array (not throws) on network failure

---

## `searchWikipedia`

Fetches a Wikipedia article summary.

```typescript
async function searchWikipedia(
  query: string
): Promise<WikipediaResult | null>
```

### `WikipediaResult`

```typescript
interface WikipediaResult {
  title: string;
  url: string;
  summary: string;     // extracted opening section
  categories: string[];
}
```

---

## `withRetry`

Wraps any async function with exponential backoff.

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;      // default: 3
    baseDelayMs?: number;  // default: 500
    label?: string;        // for logging
  }
): Promise<T>
```

Used internally by `searchWeb` and the other search utilities to retry transient failures.
