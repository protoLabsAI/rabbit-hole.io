# Handoff 003 — Launch-Stack Rescope (search-only, distribution-first)

**Date:** 2026-04-28
**Branch:** `chore/launch-stack` → PR [#273](https://github.com/protoLabsAI/rabbit-hole.io/pull/273)
**Companion PR:** [#272](https://github.com/protoLabsAI/rabbit-hole.io/pull/272) (route gate)

## Direction Change

Prior product was a graph-centric research platform (Atlas + Research workspace, Neo4j-backed, multiplayer). The new direction is:

1. **Self-host first** — most users get the docker-compose, run their own instance, BYOK.
2. **Search-only launch surface** — no graph, no atlas, no research workspace. Just the Perplexity-style web search agent + file/media ingestion via the job processor.
3. **Multi-protocol distribution** — same agent exposed over Web UI, OpenAI-compat API, MCP, A2A. (CLI deferred.)
4. **Hosted = small demo on homelab** through Cloudflare tunnel; spin up cloud capacity on demand once paid users justify it.

Everything in `/research`, `/atlas`, `/evidence`, `/timeline` (and their `/api/*` siblings) is gated out of production via `NEXT_PUBLIC_ENABLE_RESEARCH_ATLAS=true` while the new flow is being built.

## What landed in PR #273

### Phase 0 — strip graph

| Change | File |
|---|---|
| Drop `searchGraph`, `searchCommunities` tools | `apps/rabbit-hole/app/api/chat/route.ts` |
| Drop auto-ingest path (preview, bundle builder, ingest POST) | same |
| Drop `EntityMemory` + `StructuredExtraction` middleware from default registry | `app/lib/middleware-config.ts` |
| Update SYSTEM_PROMPT — workflow no longer mentions graph/communities | `app/lib/agent.ts` |
| New canonical `docker-compose.yml` (6 services, no Neo4j/Qdrant) | repo root |
| New `.env.example` for self-host | repo root |

### Phase 1 — self-host polish

| Change | File |
|---|---|
| Rewritten README — search engine pitch, BYOK, quickstart, roadmap | `README.md` |
| Lean health endpoint — pings Postgres + MinIO + JobProcessor only | `apps/rabbit-hole/app/api/health/route.ts` |

### Phase 3 — distribution surface (CLI deferred)

| Change | File |
|---|---|
| `/v1/chat/completions` OpenAI-compatible endpoint (streaming + non-streaming) | `apps/rabbit-hole/app/v1/chat/completions/route.ts` |
| Factor shared search-tool defs + system prompt | `apps/rabbit-hole/app/lib/agent.ts` |
| MCP server trimmed: drop 6 graph-bound tools, 1808 → 586 lines | `packages/mcp-server/src/handler.ts` + `tools/research-tools.ts` |
| A2A `searchProducer` rewired to call `/v1/chat/completions` | `agent/src/a2a/skills/search-producer.ts` |
| A2A skills trimmed: drop `deep_research` and `kg_facts` | `agent/src/a2a-main.ts` + `card.ts` |
| Skill files for dropped producers deleted (471 lines) | `agent/src/a2a/skills/{deep-research,kg-facts}-producer.ts` |

### Research notes

- [`.notes/cost-model.md`](../.notes/cost-model.md) — per-query LLM cost ~$0.08; $30 lifetime tier needs caps or BYOK push to break even.
- [`.notes/cloud-provisioning.md`](../.notes/cloud-provisioning.md) — Coolify on Hetzner CX22 (~$4/mo) recommended over Fly.io for near-term overflow.

## Verified tonight

- [x] `tsc --noEmit --skipLibCheck` clean across `apps/rabbit-hole`, `packages/mcp-server`, `agent`
- [x] `pnpm run lint:check` clean
- [x] `/api/health` returns 200 with all services healthy in dev
- [x] `/api/chat` streams `data:` events end-to-end on a "hello" prompt
- [x] `/v1/chat/completions` non-streaming returns OpenAI-shaped JSON with usage tokens
- [x] `/v1/chat/completions` streaming emits well-formed chunks ending in `data: [DONE]`
- [x] `docker compose -f docker-compose.yml --env-file .env.example config` validates
- [x] A2A rpc-lifecycle test passes (3/3) with new 2-skill card

**Not yet verified:**
- End-to-end real query (web search + Wikipedia + synthesis) on the new launch stack — needs SearXNG endpoint and a real LLM key in `.env`.
- File/media upload happy path through the job-processor.
- Multi-step search with reflection middleware doing what it should.
- `docker compose up -d` from a clean machine actually pulls and runs.

This is what we're picking up next: **app functionality testing**.

## Remaining work for public launch

### Phase 2 — hosted-on-homelab launch surface (BLOCKED on you)

These need accounts created on your end before code can be written:

| Item | What I need from you |
|---|---|
| Clerk magic-link auth | App publishable + secret key (`pk_live_...`, `sk_live_...`); allowed callback URLs |
| Stripe "Lifetime Pro" SKU | Price ID + webhook signing secret; price point ($30 default) |
| Carbon Ads slot | Approval (apply at https://www.carbonads.net/), then the embed snippet |
| Cloudflare tunnel | Cloudflare account on the public domain; tunnel pointing at your homelab |

Once those are in hand: ~3–5 days of code to wire them all together with a Postgres-backed rate-limiter.

### Phase 3 — remaining

| Item | Notes |
|---|---|
| CLI (`npx rabbit-hole`) | Deferred per your call. Trivial — wraps `/v1/chat/completions` once auth is in place. |

### Phase 4 — auto-provisioning prototype

Defer until paid users justify it. ~$200/mo MRR threshold. Stripe webhook → `hcloud` API → DNS update; ~200 lines TS.

### Cleanup not done tonight

- `app/lib/search.ts` still exports `searchGraph` / `searchCommunities` (now unused). Safe to leave; pruning later.
- `docker-compose.research.yml` still exists for the full research-stack dev experience. We can delete it once the research workspace is rebuilt or formally archived.
- `packages/research-middleware/src/middleware/{entity-memory,structured-extraction}.ts` still in repo but disabled. Could be deleted, or kept around for future graph mode.
- `apps/rabbit-hole/app/api/research/*`, `app/api/atlas/*`, etc. — currently 404'd by middleware in prod, but the code is still on disk and contributes to bundle size. Real cleanup deferred until the research/atlas rewrite begins.

## Cost & pricing summary (numbers from `.notes/cost-model.md`)

- Typical per-query cost (4-step agent run, Claude Sonnet 4.6): **~$0.08**
- Worst-case (7-step + heavy reflection): **~$0.18**
- BYOK has zero cost on us — distribute aggressively
- Free tier with our key only breaks even **with caps** (5 queries/day per IP) **and** ad revenue
- $30 lifetime requires usage caps OR a heavy push to BYOK on power users

## Where to pick up

1. Run the new `docker compose -f docker-compose.yml up -d` cleanly on a fresh state and confirm the search agent works end-to-end with a real LLM key.
2. Real query in the UI — does web + wiki + synthesis still produce well-cited answers without the graph?
3. File upload happy path — drop a PDF, confirm it gets transcribed and the agent uses it as context.
4. Test the OpenAI-compat endpoint with an actual `openai` SDK client (the spec compatibility we wrote should make `from openai import OpenAI; OpenAI(base_url="...").chat.completions.create(...)` Just Work).
5. Then either: start Phase 2 if Clerk/Stripe/Carbon/Cloudflare accounts are ready, or work on whatever the testing surfaces.
