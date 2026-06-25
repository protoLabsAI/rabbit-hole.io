# Search Agent Design

## Why a tool-calling agent instead of a single query?

The naïve approach to AI search is: send the user's query to an LLM with web results as context. This works for simple factual questions but breaks for anything that requires:

- **Multiple search strategies** — a question about Rust performance might need general web results, arXiv papers, and Reddit practitioner opinions
- **Iterative refinement** — an initial broad search may reveal that a more specific follow-up would yield better sources
- **Quality judgment** — the model should recognize when its sources are thin and search again rather than hallucinating

A tool-calling agent solves all three. The LLM decides which tools to call, in what order, and when it has enough to answer.

## Tool choice

The agent has three tools:

- **`searchWeb`** — calls the web search backend (Tavily, or self-hosted SearXNG) with a category hint. The agent picks the category based on query intent (`general`, `social media`, `it`, `science`).
- **`searchWikipedia`** — fetches a Wikipedia article. Useful for foundational definitions and historical context.
- **`askClarification`** — pauses the loop to ask the user a question. Intercepted by middleware before reaching the LLM.

The agent chooses which tools to call — no hard-coded pipeline. But the system prompt provides a preferred workflow:

1. Web search first (precise query)
2. Wikipedia for foundational context if needed
3. Web search again with a different angle if coverage is thin

## Why not search all tools in parallel?

Parallel search would be faster but wastes tokens and API calls. The agent's sequential tool use means it can read the first result and decide whether to go deeper, change angle, or stop. A shallow result from `searchWeb` might prompt a `social media` follow-up — that decision requires seeing the first result first.

## The step limit

The agent stops after 5 tool-call steps. This is a hard ceiling to prevent runaway loops and manage cost. The `LoopDetection` middleware provides a softer check: it warns the agent on the second repeated identical tool call and blocks the third.

5 steps is enough for:
- 1 web search
- 1 Wikipedia lookup
- 1–2 targeted follow-up searches
- Synthesis

## Middleware as behavioral policy

The middleware chain lets search behavior be configured independently of the LLM call. Each middleware hook is a policy:

- **`ResearchPlanner.beforeAgent`**: "for complex queries, plan before searching"
- **`ParallelDecomposition.beforeAgent`**: "decompose compound queries into focused sub-queries"
- **`Reflection.afterModel`**: "after each LLM response, check if sources are adequate"
- **`LoopDetection.wrapToolCall`**: "never repeat the exact same search twice"

This separation means you can add, remove, or tune policies without touching the core agent loop.

## Why web search the way we do it?

The web backend defaults to Tavily, with self-hosted SearXNG supported when `SEARXNG_ENDPOINT` is set. SearXNG aggregates multiple engines (Google, Brave, Reddit, GitHub, arXiv) under one API with a consistent JSON format and no per-query API fees or third-party data sharing.

The key insight is that different engines serve different information types. A technical question benefits from Stack Overflow and GitHub. A social question benefits from Reddit. The `categories` parameter routes to the right engine set without multiple API integrations.

## Cited answers

The agent is prompted to include inline citations in the format `[1]`, `[2]`. The `ChatMarkdown` component renders these as clickable badges that scroll to the matching source card in the side panel.

Citations are a trust mechanism — they let users verify claims and drill deeper into primary sources. An uncited claim from an LLM is an assertion; a cited claim is a pointer to evidence.
