---
layout: home
hero:
  name: Rabbit Hole
  text: AI search you can self-host
  tagline: Perplexity-style search over the web (Tavily), Wikipedia, and your own ingested files. Plug in your LLM key, run it yourself.
  actions:
    - theme: brand
      text: Get Started
      link: /tutorials/
    - theme: alt
      text: Reference
      link: /reference/

features:
  - title: Agentic Search Chat
    details: Multi-step tool-calling agent searches the web (Tavily), Wikipedia, and your ingested corpus — then synthesizes a cited answer.
  - title: File & Media Ingestion
    details: Upload PDFs, docs, audio, and video via the bundled job processor. Files get parsed/transcribed and embedded into a pgvector corpus the agent can search (ingest→embed pipeline landing — see issue #291).
  - title: Deep Research
    details: Launch a multi-step research job — scope a topic into dimensions, search each one, evaluate coverage, and stream a cited report with a table of contents.
  - title: rh CLI
    details: The @protolabsai/rabbit-hole-cli (bin rh) exposes search, research, ingest, and status commands. Designed to be shelled out to by fleet agents.
  - title: BYOK & Self-host
    details: Apache 2.0 docker-compose stack. Bring your own LLM key, optionally point at SearXNG for self-hosted meta-search. No subscription.
---

## Documentation Structure

Docs follow the [Diátaxis](https://diataxis.fr/) framework.

| | **Learning-oriented** | **Task-oriented** |
|---|---|---|
| **Practical** | [Tutorials](/tutorials/) — guided first steps | [How-to Guides](/how-to/) — task recipes |
| **Theoretical** | [Explanation](/explanation/) — design decisions | [Reference](/reference/) — complete spec |
