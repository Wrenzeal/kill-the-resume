#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="${ENV_FILE:-/var/www/kill-the-resume/shared/backend.env}"
APP_NAME="${APP_NAME:-kill-the-resume-backend}"
BIN="${BIN:-/var/www/kill-the-resume/backend/kill-the-resume-backend}"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is required but was not found" >&2
  exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "missing backend env file: $ENV_FILE" >&2
  exit 1
fi
if [ ! -x "$BIN" ]; then
  echo "missing backend binary: $BIN" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$APP_NAME" >/dev/null
fi

pm2 start "$BIN" --name "$APP_NAME" --time --update-env
pm2 save
