// Migration 006: Full-text entity search index
//
// Replaces the O(n) CONTAINS scan in entity-search with a Lucene-backed full-text index.
// At 1M+ nodes the CONTAINS predicate causes a full graph scan; this index makes queries
// sub-5ms regardless of dataset size.
//
// Notes:
//   - :Entity is the superlabel that covers all entity types (Person, Organization, etc.)
//   - eventually_consistent mode queues index updates asynchronously to avoid adding
//     Lucene write latency to the hot ingest path (safe for search-as-you-type lag of ~seconds)
//   - standard-no-stop-words: lowercases and tokenizes, preserves short terms (vs 'standard'
//     which would drop words like "a", "the" that appear in entity names)
//   - aliases and tags are array properties — each element is indexed as a separate token
//
// Run order: after 005_extended_relationship_indexes.cypher

CREATE FULLTEXT INDEX idx_entity_name_fulltext IF NOT EXISTS
FOR (n:Entity)
ON EACH [n.name, n.aliases, n.tags]
OPTIONS {
  indexConfig: {
    `fulltext.analyzer`: 'standard-no-stop-words',
    `fulltext.eventually_consistent`: true
  }
};
