#!/bin/bash
# Validate PostgreSQL Configuration for Deployment
# Checks for common issues before deploying

set -e

echo "🔍 Validating PostgreSQL configuration..."
echo

# Check 1: Deprecated files should not exist
echo "1️⃣  Checking for deprecated initialization scripts..."
if [ -f "migrations/postgresql/init-wrapper.sh" ]; then
  echo "❌ FAIL: Deprecated init-wrapper.sh exists"
  exit 1
fi

if [ -f "migrations/postgresql/003_setup_app_database.sh" ]; then
  echo "❌ FAIL: Deprecated 003_setup_app_database.sh exists"
  exit 1
fi
echo "✅ PASS: No deprecated scripts found"
echo

# Check 2: Required initialization script exists
echo "2️⃣  Checking for required initialization script..."
if [ ! -f "migrations/postgresql/000_run_migrations.sh" ]; then
  echo "❌ FAIL: 000_run_migrations.sh not found"
  exit 1
fi

if [ ! -x "migrations/postgresql/000_run_migrations.sh" ]; then
  echo "⚠️  WARNING: 000_run_migrations.sh not executable, fixing..."
  chmod +x migrations/postgresql/000_run_migrations.sh
fi
echo "✅ PASS: Initialization script exists and is executable"
echo

# Check 3: Migration files exist
echo "3️⃣  Checking for migration files..."
MIGRATION_COUNT=$(find migrations/postgresql -name "*.sql.managed" | wc -l)
if [ "$MIGRATION_COUNT" -lt 1 ]; then
  echo "❌ FAIL: No .sql.managed migration files found"
  exit 1
fi
echo "✅ PASS: Found $MIGRATION_COUNT migration files"
echo

# Check 4: Docker compose configuration
echo "4️⃣  Checking docker-compose.staging.yml configuration..."

# Check postgres volume mount
if ! grep -q "./migrations/postgresql:/docker-entrypoint-initdb.d" docker-compose.staging.yml; then
  echo "❌ FAIL: Migrations directory not mounted correctly"
  exit 1
fi

# Check environment variables
if ! grep -q "POSTGRES_APP_DB" docker-compose.staging.yml; then
  echo "❌ FAIL: POSTGRES_APP_DB environment variable not set"
  exit 1
fi

if ! grep -q "POSTGRES_APP_USER" docker-compose.staging.yml; then
  echo "❌ FAIL: POSTGRES_APP_USER environment variable not set"
  exit 1
fi

# Check health check configuration
if grep -q "start_period: 60s" docker-compose.staging.yml; then
  echo "✅ PASS: Health check has adequate start_period"
else
  echo "⚠️  WARNING: Health check may not have adequate start_period"
fi
echo "✅ PASS: Docker compose configuration valid"
echo

# Check 5: File permissions
echo "5️⃣  Checking file permissions..."
for script in migrations/postgresql/*.sh; do
  if [ -f "$script" ]; then
    if [ ! -x "$script" ]; then
      echo "⚠️  WARNING: $script not executable, fixing..."
      chmod +x "$script"
    fi
  fi
done
echo "✅ PASS: Script permissions valid"
echo

echo "✅ All validation checks passed!"
echo
echo "Ready for deployment. Remember to set environment variables in Coolify:"
echo "  - POSTGRES_MAIN_PASSWORD"
echo "  - POSTGRES_APP_PASSWORD"

