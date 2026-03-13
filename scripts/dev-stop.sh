#!/bin/bash
# Stop all development services

set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo "🛑 Stopping development environment..."
echo ""

# Stop services
docker compose -f docker-compose.dev.yml down

echo ""
echo -e "${GREEN}✅ Services stopped${NC}"
echo ""
echo "💡 To remove volumes (deletes data):"
echo "   docker compose -f docker-compose.dev.yml down -v"
echo ""
echo "💡 To start again:"
echo "   ./scripts/dev-start-full.sh"

