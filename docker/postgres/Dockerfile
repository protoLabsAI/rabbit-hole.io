FROM postgres:15

# Copy migrations into container (eliminates volume mount issues)
COPY migrations/postgresql/*.sh /docker-entrypoint-initdb.d/
COPY migrations/postgresql/*.sql.managed /docker-entrypoint-initdb.d/

# Ensure shell scripts are executable
RUN chmod +x /docker-entrypoint-initdb.d/*.sh

# PostgreSQL automatically executes scripts in /docker-entrypoint-initdb.d/ on first startup
# Order: alphabetical (000_run_migrations.sh runs first, then SQL files in order)

LABEL maintainer="rabbit-hole.io"
LABEL description="PostgreSQL 15 with embedded migration scripts"
LABEL version="1.0.0"

