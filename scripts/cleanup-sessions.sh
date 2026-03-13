#!/bin/bash

# Session Cleanup Utility
# Cleans up orphaned or expired collaboration sessions

set -e

DB_CONTAINER="postgres-complete"
DB_USER="app_user"
DB_NAME="rabbit_hole_app"

echo "🧹 Session Cleanup Utility"
echo "=========================="
echo ""

# Show current sessions
echo "📊 Current Sessions:"
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'ended') as ended,
    COUNT(*) FILTER (WHERE status = 'active' AND expires_at < EXTRACT(EPOCH FROM NOW()) * 1000) as expired
  FROM collaboration_sessions;
"

echo ""
echo "Choose cleanup mode:"
echo "1) Clean expired sessions only"
echo "2) Clean ALL active sessions (force)"
echo "3) Show session details"
echo "4) Exit"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    echo "🗑️  Cleaning expired sessions..."
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
      UPDATE collaboration_sessions 
      SET status = 'ended', 
          last_activity_at = EXTRACT(EPOCH FROM NOW()) * 1000
      WHERE status = 'active' 
        AND expires_at < EXTRACT(EPOCH FROM NOW()) * 1000;
      
      SELECT 'Cleaned ' || COUNT(*) || ' expired sessions' as result
      FROM collaboration_sessions 
      WHERE status = 'ended';
    "
    ;;
    
  2)
    echo "⚠️  WARNING: This will end ALL active sessions!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      echo "🗑️  Force cleaning all active sessions..."
      docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        UPDATE collaboration_sessions 
        SET status = 'ended',
            last_activity_at = EXTRACT(EPOCH FROM NOW()) * 1000
        WHERE status = 'active';
        
        SELECT 'Ended ' || COUNT(*) || ' active sessions' as result
        FROM collaboration_sessions 
        WHERE status = 'ended';
      "
    else
      echo "Cancelled."
    fi
    ;;
    
  3)
    echo "📋 Session Details:"
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
      SELECT 
        id,
        owner_id,
        tab_id,
        status,
        TO_CHAR(TO_TIMESTAMP(created_at/1000), 'YYYY-MM-DD HH24:MI:SS') as created,
        TO_CHAR(TO_TIMESTAMP(expires_at/1000), 'YYYY-MM-DD HH24:MI:SS') as expires,
        CASE 
          WHEN expires_at < EXTRACT(EPOCH FROM NOW()) * 1000 THEN 'EXPIRED'
          ELSE 'Valid'
        END as expiry_status
      FROM collaboration_sessions 
      ORDER BY created_at DESC 
      LIMIT 20;
    "
    ;;
    
  4)
    echo "Exiting..."
    exit 0
    ;;
    
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Done!"

