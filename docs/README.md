# Documentation

Technical documentation for **rabbit-hole.io** — a self-hostable AI search engine over the open web and your own files.

These docs follow [Diátaxis](https://diataxis.fr): four modes (below), with pages grouped by domain (Search · Deep research · Ingestion & search backends · Operate & self-host) within each.

## Product Vision

1. **Search Engine** (NOW) — Perplexity-style AI search at `/` over the web (Tavily/SearXNG) + your ingested corpus (pgvector). BYOK, self-hostable.
2. **Research workspace** (COMING BACK) — gated behind `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS` while it's rebuilt.
3. **Research App** (FUTURE) — Downloadable Tauri/Electron app. Self-hostable local search engine.

## Start here

| Mode | When to reach for it |
|------|----------------------|
| [Tutorials](./tutorials/) | Learning-oriented — run your first search and first deep research with us |
| [How-to](./how-to/) | Task-oriented — recipes: search categories, deep-research modes, configure SearXNG |
| [Reference](./reference/) | Information-oriented — Chat/Deep-Research APIs, search functions, middleware, SearXNG, migrations |
| [Explanation](./explanation/) | Understanding-oriented — search agent design, architecture, the deep-research pipeline |

## Live API surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Agentic search — AI SDK `streamText` with tools (BYOK via `x-llm-api-key`) |
| `/api/research/deep` | POST | Start deep research job (gated behind `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS`) |
| `/api/research/deep/:id` | GET | SSE stream for research progress (gated) |
| `/api/research/deep/:id` | DELETE | Cancel a running research job (gated) |
| `/api/research/deep/:id/status` | GET | Polling fallback for research status (gated) |
| `/v1/chat/completions` | POST | OpenAI-compatible endpoint (BYOK via `Authorization: Bearer`) |
