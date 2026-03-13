#!/bin/bash
# Clear workspace data to resolve Y.Array/Y.Map conflicts
# Use this if you see "Type with the name tabs has already been defined" errors

set -e

echo "🧹 Clearing workspace data..."

# Find PostgreSQL container
PG_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "postgres|db" | head -1)

if [ -z "$PG_CONTAINER" ]; then
  echo "❌ PostgreSQL container not found"
  exit 1
fi

echo "📦 Found PostgreSQL container: $PG_CONTAINER"

# Try different user names
for USER in postgres root admin; do
  echo "🔍 Trying user: $USER"
  
  if docker exec $PG_CONTAINER psql -U $USER -d rabbit_hole -c "DELETE FROM yjs_documents WHERE room_id LIKE '%workspace%';" 2>/dev/null; then
    echo "✅ Cleared workspace documents"
    echo "✅ Restart your browser and refresh"
    exit 0
  fi
done

echo "⚠️ Could not connect to PostgreSQL"
echo "💡 Alternative: Restart Hocuspocus"
echo "   docker compose -f docker-compose.dev.yml restart hocuspocus"
echo ""
echo "💡 Or clear IndexedDB in browser:"
echo "   DevTools → Application → IndexedDB → Delete all 'y-org:*:workspace:*' databases"

