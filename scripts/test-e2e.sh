#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Running E2E Tests with Cypress${NC}"
echo ""

# Check if app is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo -e "${YELLOW}⚠️  App not running at http://localhost:3000${NC}"
  echo -e "${YELLOW}Starting app in test mode...${NC}"
  docker-compose -f docker-compose.cypress.yml --profile with-app up -d app
  
  # Wait for app to be ready
  echo -e "${YELLOW}Waiting for app to be healthy...${NC}"
  timeout 60 bash -c 'until curl -s http://localhost:3000 > /dev/null; do sleep 2; done'
  echo -e "${GREEN}✓ App is ready${NC}"
  echo ""
fi

# Run Cypress tests
echo -e "${GREEN}Running Cypress tests...${NC}"
docker-compose -f docker-compose.cypress.yml run --rm cypress

# Capture exit code
EXIT_CODE=$?

# Cleanup if we started the app
if docker ps | grep -q rabbit-hole-app-test; then
  echo ""
  echo -e "${YELLOW}Cleaning up test app...${NC}"
  docker-compose -f docker-compose.cypress.yml down
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
else
  echo -e "${RED}❌ Some tests failed${NC}"
fi

exit $EXIT_CODE

