#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-killer.wrenzeal.top}"
LOG_FILE="${LOG_FILE:-/var/log/letsencrypt/killer-renew.log}"
LOCK_FILE="${LOCK_FILE:-/var/lock/killer-cert-renew.lock}"
CERTBOT="${CERTBOT:-/usr/bin/certbot}"
NGINX="${NGINX:-/usr/sbin/nginx}"
SYSTEMCTL="${SYSTEMCTL:-/bin/systemctl}"
MODE="${1:-renew}"

timestamp() {
  date '+%Y-%m-%dT%H:%M:%S%z'
}

log() {
  printf '[%s] %s\n' "$(timestamp)" "$*" | tee -a "$LOG_FILE"
}

if [ ! -x "$CERTBOT" ]; then
  echo "certbot not found: $CERTBOT" >&2
  exit 1
fi
if [ ! -x "$NGINX" ]; then
  echo "nginx not found: $NGINX" >&2
  exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$LOCK_FILE")"

(
  flock -n 9 || {
    log "another renew process is already running; exit"
    exit 0
  }

  log "start domain=$DOMAIN mode=$MODE"

  extra_args=()
  if [ "$MODE" = "dry-run" ]; then
    extra_args+=(--dry-run)
  elif [ "$MODE" != "renew" ]; then
    echo "usage: $0 [renew|dry-run]" >&2
    exit 2
  fi

  "$CERTBOT" renew \
    --cert-name "$DOMAIN" \
    --no-random-sleep-on-renew \
    --deploy-hook "$NGINX -t && $SYSTEMCTL reload nginx" \
    "${extra_args[@]}" \
    --non-interactive

  log "complete domain=$DOMAIN mode=$MODE"
) 9>"$LOCK_FILE"
