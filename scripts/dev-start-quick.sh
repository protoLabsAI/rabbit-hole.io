#!/bin/bash
# Quick development setup - services only
# You manually start Next.js when ready

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Development Services${NC}"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker not running. Start Docker Desktop first."
    exit 1
fi

# Start services
echo "Starting services..."
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "Waiting for services..."
sleep 5

# Show status
docker compose -f docker-compose.dev.yml ps

echo ""
echo -e "${GREEN}✅ Services ready!${NC}"
echo ""
echo "📍 Service URLs:"
echo "  Neo4j Browser:   http://localhost:7474 (neo4j/evidencegraph2024)"
echo "  PostgreSQL:      localhost:5432"
echo "  Redis:           localhost:6379"
echo "  MinIO Console:   http://localhost:9001 (minio/minio123)"
echo "  Hocuspocus:      ws://localhost:1234"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "  1. Start Next.js: pnpm dev"
echo "  2. Load test data: pnpm run db:dev (optional)"
echo "  3. Access app: http://localhost:3000"
echo ""

