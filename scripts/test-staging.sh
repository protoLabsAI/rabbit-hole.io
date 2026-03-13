#!/bin/bash
# Test Staging Build Locally - Pre-Coolify Validation
# Builds and runs production container locally before deploying

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Local Staging Test Environment    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check Docker running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker not running - start Docker Desktop"
    exit 1
fi

echo -e "${YELLOW}🏗️  Building production image...${NC}"
echo "This tests the same build that Coolify will use"
echo ""

# Build rabbit-hole app
docker compose -f docker-compose.staging-local.yml build rabbit-hole

echo ""
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

echo -e "${YELLOW}🚀 Starting local staging environment...${NC}"
docker compose -f docker-compose.staging-local.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 20

# Check status
echo ""
echo -e "${GREEN}📊 Service Status:${NC}"
docker compose -f docker-compose.staging-local.yml ps

echo ""
echo -e "${GREEN}✅ Staging test environment running!${NC}"
echo ""
echo -e "${BLUE}📍 Access Points:${NC}"
echo "  Rabbit Hole: https://app.localhost (via Traefik)"
echo "  Traefik Dashboard: http://localhost:8080"
echo "  Neo4j Browser: http://localhost:7474"
echo "  MinIO Console: http://localhost:9001"
echo ""
echo -e "${YELLOW}🧪 Testing Steps:${NC}"
echo "1. Open https://app.localhost in browser"
echo "2. Test authentication (Clerk)"
echo "3. Create/view research workspace"
echo "4. Test graph visualization"
echo "5. Upload a file to test MinIO"
echo "6. Test collaboration (multiple tabs)"
echo ""
echo -e "${BLUE}💡 If everything works:${NC}"
echo "  ✓ Production build is ready"
echo "  ✓ Safe to deploy to Coolify"
echo "  ✓ Stop with: docker compose -f docker-compose.staging-local.yml down"
echo ""
echo -e "${YELLOW}⚠️  If issues found:${NC}"
echo "  • Check logs: docker compose -f docker-compose.staging-local.yml logs rabbit-hole"
echo "  • Fix issues and rebuild"
echo "  • Don't deploy to Coolify until tests pass"
echo ""

