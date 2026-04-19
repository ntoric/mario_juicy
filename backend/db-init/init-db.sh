#!/bin/sh
set -e

# PostgreSQL initialization script to create multiple databases
# The POSTGRES_DB environment variable only creates one database by default.

# Secondary database name
SECONDARY_DB="loggerdb"

echo "🛠️ Creating secondary database: $SECONDARY_DB"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    CREATE DATABASE $SECONDARY_DB;
    GRANT ALL PRIVILEGES ON DATABASE $SECONDARY_DB TO $POSTGRES_USER;
EOSQL

echo "✅ Secondary database created successfully."
