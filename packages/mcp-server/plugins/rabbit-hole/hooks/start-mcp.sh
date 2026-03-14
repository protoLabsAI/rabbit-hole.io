#!/usr/bin/env bash
set -euo pipefail

# Rabbit Hole MCP Server Launcher
# Called by Claude Code plugin system via stdio transport

if [[ -z "${RABBIT_HOLE_ROOT:-}" ]]; then
  echo "RABBIT_HOLE_ROOT is not set. Set it in your plugin .env file." >&2
  echo "Example: RABBIT_HOLE_ROOT=/Users/you/dev/rabbit-hole.io" >&2
  exit 1
fi

DIST="${RABBIT_HOLE_ROOT}/packages/mcp-server/dist/index.js"

if [[ ! -f "$DIST" ]]; then
  echo "MCP server not built. Run: cd ${RABBIT_HOLE_ROOT}/packages/mcp-server && pnpm build" >&2
  exit 1
fi

exec node "$DIST" "$@"
