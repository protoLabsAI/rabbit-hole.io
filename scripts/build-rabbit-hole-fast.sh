#!/bin/bash
# Fast build for rabbit-hole - builds locally then copies into Docker
# Avoids memory issues in Docker

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Fast Build: rabbit-hole${NC}"
echo ""

echo -e "${BLUE}1. Building packages locally...${NC}"
pnpm run build:libs

echo ""
echo -e "${BLUE}2. Building Next.js app locally (skipping scan:domains - has export issue)...${NC}"
pnpm --filter @protolabsai/rabbit-hole build

echo ""
echo -e "${BLUE}3. Building Docker image (just copies files)...${NC}"
docker build -f apps/rabbit-hole/Dockerfile.fast -t rabbit-hole:latest .

echo ""
echo -e "${GREEN}✅ rabbit-hole built successfully!${NC}"
docker images rabbit-hole:latest --format "Size: {{.Size}}"

