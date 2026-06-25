# BYOK live demo — homelab + Cloudflare Tunnel

> Goal: a **public, pokeable demo** of rabbit-hole.io at ~**zero marginal cost**.
> Visitors bring their own LLM key (BYOK), so *they* pay for inference. We run
> the (mostly-idle) app shell on the homelab and expose it through a Cloudflare
> Tunnel. This is a demo of the **self-host pattern** — not a hosted SaaS.

## TL;DR economics

| Cost | Who pays |
|---|---|
| LLM inference (the expensive part) | the visitor (their key) |
| Web search | **us, but ~free** — server-side SearXNG (self-hosted), not Tavily |
| Postgres / MinIO / app compute | us — idle homelab, ≈ electricity |
| TLS / bandwidth / DDoS | Cloudflare (free tier) |

There is **no cheap way to host *free* search for everyone** (every query is paid
inference). BYOK is the only model that scales to public traffic at ~$0/query.

## What exists today

| Piece | State |
|---|---|
| Self-host stack (`docker-compose.yml`: postgres, postgres-jobs, minio, job-processor, **rabbit-hole** on `:3399`, network `rh`) | ✅ ready |
| `apps/rabbit-hole/Dockerfile`, `.env.example`, README quickstart | ✅ ready |
| **CLI BYOK** (`rh search --key …` / `RH_LLM_KEY`) | ✅ full |
| **Web `/api/chat` BYOK** | ❌ hardcoded to `getAIModel("smart")` (server env) |
| **`/v1/chat/completions` BYOK** | 🟡 reads `Authorization` header but ignores it |
| Server SearXNG (free web search) | ✅ supported via `SEARXNG_ENDPOINT` |
| Rate limiting | ❌ placeholder headers only (`middleware.ts`), no enforcement |
| Cloudflare tunnel | ❌ not configured (scaffolded here: `docker-compose.tunnel.yml`) |

**So the demo needs: a small BYOK code change + a light rate-limit + the tunnel
(ops).** Search stays server-side on SearXNG, so the visitor pastes **one** thing:
their LLM key.

---

## Work plan

### 1. BYOK for the web app  (~half day)  — the only real code

Let a request carry its own LLM credentials; fall back to server env when absent
(so local self-host keeps working unchanged).

**a. Request-scoped provider** — new helper in `@protolabsai/llm-providers/server`:

```ts
// getAIModelForRequest(headers, tier)
//   reads x-llm-api-key / x-llm-base-url / x-llm-model from the request.
//   present  → build a NEW provider for this request (createAnthropic({apiKey})
//              or createOpenAICompatible({ baseURL, apiKey }))  — NOT cached.
//   absent   → fall back to getAIModel(tier)  (existing env-based, cached).
// Never log or persist the key; redact it from Langfuse metadata.
```

**b. Use it in the two routes** — replace the hardcoded factory:
- `app/api/chat/route.ts`: `getAIModel("smart")` → `getAIModelForRequest(req.headers, "smart")`
- `app/v1/chat/completions/route.ts`: same (this also finally honors the
  `Authorization: Bearer` the route already documents).

**c. Key-paste UI** — small client component:
- Stores the key in `localStorage` (never sent to our DB).
- Adds it as `x-llm-api-key` on the `useChat` transport's requests (the AI SDK
  `DefaultChatTransport` supports per-request headers).
- Banner when no key is set: "Bring your own key to try the live demo →".

**Security:** keys travel only over TLS (Cloudflare), are never written to
Postgres/logs/traces, and live only in the visitor's browser. Add a redaction
guard so a key can't leak into Langfuse or error output.

### 2. Abuse guard  (~1–2 h)

Even with BYOK inference, the app shell + SearXNG can be hammered. Add a simple
**IP rate-limit in `middleware.ts`** on `/api/chat` + `/v1/*` (e.g. 20 req / 5 min
/ IP). In-memory is fine for a single homelab container; swap to Postgres only if
we scale out. No auth/Clerk needed for the demo.

### 3. Cloudflare Tunnel  (~30 min ops — needs your CF account)

Scaffolded in **`docker-compose.tunnel.yml`** (a `cloudflared` connector on the
`rh` network). Steps:

1. Cloudflare **Zero Trust → Networks → Tunnels → Create tunnel** → copy the token.
2. Add a **public hostname** → `demo.rabbit-hole.io` → service `http://rabbit-hole:3399`.
3. `.env`: `CLOUDFLARE_TUNNEL_TOKEN=…`
4. Launch:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d
   ```
5. (DNS for `demo.rabbit-hole.io` is auto-created by the tunnel hostname step if
   the domain is on Cloudflare.)

No app code touches the tunnel — it's transparent. Cloudflare also gives free
TLS + basic DDoS protection, and you can layer **Zero Trust / Turnstile** in front
of the hostname later if abuse appears.

### 4. Demo `.env` for the homelab

- `SEARXNG_ENDPOINT=…`  (free web search — recommended for the demo)
- `NEXT_PUBLIC_BASE_URL=https://demo.rabbit-hole.io`
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` → can be **left empty**: with BYOK wired,
  no-key visitors are prompted to paste their own; a server key only powers a
  fallback if you choose to allow one.

---

## Effort & order

1. **Tunnel up first** (30 min) — proves the homelab is publicly reachable with the
   stack exactly as-is (server-key mode, no public sharing yet).
2. **BYOK code** (half day) — the gating feature for a *public* demo.
3. **Rate-limit** (1–2 h) — before announcing it.
4. Optional later: Turnstile/Zero-Trust gate, Postgres rate-limit, a "/demo"
   landing explaining BYOK.

**Net:** ~1 focused day of code + ~30 min ops, no new paid services.

## Open decisions for you
- Demo hostname: `demo.rabbit-hole.io`? (assumed)
- Allow a server-key fallback (we eat cost for keyless visitors, capped) or
  **strictly BYOK** (keyless = read-only / prompted)? Strict BYOK = truly $0/query.
- Want me to build step 1 (BYOK code) as the next PR?
