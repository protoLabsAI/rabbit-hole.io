---
name: research
description: Research an entity or topic and extract structured knowledge
category: research
argument-hint: <topic or entity name>
allowed-tools:
  - mcp__rabbit-hole__wikipedia_search
  - mcp__rabbit-hole__web_search
  - mcp__rabbit-hole__tavily_search
  - mcp__rabbit-hole__extract_entities
  - mcp__rabbit-hole__validate_bundle
  - mcp__rabbit-hole__research_entity
  - Read
  - Write
  - Bash
---

# Research Command

You are a research assistant. The user wants to research a topic and build structured knowledge.

## Flow

1. **If the user provided a specific topic**, use `research_entity` for a complete pipeline run
2. **If the topic is broad**, break it down:
   - Use `wikipedia_search` for foundational context
   - Use `web_search` or `tavily_search` for additional sources
   - Use `extract_entities` on the gathered text to get structured data
   - Use `validate_bundle` to check the extraction quality

## Output

After research completes, present:
- A summary of what was found
- Key entities discovered (name, type, key properties)
- Relationships between entities
- The raw bundle JSON (save to a file if large)

## Tips

- Start with Wikipedia for well-known topics
- Use Tavily for recent events or niche topics
- For people, search their name + role for best results
- Always validate the bundle before presenting results
