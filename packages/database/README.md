# @proto/database

Centralized database clients for Neo4j (graph data) and PostgreSQL (relational data) with global connection pooling.

## Features

- **Connection Pooling**: Global singleton pools for Neo4j and PostgreSQL
- **Query Builders**: Parameterized query builders preventing injection attacks
- **Transaction Management**: Simplified transaction handling with retry logic
- **Health Monitoring**: Built-in database health checks and metrics
- **Type Safety**: Full TypeScript support with proper error handling
- **ESLint Enforcement**: Automatic linting prevents direct pool creation

## Quick Start

### Neo4j (Graph Database)

```typescript
import { getGlobalNeo4jClient, buildEntityDetailsQuery } from "@proto/database";

// Get entity details
const client = getGlobalNeo4jClient();
const { query, params } = buildEntityDetailsQuery({ uid: "person:elon_musk" });
const result = await client.executeRead(query, params);
```

### PostgreSQL (Relational Database)

```typescript
import { getGlobalPostgresPool } from "@proto/database";

// Get collaboration sessions
const pool = getGlobalPostgresPool();
const result = await pool.query(
  `SELECT * FROM collaboration_sessions WHERE owner_id = $1`,
  [userId]
);
```

## API

### Neo4j Client

```typescript
// Singleton client (recommended for API routes)
const client = getGlobalNeo4jClient();

// Custom client (for testing)
const client = createNeo4jClient({
  uri: "bolt://localhost:7687",
  username: "neo4j",
  password: "password",
  database: "neo4j",
});
```

### PostgreSQL Pool

```typescript
// Global pool (ALWAYS use this in API routes)
import { getGlobalPostgresPool } from "@proto/database";
const pool = getGlobalPostgresPool();

// Execute queries
const result = await pool.query(
  `SELECT * FROM users WHERE id = $1`,
  [userId]
);

// ⚠️ NEVER create pools directly - ESLint will block this:
// const pool = new Pool({ ... }); // ❌ Linter error
```

### Query Execution

```typescript
// Read queries
const result = await client.executeRead(query, params);

// Write queries
const result = await client.executeWrite(query, params);

// Transactions
const results = await client.executeTransaction([
  { query: "CREATE (n:Person {name: $name})", parameters: { name: "Alice" } },
  { query: "CREATE (m:Person {name: $name})", parameters: { name: "Bob" } },
]);
```

### Query Builders

```typescript
// Entity details with relationships
const { query, params } = buildEntityDetailsQuery({ uid: "person:alice" });

// Atlas overview
const { query, params } = buildAtlasOverviewQuery({
  entityTypes: ["Person", "Organization"],
  limit: 1000,
});

// Entity search
const { query, params } = buildEntitySearchQuery({
  searchTerm: "tesla",
  entityTypes: ["Organization"],
  limit: 50,
});
```

## Benefits

- **Eliminates Duplication**: Replaces 20+ duplicate driver/pool initializations
- **Prevents Injection**: Parameterized queries with validation
- **Standardizes Patterns**: Consistent database access across all routes
- **Improves Performance**: Global connection pooling and query optimization
- **Enhances Reliability**: Proper error handling and retry logic
- **Prevents Connection Exhaustion**: Single pool per database (not per route)
- **Enforced by Linting**: ESLint blocks direct pool creation

## Migration

### Neo4j Migration

**Before:**

```typescript
// Duplicated in every route
const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);
const session = driver.session({ database: "neo4j" });
```

**After:**

```typescript
// Single import, managed connections
import { getGlobalNeo4jClient } from "@proto/database";
const client = getGlobalNeo4jClient();
```

### PostgreSQL Migration

**Before:**

```typescript
// ❌ Module-level pool (inefficient)
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.APP_DATABASE_URL,
});

export async function GET(request: NextRequest) {
  const result = await pool.query(/* ... */);
  await pool.end(); // ❌ Closes pool!
  return NextResponse.json({ data: result.rows });
}
```

**After:**

```typescript
// ✅ Global pool (efficient)
import { getGlobalPostgresPool } from "@proto/database";

export async function GET(request: NextRequest) {
  const pool = getGlobalPostgresPool();
  const result = await pool.query(/* ... */);
  return NextResponse.json({ data: result.rows });
  // Pool stays open ✓
}
```

## Important: Never Call pool.end()

The global pools manage their own lifecycle. Do NOT call:

- `pool.end()` in API routes
- `client.close()` in API routes

Pools are automatically cleaned up during:
- Application shutdown
- Test cleanup (via `closeGlobalPostgresPool()` / `closeGlobalClient()`)

## Documentation

- **PostgreSQL Pattern**: `docs/developer/postgres-pool-pattern.md`
- **Database Architecture**: `docs/DATABASE_ARCHITECTURE.md`
- **ESLint Config**: `eslint.config.js` (Pool restriction on line 52)
