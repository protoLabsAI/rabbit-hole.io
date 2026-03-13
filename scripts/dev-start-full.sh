#!/bin/bash
# Full development setup - services + instructions for Next.js

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Rabbit Hole Development Setup     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check requirements
echo "Checking requirements..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker not running - start Docker Desktop"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not installed - run: npm install -g pnpm"
    exit 1
fi

echo -e "${GREEN}✅ Requirements met${NC}"
echo ""

# Check SSL certificates
CERT_DIR="$(pwd)/certs"
if [ ! -f "$CERT_DIR/cert.pem" ] || [ ! -f "$CERT_DIR/key.pem" ]; then
    echo -e "${YELLOW}🔐 SSL certificates not found${NC}"
    echo ""
    echo "HTTPS certificates are optional but recommended for:"
    echo "  - Testing from mobile devices on your network"
    echo "  - Avoiding browser security warnings"
    echo "  - Matching production environment"
    echo ""
    read -p "Generate SSL certificates now? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🔧 Setting up SSL certificates..."
        ./scripts/setup-local-ssl.sh
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ SSL certificates generated${NC}"
        else
            echo -e "${YELLOW}⚠️  Certificate generation failed (optional)${NC}"
        fi
        echo ""
    else
        echo -e "${BLUE}ℹ️  Skipping SSL setup. Run 'pnpm run ssl:setup' later if needed.${NC}"
        echo ""
    fi
fi

# Start services
echo "🐳 Starting Docker services..."
docker compose -f docker-compose.dev.yml up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.dev.yml ps

echo ""
echo -e "${GREEN}✅ Services running!${NC}"
echo ""

# Check and run migrations if needed
echo "🔍 Checking database migrations..."

# Detect database architecture
POSTGRES_JOBS_RUNNING=$(docker ps --format '{{.Names}}' | grep -q "postgres-jobs" && echo "true" || echo "false")

# Source shared migration check utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/migration-checks.sh"

# Health check for postgres-complete
echo "Checking postgres-complete health..."
if ! docker exec postgres-complete psql -U postgres --version >/dev/null 2>&1; then
    echo -e "${RED}❌ postgres-complete is not responding${NC}"
    echo "Container may not be ready or connection failed"
    echo "Try: docker logs postgres-complete"
    echo "Or wait a few seconds and run: pnpm run dev:migrate"
    echo ""
    # Don't exit - allow user to continue
    export POSTGRES_COMPLETE_HEALTHY="false"
else
    export POSTGRES_COMPLETE_HEALTHY="true"
fi

# Health check for postgres-jobs if it's running
if [ "$POSTGRES_JOBS_RUNNING" = "true" ]; then
    if ! docker exec postgres-jobs psql -U jobqueue --version >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  postgres-jobs is not responding${NC}"
        export POSTGRES_JOBS_HEALTHY="false"
    else
        export POSTGRES_JOBS_HEALTHY="true"
    fi
else
    export POSTGRES_JOBS_HEALTHY="false"
fi

# Table check functions are now loaded from scripts/lib/migration-checks.sh

# Check critical tables (only if postgres is healthy)
if [ "$POSTGRES_COMPLETE_HEALTHY" = "true" ]; then
    RABBIT_HOLE_READY=$(check_table_exists "rabbit_hole_app" "share_tokens")
    SIDEQUEST_DB_EXISTS=$(eval "docker exec postgres-complete psql -U postgres -tAc \
        \"SELECT EXISTS (SELECT FROM pg_database WHERE datname='sidequest');\" $STDERR_REDIRECT" || echo "false")
else
    RABBIT_HOLE_READY="f"
    SIDEQUEST_DB_EXISTS="f"
fi

# Check job completions in the correct database
if [ "$POSTGRES_JOBS_RUNNING" = "true" ]; then
    SIDEQUEST_COMPLETIONS_EXISTS=$(check_table_exists_jobs "sidequest" "sidequest_job_completions")
    SIDEQUEST_JOBS_EXISTS=$(check_table_exists_jobs "sidequest" "sidequest_jobs")
else
    SIDEQUEST_COMPLETIONS_EXISTS=$(check_table_exists "sidequest" "sidequest_job_completions")
    SIDEQUEST_JOBS_EXISTS="t"
fi

