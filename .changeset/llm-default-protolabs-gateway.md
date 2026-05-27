---
"@protolabsai/llm-providers": minor
---

Default the LLM provider to the protoLabs gateway. Adds a `protolabs` OpenAI-compatible provider (base URL `http://gateway:4000/v1`, overridable via `PROTOLABS_BASE_URL`/`OPENAI_BASE_URL`; key via `PROTOLABS_API_KEY`) whose categories route through the gateway tiers — `fast → protolabs/fast`, `smart → protolabs/smart`, `reasoning → protolabs/reasoning` (vision/coding → smart, long → reasoning). Sets `defaultProvider: "protolabs"`. Other providers remain available as fallback. No per-provider API keys needed by default — the gateway holds upstream credentials.
