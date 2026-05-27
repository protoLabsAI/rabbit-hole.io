---
"@protolabsai/rabbit-hole-cli": patch
---

fix(search): retry SearXNG once on an empty result, then fall back to Tavily. SearXNG occasionally returns HTTP 200 with zero results when its upstream engines time out/rate-limit on a query; previously that surfaced as `rh search` returning no hits (and `rh research` losing a sub-query). Now a transient empty triggers a single retry, then a Tavily fallback when a key is configured. (#318)
