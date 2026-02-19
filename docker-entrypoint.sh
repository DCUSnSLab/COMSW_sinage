#!/bin/sh
set -e

# DB 초기화 (스키마 적용)
echo "Initializing database..."

# Ensure upload directory exists (in case volume mount is empty)
mkdir -p public/uploads

# Check if we should skip migration (e.g. if handled by K8s InitContainer)
if [ "$SKIP_MIGRATION" != "true" ]; then
    echo "Running DB migration..."
    # Use local prisma binary to avoid npx downloading latest incompatible version
    if [ -f "./node_modules/.bin/prisma" ]; then
        echo "Using local Prisma binary..."
        ./node_modules/.bin/prisma migrate deploy
    else
        echo "Prisma binary not found locally, falling back to npx (pinned version)..."
        npx prisma@5.22.0 migrate deploy
    fi
else
    echo "Skipping DB migration (SKIP_MIGRATION=true)..."
fi

# 서버 실행 (CMD로 전달된 명령어 실행)
echo "Starting server..."
exec "$@"
