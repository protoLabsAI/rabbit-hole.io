#!/bin/bash
# research-health-check.sh
# Verify all research platform services are healthy
#
# Usage: ./scripts/research-health-check.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check_service() {
  local name="$1"
  local url="$2"
  local timeout="${3:-5}"

  if curl -sf --connect-timeout "$timeout" "$url" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} $name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $name ($url)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Rabbit Hole Research Platform - Health Check"
echo "============================================="
echo ""

echo "Data Layer:"
check_service "PostgreSQL (App)" "http://localhost:5432" 2 || true
check_service "Neo4j Browser" "http://localhost:7474"
check_service "MinIO" "http://localhost:9000/minio/health/live"

echo ""
echo "Processing Layer:"
check_service "Job Processor" "http://localhost:8680/health"

echo ""
echo "Agent Layer:"
check_service "LangGraph Agent" "http://localhost:8123/health"

echo ""
echo "Application Layer:"
check_service "Rabbit Hole (Next.js)" "http://localhost:3000"

echo ""
echo "============================================="
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}Some services are not responding. Check logs with:${NC}"
  echo "  docker compose -f docker-compose.research.yml logs <service-name>"
  exit 1
fi

echo ""
echo -e "${GREEN}All services healthy!${NC}"
