#!/bin/bash
set -e

echo "Waiting for database to be ready..."

# Wait for PostgreSQL to be ready using pg_isready
MAX_RETRIES=30
RETRY_COUNT=0
until pg_isready -h "${DB_HOST:-db}" -U "${POSTGRES_USER:-library_user}" -d "${POSTGRES_DB:-library}"; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "Database connection timeout after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "Database is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 1
done

echo "Database is ready!"
cd /app/backend || { echo "Backend directory not found"; exit 1; }

echo "Running migrations..."
python manage.py migrate --noinput

# Load fixtures only if explicitly enabled via environment variable
# WARNING: Never set LOAD_FIXTURES=true in production
if [ "${LOAD_FIXTURES:-false}" = "true" ]; then
    FIXTURE_FILE="fixtures/test_data.json"

    # Verify fixture file exists before attempting to load
    if [ ! -f "$FIXTURE_FILE" ]; then
        echo "✗ Error: Fixture file not found at $FIXTURE_FILE"
        exit 1
    fi

    echo "Checking for existing data..."
    # Use get_user_model() to avoid coupling to specific user model
    USER_COUNT=$(python manage.py shell -c "from django.contrib.auth import get_user_model; print(get_user_model().objects.count())" | tail -1 | tr -d '[:space:]')

    # Fail fast if shell command fails (don't mask errors)
    if [ $? -ne 0 ]; then
        echo "✗ Error: Failed to query user count"
        exit 1
    fi

    if [ "$USER_COUNT" -eq 0 ] 2>/dev/null; then
        echo "Loading test data fixture..."
        python manage.py loaddata "$FIXTURE_FILE"

        if [ $? -eq 0 ]; then
            echo ""
            echo "✓ Test data loaded successfully!"
            echo ""
            echo "Test Users Created:"
            echo "===================="
            echo "Librarians:"
            echo "  - Username: librarian1, Password: password123"
            echo "  - Username: librarian2, Password: password123"
            echo ""
            echo "Members:"
            echo "  - Username: member1, Password: password123"
            echo "  - Username: member2, Password: password123"
            echo "  - Username: member3, Password: password123"
            echo "  - Username: member4, Password: password123"
            echo "  - Username: member5, Password: password123"
            echo ""
            echo "Data Summary:"
            echo "  - 10 books with 5 copies each (50 total copies)"
            echo "  - 15 historical transactions"
            echo "  - 2 books currently borrowed"
            echo ""
            echo "⚠️  WARNING: Test credentials are logged above. For development only!"
            echo ""
        else
            echo "✗ Error loading test data"
            exit 1
        fi
    else
        echo "Test data already exists ($USER_COUNT users found). Skipping fixture load."
    fi
else
    echo "Fixture loading disabled (LOAD_FIXTURES not set to 'true')"
fi

echo "Starting services (Django backend + Next.js frontend via supervisor)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
