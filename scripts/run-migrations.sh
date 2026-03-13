#!/bin/bash
# Run database migrations manually
# Usage: ./scripts/run-migrations.sh

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Database Migration Runner          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Source shared migration check utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/migration-checks.sh"

if [ "${DEBUG:-0}" = "1" ]; then
    echo -e "${BLUE}ℹ️  DEBUG mode enabled - showing all database errors${NC}"
    echo ""
fi

# Check if postgres containers are running
POSTGRES_COMPLETE_RUNNING=$(docker ps --format '{{.Names}}' | grep -q "postgres-complete" && echo "true" || echo "false")
POSTGRES_JOBS_RUNNING=$(docker ps --format '{{.Names}}' | grep -q "postgres-jobs" && echo "true" || echo "false")

if [ "$POSTGRES_COMPLETE_RUNNING" = "false" ]; then
    echo -e "${RED}❌ postgres-complete container not running${NC}"
    echo ""
    echo "Start services first:"
    echo "  pnpm run dev:start"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ postgres-complete container found${NC}"

# Health check for postgres-complete
echo "Checking postgres-complete connectivity..."
if ! docker exec postgres-complete psql -U postgres --version >/dev/null 2>&1; then
    echo -e "${RED}❌ postgres-complete is not responding${NC}"
    echo ""
    echo "Container exists but PostgreSQL is not accessible."
    echo "Possible issues:"
    echo "  - Database still initializing (wait 10-30 seconds)"
    echo "  - Connection refused (check: docker logs postgres-complete)"
    echo "  - Permission denied (check container status)"
    echo ""
    echo "Try: docker logs postgres-complete --tail 50"
    echo ""
    exit 1
fi
export POSTGRES_COMPLETE_HEALTHY="true"
echo -e "${GREEN}✅ postgres-complete is healthy${NC}"

if [ "$POSTGRES_JOBS_RUNNING" = "true" ]; then
    echo -e "${GREEN}✅ postgres-jobs container found (dual database mode)${NC}"
    
    # Health check for postgres-jobs
    echo "Checking postgres-jobs connectivity..."
    if ! docker exec postgres-jobs psql -U jobqueue --version >/dev/null 2>&1; then
        echo -e "${RED}❌ postgres-jobs is not responding${NC}"
        echo ""
        echo "Container exists but PostgreSQL is not accessible."
        echo "Try: docker logs postgres-jobs --tail 50"
        echo ""
        exit 1
    fi
    export POSTGRES_JOBS_HEALTHY="true"
    echo -e "${GREEN}✅ postgres-jobs is healthy${NC}"
else
    export POSTGRES_JOBS_HEALTHY="false"
    echo -e "${YELLOW}⚠️  postgres-jobs not running (single database mode)${NC}"
fi
echo ""

# Table check functions are now loaded from scripts/lib/migration-checks.sh

# Check current migration status
echo "🔍 Checking migration status..."
echo ""

RABBIT_HOLE_READY=$(check_table_exists "rabbit_hole_app" "share_tokens")
if [ "$POSTGRES_COMPLETE_HEALTHY" = "true" ]; then
    SIDEQUEST_DB_EXISTS=$(eval "docker exec postgres-complete psql -U postgres -tAc \
        \"SELECT EXISTS (SELECT FROM pg_database WHERE datname='sidequest');\" $STDERR_REDIRECT" || echo "false")
else
    SIDEQUEST_DB_EXISTS="false"
fi

# Check job completions in the correct database based on architecture
if [ "$POSTGRES_JOBS_RUNNING" = "true" ]; then
    SIDEQUEST_COMPLETIONS_EXISTS=$(check_table_exists_jobs "sidequest" "sidequest_job_completions")
    SIDEQUEST_JOBS_EXISTS=$(check_table_exists_jobs "sidequest" "sidequest_jobs")
else
    SIDEQUEST_COMPLETIONS_EXISTS=$(check_table_exists "sidequest" "sidequest_job_completions")
    SIDEQUEST_JOBS_EXISTS="t" # Skip check in single instance mode
fi

if [ "$POSTGRES_JOBS_RUNNING" = "true" ]; then
    echo "Current status (dual database mode):"
    echo "  App Database (postgres-complete:5432):"
    echo "    - rabbit_hole_app tables: $([ "$RABBIT_HOLE_READY" = "t" ] && echo -e "${GREEN}✅ Ready${NC}" || echo -e "${YELLOW}❌ Missing${NC}")"
    echo "    - sidequest database: $([ "$SIDEQUEST_DB_EXISTS" = "t" ] && echo -e "${GREEN}✅ Ready${NC}" || echo -e "${YELLOW}❌ Missing${NC}")"
    echo "  Job Database (postgres-jobs:5433):"
    echo "    - sidequest_jobs: $([ "$SIDEQUEST_JOBS_EXISTS" = "t" ] && echo -e "${GREEN}✅ Ready${NC}" || echo -e "${YELLOW}❌ Missing${NC}")"
    echo "    - sidequest_job_completions: $([ "$SIDEQUEST_COMPLETIONS_EXISTS" = "t" ] && echo -e "${GREEN}✅ Ready${NC}" || echo -e "${YELLOW}❌ Missing${NC}")"
else
    echo "Current status (single database mode):"
    echo "  - rabbit_hole_app tables: $([ "$RABBIT_HOLE_READY" = "t" ] && echo -e "${GREEN}✅ Ready${NC}" || echo -e "${YELLOW}❌ Missing${NC}")"
    echo "  - sidequest database: $([ "$SIDEQUEST_DB_EXISTS" = "t" ] && echo -e "${GREEN}✅ Ready${NC}" || echo -e "${YELLOW}❌ Missing${NC}")"
    echo "  - sidequest_job_completions: $([ "$SIDEQUEST_COMPLETIONS_EXISTS" = "t" ] && echo -e "${GREEN}✅ Ready${NC}" || echo -e "${YELLOW}❌ Missing${NC}")"
