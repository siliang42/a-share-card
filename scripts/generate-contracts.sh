#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
spec_file="$(mktemp)"
trap 'rm -f "$spec_file"' EXIT

cd "$repo_root/services/api"
uv run python -c 'import json; from app.main import app; print(json.dumps(app.openapi(), ensure_ascii=False))' > "$spec_file"

cd "$repo_root"
npx openapi-typescript "$spec_file" -o packages/contracts/src/schema.ts
