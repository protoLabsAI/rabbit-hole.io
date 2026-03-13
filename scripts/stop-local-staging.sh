#!/bin/bash
# Stop local staging environment

set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}🛑 Stopping Local Staging Environment${NC}"
echo ""

# Stop services
docker compose -f docker-compose.staging-local.yml down

echo ""
echo -e "${GREEN}✅ Services stopped${NC}"
echo ""
echo "To remove volumes (WARNING: deletes data):"
echo "  docker compose -f docker-compose.staging-local.yml down -v"

