#!/bin/bash
# Show development environment status

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Development Environment Status${NC}"
echo ""

# Check Docker
echo -e "${YELLOW}Docker Services:${NC}"
if docker compose -f docker-compose.dev.yml ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null; then
    echo ""
else
    echo "  No services running (run: ./scripts/dev-start-full.sh)"
    echo ""
fi

# Check Next.js
echo -e "${YELLOW}Next.js:${NC}"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Running${NC} - http://localhost:3000"
else
    echo -e "  ${RED}❌ Not running${NC} (run: pnpm dev)"
fi
echo ""

# Check YouTube Processor
echo -e "${YELLOW}YouTube Processor:${NC}"
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Running${NC} - http://localhost:8001"
else
    echo -e "  ${RED}❌ Not running${NC} (part of docker services)"
fi
echo ""

# Check Staging
echo -e "${YELLOW}Local Staging:${NC}"
if docker compose -f docker-compose.staging-local.yml ps 2>/dev/null | grep -q "Up"; then
    echo -e "  ${GREEN}✅ Running${NC} - https://app.localhost"
else
    echo "  ⏸️  Not running (optional)"
fi
echo ""

echo "💡 Quick Commands:"
echo "  Start dev:     ./scripts/dev-start-full.sh"
echo "  Stop dev:      ./scripts/dev-stop.sh"
echo "  Start staging: ./scripts/start-local-staging.sh"

