#!/bin/sh
# Praedixa API — Docker entrypoint
#
# 1. Runs Alembic migrations to apply latest schema
# 2. Starts uvicorn (reload only in development)
set -e

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting Praedixa API (ENVIRONMENT=${ENVIRONMENT:-development})..."

if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${UVICORN_WORKERS:-2}" --access-log
else
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
