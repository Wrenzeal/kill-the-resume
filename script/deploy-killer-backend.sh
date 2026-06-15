#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/kill-the-resume}"
DOMAIN="${DOMAIN:-killer.wrenzeal.top}"
FRONTEND_PORT="${FRONTEND_PORT:-16639}"
BACKEND_DIR="$DEPLOY_ROOT/backend"
ENV_FILE="$DEPLOY_ROOT/shared/backend.env"
BIN="$BACKEND_DIR/kill-the-resume-backend"

mkdir -p "$BACKEND_DIR" "$DEPLOY_ROOT/shared"

if [ ! -f "$ENV_FILE" ]; then
  if [ -z "${DB_PASSWORD:-}" ]; then
    echo "DB_PASSWORD must be set when creating a new production backend env file" >&2
    exit 1
  fi

  secret="$(openssl rand -hex 32)"
  cors_origins="${CORS_ORIGINS:-https://$DOMAIN,http://$DOMAIN,https://*.vercel.app,http://127.0.0.1:$FRONTEND_PORT,http://localhost:$FRONTEND_PORT}"
  cat > "$ENV_FILE" <<ENV
APP_ENV=production
SERVER_ADDR=127.0.0.1:19304
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DB_NAME=postgres
DB_SCHEMA=kill_the_resume
JWT_SECRET=$secret
JWT_ISSUER=kill-the-resume
JWT_AUDIENCE=kill-the-resume-web
JWT_TTL_HOURS=168
MAX_BODY_BYTES=1048576
AUTH_RATE_LIMIT_MAX=8
AUTH_RATE_LIMIT_WINDOW_MINUTES=15
CORS_ORIGINS=$cors_origins
FONT_DIR=/var/www/kill-the-resume/current/public/fonts
ENV
  chmod 600 "$ENV_FILE"
fi

(
  cd "$PROJECT_ROOT/backend"
  go build -o "$BIN" ./cmd/server
)

ENV_FILE="$ENV_FILE" BIN="$BIN" "$PROJECT_ROOT/script/start-killer-backend.sh"
