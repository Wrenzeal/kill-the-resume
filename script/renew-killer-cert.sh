#!/usr/bin/env bash
set -euo pipefail

DEFAULT_DOMAINS="api.killer.wrenzeal.top"
if [ -n "${DOMAINS:-}" ]; then
  DOMAIN_LIST="$DOMAINS"
elif [ -n "${DOMAIN:-}" ]; then
  DOMAIN_LIST="$DOMAIN"
else
  DOMAIN_LIST="$DEFAULT_DOMAINS"
fi

LOG_FILE="${LOG_FILE:-/var/log/letsencrypt/killer-renew.log}"
LOCK_FILE="${LOCK_FILE:-/var/lock/killer-cert-renew.lock}"
CERTBOT="${CERTBOT:-/usr/bin/certbot}"
NGINX="${NGINX:-/usr/sbin/nginx}"
SYSTEMCTL="${SYSTEMCTL:-/bin/systemctl}"
MODE="${1:-renew}"

# Certbot deploy hooks run only when a lineage is renewed. The hook validates
# nginx first, then reloads it so renewed certificates are picked up safely.
RELOAD_HOOK="$NGINX -t && $SYSTEMCTL reload nginx"

timestamp() {
  date '+%Y-%m-%dT%H:%M:%S%z'
}

log() {
  printf '[%s] %s\n' "$(timestamp)" "$*" | tee -a "$LOG_FILE"
}

usage() {
  echo "usage: $0 [renew|dry-run]" >&2
}

split_domains() {
  printf '%s\n' "$DOMAIN_LIST" | tr ',[:space:]' '\n' | sed '/^$/d' | awk '!seen[$0]++'
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

  extra_args=()
  if [ "$MODE" = "dry-run" ]; then
    extra_args+=(--dry-run)
  elif [ "$MODE" != "renew" ]; then
    usage
    exit 2
  fi

  mapfile -t domains < <(split_domains)
  if [ "${#domains[@]}" -eq 0 ]; then
    echo "no domains configured; set DOMAINS or DOMAIN" >&2
    exit 2
  fi

  log "start domains=${domains[*]} mode=$MODE"

  status=0
  for cert_name in "${domains[@]}"; do
    log "renew cert_name=$cert_name mode=$MODE"
    if ! "$CERTBOT" renew \
      --cert-name "$cert_name" \
      --no-random-sleep-on-renew \
      --deploy-hook "$RELOAD_HOOK" \
      "${extra_args[@]}" \
      --non-interactive; then
      log "failed cert_name=$cert_name mode=$MODE"
      status=1
    else
      log "ok cert_name=$cert_name mode=$MODE"
    fi
  done

  if [ "$status" -ne 0 ]; then
    log "complete with failures domains=${domains[*]} mode=$MODE"
    exit "$status"
  fi

  log "complete domains=${domains[*]} mode=$MODE"
) 9>"$LOCK_FILE"
