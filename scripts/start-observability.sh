#!/bin/bash
# Start local staging with observability

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔭 Starting Local Staging + Observability${NC}"
echo ""

# Start both stacks
docker compose \
  -f docker-compose.staging-local.yml \
  -f docker-compose.observability.yml \
  up -d

echo ""
echo "Waiting for services..."
sleep 15

echo ""
echo -e "${GREEN}✅ Observability Stack Ready${NC}"
echo ""
echo "📊 Access Points:"
echo "  Grafana:    http://localhost:3002 (admin/admin123)"
echo "  Prometheus: http://localhost:9090"
echo "  App:        https://app.localhost"
echo ""
echo "🔍 Quick Checks:"
echo "  curl http://localhost:3100/ready  # Loki"
echo "  curl http://localhost:3200/ready  # Tempo"
echo "  curl http://localhost:9090/-/healthy  # Prometheus"
echo ""