fi
echo ""

if [ "$RABBIT_HOLE_READY" = "t" ] && [ "$SIDEQUEST_DB_EXISTS" = "t" ] && [ "$SIDEQUEST_COMPLETIONS_EXISTS" = "t" ] && [ "$SIDEQUEST_JOBS_EXISTS" = "t" ]; then
    echo -e "${GREEN}✅ All migrations are up to date${NC}"
    echo ""
    echo "No action needed!"
    exit 0
fi

echo -e "${YELLOW}⚠️  Some migrations are missing${NC}"
echo ""

read -p "Run migrations now? (Y/n) " -n 1 -r
echo ""
echo ""

if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Migrations skipped"
    exit 0
fi

echo "🔧 Running database migrations..."
echo ""

# Check if migration script exists in container
if ! docker exec postgres-complete bash -c "[ -f /docker-entrypoint-initdb.d/000_run_migrations.sh ]"; then
    echo -e "${RED}❌ Migration scripts not found in container${NC}"
    echo ""
    echo "This usually means the postgres image needs to be rebuilt."
    echo ""
    echo "Options:"
    echo "  1. Rebuild the image:"
    echo "     docker compose -f docker-compose.dev.yml build postgres"
    echo "     docker compose -f docker-compose.dev.yml up -d postgres"
    echo ""
    echo "  2. Or recreate everything (will lose data):"
    echo "     docker compose -f docker-compose.dev.yml down -v"
    echo "     pnpm run dev:start"
    echo ""
    exit 1
fi

# Run migrations on postgres-complete
echo "Executing migration script on postgres-complete..."
if ! docker exec postgres-complete bash /docker-entrypoint-initdb.d/000_run_migrations.sh; then
    echo -e "${RED}❌ Migration script failed on postgres-complete${NC}"
    echo ""
    echo "Check logs above for details. Common issues:"
    echo "  - Database connection problems"
    echo "  - Permission errors"
    echo "  - Syntax errors in migration files"
    exit 1
fi

# Run job completions migration on postgres-jobs if it exists
if [ "$POSTGRES_JOBS_RUNNING" = "true" ] && [ "$SIDEQUEST_COMPLETIONS_EXISTS" = "f" ]; then
    echo ""
    echo "Creating sidequest_job_completions table in postgres-jobs..."
    
    # Run the migration SQL file
    if ! docker exec -i postgres-jobs psql -U jobqueue -d sidequest < migrations/postgresql/018_job_completions_postgres_jobs.sql; then
        echo -e "${RED}❌ Failed to create job completions table in postgres-jobs${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Job completions table created in postgres-jobs${NC}"
fi

echo ""
echo -e "${GREEN}✅ Migrations completed successfully!${NC}"
echo ""

# Verify
echo "🔍 Verifying migrations..."
RABBIT_HOLE_READY=$(check_table_exists "rabbit_hole_app" "share_tokens")
SIDEQUEST_DB_EXISTS=$(eval "docker exec postgres-complete psql -U postgres -tAc \
    \"SELECT EXISTS (SELECT FROM pg_database WHERE datname='sidequest');\" $STDERR_REDIRECT" || echo "false")

if [ "$POSTGRES_JOBS_RUNNING" = "true" ]; then
    SIDEQUEST_COMPLETIONS_EXISTS=$(check_table_exists_jobs "sidequest" "sidequest_job_completions")
    SIDEQUEST_JOBS_EXISTS=$(check_table_exists_jobs "sidequest" "sidequest_jobs")
    
    echo "Final status (dual database mode):"
    echo "  App Database (postgres-complete:5432):"
    echo "    - rabbit_hole_app tables: $([ "$RABBIT_HOLE_READY" = "t" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
    echo "    - sidequest database: $([ "$SIDEQUEST_DB_EXISTS" = "t" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
    echo "  Job Database (postgres-jobs:5433):"
    echo "    - sidequest_jobs: $([ "$SIDEQUEST_JOBS_EXISTS" = "t" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
    echo "    - sidequest_job_completions: $([ "$SIDEQUEST_COMPLETIONS_EXISTS" = "t" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
else
    SIDEQUEST_COMPLETIONS_EXISTS=$(check_table_exists "sidequest" "sidequest_job_completions")
    SIDEQUEST_JOBS_EXISTS="t"
    
    echo "Final status (single database mode):"
    echo "  - rabbit_hole_app tables: $([ "$RABBIT_HOLE_READY" = "t" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
    echo "  - sidequest database: $([ "$SIDEQUEST_DB_EXISTS" = "t" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
    echo "  - sidequest_job_completions: $([ "$SIDEQUEST_COMPLETIONS_EXISTS" = "t" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
fi
echo ""

if [ "$RABBIT_HOLE_READY" = "t" ] && [ "$SIDEQUEST_DB_EXISTS" = "t" ] && [ "$SIDEQUEST_COMPLETIONS_EXISTS" = "t" ] && [ "$SIDEQUEST_JOBS_EXISTS" = "t" ]; then
    echo -e "${GREEN}🎉 All migrations verified!${NC}"
else
    echo -e "${YELLOW}⚠️  Some migrations may have failed - check logs above${NC}"
    echo ""
    echo "For detailed error messages, run with DEBUG mode:"
    echo "  DEBUG=1 pnpm run dev:migrate"
    exit 1
fi

