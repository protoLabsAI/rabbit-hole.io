#!/bin/bash
set -e

echo "Creating application and job queue users..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create app_user (if not exists)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${POSTGRES_APP_USER:-app_user}') THEN
            CREATE USER ${POSTGRES_APP_USER:-app_user} WITH PASSWORD '${POSTGRES_APP_PASSWORD:-changeme}';
        END IF;
    END
    \$\$;
    
    -- Grant app_user permissions on public schema
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_APP_USER:-app_user};
    GRANT USAGE ON SCHEMA public TO ${POSTGRES_APP_USER:-app_user};
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${POSTGRES_APP_USER:-app_user};
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${POSTGRES_APP_USER:-app_user};
    
    -- Grant future permissions for app_user
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${POSTGRES_APP_USER:-app_user};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${POSTGRES_APP_USER:-app_user};
    
    -- Create jobqueue user for job processing (if not exists)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${POSTGRES_JOB_USER:-jobqueue}') THEN
            CREATE USER ${POSTGRES_JOB_USER:-jobqueue} WITH PASSWORD '${POSTGRES_JOB_PASSWORD:-changeme}';
        END IF;
    END
    \$\$;
    
    -- Create sidequestjs schema for job queue
    CREATE SCHEMA IF NOT EXISTS sidequestjs;
    
    -- Grant jobqueue user permissions on sidequestjs schema
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_JOB_USER:-jobqueue};
    GRANT USAGE ON SCHEMA sidequestjs TO ${POSTGRES_JOB_USER:-jobqueue};
    GRANT ALL PRIVILEGES ON SCHEMA sidequestjs TO ${POSTGRES_JOB_USER:-jobqueue};
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sidequestjs TO ${POSTGRES_JOB_USER:-jobqueue};
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sidequestjs TO ${POSTGRES_JOB_USER:-jobqueue};
    
    -- Grant future permissions for jobqueue user
    ALTER DEFAULT PRIVILEGES IN SCHEMA sidequestjs GRANT ALL ON TABLES TO ${POSTGRES_JOB_USER:-jobqueue};
    ALTER DEFAULT PRIVILEGES IN SCHEMA sidequestjs GRANT ALL ON SEQUENCES TO ${POSTGRES_JOB_USER:-jobqueue};
    
    -- Allow jobqueue to access public schema (for app database queries if needed)
    GRANT USAGE ON SCHEMA public TO ${POSTGRES_JOB_USER:-jobqueue};
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${POSTGRES_JOB_USER:-jobqueue};
EOSQL

echo "✓ Users created: ${POSTGRES_APP_USER:-app_user}, ${POSTGRES_JOB_USER:-jobqueue}"
echo "✓ Schemas: public (app), sidequestjs (job queue)"

