# Per-query LLM cost model — search agent

**Last updated**: 2026-04-28
**Stack assumed**: Phase 0 launch stack (search-only, no graph).

## Models in use

| Role | Model | Input $/1M | Output $/1M | Where called |
|---|---|---|---|---|
| Main agent (`smart`) | Claude Sonnet 4.6 | $3.00 | $15.00 | `streamText` in `/api/chat/route.ts:174` |
| Middleware (`fast`) | Claude Haiku 4.5 | $0.80 | $4.00 | `research-planner.ts`, `reflection.ts` |

(Defaults from `packages/llm-providers/config/llm-providers.config.json`. Anthropic pricing per their Apr 2026 published rates.)

## Token accounting per query

### Main agent loop (Sonnet)

Measured prompt sizes:
- System prompt: ~2,200 input tokens (`route.ts` SYSTEM_PROMPT, 8.9KB)
- User query: ~50 tokens (typical)
- `searchWeb` result: ~500 tokens × N calls
- `searchWikipedia` result: ~1,000 tokens × N calls

Typical 4-step run (web → wiki → web again → final synthesis):

| Step | Input | Output | Cost |
|---|---|---|---|
| 1 — choose tool | 2,250 | 100 | $0.0083 |
| 2 — choose tool, web result in context | 2,750 | 100 | $0.0098 |
| 3 — wiki result in context | 3,750 | 100 | $0.0128 |
| 4 — synthesize | 4,250 | 1,500 | $0.0353 |
| **Sonnet subtotal** | | | **~$0.066** |

7-step run (`stopWhen: stepCountIs(7)` is the worst case): roughly 1.7× this → **~$0.11**.

### Middleware (Haiku)

| Middleware | Calls/req | Input | Output | Cost |
|---|---|---|---|---|
| ResearchPlanner | 1 | 500 | 300 | $0.0016 |
| Reflection (per step) | 4 (typical) | 1,500 | 200 | $0.0080 |
| ParallelDecomp | 0 | — | — | $0 |
| Clarification, LoopDetect, DeferredTools | 0 (no LLM) | — | — | $0 |
| **Haiku subtotal** | | | | **~$0.010** |

## Per-query totals

| Query type | Cost |
|---|---|
| Typical (4-step) | **~$0.075** |
| Worst case (7-step + heavier reflection) | **~$0.18** |
| BYOK (we just route — no LLM cost on us) | ~$0 |

## Pricing implications

### Free-tier rate limit
At ~$0.08/query we cannot afford to give anonymous users many. Budget signals:
- 5 queries/day per IP × 1,000 free users × 30 days = 150,000 queries × $0.08 = **$12,000/mo** (uncomfortable)
- 5 queries/day per IP × 1,000 free users with **ad revenue offset** at ~$3 CPM (Carbon Ads) = $15K queries × ($3/1000) ≈ $45 ad revenue. Doesn't cover the LLM bill.

Conclusion: **free tier without BYOK doesn't break even on ads alone at any reasonable rate limit**.

### Sustainable models
1. **BYOK as the default free experience** — users plug in their own Anthropic key. Our cost: ~$0 per query. Charge $X for the convenience layer (UI + multi-protocol surface + hosted reliability).
2. **$30 lifetime "remove ads" + low cap** — say 10 queries/month with our key, unlimited with BYOK. $30 amortized over a year of 10/mo = $0.25/query revenue vs $0.08 cost = 3× margin. Workable, but volume is everything.
3. **Self-host as the 3rd path** — most users go here. Their compute, their LLM key, their problem. Our cost: $0.

### Lifetime-pricing sanity check
- $30 lifetime with 1,000 customers = $30,000 one-time revenue.
- If average lifetime usage is 100 queries: $30 / 100 = $0.30/query revenue, 3.7× over cost ✓
- If average lifetime usage is 1,000 queries: $30 / 1000 = $0.03/query revenue, **0.4× over cost — losing money**.

To make $30 lifetime work, must either:
- Cap "with our key" usage hard (e.g. 100 queries/year), OR
- Push power users to BYOK (the $30 then pays for the UI/ads-removal, not the LLM).

## Levers to lower cost

- **Cap step count to 4** instead of 7 — saves ~40% on worst-case but rarely matters in practice.
- **Drop the system prompt** by 30% — already lean post-Phase-0; pruning further hurts citation quality.
- **Switch reflection to off** by default — saves ~$0.008/query (~10%). Reflection is most valuable on long queries.
- **Use Haiku as `smart`** for non-paying users — cuts main-agent cost ~5×. Quality drops but is workable for free tier.
- **Tavily-or-Brave for web search** instead of SearXNG self-host — adds $0.001/query but better results, smaller token spend (less re-querying).

## Recommended pricing for launch

- **Self-host**: free, MIT-licensed.
- **BYOK on hosted**: free with an account, no ad. (Revenue: $0. Cost: $0. Goal: distribution.)
- **Free hosted with our key**: 5 queries/day cap, ads, Haiku-only ("smart" downgraded to fast). Cost ~$0.015/query × 150 q/mo = $2.25/user/mo before ad revenue.
- **$30 lifetime "Pro"**: removes ads, switches to Sonnet, 100 queries/month cap. Cost ~$0.075 × 100 = $7.50/user/mo. Pays for itself after ~4 months.

All numbers approximate — **track actual token usage from Langfuse for the first 100 real queries before locking pricing.**
