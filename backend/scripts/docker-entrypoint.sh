#!/bin/bash

# Wait for database to be ready
# if [ "$DATABASE_URL" != "" ]; then
#     # Extract host and port from DATABASE_URL
#     # Protocol://[user:pass@]host[:port]/db
#     URL_STRIPPED=$(echo $DATABASE_URL | sed -e 's|.*://||' -e 's|/.*||')
#     HOST_PORT=$(echo $URL_STRIPPED | sed -e 's|.*@||')
#     DB_HOST=${HOST_PORT%:*}
#     DB_PORT=${HOST_PORT#*:}
    
#     # If no port was specified, default to 5432
#     if [ "$DB_PORT" = "$DB_HOST" ]; then
#         DB_PORT=5432
#     fi
    
#     echo "Waiting for database at $DB_HOST:$DB_PORT..."
#     while ! nc -z $DB_HOST $DB_PORT; do
#       sleep 0.1
#     done
#     echo "Database is ready!"
# fi

# Install dependencies
echo "📦 Checking and installing dependencies..."
pip install --no-cache-dir -r requirements.txt

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Start the server
echo "Starting server..."
python manage.py runserver 0.0.0.0:8000
