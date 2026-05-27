# Rabbit Hole — Project Status

> Last updated: 2026-04-28

## Direction

Single product line: **AI search you can self-host**. Web + Wikipedia + your files, with a multi-protocol API and BYOK as the default free experience. Distribution-first; the hosted version is a small demo/paid tier on the homelab through Cloudflare.

The graph / atlas / research workspace is being rebuilt; gated out of production via `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS=true` while it's not part of the launch surface. See [handoff 003](./handoffs/003-launch-stack-rescope.md) for the rescope.

## Launch surface — feature status

### Search agent (`/api/chat`, `/v1/chat/completions`, A2A `search`, MCP `web_search`)

| Feature | Status | Notes |
|---|---|---|
| AI SDK v6 agentic search (`streamText` + tools) | ✅ | Stripped of graph/community tools |
| SearXNG web search (when `SEARXNG_ENDPOINT` set) | ✅ | Falls back to wiki-only without it |
| Wikipedia article fetch | ✅ | |
| `askClarification` tool | ✅ | Intercepted by ClarificationMiddleware |
| Middleware pipeline (Planner / LoopDetect / Reflection / ParallelDecomp) | ✅ | EntityMemory + StructuredExtraction disabled |
| Session persistence (localStorage + URL sync) | ✅ | inherited from prior version |
| File attachments | ⏳ | UI present; full happy-path through job-processor not retested on launch stack |
| Citations + RELATED_SEARCHES block in responses | ✅ | system prompt enforces |

### Distribution surfaces

| Surface | Status | Notes |
|---|---|---|
| Web UI (`/`) | ✅ shipping | |
| OpenAI-compat REST (`/v1/chat/completions`) | ✅ | streaming + non-streaming, usage tokens reported. No auth yet. |
| MCP server (web/wiki/tavily + media tools) | ✅ trimmed | dropped 6 graph-bound tools, 1808→586 lines |
| A2A skill (`search`, `ingest_url`) | ✅ trimmed | searchProducer rewired through `/v1/chat/completions` |
| CLI (`npx rabbit-hole`) | ⏸ deferred | will wrap REST once auth lands |

### Self-host stack

| Service | Status | Notes |
|---|---|---|
| `docker-compose.yml` (canonical lean stack) | ✅ | 6 services: postgres, postgres-jobs, minio, minio-init, job-processor, rabbit-hole |
| `.env.example` | ✅ | required + recommended + optional sections |
| `/api/health` | ✅ | rebuilt for launch stack — postgres + minio + job-processor |
| README quickstart | ✅ | rewritten for self-host pitch |
| One-line install (`npx create-rabbit-hole`) | ⏸ | not started |
| Self-host docs site | ⏸ | VitePress wiring exists; content not written |

### Hosted launch (Phase 2 — BLOCKED on accounts)

| Item | Status | Blocker |
|---|---|---|
| Clerk magic-link auth | ⏸ | needs Clerk app keys |
| Postgres-backed rate limiter | ⏸ | depends on auth |
| Stripe one-time "Lifetime Pro" SKU | ⏸ | needs Stripe price ID + webhook secret |
| Carbon Ads embed | ⏸ | needs Carbon approval + snippet |
| Cloudflare tunnel from homelab | ⏸ | needs Cloudflare account on the domain |
| Public domain pointing at homelab | ⏸ | depends on tunnel |

### Auto-provisioning (Phase 4)

| Item | Status | Notes |
|---|---|---|
| Decision: Coolify on Hetzner | ✅ | see [`.notes/cloud-provisioning.md`](./.notes/cloud-provisioning.md) |
| Provisioner (Stripe webhook → `hcloud` → DNS) | ⏸ | defer until paying users justify it (~$200 MRR) |

## Open PRs

| # | Title | Status |
|---|---|---|
| [#272](https://github.com/protoLabsAI/rabbit-hole.io/pull/272) | gate `/research` and `/atlas` behind dev flag | open, awaiting CI |
| [#273](https://github.com/protoLabsAI/rabbit-hole.io/pull/273) | search-only stack — Phase 0 + 1 + 3 (no CLI) | open, awaiting CI |

## Released images (GHCR `:0.4.0` + `:latest`)

| Image | Notes |
|---|---|
| `ghcr.io/protolabsai/rabbit-hole/rabbit-hole` | 724 MB after Dockerfile.fast standalone build (was 7.27 GB) |
| `ghcr.io/protolabsai/rabbit-hole/agent` | 2.71 GB, node:22-alpine after node:25 corepack regression revert |
| `ghcr.io/protolabsai/rabbit-hole/job-processor` | 3.06 GB |

CI Docker Build workflow has been failing since v0.2.0 (GHCR perms issue intermittently); current `:latest` tags were pushed by hand. Phase 4 cleanup item: get CI Docker Build working again so we don't keep manually pushing.

## What's next

1. **Now**: end-to-end test of the launch stack — search query, file upload, OpenAI client compatibility, A2A skill, MCP tools.
2. **After tests pass**: triage anything broken, commit fixes.
3. **When you have accounts ready**: Phase 2 (hosted launch).
4. **Whenever**: CLI (Phase 3 remainder), provisioner (Phase 4), repo cleanup of dead `/research`/`/atlas` code.

## Reference docs (this session)

- [`handoffs/003-launch-stack-rescope.md`](./handoffs/003-launch-stack-rescope.md) — what landed, what's left
- [`.notes/cost-model.md`](./.notes/cost-model.md) — per-query LLM cost model + pricing implications
- [`.notes/cloud-provisioning.md`](./.notes/cloud-provisioning.md) — Coolify-on-Hetzner vs Fly Machines decision
