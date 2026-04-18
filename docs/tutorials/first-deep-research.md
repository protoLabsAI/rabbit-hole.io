# Your First Deep Research

This tutorial walks through a complete deep research session — from launching a job to reading the final cited report.

## Prerequisites

- Rabbit Hole running locally (`pnpm dev`)
- SearXNG reachable at `SEARXNG_ENDPOINT`
- At least one AI model configured (`ANTHROPIC_API_KEY`)

## Step 1 — Open deep research

From the main search page, click **Deep Research** in the navigation, or navigate directly to `/research`.

## Step 2 — Enter a topic

Type a research topic — something broad enough to have multiple angles:

- `The tradeoffs between GraphRAG and standard RAG for enterprise knowledge management`
- `How Rust's ownership model compares to garbage collection for systems programming`
- `State of open-source LLM inference engines in 2025`

Click **Start Research**. The pipeline starts immediately and returns a `researchId`.

## Step 3 — Watch the pipeline

The left panel shows the activity feed in real time. Deep research runs a four-phase pipeline:

### Phase 1: SCOPE

The agent decomposes your topic into 3–6 research dimensions. You'll see entries like:

```
Scoped topic into 5 dimensions:
  • Performance benchmarks and throughput
  • Memory and resource usage
  • Developer ergonomics and tooling
  • Ecosystem maturity
  • Production adoption patterns
```

### Phase 2: RESEARCH (per dimension)

For each dimension, the agent searches:

1. **Web** — SearXNG general category, then social media/IT categories for depth
2. **Wikipedia** — foundational context
3. **Knowledge graph** — prior sessions if available

You'll see per-dimension progress cards as each completes.

### Phase 3: EVALUATE

After all dimensions are researched, an LLM checks for coverage gaps. If gaps are found and fewer than 3 iterations have run, new sub-dimensions are researched. The activity feed shows:

```
Evaluating coverage... 2 gaps found.
Starting iteration 2: researching "production deployment patterns"...
```

### Phase 4: SYNTHESIS

A streaming LLM call produces the final report with inline citations `[1]`, `[2]`. The center panel shows the report as it streams in.

## Step 4 — Read the report

The center panel renders the completed report:

- **Table of Contents** — click any heading to jump to it
- **Inline citations** — `[1]` badges link to sources
- **Section headers** — one per research dimension

The right panel (toggle with the **Sources** button) lists all sources numbered to match inline citations.

## Step 5 — Download the report

Click **Download** (top right of the center panel) to export the report as Markdown.

## Step 6 — Add to knowledge graph

If the research produced useful entities, click **Add to Graph** on any message to extract and ingest entities into Neo4j. Future searches will find this knowledge.

## What's next

- [Use deep research modes](../how-to/deep-research-modes) — standard vs. comprehensive vs. quick
- [Ingest to knowledge graph](../how-to/ingest-to-graph) — build your personal knowledge base
- [Deep research pipeline](../explanation/deep-research-pipeline) — how SCOPE → RESEARCH → EVALUATE → SYNTHESIS works
