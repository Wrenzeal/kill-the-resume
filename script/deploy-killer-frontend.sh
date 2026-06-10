#!/usr/bin/env bash
set -euo pipefail

APP_NAME="kill-the-resume-frontend"
DOMAIN="${DOMAIN:-killer.wrenzeal.top}"
PORT="${PORT:-16639}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_SRC="$PROJECT_ROOT/web"
DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/kill-the-resume}"
RELEASES_DIR="$DEPLOY_ROOT/release"
SHARED_DIR="$DEPLOY_ROOT/shared"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$RELEASES_DIR/$TIMESTAMP"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-/api/v1}"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] pm2 is required but was not found" >&2
  exit 1
fi

if [ ! -f "$WEB_SRC/package.json" ]; then
  echo "[deploy] web package not found: $WEB_SRC/package.json" >&2
  exit 1
fi

free_port_owner() {
  local port="$1"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  elif command -v ss >/dev/null 2>&1; then
    pids="$(
      ss -ltnp "sport = :$port" 2>/dev/null \
        | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
        | sort -u
    )"
  fi

  if [ -z "$pids" ]; then
    return 0
  fi

  echo "[deploy] freeing stale listener(s) on port $port: $pids"
  kill $pids 2>/dev/null || true

  for _ in 1 2 3 4 5; do
    sleep 0.4
    if ! ss -ltn "sport = :$port" 2>/dev/null | grep -q ":$port"; then
      return 0
    fi
  done

  echo "[deploy] force killing stale listener(s) on port $port"
  kill -9 $pids 2>/dev/null || true
}

echo "[deploy] app=$APP_NAME domain=$DOMAIN port=$PORT"
echo "[deploy] source=$WEB_SRC"
echo "[deploy] release=$RELEASE_DIR"

mkdir -p "$RELEASES_DIR" "$SHARED_DIR"

rsync -a \
  --delete \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.turbo' \
  --exclude='tsconfig.tsbuildinfo' \
  "$WEB_SRC/" "$RELEASE_DIR/"

cat > "$RELEASE_DIR/.env.local" <<ENV
NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL
ENV

echo "[deploy] installing dependencies"
(
  cd "$RELEASE_DIR"
  npm ci
)

echo "[deploy] building Next.js app"
(
  cd "$RELEASE_DIR"
  npm run build
)

ln -sfn "$RELEASE_DIR" "$DEPLOY_ROOT/current"
cat > "$DEPLOY_ROOT/start_frontend.sh" <<START
#!/usr/bin/env bash
set -euo pipefail
pm2 start npm --name "$APP_NAME" --cwd "$DEPLOY_ROOT/current" -- run start -- -p $PORT
START
chmod +x "$DEPLOY_ROOT/start_frontend.sh"

echo "[deploy] restarting pm2 process"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$APP_NAME" >/dev/null
fi
free_port_owner "$PORT"
pm2 start npm --name "$APP_NAME" --cwd "$DEPLOY_ROOT/current" -- run start -- -p "$PORT"
pm2 save

echo "[deploy] pruning old releases, keep=$KEEP_RELEASES"
find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

echo "[deploy] complete"
echo "[deploy] current -> $(readlink -f "$DEPLOY_ROOT/current")"
