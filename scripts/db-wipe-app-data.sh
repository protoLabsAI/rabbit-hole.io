#!/bin/bash

# Wipe Application Database - Fresh Start
# Truncates all application tables while preserving schema
# Use when starting fresh with no users

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: This will DELETE ALL APPLICATION DATA${NC}"
echo ""
echo "Tables that will be wiped:"
echo "  - yjs_documents (workspaces)"
echo "  - yjs_snapshots"
echo "  - share_tokens"
echo "  - organization_tenants"
echo "  - workspace_drafts"
echo ""
echo -e "${YELLOW}This action is IRREVERSIBLE.${NC}"
echo ""

read -p "Type 'WIPE' to confirm: " confirmation

if [ "$confirmation" != "WIPE" ]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo -e "${BLUE}🗑️  Wiping application data...${NC}"

# Check if docker container is running
if ! docker ps | grep -q postgres-complete; then
  echo -e "${RED}❌ Postgres container not running${NC}"
  echo "Start it with: docker compose -f docker-compose.dev.yml up -d postgres"
  exit 1
fi

# Wipe tables in order (respecting foreign keys)
docker exec postgres-complete psql -U app_user -d rabbit_hole_app <<EOF
BEGIN;

-- Truncate tables in correct order (respecting FK constraints)
TRUNCATE TABLE yjs_snapshots CASCADE;
TRUNCATE TABLE yjs_documents CASCADE;
TRUNCATE TABLE workspace_drafts CASCADE;
TRUNCATE TABLE share_tokens CASCADE;
TRUNCATE TABLE organization_quotas CASCADE;
TRUNCATE TABLE organization_tenants CASCADE;

COMMIT;

-- Verify all tables are empty
SELECT 
  'yjs_documents' as table_name, COUNT(*) as rows FROM yjs_documents
UNION ALL
SELECT 'yjs_snapshots', COUNT(*) FROM yjs_snapshots
UNION ALL
SELECT 'workspace_drafts', COUNT(*) FROM workspace_drafts
UNION ALL
SELECT 'share_tokens', COUNT(*) FROM share_tokens
UNION ALL
SELECT 'organization_tenants', COUNT(*) FROM organization_tenants
UNION ALL
SELECT 'organization_quotas', COUNT(*) FROM organization_quotas;
EOF

echo ""
echo -e "${GREEN}✅ All application data wiped${NC}"
echo ""
echo "Next steps:"
echo "  1. Clear localStorage in browser: localStorage.clear()"
echo "  2. Delete IndexedDB in DevTools"
echo "  3. Hard refresh: Cmd+Shift+R"
echo ""
echo "Database is now ready for fresh user signups with tier system."
