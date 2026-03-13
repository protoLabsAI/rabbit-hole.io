#!/bin/bash
# Shared migration check utilities
# Used by dev-start-full.sh and run-migrations.sh

# Conditional error suppression based on DEBUG environment variable
# When DEBUG=1, show all database errors for troubleshooting
# When DEBUG=0 or unset, suppress stderr for cleaner output
if [ "${DEBUG:-0}" = "1" ]; then
    export STDERR_REDIRECT=""
else
    export STDERR_REDIRECT="2>/dev/null"
fi

# Function to check if a table exists in postgres-complete
# Args: database_name table_name
# Returns: "t" if exists, "f" if not
# Requires: POSTGRES_COMPLETE_HEALTHY variable to be set
check_table_exists() {
    local db=$1
    local table=$2
    
    # Skip query if postgres-complete is not healthy
    if [ "${POSTGRES_COMPLETE_HEALTHY:-false}" != "true" ]; then
        echo "false"
        return
    fi
    
    # Query with conditional stderr suppression
    eval "docker exec postgres-complete psql -U postgres -d \"$db\" -tAc \
        \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='$table');\" $STDERR_REDIRECT" || echo "false"
}

# Function to check if a table exists in postgres-jobs
# Args: database_name table_name
# Returns: "t" if exists, "f" if not
# Requires: POSTGRES_JOBS_HEALTHY variable to be set
check_table_exists_jobs() {
    local db=$1
    local table=$2
    
    # Skip query if postgres-jobs is not healthy
    if [ "${POSTGRES_JOBS_HEALTHY:-false}" != "true" ]; then
        echo "false"
        return
    fi
    
    # Query with conditional stderr suppression
    eval "docker exec postgres-jobs psql -U jobqueue -d \"$db\" -tAc \
        \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='$table');\" $STDERR_REDIRECT" || echo "false"
}

