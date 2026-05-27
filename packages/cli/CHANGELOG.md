# @protolabsai/rabbit-hole-cli

## 0.1.1

### Patch Changes

- ff4eb5e: fix(search): retry SearXNG once on an empty result, then fall back to Tavily. SearXNG occasionally returns HTTP 200 with zero results when its upstream engines time out/rate-limit on a query; previously that surfaced as `rh search` returning no hits (and `rh research` losing a sub-query). Now a transient empty triggers a single retry, then a Tavily fallback when a key is configured. (#318)

## 0.1.0

### Minor Changes

- e6fd584: Initial release: `rh` CLI with `search`, `research`, `ingest`, `status` commands. Stateless wrapper over Tavily + the LiteLLM gateway + the job-processor HTTP API. Designed to be COPY'd into fleet agent images so agents shell out for media work instead of holding a long-lived MCP session.
