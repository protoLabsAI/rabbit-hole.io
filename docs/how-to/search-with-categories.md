# Search with Categories

The search agent routes queries to different SearXNG categories based on intent. You can influence this routing by phrasing your query — or the agent will infer the right category automatically.

## Available categories

| Category | Engines | Best for |
|----------|---------|----------|
| `general` | Google, Bing, Brave, DuckDuckGo | Broad factual questions, current events |
| `social media` | Reddit, Hacker News | Community opinions, real-world experience |
| `it` | GitHub, Stack Overflow, ArchWiki | Code, libraries, tooling, configurations |
| `science` | arXiv, Semantic Scholar, PubMed | Research papers, academic literature |
| `news` | NewsBlur, Google News | Recent news, announcements |

## How the agent routes queries

The system prompt instructs the agent to:

1. Start with a `general` web search for most queries
2. Add `social media` for opinion/experience questions ("what do people think…", "how is X in production")
3. Use `it` for code/tooling questions ("best library for…", "how to configure…", "GitHub repo for…")
4. Use `science` for research-heavy topics ("recent papers on…", "survey of…")

## Influencing routing with query phrasing

The agent picks up on intent signals in your query:

**Community sentiment** — triggers `social media`:
```
what do developers think about Bun vs Node.js
how do teams handle auth in production Next.js apps
```

**Code/tooling** — triggers `it`:
```
best pnpm workspace monorepo patterns
configure Nginx for websockets
```

**Academic** — triggers `science`:
```
recent papers on speculative decoding
survey of retrieval-augmented generation 2024
```

**General factual** — uses `general` (default):
```
React Server Components performance tradeoffs
what is GraphRAG
```

## Combining categories

The agent can search multiple categories in one session. For a query like:

```
what are the best open-source vector databases and what do practitioners prefer
```

The agent will:
1. Search `general` for factual comparison
2. Search `social media` (Reddit/HN) for practitioner opinions
3. Combine results into a single synthesized answer

## Manual category override (API)

If you're calling the API directly, pass `categories` in your message:

```json
{
  "role": "user",
  "content": "best Rust web frameworks",
  "categories": "it"
}
```

See [Search Chat API](../reference/search-chat-api) for the full schema.
