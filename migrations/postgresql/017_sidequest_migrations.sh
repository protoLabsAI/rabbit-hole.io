#!/bin/bash
set -e

echo "Running sidequest database migrations..."

# Run job completions migration in sidequest database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "sidequest" <<-EOSQL
    -- Migration 016: Job Completion Cache
    -- Purpose: Persist job completion state after Sidequest cleanup + real-time notifications
    
    SET search_path TO public;
    
    -- Create job completions table
    CREATE TABLE IF NOT EXISTS sidequest_job_completions (
        -- Primary key (matches job ID)
        job_id BIGINT PRIMARY KEY,
        
        -- Job metadata
        queue VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('completed', 'failed')),
        
        -- Results
        result JSONB,
        error TEXT,
        
        -- User/workspace context for filtering
        user_id VARCHAR(255),
        workspace_id VARCHAR(255),
        
        -- Timestamps
        completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        
        -- Notification tracking
        notified BOOLEAN DEFAULT FALSE
    );
    
    -- Indexes for fast queries
    CREATE INDEX IF NOT EXISTS idx_sidequest_completions_user 
        ON sidequest_job_completions(user_id, completed_at DESC)
        WHERE user_id IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sidequest_completions_workspace 
        ON sidequest_job_completions(workspace_id, completed_at DESC)
        WHERE workspace_id IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sidequest_completions_status 
        ON sidequest_job_completions(status);
    
    CREATE INDEX IF NOT EXISTS idx_sidequest_completions_notified 
        ON sidequest_job_completions(notified)
        WHERE notified = FALSE;
    
    -- Trigger function to capture job completions
    CREATE OR REPLACE FUNCTION notify_job_completion()
    RETURNS TRIGGER AS \$\$
    BEGIN
        -- Only track when job transitions to completed/failed
        IF NEW.state IN ('completed', 'failed') AND 
           (OLD.state IS NULL OR OLD.state != NEW.state) THEN
            
            -- Insert into completion cache
            INSERT INTO sidequest_job_completions (
                job_id,
                queue,
                status,
                result,
                error,
                user_id,
                workspace_id,
                completed_at
            )
            VALUES (
                NEW.id,
                NEW.queue,
                NEW.state,
                NEW.result,
                NEW.errors->0->>'message',
                (NEW.args->>'userId'),
                (NEW.args->>'workspaceId'),
                NOW()
            )
            ON CONFLICT (job_id) DO UPDATE SET
                status = EXCLUDED.status,
                result = EXCLUDED.result,
                error = EXCLUDED.error,
                completed_at = EXCLUDED.completed_at;
    
            -- Send PostgreSQL NOTIFY for real-time listeners
            PERFORM pg_notify(
                'job_completion',
                json_build_object(
                    'jobId', NEW.id,
                    'status', NEW.state,
                    'userId', NEW.args->>'userId',
                    'workspaceId', NEW.args->>'workspaceId',
                    'queue', NEW.queue,
                    'completedAt', NEW.completed_at,
                    'error', NEW.errors->0->>'message'
                )::text
            );
        END IF;
    
        RETURN NEW;
    END;
    \$\$ LANGUAGE plpgsql;
    
    -- Attach trigger to Sidequest jobs table (will be created by Sidequest on startup)
    -- Note: This will succeed silently if table doesn't exist yet
    DO \$\$
    BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'sidequest_jobs') THEN
            DROP TRIGGER IF EXISTS trigger_job_completion ON sidequest_jobs;
            CREATE TRIGGER trigger_job_completion
                AFTER UPDATE ON sidequest_jobs
                FOR EACH ROW
                EXECUTE FUNCTION notify_job_completion();
            RAISE NOTICE 'Trigger attached to sidequest_jobs table';
        ELSE
            RAISE NOTICE 'sidequest_jobs table does not exist yet - trigger will be attached on first job processor startup';
        END IF;
    END \$\$;
    
    -- Auto-cleanup old completions (retain 7 days)
    CREATE OR REPLACE FUNCTION cleanup_old_completions()
    RETURNS void AS \$\$
    BEGIN
        DELETE FROM sidequest_job_completions
        WHERE completed_at < NOW() - INTERVAL '7 days';
    END;
    \$\$ LANGUAGE plpgsql;
    
    -- Grant permissions
    GRANT ALL PRIVILEGES ON TABLE sidequest_job_completions TO jobqueue;
    GRANT EXECUTE ON FUNCTION notify_job_completion() TO jobqueue;
    GRANT EXECUTE ON FUNCTION cleanup_old_completions() TO jobqueue;
    
    -- Comments
    COMMENT ON TABLE sidequest_job_completions IS 'Cached job completion results (persisted after Sidequest cleanup)';
    COMMENT ON COLUMN sidequest_job_completions.job_id IS 'References sidequest_jobs.id';
    COMMENT ON COLUMN sidequest_job_completions.user_id IS 'Extracted from sidequest_jobs.args->>''userId'' for filtering';
    COMMENT ON COLUMN sidequest_job_completions.notified IS 'Tracks if completion was broadcast via SSE';
    
    RESET search_path;
    
    DO \$\$
    BEGIN
    RAISE NOTICE 'Migration 017: Sidequest database migrations complete';
    RAISE NOTICE 'Table: sidequest_job_completions created in sidequest database';
    RAISE NOTICE 'Trigger: notify_job_completion() ready (will attach when sidequest_jobs exists)';
    END \$\$;
EOSQL

echo "Sidequest migrations complete"

