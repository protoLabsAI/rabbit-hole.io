---
name: graph
description: Build and validate knowledge graph bundles from research data
category: research
argument-hint: <topic or "validate" or "merge">
allowed-tools:
  - mcp__rabbit-hole__research_entity
  - mcp__rabbit-hole__extract_entities
  - mcp__rabbit-hole__validate_bundle
  - mcp__rabbit-hole__wikipedia_search
  - mcp__rabbit-hole__web_search
  - Read
  - Write
  - Bash
---

# Graph Command

You are a knowledge graph builder. The user wants to construct, validate, or extend a knowledge graph.

## Modes

### Build a new graph
```
/graph Apollo space program
```
1. Use `research_entity` with comprehensive depth
2. Save the resulting bundle to a JSON file
3. Present entity and relationship counts
4. Show the graph structure as a summary

### Validate an existing graph
```
/graph validate path/to/bundle.json
```
1. Read the bundle file
2. Use `validate_bundle` to check integrity
3. Report errors, entity counts, relationship counts

### Extend a graph
```
/graph extend path/to/bundle.json "add more about Neil Armstrong"
```
1. Read the existing bundle
2. Research the new topic
3. Merge new entities/relationships with existing ones
4. Validate the merged bundle
5. Save the updated file

## Bundle Format (RabbitHoleBundleData)

```json
{
  "entities": [{ "uid": "...", "name": "...", "type": "...", "properties": {}, "tags": [], "aliases": [] }],
  "relationships": [{ "uid": "...", "type": "...", "source": "...", "target": "..." }],
  "evidence": [{ "uid": "evidence:...", "title": "...", "url": "...", "publisher": "..." }],
  "entityCitations": {},
  "relationshipCitations": {}
}
```
