#!/usr/bin/env bash
set -euo pipefail

api_url="${GUSHI_SMOKE_API_URL:-http://127.0.0.1:8000}"
admin_url="${GUSHI_SMOKE_ADMIN_URL:-http://127.0.0.1:3000}"
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
token_file="${GUSHI_SMOKE_TOKEN_FILE:-${root_dir}/data/pairing-token}"

wait_for_url() {
  local label="$1"
  local url="$2"
  for _attempt in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 3 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "${label} did not become ready: ${url}" >&2
  return 1
}

wait_for_url "API" "${api_url}/health"
wait_for_url "Admin" "${admin_url}/"

health_payload="$(curl --fail --silent --show-error "${api_url}/health")"
case "$health_payload" in
  *'"status":"ok"'*'"service":"gushi-api"'*) ;;
  *) echo "Unexpected API health response: ${health_payload}" >&2; exit 1 ;;
esac

if [[ ! -s "$token_file" ]]; then
  echo "Pairing token was not generated at ${token_file}" >&2
  exit 1
fi
pairing_token="$(tr -d '\r\n' < "$token_file")"
curl --fail --silent --show-error \
  -H "Authorization: Bearer ${pairing_token}" \
  "${api_url}/api/v1/catalog" >/dev/null

echo "Local stack healthy: API ${api_url}, Admin ${admin_url}, authenticated catalog available"
