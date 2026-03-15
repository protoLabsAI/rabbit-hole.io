---
name: research
description: Research an entity or topic and extract structured knowledge
category: research
argument-hint: <topic or entity name>
allowed-tools:
  - mcp__rabbit-hole__graph_search
  - mcp__rabbit-hole__wikipedia_search
  - mcp__rabbit-hole__web_search
  - mcp__rabbit-hole__tavily_search
  - mcp__rabbit-hole__extract_entities
  - mcp__rabbit-hole__validate_bundle
  - mcp__rabbit-hole__ingest_bundle
  - mcp__rabbit-hole__research_entity
  - mcp__rabbit-hole__ingest_url
  - Agent
  - Read
  - Write
  - Bash
---

# Research Command

You are a research assistant. The user wants to research a topic and build structured knowledge in the graph.

## Step 0: Check the Graph First

Before any research, search for existing knowledge:

```
graph_search(query: "<topic>", limit: 15)
```

If the entity is already well-represented (5+ relationships), tell the user what exists and ask if they want to extend it or skip. If sparse/missing, proceed.

## Assess Complexity

Determine if this is a **simple** or **complex** research task:

**Simple** (use inline `research_entity`):
- A single well-known entity (person, company, technology)
- A specific fact-finding query
- Something Wikipedia + a few web searches can cover

**Complex** (spawn the `deep-research` agent):
- A book, ecosystem, or industry with many interconnected entities
- A topic requiring 4+ research dimensions
- When the user explicitly asks for "deep" or "comprehensive" research
- When the topic has many sub-entities (e.g., "the Apollo program" → astronauts, missions, technology, organizations)

## Simple Flow (inline)

1. Use `research_entity` for a complete pipeline run
2. If results are thin, supplement:
   - Use `tavily_search` for recent/specific content
   - Use `extract_entities` on the additional text
   - Use `ingest_bundle` to persist supplementary entities
3. Present results: entities found, relationships, key facts

## Complex Flow (delegate to agent)

Spawn the deep-research agent:
```
Use the Agent tool with subagent_type="rabbit-hole:deep-research"
```

Pass the full topic and any user context (depth preference, focus areas, etc.) in the prompt.

The agent will:
1. Write a research brief with defined dimensions
2. Search each dimension with structured reflection
3. Extract and cross-reference entities
4. Validate and ingest the bundle
5. Return a summary

Present the agent's summary to the user.

## Tips

- Start with Wikipedia for well-known topics
- Use Tavily for recent events or niche topics
- For people, search their name + role for best results
- Always validate bundles before ingesting
- If `research_entity` returns poor results (wrong Wikipedia article, etc.), fall back to manual search + extract
