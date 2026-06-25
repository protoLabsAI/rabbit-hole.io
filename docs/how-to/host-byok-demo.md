# Host a public BYOK demo (Cloudflare Tunnel)

This is how `demo.rabbit-hole.io` is run, and how you can stand up your own
public, pokeable demo at roughly zero marginal cost.

The trick: visitors **bring their own LLM key** (BYOK), so they pay for
inference. Web search stays server-side on your own SearXNG (free). The app
runs on a homelab box and is exposed through a Cloudflare Tunnel — no open
ports, no public IP. This is a demo of the self-host pattern, not a hosted SaaS.

## How it works

```
visitor ──HTTPS──> Cloudflare edge ──tunnel (outbound only)──> rabbit-hole:3399
   │                                                              (your LAN)
   └─ pastes their own LLM key in the UI (x-llm-api-key, localStorage only)
```

- The visitor's key lives in their browser's localStorage and rides on each
  chat request as the `x-llm-api-key` header. It is never sent to or stored by
  the server — see `useByokKey`.
- With no server LLM key configured, every request must carry a visitor key, so
  the demo can't run up your bill.
- A per-IP rate limit (opt-in) throttles abuse, keyed on Cloudflare's
  `cf-connecting-ip`.

## Prerequisites

- The self-host stack running on a homelab box: `docker compose up` brings up
  Postgres, object storage, the job processor, and the app on `:3399`
  (network `rh`).
- A SearXNG endpoint for free server-side web search (set `SEARXNG_ENDPOINT`).
- A Cloudflare account with the `rabbit-hole.io` zone (or your own domain).

## 1. Create the tunnel

In the Cloudflare dashboard:

1. **Zero Trust → Networks → Tunnels → Create a tunnel** (type: Cloudflared).
2. Name it (e.g. `rabbit-hole-demo`) and **copy the tunnel token**.
3. Under **Public Hostnames**, add a hostname:
   - **Subdomain**: `demo`, **Domain**: `rabbit-hole.io`
   - **Service**: `HTTP` → `http://rabbit-hole:3399`

   The service URL is the container name on the `rh` network — not the host's
   `:3399` mapping. Cloudflare creates the `demo.rabbit-hole.io` DNS record for
   you.

## 2. Configure env

In `.env` on the homelab box:

```bash
# The tunnel token from step 1
CLOUDFLARE_TUNNEL_TOKEN=eyJ...

# Free server-side web search
SEARXNG_ENDPOINT=http://searxng:8080

# Strict BYOK: do NOT set a server LLM key — force every request to bring one.
# (leave ANTHROPIC_API_KEY / gateway key unset)

# Throttle public traffic
RH_RATE_LIMIT_ENABLED=true
RH_RATE_LIMIT_MAX=30
RH_RATE_LIMIT_WINDOW_S=300
```

## 3. Bring it up

The tunnel ships as a compose overlay (`docker-compose.tunnel.yml`) that adds a
`cloudflared` connector to the base stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d
```

Check the connector registered:

```bash
docker compose logs -f cloudflared   # look for "Registered tunnel connection"
```

Then open `https://demo.rabbit-hole.io`. The first chat prompts for a key — the
visitor pastes their own (the **Key** button, stored in their browser only).

## 4. Verify

```bash
# Without a key → 400, the route refuses (strict BYOK)
curl -s https://demo.rabbit-hole.io/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}]}'

# With a key → streams a response (the visitor pays for inference)
curl -s https://demo.rabbit-hole.io/api/chat \
  -H 'content-type: application/json' \
  -H 'x-llm-api-key: sk-...' \
  -d '{"messages":[{"role":"user","content":"hi"}]}'
```

`/v1/chat/completions` works the same way with `Authorization: Bearer <key>`.

## Cost

| Cost | Who pays |
|---|---|
| LLM inference (the expensive part) | the visitor (their key) |
| Web search | you — server-side SearXNG, ~free |
| App compute / storage | you — idle homelab, ~electricity |
| TLS / bandwidth / DDoS | Cloudflare free tier |

There is no cheap way to host *free* search for everyone — every query is paid
inference. BYOK is the only model that scales to public traffic at ~$0/query.
