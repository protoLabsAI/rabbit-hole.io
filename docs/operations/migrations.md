# Migrations

Neo4j schema migrations are Cypher files in `migrations/`. They create indexes, constraints, and full-text indexes that the application depends on.

## Running Migrations

All migrations use `IF NOT EXISTS` — safe to run multiple times.

### Via Node.js (recommended)

```bash
node -e "
const neo4j = require('neo4j-driver');
const fs = require('fs');
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'evidencegraph2024'
  )
);
async function run() {
  const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  const file = process.argv[2];
  const cypher = fs.readFileSync(file, 'utf8');
  // Split on semicolons, filter comments and blanks
  const statements = cypher.split(';')
    .map(s => s.replace(/\/\/.*$/gm, '').trim())
    .filter(s => s.length > 0);
  for (const stmt of statements) {
    console.log('Running:', stmt.slice(0, 80) + '...');
    await session.run(stmt);
  }
  console.log('Done.');
  await session.close();
  await driver.close();
}
run().catch(e => { console.error(e.message); process.exit(1); });
" migrations/006_fulltext_entity_index.cypher
```

### Via cypher-shell

```bash
cat migrations/006_fulltext_entity_index.cypher | cypher-shell -u neo4j -p <password>
```

### Run All Migrations

```bash
for f in migrations/*.cypher; do
  echo "=== $f ==="
  node -e "..." "$f"  # use the script above
done
```

## Migration Index

| File | Description | Dependencies |
|------|-------------|-------------|
| `002_relationship_indexes.cypher` | Property indexes for SPEECH_ACT, FUNDS, ATTACKS, etc. | None |
| `003_time_navigation_indexes.cypher` | Temporal query optimization indexes | None |
| `004_extended_entity_indexes.cypher` | Biological, astronomical, geographic entity indexes + constraints | None |
| `005_extended_relationship_indexes.cypher` | Domain-specific relationship indexes | None |
| `006_fulltext_entity_index.cypher` | Full-text search index on Entity name/aliases/tags | None |

## Verifying Index State

```cypher
-- Check all indexes
SHOW INDEXES;

-- Check a specific index
SHOW INDEXES WHERE name = 'idx_entity_name_fulltext';

-- Expected output:
-- State: ONLINE
-- Population %: 100.0
```

## Creating New Migrations

1. Create `migrations/NNN_description.cypher`
2. Use `IF NOT EXISTS` for all CREATE statements
3. Add comments explaining what the migration does and why
4. Test on a local Neo4j instance before committing
5. Update this document's migration index
