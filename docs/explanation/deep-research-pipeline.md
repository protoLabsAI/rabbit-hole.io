# Deep Research Pipeline

## The problem with single-shot research

Asking an LLM to "research GraphRAG" in a single pass produces a shallow answer. The LLM either hallucinates a comprehensive-sounding answer from training data, or returns a brief summary of the first few search results.

Deep research breaks the problem into four phases that mirror how a human researcher would approach it.

## Phase 1: SCOPE

**What it does**: Decomposes the topic into 3–6 orthogonal research dimensions.

**Why**: A topic like "Rust vs Go for systems programming" has multiple independent angles — performance benchmarks, memory models, ecosystem maturity, developer ergonomics, production adoption. Researching them together in a single query produces muddy results where important angles are underrepresented.

**How**: `generateObject` with a Zod schema produces a structured list of dimensions. The LLM is prompted to think like an editor planning a magazine feature — what are the distinct sub-topics a thorough article would cover?

**Example output**:
```json
{
  "dimensions": [
    "Runtime performance and throughput",
    "Memory safety model",
    "Concurrency primitives",
    "Ecosystem and package quality",
    "Learning curve and developer productivity",
    "Production adoption case studies"
  ]
}
```

## Phase 2: RESEARCH (per dimension)

**What it does**: For each dimension, runs a multi-source search and compresses findings.

**Why**: Each dimension needs its own targeted search query. "Rust performance benchmarks" and "Rust vs Go ecosystem" need different search terms and different engine categories.

**How**:
1. **Primary web search** — general category, dimension-specific query, up to 8 results
2. **Wikipedia** — foundational context if the dimension is well-documented
3. **Secondary web search** — `social media,it` categories, angle query combining topic + dimension

Graph search is skipped on a fresh installation (`graphIsEmpty` flag). When the graph has relevant content, it's searched here too.

After collecting sources, a `generateObject` call compresses findings into:
- `summary` — 2–3 sentence synthesis of what was found
- `keyFinding` — the single most important fact for this dimension

**Why compress?** Feeding all raw search results into the synthesis prompt hits context limits quickly. Compression distills each dimension into its essential contribution before the final synthesis pass.

## Phase 3: EVALUATE

**What it does**: An LLM evaluator checks whether the covered dimensions adequately address the original topic.

**Why**: The initial scope may miss angles that only become apparent after reading the research. The evaluate phase catches these gaps.

**How**: The evaluator receives the original query and all dimension summaries. It answers: "What is missing or underrepresented?" If it identifies gaps, new sub-dimensions are added and researched.

**Loop limit**: The loop runs at most 3 times to prevent infinite refinement. In practice, 1–2 iterations are sufficient for most topics.

**Example gap finding**:
```
Coverage gaps identified:
- No data on WebAssembly/WASM target support for either language
- Missing: real-world startup time benchmarks (embedded systems context)
Adding 1 new dimension to iteration 2.
```

## Phase 4: SYNTHESIS

**What it does**: A streaming LLM call produces the final report.

**Why streaming?** Research reports can be long (2,000–5,000 words). Streaming means the user sees the report appearing in real time rather than waiting for a single large response.

**How**: The synthesis prompt receives:
- Original query
- All dimension summaries and key findings
- All source URLs (numbered for citation)

The LLM is instructed to:
1. Write a structured report with H2 headers per major theme
2. Cite sources inline using `[1]`, `[2]` notation
3. Include a concluding synthesis across dimensions
4. Not introduce claims that aren't supported by the provided summaries

**Why inline citations?** Synthesis LLMs are tempted to blend retrieved facts with training data. Requiring inline citations forces the model to attribute every claim — and makes it verifiable.

## Why in-memory state?

Research state lives in `globalThis.__researchStore`. This is intentional:

1. **Turbopack isolation**: Next.js dev mode hot-reloads modules, which would clear module-level globals. `globalThis` survives hot reloads.
2. **No persistence requirement**: Deep research results are meant to be read, then optionally ingested. They don't need to survive process restarts.
3. **Simplicity**: A database-backed job queue would require schema migrations, connection management, and cleanup jobs. In-memory is simpler for the current scale.

The tradeoff is that reports are lost if the server restarts. Users should download reports they want to keep.

## Pagination for gap-filling

On the second (gap-fill) iteration, primary web search uses `pageno: 2` — fetching the second page of results. This gives genuinely new sources because SearXNG deduplicates within a page but not across pages.

This is more reliable than rephrasing the query, which often returns the same top sources with slightly different ranking.
