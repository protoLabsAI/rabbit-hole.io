#!/bin/bash
# Build Docker images locally and push to GitHub Container Registry
# Fast native ARM64 builds on M1/M2/M3 Macs

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐳 Build and Push to GHCR${NC}"
echo ""

# Configuration
REGISTRY="ghcr.io"
ORG="proto-labs-ai"
REPO="proto-starter"
TAG="${1:-latest}"

# Check if GITHUB_TOKEN is set
echo -e "${BLUE}Checking GHCR authentication...${NC}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  GITHUB_TOKEN not set${NC}"
  echo ""
  echo "Please create and set GitHub Personal Access Token:"
  echo "  1. Go to: https://github.com/settings/tokens"
  echo "  2. Generate new token (classic)"
  echo "  3. Scopes: write:packages, read:packages"
  echo "  4. Run: export GITHUB_TOKEN=ghp_xxxxx"
  echo ""
  echo "Then try again!"
  exit 1
fi

# Login to GHCR
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "${ORG}" --password-stdin

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Logged in to GHCR as ${ORG}${NC}"
  echo ""
else
  echo -e "${RED}❌ Login failed${NC}"
  echo "Check your GITHUB_TOKEN has write:packages scope"
  exit 1
fi

# Build images locally (fast on ARM64 Mac!)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Building images locally (native ARM64)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

./scripts/build-docker-images.sh || {
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
}

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏷️  Tagging images for GHCR...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Tag images
docker tag rabbit-hole:latest ${REGISTRY}/${ORG}/${REPO}/rabbit-hole:${TAG}
docker tag langgraph-agent:latest ${REGISTRY}/${ORG}/${REPO}/agent:${TAG}
docker tag job-processor:latest ${REGISTRY}/${ORG}/${REPO}/job-processor:${TAG}
docker tag yjs-collab:latest ${REGISTRY}/${ORG}/${REPO}/yjs-collab:${TAG}

echo -e "${GREEN}✅ Tagged all images${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⬆️  Pushing to GHCR...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Push images
for service in rabbit-hole agent job-processor yjs-collab; do
  echo -e "${BLUE}Pushing ${service}...${NC}"
  docker push ${REGISTRY}/${ORG}/${REPO}/${service}:${TAG}
  echo -e "${GREEN}✅ ${service} pushed${NC}"
  echo ""
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All images pushed to GHCR!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Images available at:"
echo "  ${REGISTRY}/${ORG}/${REPO}/rabbit-hole:${TAG}"
echo "  ${REGISTRY}/${ORG}/${REPO}/agent:${TAG}"
echo "  ${REGISTRY}/${ORG}/${REPO}/job-processor:${TAG}"
echo "  ${REGISTRY}/${ORG}/${REPO}/yjs-collab:${TAG}"
echo ""

echo -e "${BLUE}🚀 Ready to deploy on Coolify!${NC}"
echo ""
echo "On Coolify:"
echo "  docker compose -f docker-compose.staging.yml pull"
echo "  docker compose -f docker-compose.staging.yml up -d"
echo ""

