# PostgreSQL Migration Log

## Migration 014: Collaboration Session Metadata

**Date:** October 10, 2025  
**Status:** ✅ Applied to DEV

### Tables Created

1. **collaboration_sessions_metadata**
   - Stores initial canvas state and metadata for collaboration sessions
   - JSONB column for flexible metadata storage
   - Foreign key to collaboration_sessions with CASCADE delete
   - 3 indexes (primary key, session lookup, timestamp, GIN for JSONB)

### Verification

```sql
-- DEV Environment (Oct 10, 2025)
\d collaboration_sessions_metadata  -- Table created
\dp collaboration_sessions_metadata -- app_user has full permissions
SELECT COUNT(*) FROM collaboration_sessions_metadata; -- 0 rows (fresh)
```

### Purpose

Enables storing initial canvas data when creating collaboration sessions from workspace tabs. This allows guests to load the same canvas state as the host when joining a session.

### Important Notes

- Migration includes GRANT statement for app_user permissions
- Fixed permission error during initial deployment

---

## Migration 010: Per-Tab Collaboration

**Date:** October 9, 2025  
**Status:** ✅ Applied to DEV

### Tables Modified

1. **collaboration_sessions** - Added `tab_id` column for tab-specific sessions

2. **session_invitations** - New table for tracking session invites

### Verification

```sql
-- DEV Environment (Oct 9, 2025)
\d collaboration_sessions  -- Has tab_id column
\d session_invitations     -- Table created
```

---

## Migration 009: Device Tracking

**Date:** October 9, 2025  
**Status:** ✅ Applied to DEV

### Environment Status

| Environment | Status     | Date Applied | Notes                            |
| ----------- | ---------- | ------------ | -------------------------------- |
| **DEV**     | ✅ Applied | Oct 9, 2025  | Tables created successfully      |
| **STAGING** | ⏳ Pending | -            | Ready to apply after dev testing |
| **PROD**    | ⏳ Pending | -            | Apply after staging validation   |

### Tables Created

1. **user_devices**
   - Tracks registered devices per user
   - Enforces tier-based device limits
   - 4 indexes (primary key, user lookup, cleanup, unique constraint)

2. **user_sessions**
   - Tracks active WebSocket connections
   - Enforces concurrent session limits
   - 3 indexes (primary key, active sessions, cleanup)
   - Foreign key to user_devices (cascade delete)

### Verification

```sql
-- DEV Environment (Oct 9, 2025)
SELECT COUNT(*) FROM user_devices;    -- 0 rows (fresh)
SELECT COUNT(*) FROM user_sessions;   -- 0 rows (fresh)

-- Table structures verified ✅
-- All indexes created ✅
-- Foreign keys established ✅
```

### Applying to STAGING

When ready to deploy to staging:

```bash
# Staging deployment command
docker exec -i postgres-staging psql -U app_user -d rabbit_hole_app \
  < migrations/postgresql/009_device_tracking.sql

# Or if staging uses direct connection:
psql $STAGING_DATABASE_URL -f migrations/postgresql/009_device_tracking.sql
```

### Rollback (if needed)

```sql
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_devices CASCADE;
```

### Notes

- Fixed index predicate issues (removed CURRENT_TIMESTAMP from WHERE clauses)
- No data migration required (new tables)
- No breaking changes to existing functionality
- Zero downtime deployment (new tables don't affect existing features)
