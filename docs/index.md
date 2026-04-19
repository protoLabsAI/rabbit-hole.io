---
layout: home
hero:
  name: Rabbit Hole
  text: AI Search + Living Knowledge Graph
  tagline: Perplexity-style search backed by SearXNG, Wikipedia, and a self-growing Neo4j knowledge graph. Deep research mode for comprehensive cited reports.
  actions:
    - theme: brand
      text: Get Started
      link: /tutorials/
    - theme: alt
      text: Reference
      link: /reference/

features:
  - icon: 🔍
    title: Agentic Search Chat
    details: Multi-step tool-calling agent searches SearXNG (Reddit, GitHub, Google, arXiv), Wikipedia, and your knowledge graph — then synthesizes a cited answer.
  - icon: 📄
    title: Deep Research
    details: SCOPE → RESEARCH → EVALUATE → SYNTHESIS pipeline. Decomposes any topic into dimensions, searches each exhaustively, and produces a structured report with inline citations.
  - icon: 🧠
    title: Living Knowledge Graph
    details: Every research session can feed Neo4j. Entities and relationships accumulate over time, making future searches faster and richer.
  - icon: 🤖
    title: Fleet A2A Agent
    details: A spec-compliant A2A server (port 7870) exposes search, deep_research, ingest_url, and kg_facts skills — callable by Ava and other fleet agents via JSON-RPC 2.0.
  - icon: 🌐
    title: SearXNG-Powered
    details: Self-hosted meta-search across Google, Brave, DuckDuckGo, Reddit, GitHub, arXiv, Semantic Scholar, and more — no third-party API keys required.
---

## Documentation Structure

Docs follow the [Diátaxis](https://diataxis.fr/) framework.

| | **Learning-oriented** | **Task-oriented** |
|---|---|---|
| **Practical** | [Tutorials](/tutorials/) — guided first steps | [How-to Guides](/how-to/) — task recipes |
| **Theoretical** | [Explanation](/explanation/) — design decisions | [Reference](/reference/) — complete spec |
