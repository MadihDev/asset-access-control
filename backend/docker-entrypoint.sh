#!/bin/sh
set -e

# Wait for DB if DATABASE_URL is set and host is reachable (best-effort)
if [ -n "$DATABASE_URL" ]; then
  echo "Database URL detected. Running prisma migrate..."
  npx prisma migrate deploy || true
fi

echo "Starting API on port ${PORT:-5001}"
node dist/index.js
