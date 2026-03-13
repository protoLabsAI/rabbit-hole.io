# PostgreSQL Migrations

## Quick Start (Development)

**Automatic migration checking is built into the dev startup:**

```bash
pnpm run dev:start
```

The script will:
1. Check if critical tables exist
2. Prompt to run migrations if missing
3. Execute all migrations automatically

**Manual migration runner:**

```bash
pnpm run dev:migrate
```

This checks migration status and runs missing migrations without restarting services.

---

## Migration Validation

**Optional local validation:**

```bash
pnpm run lint:migrations
```

Checks for:
- Shell script syntax (ShellCheck)
- RAISE statements outside DO blocks
- Common SQL syntax errors

---

## Architecture: Baked Migrations

**Strategy:** Migrations are embedded into a custom PostgreSQL Docker image, not mounted as volumes.

```
Custom Image (docker/postgres/Dockerfile)
├─ Base: postgres:15
├─ COPY migrations → /docker-entrypoint-initdb.d/
└─ RUN chmod +x *.sh
```

**Benefits:**

- ✅ No file mount issues (eliminates Coolify directory problems)
- ✅ Immutable infrastructure
- ✅ Version-controlled schema
- ✅ Production-ready pattern

## How Initialization Works

PostgreSQL Docker images automatically run scripts in `/docker-entrypoint-initdb.d/` **only on first startup** (when data directory is empty).

### Initialization Script

**`000_run_migrations.sh`** - Main initialization script that:

1. Creates `app_user` with appropriate permissions (database created via POSTGRES_DB)
2. Runs all `.sql.managed` migration files in order
3. Grants schema and table permissions

This script runs **inside** the postgres container during first initialization.

**Note:** The `rabbit_hole_app` database is created automatically by PostgreSQL via the `POSTGRES_DB` environment variable.

### Migration Files

- `001_create_app_database.sql.managed` - Creates app_user and grants permissions
- `002-014_*.sql.managed` - Application schema migrations (collaboration, sessions, etc.)

Files are named with numeric prefixes to ensure correct execution order.

## Important Notes

### First Deployment

Migrations run automatically when postgres container starts with empty volume:

```bash
# Local staging
docker compose -f docker-compose.local-staging.yml up -d postgres

# Coolify (in production)
docker compose -f docker-compose.coolify.yml up -d postgres

# Neo4j development
docker compose -f docker-compose.neo4j.yml up -d postgres

# Migrations run automatically via 000_run_migrations.sh
```

### Subsequent Deployments

**Migrations will NOT re-run** because the data volume persists. To add new migrations:

1. Add new migration file: `015_new_feature.sql.managed`
2. Update `000_run_migrations.sh` to include it in the loop
3. Manually run the migration:

   ```bash
   # Local staging and Coolify
   docker exec postgres-database psql -U postgres -d rabbit_hole_app -f /docker-entrypoint-initdb.d/015_new_feature.sql.managed

   # Neo4j development
   docker exec postgres-complete psql -U postgres -d rabbit_hole_app -f /docker-entrypoint-initdb.d/015_new_feature.sql.managed
   ```

### Clean Slate (Development Only)

To wipe database and re-run all migrations:

```bash
# Choose the appropriate docker-compose file
docker compose -f docker-compose.local-staging.yml down -v  # -v removes volumes
docker compose -f docker-compose.local-staging.yml up -d postgres

# Watch logs to verify migrations
docker logs -f postgres-database  # or postgres-complete for neo4j
```

## Removed Deprecated Files

- `init-wrapper.sh` - Old external initialization approach (REMOVED)
- `003_setup_app_database.sh` - Superseded by 000_run_migrations.sh (REMOVED)

These files caused conflicts in Coolify deployments and have been removed from the repository.

## Docker Compose Configuration

All docker-compose files use the custom PostgreSQL image with baked-in migrations:

**docker-compose.local-staging.yml** (container: `postgres-database`):

```yaml
postgres:
  build:
    context: .
    dockerfile: docker/postgres/Dockerfile
  image: rabbit-hole-postgres:local
  container_name: postgres-database
  volumes:
    - postgres_data:/var/lib/postgresql/data
    # Migrations baked into image - no volume mount needed
```

**docker-compose.coolify.yml** (container: `postgres-database`):

```yaml
postgres:
  build:
    context: .
    dockerfile: docker/postgres/Dockerfile
  image: rabbit-hole-postgres:production
  container_name: postgres-database
  volumes:
    - postgres_data:/var/lib/postgresql/data
    # Migrations baked into image - no volume mount needed
```

**docker-compose.neo4j.yml** (container: `postgres-complete`):

```yaml
postgres:
  build:
    context: .
    dockerfile: docker/postgres/Dockerfile
  image: rabbit-hole-postgres:dev
  container_name: postgres-complete
  volumes:
    - postgres_data:/var/lib/postgresql/data
    # Migrations baked into image - no volume mount needed
```

The custom Dockerfile copies migrations into the image during build.

## Coolify Production

Coolify deployments:

1. Build custom image from `docker/postgres/Dockerfile` (automatic)
2. Migrations are embedded in the image
3. On first startup, PostgreSQL runs embedded migrations
4. No file mount issues - migrations are part of the image

**To update migrations:**

1. Modify migration files
2. Increment image version
3. Redeploy - Coolify rebuilds image

No manual intervention needed - Docker handles initialization.
