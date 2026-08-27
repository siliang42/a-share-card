#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="${root_dir}/infra/docker-compose.yml"
verify_project="${GUSHI_VERIFY_PROJECT:-gushi-verify-$$}"
verify_data_dir="$(mktemp -d "${TMPDIR:-/tmp}/gushi-verify.XXXXXX")"

export GUSHI_DATA_PATH="${verify_data_dir}"
export GUSHI_API_PORT="${GUSHI_VERIFY_API_PORT:-18080}"
export GUSHI_ADMIN_PORT="${GUSHI_VERIFY_ADMIN_PORT:-13011}"
export GUSHI_QUOTE_REFRESH_SECONDS="86400"

compose() {
  docker compose -p "${verify_project}" -f "${compose_file}" "$@"
}

cleanup() {
  compose down --remove-orphans --rmi local >/dev/null 2>&1 || true
  case "${verify_data_dir}" in
    "${TMPDIR:-/tmp}"/gushi-verify.*) find "${verify_data_dir}" -depth -delete 2>/dev/null || true ;;
    *) echo "Refusing to remove unexpected verification directory: ${verify_data_dir}" >&2 ;;
  esac
}
trap cleanup EXIT

echo "[1/8] API tests"
(cd "${root_dir}/services/api" && uv run pytest -q)

echo "[2/8] Contracts build and admin tests, types, and production build"
(cd "${root_dir}" && npm --workspace @gushi/contracts run build)
(cd "${root_dir}" && npm --workspace @gushi/admin test -- --run)
(cd "${root_dir}" && npm --workspace @gushi/admin run typecheck)
(cd "${root_dir}" && npm --workspace @gushi/admin run build)

echo "[3/8] Mobile tests and types"
(cd "${root_dir}" && npm --workspace @gushi/mobile test -- --runInBand)
(cd "${root_dir}" && npm --workspace @gushi/mobile run typecheck)

echo "[4/8] Compose configuration and deterministic seed"
compose config >/dev/null
compose build
compose run --rm --no-deps -T worker uv run --no-sync python -m app.demo_seed

echo "[5/8] Isolated local stack smoke"
compose up -d
GUSHI_SMOKE_API_URL="http://127.0.0.1:${GUSHI_API_PORT}" \
GUSHI_SMOKE_ADMIN_URL="http://127.0.0.1:${GUSHI_ADMIN_PORT}" \
GUSHI_SMOKE_TOKEN_FILE="${verify_data_dir}/pairing-token" \
  "${root_dir}/scripts/smoke-local.sh"

echo "[6/8] Admin browser E2E and screenshots"
(cd "${root_dir}" && \
  GUSHI_ADMIN_BASE_URL="http://127.0.0.1:${GUSHI_ADMIN_PORT}" \
  npm --workspace @gushi/admin run test:e2e)

echo "[7/8] Android Expo export"
(cd "${root_dir}/apps/mobile" && \
  EXPO_NO_TELEMETRY=1 npx expo export \
    --platform android \
    --output-dir "${verify_data_dir}/android-export")

echo "[8/8] iOS resume flow"
ios_requested="${GUSHI_RUN_IOS:-auto}"
simulator_id=""
if command -v maestro >/dev/null 2>&1 && xcrun simctl list devices booted >/dev/null 2>&1; then
  simulator_id="$(xcrun simctl list devices booted | sed -n 's/.*(\([0-9A-Fa-f-]\{36\}\)) (Booted).*/\1/p' | head -n 1)"
fi
if [[ -n "${simulator_id}" ]] && \
  xcrun simctl get_app_container "${simulator_id}" cn.gushi.memory >/dev/null 2>&1; then
  pairing_token="$(tr -d '\r\n' < "${verify_data_dir}/pairing-token")"
  maestro test \
    -e GUSHI_MAESTRO_API_URL="http://127.0.0.1:${GUSHI_API_PORT}" \
    -e GUSHI_MAESTRO_PAIRING_TOKEN="${pairing_token}" \
    "${root_dir}/apps/mobile/.maestro/primary-flow.yaml"
elif [[ "${ios_requested}" == "1" ]]; then
  echo "iOS verification requires full Xcode, a booted simulator, Maestro, and an installed cn.gushi.memory app." >&2
  exit 1
else
  echo "SKIP: iOS verification requires full Xcode, a booted simulator, Maestro, and an installed cn.gushi.memory app."
fi

echo "Verification complete. Browser screenshots: ${root_dir}/output/playwright"
