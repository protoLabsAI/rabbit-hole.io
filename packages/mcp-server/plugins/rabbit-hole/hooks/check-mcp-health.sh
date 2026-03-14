#!/usr/bin/env bash
# Pre-flight health check for Rabbit Hole MCP server
# Runs on SessionStart to verify the server is ready

ERRORS=0

# Check RABBIT_HOLE_ROOT
if [[ -z "${RABBIT_HOLE_ROOT:-}" ]]; then
  echo "RABBIT_HOLE_ROOT not set. Configure in plugin .env file."
  ERRORS=$((ERRORS + 1))
fi

# Check built artifact
if [[ -n "${RABBIT_HOLE_ROOT:-}" ]]; then
  DIST="${RABBIT_HOLE_ROOT}/packages/mcp-server/dist/index.js"
  if [[ ! -f "$DIST" ]]; then
    echo "MCP server not built at ${DIST}"
    echo "Run: cd ${RABBIT_HOLE_ROOT}/packages/mcp-server && pnpm build"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check job processor (optional — only needed for media tools)
JOB_URL="${JOB_PROCESSOR_URL:-http://localhost:8680}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "${JOB_URL}/health" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "Job processor: healthy (${JOB_URL})"
else
  echo "Job processor: unavailable (media tools disabled)"
  echo "Start with: docker compose -f docker-compose.research.yml up -d"
fi

# Check API keys
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "Entity extraction: enabled"
else
  echo "Entity extraction: disabled (no ANTHROPIC_API_KEY)"
fi

if [[ -n "${TAVILY_API_KEY:-}" ]]; then
  echo "Tavily search: enabled"
else
  echo "Tavily search: disabled (using DuckDuckGo free tier)"
fi

if [[ $ERRORS -gt 0 ]]; then
  exit 1
fi

exit 0
