#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🧪 Opening Cypress Interactive Mode${NC}"
echo ""

# Check if app is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo -e "${YELLOW}⚠️  App not running at http://localhost:3000${NC}"
  echo -e "${YELLOW}Please start your dev server: pnpm dev${NC}"
  exit 1
fi

# For macOS, enable X11 forwarding (requires XQuartz)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo -e "${YELLOW}Note: Interactive mode on macOS requires XQuartz${NC}"
  echo -e "${YELLOW}Install with: brew install --cask xquartz${NC}"
  echo ""
  export DISPLAY=host.docker.internal:0
fi

# Run Cypress in interactive mode
docker-compose -f docker-compose.cypress.yml --profile interactive run --rm cypress-open