if [ "$RABBIT_HOLE_READY" = "f" ] || [ "$SIDEQUEST_DB_EXISTS" = "f" ] || [ "$SIDEQUEST_COMPLETIONS_EXISTS" = "f" ] || [ "$SIDEQUEST_JOBS_EXISTS" = "f" ]; then
    echo -e "${YELLOW}⚠️  Database migrations needed${NC}"
    echo ""
    
    if [ "$POSTGRES_JOBS_RUNNING" = "true" ]; then
        echo "Migration status (dual database mode):"
        echo "  App Database (postgres-complete:5432):"
        echo "    - rabbit_hole_app tables: $([ "$RABBIT_HOLE_READY" = "t" ] && echo "✅" || echo "❌")"
        echo "    - sidequest database: $([ "$SIDEQUEST_DB_EXISTS" = "t" ] && echo "✅" || echo "❌")"
        echo "  Job Database (postgres-jobs:5433):"
        echo "    - sidequest_jobs: $([ "$SIDEQUEST_JOBS_EXISTS" = "t" ] && echo "✅" || echo "❌")"
        echo "    - sidequest_job_completions: $([ "$SIDEQUEST_COMPLETIONS_EXISTS" = "t" ] && echo "✅" || echo "❌")"
    else
        echo "Migration status:"
        echo "  - rabbit_hole_app tables: $([ "$RABBIT_HOLE_READY" = "t" ] && echo "✅" || echo "❌")"
        echo "  - sidequest database: $([ "$SIDEQUEST_DB_EXISTS" = "t" ] && echo "✅" || echo "❌")"
        echo "  - sidequest_job_completions: $([ "$SIDEQUEST_COMPLETIONS_EXISTS" = "t" ] && echo "✅" || echo "❌")"
    fi
    echo ""
    
    read -p "Run migrations now? (Y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo ""
        echo "🔧 Running database migrations..."
        
        # Run the main migration script on postgres-complete
        if docker exec postgres-complete bash -c "[ -f /docker-entrypoint-initdb.d/000_run_migrations.sh ]"; then
            if ! docker exec postgres-complete bash /docker-entrypoint-initdb.d/000_run_migrations.sh; then
                echo -e "${RED}❌ Migration script failed${NC}"
                echo ""
                echo "Try running manually: pnpm run dev:migrate"
                echo ""
                # Don't exit - allow user to continue and fix later
            else
                # Run job completions migration on postgres-jobs if needed
                if [ "$POSTGRES_JOBS_RUNNING" = "true" ] && [ "$SIDEQUEST_COMPLETIONS_EXISTS" = "f" ]; then
                    echo ""
                    echo "Creating job completions table in postgres-jobs..."
                    
                    # Use the dedicated migration file with conditional error suppression
                    if [ "${DEBUG:-0}" = "1" ]; then
                        if docker exec -i postgres-jobs psql -U jobqueue -d sidequest < migrations/postgresql/018_job_completions_postgres_jobs.sql; then
                            echo -e "${GREEN}✅ Job completions table created${NC}"
                        else
                            echo -e "${YELLOW}⚠️  Failed to create job completions table - run: pnpm run dev:migrate${NC}"
                        fi
                    else
                        if docker exec -i postgres-jobs psql -U jobqueue -d sidequest < migrations/postgresql/018_job_completions_postgres_jobs.sql > /dev/null 2>&1; then
                            echo -e "${GREEN}✅ Job completions table created${NC}"
                        else
                            echo -e "${YELLOW}⚠️  Failed to create job completions table - check logs with: DEBUG=1 pnpm run dev:start${NC}"
                        fi
                    fi
                fi
                
                echo -e "${GREEN}✅ Migrations completed successfully${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Migration script not found in container${NC}"
            echo "   Run: pnpm run dev:migrate"
            echo "   Or recreate: docker compose -f docker-compose.dev.yml down -v && pnpm run dev:start"
        fi
        echo ""
    else
        echo -e "${YELLOW}⚠️  Skipping migrations - some features may not work${NC}"
        echo ""
    fi
else
    echo -e "${GREEN}✅ Database migrations up to date${NC}"
    echo ""
fi

# MinIO buckets are auto-configured by minio-init service
echo -e "${GREEN}🪣 MinIO buckets will be auto-configured on startup${NC}"
echo ""

