#!/bin/bash
# Lint all Dockerfiles using hadolint
# Can be run locally or in CI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Linting Dockerfiles with hadolint...${NC}"
echo ""

# Check if hadolint is installed
if ! command -v hadolint &> /dev/null; then
    echo -e "${YELLOW}⚠️  hadolint not found. Installing via Docker...${NC}"
    USE_DOCKER=true
else
    echo -e "${GREEN}✓ hadolint found: $(hadolint --version)${NC}"
    USE_DOCKER=false
fi

echo ""

# Find all Dockerfiles
DOCKERFILES=$(find . -type f \( -name "Dockerfile" -o -name "Dockerfile.*" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -not -path "*/dist/*" \
    | sort)

if [ -z "$DOCKERFILES" ]; then
    echo -e "${YELLOW}No Dockerfiles found${NC}"
    exit 0
fi

FAILED=0
TOTAL=0

for dockerfile in $DOCKERFILES; do
    TOTAL=$((TOTAL + 1))
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📄 Linting: ${GREEN}$dockerfile${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ "$USE_DOCKER" = true ]; then
        # Use Docker to run hadolint with config file
        if docker run --rm -i \
            -v "$(pwd)/.hadolint.yaml:/root/.hadolint.yaml:ro" \
            hadolint/hadolint hadolint -c /root/.hadolint.yaml - < "$dockerfile"; then
            echo -e "${GREEN}✅ Pass${NC}"
        else
            echo -e "${RED}❌ Failed${NC}"
            FAILED=$((FAILED + 1))
        fi
    else
        # Use local hadolint
        if hadolint -c .hadolint.yaml "$dockerfile"; then
            echo -e "${GREEN}✅ Pass${NC}"
        else
            echo -e "${RED}❌ Failed${NC}"
            FAILED=$((FAILED + 1))
        fi
    fi
    echo ""
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total: ${TOTAL}"
echo -e "Passed: ${GREEN}$((TOTAL - FAILED))${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Some Dockerfiles have linting issues${NC}"
    echo -e "${YELLOW}💡 Fix suggestions:${NC}"
    echo -e "  1. Review the errors above"
    echo -e "  2. Check .hadolint.yaml for ignored rules"
    echo -e "  3. See: https://github.com/hadolint/hadolint#rules"
    exit 1
else
    echo -e "${GREEN}✅ All Dockerfiles pass linting!${NC}"
    exit 0
fi

