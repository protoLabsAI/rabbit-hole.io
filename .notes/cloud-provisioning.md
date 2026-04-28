# Cloud auto-provisioning decision — Coolify-on-Hetzner vs Fly.io Machines

**Last updated**: 2026-04-28
**Context**: deciding how to spin up cloud instances for paying users when the homelab fills up.

## TL;DR

For our scale and the user's existing skill set, **Coolify on Hetzner CX22 boxes** wins. Fly Machines is the cleaner per-tenant story but adds a new operational paradigm; we don't need it yet.

Recommendation: start with Coolify on a single $4/mo Hetzner box; add boxes by hand on demand; keep the Fly path in our back pocket if we hit the per-tenant-isolation requirement later.

## Pricing snapshot (April 2026)

### Hetzner Cloud (apr 2026 prices, shared vCPU)
| Plan | vCPU | RAM | Disk | Traffic | $/mo |
|---|---|---|---|---|---|
| CX22 | 2 | 4 GB | 40 GB | 20 TB | ~$4.20 |
| CX32 | 4 | 8 GB | 80 GB | 20 TB | ~$7.55 |
| CX42 | 8 | 16 GB | 160 GB | 20 TB | ~$18 |
| CX52 | 16 | 32 GB | 320 GB | 20 TB | ~$36 |

(`hcloud` CLI provisions in 30–90s. EU + US regions.)

### Fly.io Machines (per second, scale-to-zero)
| Preset | vCPU | RAM | $/sec | $/mo always-on | $/mo idle (auto-stop) |
|---|---|---|---|---|---|
| shared-cpu-1x | 1 | 256 MB | $0.00000075 | ~$2.32 | <$1 (rootfs only) |
| shared-cpu-1x@1GB | 1 | 1 GB | + ~$5/mo extra RAM | ~$7 | ~$1 |
| shared-cpu-2x@2GB | 2 | 2 GB | | ~$15 | ~$2 |

(Cold start: seconds. Auto-stop bills only rootfs at $0.15/GB/30d when idle.)

### Coolify (self-hosted Heroku-like)
- Free, OSS. Adds a control plane on top of any Linux box.
- Same docker-compose definition deploys to homelab + cloud.
- Built-in Git deploys, auto-SSL via Let's Encrypt, tunnels.

## Decision matrix

| Concern | Coolify on Hetzner | Fly.io Machines |
|---|---|---|
| Cost for 1 tenant always-on | ~$4 | ~$7 |
| Cost for 100 mostly-idle tenants | hard — need to pack many on one box | $100/mo if idle ($1 × 100), $700/mo if all active |
| Cost for 100 always-on tenants | ~$400 (CX42 box runs ~10 stacks at $4/tenant) | ~$700 |
| Tenant isolation | Process-level (one box, many users) | Per-tenant VM |
| Provisioning latency | 1–2 min | seconds |
| Skill match (you already use Coolify-style at home) | ✓ | New paradigm |
| API automation | `hcloud` CLI + Coolify API | `flyctl` + machines API |
| Failover / multi-region | manual / DNS | built-in |
| Stripe-webhook → instance flow | ~150 lines bash + hcloud | ~100 lines TS + flyctl |

## When to switch from one to the other

Use **Coolify on Hetzner** when:
- Most users want a shared-tenant experience (free or low-margin tier).
- You want one stack everywhere (homelab + cloud identical).
- Provisioning latency is fine (1–2 min on signup is OK).
- You have <100 paying users each generating predictable load.

Switch to **Fly Machines** when:
- Per-tenant isolation becomes a hard requirement (compliance, noisy-neighbor, BYOK that needs to never leak between users).
- Most paying users are bursty and idle 23/24 hours — auto-stop makes the per-tenant cost actually cheaper than packing on Hetzner.
- Multi-region matters (your users are distributed).
- You hit a Hetzner box ceiling (~10 paying tenants on a CX42 before you're degrading SLA).

## Concrete near-term plan

1. **Now**: homelab through Cloudflare tunnel runs free + paid hosted users. ~$0 marginal.
2. **First overflow**: rent a CX22 (~$4/mo), install Coolify, point a second tunnel through Cloudflare. Capacity: ~5 paying tenants. Total cost: $4/mo.
3. **Stripe webhook → provisioner**: when MRR justifies it. Probably ~$200/mo MRR (~7 paid lifetime users at $30 each over a year). Script:
   ```
   stripe.com/v1/webhooks → service POST /provision { customerId }
     → hcloud server create --type cx22 ...
     → ssh + provision.sh (clone repo, install Coolify, cert, DNS)
     → cloudflare API: create CNAME customer.app
     → email customer with their URL
   ```
   ~200 LoC TypeScript; doable in a day once accounts are set.
4. **Defer Fly migration** until you need either (a) sub-second cold start for some auto-resume feature, or (b) per-tenant strict isolation.

## What to learn next

- `hcloud` CLI basics: create / destroy / inspect, image cloning for fast spinup
- Coolify API: read deployment status, trigger redeploys
- Cloudflare Tunnels: dynamic CNAME registration via API
- One-shot bash `cloud-init` script that bootstraps Coolify + your stack from a fresh CX22 — keep it under 100 lines

(Phase 4 of the launch plan covers actually building the provisioner. This doc just sets the direction.)

## Sources
- [Hetzner Cloud price update April 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Hetzner CX22 specs (Spare Cores)](https://sparecores.com/server/hcloud/cx22)
- [Fly.io Resource Pricing](https://fly.io/docs/about/pricing/)
- [Fly.io Cost Management — auto-stop](https://fly.io/docs/about/cost-management/)
