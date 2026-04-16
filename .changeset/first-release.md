---
"@proto/agent": minor
---

First tagged release of the rabbit-hole.io researcher agent as a proper A2A endpoint.

The `@proto/agent` package ships a spec-compliant A2A server per the protoWorkstacean [build-an-a2a-agent](https://protolabsai.github.io/protoWorkstacean/guides/build-an-a2a-agent/) guide: all 10 mandatory JSON-RPC methods on `/a2a`, SSE streaming with `kind` discriminators and the terminal 2-event sequence, atomic cancel, TTL eviction, SSRF-guarded webhooks with an allowlist for internal workstacean hostnames, and X-API-Key auth enforcement gated on `RESEARCHER_API_KEY`.

The agent image is now published to `ghcr.io/protolabsai/rabbit-hole/agent` with the A2A discovery labels (`a2a.protoworkstacean/agent=true`, `name=researcher`, `version=<tag>`) so the fleet's `SkillBrokerPlugin` can enumerate the container from metadata alone. Skill producers for `search` and `deep_research` are currently echo stubs; real integrations will replace them in follow-up releases using the same `ctx.pushText/finish/fail` contract.
