#!/bin/bash
set -e

echo "🔧 Running database migrations..."

# Postgres is already running locally during docker-entrypoint-initdb.d execution
# POSTGRES_DB environment variable determines the initial database created

echo "✅ PostgreSQL is ready (running in init context)"
echo "📦 Database: rabbit_hole_app (created via POSTGRES_DB)"

# Step 1: Create users (app_user and jobqueue)
echo "👤 Creating database users..."
psql -U postgres -d rabbit_hole_app -f /docker-entrypoint-initdb.d/001_create_app_database.sql.managed

# Step 2: Create sidequest database for job processing
echo "📦 Creating sidequest database..."
bash /docker-entrypoint-initdb.d/002_create_sidequest_database.sh

# Step 3: Run application migrations in rabbit_hole_app context
echo "🔧 Running rabbit_hole_app migrations..."
for migration in /docker-entrypoint-initdb.d/{002,004,005,006,007,009,010,011,012,013,014}_*.sql.managed; do
  if [ -f "$migration" ]; then
    filename=$(basename "$migration" .managed)
    echo "▶️  Running $filename in rabbit_hole_app..."
    psql -U postgres -d rabbit_hole_app -f "$migration"
  fi
done

# Step 4: Grant permissions to app_user in rabbit_hole_app
echo "🔐 Granting permissions to app_user in rabbit_hole_app..."
psql -U postgres -d rabbit_hole_app <<-EOSQL
  GRANT ALL ON SCHEMA public TO app_user;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;
EOSQL

# Step 5: Run sidequest database migrations
echo "🔧 Running sidequest database migrations..."
bash /docker-entrypoint-initdb.d/017_sidequest_migrations.sh

echo "✅ All migrations complete!"
echo "   - rabbit_hole_app: Application database"
echo "   - sidequest: Job processing database"