echo "📍 Available Services:"
echo "  ├─ Neo4j:           http://localhost:7474"
echo "  ├─ PostgreSQL:      localhost:5432"
echo "  ├─ Redis:           localhost:6379"
echo "  ├─ MinIO:           http://localhost:9001 (minio/minio123)"
echo "  ├─ Hocuspocus:      ws://localhost:1234"
echo "  └─ YouTube Processor: http://localhost:8001"
echo ""
echo -e "${BLUE}💡 Pro Tip:${NC} Set DEBUG=1 before running to see detailed database connection logs"
echo "   Example: DEBUG=1 pnpm run dev:start"
echo ""
echo -e "${YELLOW}🎯 Next Steps - Multi-App Monorepo:${NC}"
echo ""
echo "1️⃣  Start an Application (in new terminal):"
echo ""
echo "    Choose your app:"
if [ -f "$CERT_DIR/cert.pem" ]; then
    echo -e "    ${GREEN}cd apps/rabbit-hole && pnpm dev${NC}  (Main app with HTTPS)"
    echo "    cd apps/portfolio && pnpm dev      (Portfolio - when created)"
    echo "    cd apps/blog && pnpm dev           (Blog - when created)"
else
    echo "    cd apps/rabbit-hole && pnpm dev    (Main app)"
    echo "    cd apps/portfolio && pnpm dev      (Portfolio - when created)"
    echo "    cd apps/blog && pnpm dev           (Blog - when created)"
fi
echo ""
echo "2️⃣  Load test data (optional):"
echo "    pnpm run db:dev"
echo ""
echo "3️⃣  Access applications:"
if [ -f "$CERT_DIR/cert.pem" ]; then
    # Try to detect local network IP
    LOCAL_IP=""
    if command -v ip &> /dev/null; then
        LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+')
    elif command -v ifconfig &> /dev/null; then
        LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)
    fi
    
    echo -e "    ${GREEN}https://localhost:3000${NC}  (rabbit-hole)"
    echo "    https://localhost:3001   (portfolio - when running)"
    echo "    https://localhost:3002   (blog - when running)"
    if [ -n "$LOCAL_IP" ]; then
        echo -e "    ${GREEN}https://${LOCAL_IP}:3000${NC}  (from network devices)"
    else
        echo "    https://YOUR_LOCAL_IP:3000  (from network devices - find IP with 'ifconfig' or 'ip addr')"
    fi
else
    echo "    http://localhost:3000    (rabbit-hole)"
    echo "    http://localhost:3001    (portfolio - when running)"
    echo "    http://localhost:3002    (blog - when running)"
fi
echo ""
echo -e "${BLUE}📚 Multi-App Architecture:${NC}"
echo "  Migration:     handoffs/2025-10-20_DOCKER_MULTI_APP_MIGRATION_COMPLETE.md"
echo "  Deployment:    DOCKER_MIGRATION_STEPS.md"
echo "  HTTPS Setup:   docs/developer/https-local-dev.md"
echo ""
echo -e "${BLUE}🚀 Deployment Options Available:${NC}"
echo "  1. Coolify (Docker Compose) - Simple, \$50/mo"
echo "     → DOCKER_MIGRATION_STEPS.md"
echo ""
echo "  2. K3s Hybrid (Cloud Burst) - Learn K8s, \$22/mo + spikes"
echo "     → handoffs/2025-10-21_HYBRID_CLOUD_BURSTING_IMPLEMENTATION.md"
echo "     → docs/developer/third-party/k3s/"
echo ""
echo "  3. Terraform AWS (Enterprise) - Managed, \$164/mo"
echo "     → handoffs/2025-10-21_TERRAFORM_MULTI_APP_ARCHITECTURE.md"
echo ""
echo -e "${BLUE}💡 Pro Tips:${NC}"
if [ -f "$CERT_DIR/cert.pem" ]; then
    echo "  • Apps are in apps/* directory (monorepo structure)"
    # Try to detect local network IP for mobile access tip
    LOCAL_IP=""
    if command -v ip &> /dev/null; then
        LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+')
    elif command -v ifconfig &> /dev/null; then
        LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)
    fi
    if [ -n "$LOCAL_IP" ]; then
        echo "  • Access from mobile: https://${LOCAL_IP}:3000"
    else
        echo "  • Access from mobile: https://YOUR_LOCAL_IP:3000 (find IP: ifconfig or ip addr)"
    fi
    echo "  • Agent: cd agent && pnpm dev (separate LangGraph project)"
else
    echo "  • Run 'pnpm run ssl:setup' for HTTPS support"
    echo "  • Apps are in apps/* directory (monorepo structure)"
fi
echo "  • Each app has its own Dockerfile for production builds"
echo "  • Run migrations manually: pnpm run dev:migrate"
echo "  • Test staging: ./scripts/test-staging.sh"
echo "  • MinIO buckets auto-configured for file uploads"
echo ""

