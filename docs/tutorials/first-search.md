# Your First Search

This tutorial walks you through a complete search session — from typing a query to reading cited results and asking a follow-up.

## Prerequisites

- Rabbit Hole running locally (`pnpm dev`)
- SearXNG reachable at `SEARXNG_ENDPOINT` (e.g. `http://ava:8888`)
- Neo4j running (results will be empty but search still works)

## Step 1 — Open the search page

Navigate to `http://localhost:3399`. You'll see a minimal search input.

## Step 2 — Type a query

Type any factual question or topic. Examples:

- `React Server Components performance tradeoffs`
- `What is GraphRAG and how does it differ from RAG?`
- `Rust async runtime internals`

Press **Enter** or click the search button.

## Step 3 — Watch the agent work

The search agent runs up to 7 tool-call steps. You'll see tool calls stream in before the answer:

- **searchWeb** (general) — broad web results from Google, Brave, DuckDuckGo
- **searchWikipedia** — foundational context if the topic is well-documented
- **searchWeb** (it or social media) — GitHub, Stack Overflow, or Reddit for depth

The agent decides which tools to call and in what order based on the query.

## Step 4 — Read the cited answer

The answer renders with inline citation badges like `[1]` `[2]`. Hover any badge to see the source title, domain, and snippet. Click to open the source.

A **Sources** panel on the right lists all sources the agent consulted, numbered to match the inline citations.

## Step 5 — Ask a follow-up

The search input stays active. Type a follow-up question — it has full context from the previous answer. The agent will search again if needed.

## Step 6 — Try a category-specific query

For community discussions, try:

```
what do developers think about Bun vs Node.js performance
```

The agent will recognize this as a community-sentiment query and search `social media` (Reddit, Hacker News) in addition to general web results.

For code/tooling queries:

```
best pnpm workspace monorepo patterns GitHub
```

The agent will target the `it` category (GitHub, Stack Overflow) for code-level results.

## What's next

- [Run your first deep research](./first-deep-research) for a comprehensive report on any topic
- [Search with categories](../how-to/search-with-categories) to understand category routing
