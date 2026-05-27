---
"@protolabsai/rabbit-hole-cli": minor
---

Initial release: `rh` CLI with `search`, `research`, `ingest`, `status` commands. Stateless wrapper over Tavily + the LiteLLM gateway + the job-processor HTTP API. Designed to be COPY'd into fleet agent images so agents shell out for media work instead of holding a long-lived MCP session.
