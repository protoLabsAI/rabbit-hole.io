#!/bin/bash
set -e

echo "Creating sidequest database for job processing..."

# Create sidequest database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    -- Check if sidequest database exists, create if not
    SELECT 'CREATE DATABASE sidequest OWNER jobqueue'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sidequest')\gexec
    
    -- Grant permissions
    GRANT ALL PRIVILEGES ON DATABASE sidequest TO jobqueue;
EOSQL

echo "Sidequest database created successfully"

