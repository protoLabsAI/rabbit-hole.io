#!/bin/bash
# Start local staging environment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Local Staging Environment${NC}"
echo ""

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Start services
echo "Starting services..."
docker compose -f docker-compose.staging-local.yml up -d

echo ""
echo -e "${GREEN}✅ Services started${NC}"
echo ""

# Wait for health checks
echo "Waiting for services to become healthy..."
sleep 15

# Show status
docker compose -f docker-compose.staging-local.yml ps

echo ""
echo -e "${GREEN}📍 Access Points:${NC}"
echo "  Next.js:            http://localhost:3000"
echo "  Neo4j Browser:      http://localhost:7474"
echo "  MinIO Console:      http://localhost:9001"
echo "  YouTube Processor:  http://localhost:8001"
echo "  Hocuspocus (YJS):   ws://localhost:1234"
echo ""
echo -e "${GREEN}✅ Local staging ready!${NC}"

