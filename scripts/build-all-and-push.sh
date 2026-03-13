#!/bin/bash
# Build ALL services locally and push to GHCR
# Fast native ARM64 builds - no memory issues!

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Build All Services & Push to GHCR${NC}"
echo ""

# Configuration
REGISTRY="ghcr.io"
ORG="proto-labs-ai"
REPO="proto-starter"

# Check GITHUB_TOKEN
if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${RED}❌ GITHUB_TOKEN not set${NC}"
  echo "Run: export GITHUB_TOKEN=ghp_YOUR_TOKEN"
  exit 1
fi

# Login to GHCR
echo -e "${BLUE}Logging in to GHCR...${NC}"
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "${ORG}" --password-stdin
echo -e "${GREEN}✅ Logged in${NC}"
echo ""

# Build packages once (shared by all services)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Building workspace packages...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pnpm run build:libs
echo -e "${GREEN}✅ Packages built${NC}"
echo ""

# ============================================
# SERVICE 1: rabbit-hole (Next.js)
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  rabbit-hole (Next.js)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Building Next.js app..."
pnpm --filter @apps/rabbit-hole build

echo "Building Docker image..."
docker build -f apps/rabbit-hole/Dockerfile.fast -t rabbit-hole:latest . -q

echo "Tagging for GHCR..."
docker tag rabbit-hole:latest ${REGISTRY}/${ORG}/${REPO}/rabbit-hole:latest

echo "Pushing to GHCR..."
docker push ${REGISTRY}/${ORG}/${REPO}/rabbit-hole:latest | tail -5

echo -e "${GREEN}✅ rabbit-hole complete${NC}"
echo ""

# ============================================
# SERVICE 2: agent (LangGraph)
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  agent (LangGraph)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Building agent..."
docker build -f agent/Dockerfile -t langgraph-agent:latest . -q

echo "Tagging for GHCR..."
docker tag langgraph-agent:latest ${REGISTRY}/${ORG}/${REPO}/agent:latest

echo "Pushing to GHCR..."
docker push ${REGISTRY}/${ORG}/${REPO}/agent:latest | tail -5

echo -e "${GREEN}✅ agent complete${NC}"
echo ""

# ============================================
# SERVICE 3: job-processor
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3️⃣  job-processor${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Building job-processor..."
docker build -f services/job-processor/Dockerfile -t job-processor:latest . -q

echo "Tagging for GHCR..."
docker tag job-processor:latest ${REGISTRY}/${ORG}/${REPO}/job-processor:latest

echo "Pushing to GHCR..."
docker push ${REGISTRY}/${ORG}/${REPO}/job-processor:latest | tail -5

echo -e "${GREEN}✅ job-processor complete${NC}"
echo ""

# ============================================
# SERVICE 4: yjs-collab
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4️⃣  yjs-collab${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Building yjs-collab..."
docker build -f services/yjs-collaboration-server/Dockerfile -t yjs-collab:latest . -q

echo "Tagging for GHCR..."
docker tag yjs-collab:latest ${REGISTRY}/${ORG}/${REPO}/yjs-collab:latest

echo "Pushing to GHCR..."
docker push ${REGISTRY}/${ORG}/${REPO}/yjs-collab:latest | tail -5

echo -e "${GREEN}✅ yjs-collab complete${NC}"
echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ALL SERVICES PUSHED TO GHCR!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Images available at:"
echo "  📦 ${REGISTRY}/${ORG}/${REPO}/rabbit-hole:latest"
echo "  📦 ${REGISTRY}/${ORG}/${REPO}/agent:latest"
echo "  📦 ${REGISTRY}/${ORG}/${REPO}/job-processor:latest"
echo "  📦 ${REGISTRY}/${ORG}/${REPO}/yjs-collab:latest"
echo ""

echo -e "${BLUE}🚀 Ready to deploy on Coolify!${NC}"
echo ""
echo "On Coolify, run:"
echo "  docker compose -f docker-compose.staging.yml pull"
echo "  docker compose -f docker-compose.staging.yml up -d"
echo ""

